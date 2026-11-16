// The dispatcher's decision rules (CW-10): no AI and no I/O. One issue's state goes
// in, a plan comes out, and the same state always gives the same plan. Level-triggered
// (D5): the rules read labels, the timeline and the dispatcher's own records, never the
// event that woke them, so a lost or repeated event changes nothing.
//
// A view of an issue:
//   { number, state: 'open'|'closed', author, body, labels: [names], isPull,
//     timeline: [{ type: 'labeled'|'unlabeled'|'commented'|'closed'|'reopened', actor, label, body }],
//     dependencies: [{ number, state }], pull: { number, author, state, merged, closedBy, headSha } | null }
// The context:
//   { settings, control: { stopped }, running: Set of issue numbers with a session,
//     queue: issue numbers that may start implementing now (ready.startableQueue),
//     spend: { monthUsd } when known }
'use strict';

const L = require('./labels');
const { actorKind } = require('./actors');
const { readRecord } = require('./markers');
const { splitBody, digest } = require('./spec');
const { checkReady, routeLabel } = require('./ready');
const { unsetCaps } = require('./settings');
const { Plan } = require('./plan');

const ROLE_FOR_STATE = { triage: 'triage', refining: 'refine', ready: 'implement', 'in-progress': 'implement', 'in-review': 'review' };
// Only the owner and the dispatcher change these. Merge labels are guarded against
// removal only: any agent may raise a class (CW-67).
const GUARDED = [L.APPROVED, L.BUDGET_EXTEND, L.PAUSED, ...L.ORIGINS, ...L.STATES];

const code = (label) => `\`${label}\``;

function lastIndex(timeline, test) {
  for (let i = timeline.length - 1; i >= 0; i--) if (test(timeline[i])) return i;
  return -1;
}
const lastLabelEvent = (timeline, label, type) =>
  lastIndex(timeline, (e) => (type ? e.type === type : e.type === 'labeled' || e.type === 'unlabeled') && e.label === label);

function ownerActedAfter(timeline, since, settings, types = ['commented']) {
  for (let i = since + 1; i < timeline.length; i++) {
    const e = timeline[i];
    if (types.includes(e.type) && actorKind(e.actor, settings) === 'owner') return true;
  }
  return false;
}

function readFacts(view, settings) {
  const { record, at, lastDryRun } = readRecord(view.timeline || [], settings);
  const { ask, spec } = splitBody(view.body);
  return { record, at, lastDryRun, askDigest: digest(ask), specDigest: digest(spec || '') };
}

// CW-3: closing removes the state, `approved` and `paused`; U13 adds `budget:extend`.
function closeCleanup(plan) {
  for (const label of [...L.STATES, L.APPROVED, L.PAUSED, L.BUDGET_EXTEND]) plan.removeLabel(label);
}

// CW-13, U11: changes by anyone but the owner and the dispatcher are undone.
function revertUntrustedChanges(plan, view, settings) {
  const timeline = view.timeline || [];
  const reverted = [];
  for (const label of [...GUARDED, ...L.MERGES]) {
    const i = lastLabelEvent(timeline, label);
    if (i < 0) continue;
    const e = timeline[i];
    const kind = actorKind(e.actor, settings);
    if (kind === 'owner' || kind === 'dispatcher') continue;
    const added = e.type === 'labeled';
    if (added !== plan.has(label)) continue; // a later change we can't see yet; the next run sees it
    if (added && L.MERGES.includes(label)) continue;
    if (added) plan.removeLabel(label);
    else plan.addLabel(label);
    reverted.push(`${added ? 'removed' : 'restored'} ${code(label)} (${added ? 'added' : 'removed'} by @${e.actor || 'unknown'})`);
  }
  if (reverted.length) {
    plan.say.push(`Reverted: ${reverted.join('; ')}. Only the owner sets state, origin, \`approved\`, \`budget:extend\` and \`paused\`, and only the owner lowers a merge class.`);
  }
}

function originFor(author, settings) {
  const kind = actorKind(author, settings);
  if (kind === 'owner') return L.ORIGIN.owner;
  if (kind === 'agent') return L.ORIGIN.agent;
  return L.ORIGIN.external;
}

// Keeps one label of a group; `pick` chooses among those present.
function keepOne(plan, group, pick, why) {
  const present = group.filter((l) => plan.has(l));
  if (present.length < 2) return;
  const keep = pick(present);
  const dropped = present.filter((l) => l !== keep);
  dropped.forEach((l) => plan.removeLabel(l));
  plan.say.push(`Kept ${code(keep)} and removed ${dropped.map(code).join(', ')}: ${why}.`);
}

// CW-4, U12, CW-22 and CW-3's repair of several state labels.
function repairLabels(plan, view, facts, settings) {
  const timeline = view.timeline || [];
  if (!L.ORIGINS.some((o) => plan.has(o))) plan.addLabel(originFor(view.author, settings));
  keepOne(plan, L.ORIGINS, (present) => present.reduce((a, b) => (lastLabelEvent(timeline, b, 'labeled') > lastLabelEvent(timeline, a, 'labeled') ? b : a)), 'an issue has one origin');
  keepOne(plan, L.MERGES, (present) => present[present.length - 1], 'the highest merge class stays');
  keepOne(plan, L.ROUTES, (present) => present[present.length - 1], 'the route with the most process stays');
  if (plan.has('route:direct') && !plan.has(L.ORIGIN.owner)) {
    plan.removeLabel('route:direct');
    plan.addLabel('route:lean');
    plan.say.push('Changed `route:direct` to `route:lean`: only an issue the owner wrote can skip approval.');
  }
  const remembered = facts.record.state;
  keepOne(plan, L.STATES, (present) => (present.includes(remembered) ? remembered : present[0]), 'an open issue has exactly one state label');
}

// CW-17: every move to `needs-answer` names the reason and the state it came from.
const REASONS = {
  external: 'it was opened by someone who is neither the owner nor an agent',
  'pr-closed': 'the owner closed the pull request without merging',
};
function toNeedsAnswer(plan, from, reason, text) {
  plan.setState('needs-answer');
  plan.remember({ waiting: { from, reason } });
  plan.say.push(`${text} Waiting for the owner because ${REASONS[reason] || reason}; it came from ${code(from)}. Nothing happens until the owner comments.`);
}

// CW-3, CW-18, CW-19: a new issue, a reopened one, or one whose state label was removed.
function intake(plan, view, facts, reopened) {
  if (plan.has(L.APPROVED)) plan.removeLabel(L.APPROVED);
  if (reopened) L.ROUTES.forEach((r) => plan.removeLabel(r));
  plan.remember({ intake: true, ask: facts.askDigest, triage: null, approvedSpec: null, waiting: null, dorFailing: null });
  const prefix = reopened ? 'Reopened: triaged as a new issue, without `approved`.' : '';
  if (plan.has(L.ORIGIN.external)) {
    toNeedsAnswer(plan, 'triage', 'external', `${prefix} Thanks for the issue.`.trim());
  } else {
    plan.setState('triage');
    if (prefix) plan.say.push(prefix);
  }
}

// CW-26, U4: the owner changed what the issue asks for.
function retriage(plan, facts) {
  plan.removeLabel(L.APPROVED);
  plan.setState('triage');
  plan.remember({ ask: facts.askDigest, triage: null, approvedSpec: null, waiting: null, dorFailing: null });
  plan.say.push('The request changed: triaged again, without `approved`.');
}

// The state a waiting issue returns to: the dispatcher's record, or else the state
// label removed last before `needs-answer` came, or else `triage`.
function cameFrom(view, facts, since) {
  if (facts.record.waiting && (facts.at.waiting ?? -1) >= since && L.STATES.includes(facts.record.waiting.from)) {
    return facts.record.waiting;
  }
  const timeline = view.timeline || [];
  for (let i = since - 1; i >= 0; i--) {
    const e = timeline[i];
    if (e.type === 'unlabeled' && L.STATES.includes(e.label) && e.label !== 'needs-answer') return { from: e.label, reason: 'unknown' };
  }
  return { from: 'triage', reason: 'unknown' };
}

// CW-11, CW-19, CW-44, U9: a `needs-answer` issue moves only when the owner acts.
function handleNeedsAnswer(plan, view, facts, settings) {
  const timeline = view.timeline || [];
  const since = lastLabelEvent(timeline, 'needs-answer', 'labeled');
  const waiting = cameFrom(view, facts, since);
  if (plan.has(L.APPROVED)) {
    if (plan.has('route:direct') && plan.has(L.OBJECTION)) {
      plan.removeLabel(L.OBJECTION);
      plan.setState('ready');
      plan.remember({ waiting: null, approvedSpec: facts.specDigest });
      plan.say.push('Approved over objection. The owner\'s approval overrides the objection; the issue is `ready`.');
      return;
    }
    plan.removeLabel(L.APPROVED);
    plan.say.push('Removed `approved`: it counts once the spec is complete and the issue waits in `needs-approval`. To let work go on here, comment.');
  }
  if (!ownerActedAfter(timeline, since, settings)) return;
  const from = ['needs-answer', 'needs-approval'].includes(waiting.from) ? 'triage' : waiting.from;
  plan.setState(from);
  // The ask an external issue had while it waited is what triage now looks at.
  plan.remember({ waiting: null, ask: facts.askDigest });
  plan.say.push(`The owner answered: back to ${code(from)}.`);
}

// CW-40, CW-41, U10.
function handleNeedsApproval(plan, view, facts, settings) {
  const timeline = view.timeline || [];
  if (plan.has(L.APPROVED)) {
    if (plan.has(L.OBJECTION)) {
      plan.removeLabel(L.OBJECTION);
      plan.say.push('Approved over objection. The owner\'s approval overrides the objection.');
    }
    plan.setState('ready');
    plan.remember({ approvedSpec: facts.specDigest });
    plan.say.push('Approved: the spec as it stands now is what gets built.');
    return;
  }
  const since = lastLabelEvent(timeline, 'needs-approval', 'labeled');
  if (ownerActedAfter(timeline, since, settings)) {
    plan.setState('refining');
    plan.say.push('The owner commented without approving: back to `refining` to revise the spec.');
  }
}

// CW-42, and the owner's own approval of an issue moved by hand (U11).
function checkApprovedSpec(plan, facts) {
  if (!plan.has(L.APPROVED)) return;
  if (facts.record.approvedSpec === undefined) {
    plan.remember({ approvedSpec: facts.specDigest });
  } else if (facts.record.approvedSpec !== facts.specDigest) {
    plan.removeLabel(L.APPROVED);
    plan.setState('needs-approval');
    plan.remember({ approvedSpec: null });
    plan.say.push('The spec changed after approval: `approved` removed, back to `needs-approval`.');
  }
}

// CW-18: the owner closed the issue's pull request without merging it.
function checkPullClosed(plan, view, settings) {
  const pr = view.pull;
  if (!pr || pr.state !== 'closed' || pr.merged || actorKind(pr.closedBy, settings) !== 'owner') return;
  toNeedsAnswer(plan, 'in-progress', 'pr-closed', `The owner closed #${pr.number} without merging.`);
}

function handleState(plan, view, facts, settings) {
  switch (plan.state) {
    case 'needs-answer':
      return handleNeedsAnswer(plan, view, facts, settings);
    case 'needs-approval':
      return handleNeedsApproval(plan, view, facts, settings);
    case 'triage':
    case 'refining':
      if (plan.has(L.APPROVED)) {
        plan.removeLabel(L.APPROVED);
        plan.say.push('Removed `approved`: it counts once the spec is complete and the issue waits in `needs-approval`.');
      }
      return undefined;
    case 'in-review':
      checkApprovedSpec(plan, facts);
      if (plan.state === 'in-review') checkPullClosed(plan, view, settings);
      return undefined;
    default:
      return checkApprovedSpec(plan, facts);
  }
}

const roundCents = (usd) => Math.floor(usd * 100) / 100;

// CW-81: the hard limit of a session. Spent amounts and extensions come from records
// the session-watching job writes (phase 3 and 8).
function hardLimit(role, plan, record, ctx) {
  const caps = ctx.settings.caps;
  let limit;
  if (role === 'triage') limit = caps.perRunUsd.triage;
  else {
    const route = routeLabel(plan.labels);
    if (!route) return null;
    limit = caps.perIssueUsd[L.routeOf(route)] * (1 + Number(record.extensions || 0)) - Number(record.spentUsd || 0);
  }
  if (ctx.spend && Number.isFinite(ctx.spend.monthUsd)) {
    limit = Math.min(limit, caps.monthlyUsd - ctx.spend.monthUsd - Number(ctx.spend.reservedUsd || 0));
  }
  return roundCents(limit);
}

// CW-11, CW-12, CW-14, CW-80, CW-84: which agent the state calls for, if it may start.
function startAgent(plan, view, facts, ctx) {
  const state = plan.state;
  const role = ROLE_FOR_STATE[state];
  if (!role) return;
  if (state === 'in-review') {
    const pr = view.pull;
    if (!pr || pr.state !== 'open' || actorKind(pr.author, ctx.settings) !== 'agent' || facts.record.reviewedSha === pr.headSha) return;
  }
  if (state === 'refining' && !routeLabel(plan.labels)) {
    plan.notes.push('no refine agent: the issue has no route; move it to `triage`');
    return;
  }
  if (role === 'implement') {
    const ready = checkReady({ labels: plan.labels, record: { ...facts.record, ...plan.record }, dependencies: view.dependencies }, ctx.settings);
    const key = ready.failing.map((f) => f.item).join(',') || null;
    if (!ready.ok) {
      if (facts.record.dorFailing !== key) {
        plan.remember({ dorFailing: key });
        plan.say.push(`Not starting the implementation. Definition of Ready: ${ready.failing.map((f) => `item ${f.item} fails, ${f.text}`).join('; ')}.`);
      }
      return;
    }
    if (facts.record.dorFailing) plan.remember({ dorFailing: null });
    if (state === 'ready' && !(ctx.queue || []).includes(view.number)) {
      plan.notes.push(`waits for a free implementation slot (${ctx.settings.parallelImplementations} at a time, lowest issue number first)`);
      return;
    }
  }
  if (ctx.running && ctx.running.has(view.number)) return plan.notes.push('a session is already running for this issue');
  if (ctx.control && ctx.control.stopped) return plan.notes.push('the stop switch is on');
  if (plan.has(L.PAUSED)) return plan.notes.push('the issue is `paused` at its cap');
  const unset = unsetCaps(ctx.settings);
  if (unset.length) return plan.notes.push(`no session starts while caps are unset: ${unset.join(', ')}`);
  const limitUsd = hardLimit(role, plan, { ...facts.record, ...plan.record }, ctx);
  if (!(limitUsd > 0)) return plan.notes.push('nothing is left of the cap for this session');
  plan.start = { role, limitUsd };
  if (state === 'ready') plan.setState('in-progress');
  return undefined;
}

function decideIssue(view, ctx) {
  const { settings } = ctx;
  const plan = new Plan(view.number, view.labels);
  const facts = readFacts(view, settings);
  plan.lastDryRun = facts.lastDryRun;
  if (view.isPull || actorKind(view.author, settings) === 'dispatcher') return plan;
  if (view.state === 'closed') {
    closeCleanup(plan);
    return plan;
  }
  revertUntrustedChanges(plan, view, settings);
  repairLabels(plan, view, facts, settings);

  const timeline = view.timeline || [];
  const reopened = lastIndex(timeline, (e) => e.type === 'reopened') > (facts.at.intake ?? -1);
  const waitingForOwner = plan.state === 'needs-answer' && facts.record.waiting && facts.record.waiting.reason === 'external';
  if (!plan.state || reopened) intake(plan, view, facts, reopened);
  else if (facts.record.ask && facts.record.ask !== facts.askDigest && !waitingForOwner) retriage(plan, facts);
  else handleState(plan, view, facts, settings);

  startAgent(plan, view, facts, ctx);
  return plan;
}

// Decides every view in issue-number order. The queue in the context is shared, so
// one run never starts more implementations than there are free slots.
const decideAll = (views, ctx) => [...views].sort((a, b) => a.number - b.number).map((v) => decideIssue(v, ctx));

module.exports = { decideIssue, decideAll, readFacts, ROLE_FOR_STATE };
