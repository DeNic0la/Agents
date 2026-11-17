// The dispatcher's decision rules (CW-10): no AI and no I/O. One issue's state goes
// in, a plan comes out, and the same state always gives the same plan. Level-triggered
// (D5): the rules read labels, the timeline and the dispatcher's own records, never the
// event that woke them, so a lost or repeated event changes nothing.
//
// A view of an issue:
//   { number, state: 'open'|'closed', author, body, labels: [names], isPull,
//     timeline: [{ type: 'labeled'|'unlabeled'|'commented'|'closed'|'reopened', actor, label, body }],
//     dependencies: [{ number, state }],
//     pull: { number, title, author, state, draft, merged, mergedBy, mergeSha, closedBy, headSha,
//             mergeable, mergeableState, files: [{ path, previousPath, status, additions, deletions, executable }] | null } | null }
// The context:
//   { settings, control: { stopped }, running: Set of issue numbers with a session,
//     queue: issue numbers that may start implementing now (ready.startableQueue),
//     spend: { monthUsd } when known }
'use strict';

const L = require('./labels');
const { actorKind } = require('./actors');
const { readRecord } = require('./markers');
const { splitBody, digest } = require('./spec');
const { checkReady, routeLabel, startableQueue } = require('./ready');
const { unsetCaps } = require('./settings');
const { Plan } = require('./plan');
const { mergeClassCheck, mergeLabelOf, closingComment } = require('./merge');

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

// CW-13, U11: changes by anyone but the owner and the dispatcher are undone. Each guarded
// label is put back to what the last trusted change left (D46), not by undoing only the
// last change: an agent adding and then removing `approved` must not leave an approval
// the owner never gave. For merge classes a raise by anyone also counts (CW-67).
function revertUntrustedChanges(plan, view, settings) {
  const timeline = view.timeline || [];
  const trusted = (e) => ['owner', 'dispatcher'].includes(actorKind(e.actor, settings));
  const reverted = [];
  for (const label of [...GUARDED, ...L.MERGES]) {
    const i = lastLabelEvent(timeline, label);
    if (i < 0) continue;
    const e = timeline[i];
    if (trusted(e)) continue;
    if ((e.type === 'labeled') !== plan.has(label)) continue; // a later change we can't see yet; the next run sees it
    const isMerge = L.MERGES.includes(label);
    const authorized = lastIndex(timeline, (x) => (x.type === 'labeled' || x.type === 'unlabeled') && x.label === label && (trusted(x) || (isMerge && x.type === 'labeled')));
    const shouldHave = authorized >= 0 && timeline[authorized].type === 'labeled';
    if (shouldHave === plan.has(label)) continue;
    if (shouldHave) plan.addLabel(label);
    else plan.removeLabel(label);
    reverted.push(`${shouldHave ? 'restored' : 'removed'} ${code(label)} (${e.type === 'labeled' ? 'added' : 'removed'} by @${e.actor || 'unknown'})`);
  }
  if (reverted.length) {
    plan.say.push(`Reverted: ${reverted.join('; ')}. Only the owner sets state, origin, \`approved\`, \`budget:extend\` and \`paused\`, and only the owner lowers a merge class.`);
  }
  // D26: GitHub doesn't say who created a label, so a label the agent identity put on an
  // issue that cloud/labels.json doesn't list comes off again.
  const foreign = [...plan.labels].filter((label) => {
    if (L.ALL.includes(label)) return false;
    const i = lastLabelEvent(timeline, label);
    return i >= 0 && timeline[i].type === 'labeled' && actorKind(timeline[i].actor, settings) === 'agent';
  });
  for (const label of foreign) plan.removeLabel(label);
  if (foreign.length) {
    plan.say.push(`Removed ${foreign.map(code).join(', ')}: the agent identity added ${foreign.length > 1 ? 'them' : 'it'}, and agents use only the labels in \`cloud/labels.json\` (D26).`);
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
  plan.remember({ intake: true, ask: facts.askDigest, triage: null, estimateUsd: null, approvedSpec: null, waiting: null, dorFailing: null });
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
  plan.remember({ ask: facts.askDigest, triage: null, estimateUsd: null, approvedSpec: null, waiting: null, dorFailing: null });
  plan.say.push('The request changed: triaged again, without `approved`.');
}

// D48: the author of an external issue changed the request after the owner let it in.
// The owner decides again, so an outsider's edits never start a session by themselves.
function externalEdit(plan, facts) {
  plan.removeLabel(L.APPROVED);
  plan.remember({ ask: facts.askDigest, triage: null, estimateUsd: null, approvedSpec: null, dorFailing: null });
  toNeedsAnswer(plan, 'triage', 'external', 'The request changed after the owner let it in.');
}

// An approval the owner gave earlier, for the spec as it stands now (D44).
const approvalStands = (facts) => Boolean(facts.record.approvedSpec) && facts.record.approvedSpec === facts.specDigest;
const askChanged = (facts) => Boolean(facts.record.ask) && facts.record.ask !== facts.askDigest;

// CW-41, scenario 5, D45: the owner's `approved` overrides an objection. A `direct` issue
// is then ready; any other goes back to the agent that objected, which goes on without the
// objection, and the spec it writes still needs the owner's approval.
function overrideObjection(plan, facts, waiting) {
  plan.removeLabel(L.OBJECTION);
  plan.remember({ waiting: null, objectionOverridden: true });
  if (plan.has('route:direct')) {
    plan.setState('ready');
    plan.remember({ approvedSpec: facts.specDigest });
    plan.say.push('Approved over objection. The owner\'s approval overrides the objection; the issue is `ready`.');
    return;
  }
  const from = ['triage', 'refining'].includes(waiting.from) ? waiting.from : 'triage';
  plan.removeLabel(L.APPROVED);
  plan.setState(from);
  plan.say.push(`Approved over objection. The objection is set aside and the issue goes back to ${code(from)}; the spec it gets still needs the owner's \`approved\` in \`needs-approval\`.`);
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
  if (plan.has(L.APPROVED) && plan.has(L.OBJECTION)) return overrideObjection(plan, facts, waiting);
  if (plan.has(L.APPROVED) && !approvalStands(facts)) {
    plan.removeLabel(L.APPROVED);
    if (facts.record.approvedSpec) {
      plan.remember({ approvedSpec: null });
      plan.say.push('The spec changed after approval: `approved` removed.');
    } else {
      plan.say.push('Removed `approved`: it counts once the spec is complete and the issue waits in `needs-approval`, or to override an objection. To let work go on here, comment.');
    }
  }
  if (!ownerActedAfter(timeline, since, settings)) return undefined;
  // D37: an issue edited while it waited is triaged as it is now.
  if (askChanged(facts)) return retriage(plan, facts);
  const from = ['needs-answer', 'needs-approval'].includes(waiting.from) ? 'triage' : waiting.from;
  plan.setState(from);
  // D22: an implementation kept its slot while it waited, so it goes on at once.
  plan.remember({ waiting: null, ask: facts.askDigest });
  plan.say.push(`The owner answered: back to ${code(from)}.`);
  return undefined;
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
    if (askChanged(facts)) return retriage(plan, facts);
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

const agentPull = (view, settings) => {
  const pr = view.pull;
  return pr && pr.state === 'open' && actorKind(pr.author, settings) === 'agent' ? pr : null;
};

// CW-62: on every push, the class the changed paths, file types and size allow, raised
// onto the issue when higher (CW-67: never lowered). In `in-review`, a confirmed
// `merge:self` is recorded at the head commit; `merge-gate` reads that record (CW-63).
function checkMergeClass(plan, view, facts, settings) {
  const pr = agentPull(view, settings);
  if (!pr || !pr.files) return;
  const check = mergeClassCheck(plan.labels, pr, settings);
  if (check.raised) {
    for (const m of L.MERGES) if (m !== check.effective) plan.removeLabel(m);
    plan.addLabel(check.effective);
    plan.say.push(`Raised the merge class to ${code(check.effective)} for #${pr.number}: ${check.reasons.join('; ')} (CW-62).`);
  }
  if (plan.state !== 'in-review' || check.effective !== 'merge:self') return;
  const done = facts.record.mergeCheck;
  if (done && done.sha === pr.headSha && done.merge === 'merge:self') return;
  plan.remember({ mergeCheck: { sha: pr.headSha, merge: 'merge:self', pull: pr.number } });
  plan.say.push(`Confirmed \`merge:self\` for #${pr.number} at ${String(pr.headSha).slice(0, 7)}: the agent merges it once CI is green (CW-63).`);
}

// CW-55: a pull request that conflicts with the default branch goes back to the implement
// agent, which brings the branch up to date. `mergeable` is computed lazily: unknown is no conflict.
function checkConflict(plan, view, settings) {
  const pr = agentPull(view, settings);
  if (!pr || pr.mergeableState !== 'dirty') return;
  plan.setState('in-progress');
  plan.say.push(`#${pr.number} conflicts with the default branch: back to \`in-progress\`, so the implement agent brings the branch up to date (CW-55).`);
}

// CW-69: after the owner merged, the dispatcher posts the closing comment; after the
// agent's merge, the merge job did, and when it couldn't, the dispatcher does (D86).
// A merge by anyone else gets none.
function closedByMerge(plan, view, facts, settings) {
  const pr = view.pull;
  const m = facts.record.merged;
  if (m && m.by === 'agent' && m.commented === false) {
    plan.say.push(closingComment({ pull: m.pull, title: pr && pr.number === m.pull ? pr.title : '', by: 'agent', record: facts.record }));
    plan.remember({ merged: { ...m, commented: true } });
    return;
  }
  if (!pr || !pr.merged || facts.record.merged || actorKind(pr.mergedBy, settings) !== 'owner') return;
  plan.say.push(closingComment({ pull: pr.number, title: pr.title, by: 'owner', record: facts.record }));
  plan.remember({ merged: { pull: pr.number, sha: pr.mergeSha || null, by: 'owner' } });
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
      if (plan.state === 'in-review') checkConflict(plan, view, settings);
      if (['in-review', 'in-progress'].includes(plan.state)) checkMergeClass(plan, view, facts, settings);
      return undefined;
    case 'in-progress':
      checkApprovedSpec(plan, facts);
      if (plan.state === 'in-progress') checkMergeClass(plan, view, facts, settings);
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

const SESSION_RETRIES = 1; // CW-16: one retry, then the owner

// CW-11, CW-12, CW-14, CW-80, CW-84: which agent the state calls for, if it may start.
function startAgent(plan, view, facts, ctx) {
  const state = plan.state;
  const role = ROLE_FOR_STATE[state];
  if (!role) return;
  if (state === 'in-review') {
    const pr = view.pull;
    if (!pr || pr.state !== 'open' || actorKind(pr.author, ctx.settings) !== 'agent' || facts.record.reviewedSha === pr.headSha) return;
    // CW-61: merge:self gets no review; the merge job merges it (CW-63).
    if (mergeLabelOf(plan.labels) === 'merge:self') {
      plan.notes.push(`no review for \`merge:self\`: the agent merges #${pr.number} when CI and \`merge-gate\` are green`);
      return;
    }
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
  // The dispatcher requested a session and no run of it is active any more: the run ended
  // without reporting (a crash or a time-out of the job). CW-16 counts it as a failure.
  const lost = facts.record.session;
  if (lost) {
    const failures = Number(facts.record.failures || 0) + 1;
    plan.remember({ session: null });
    if (failures > SESSION_RETRIES) {
      plan.remember({ failures: null });
      return toNeedsAnswer(plan, state, `the ${lost.role} session run ended without a result ${failures} times`, 'Not retrying again.');
    }
    plan.remember({ failures });
    plan.say.push(`The ${lost.role} session run ended without a result. Retrying once.`);
  }
  plan.start = { role, limitUsd };
  if (state === 'ready') plan.setState('in-progress');
  return undefined;
}

// Everything but starting an agent: labels repaired, the state moved. `final` means
// nothing may start for this view.
function decideState(view, ctx) {
  const { settings } = ctx;
  const plan = new Plan(view.number, view.labels);
  const facts = readFacts(view, settings);
  plan.lastDryRun = facts.lastDryRun;
  if (view.isPull || actorKind(view.author, settings) === 'dispatcher') return { plan, facts, view, final: true };
  if (view.state === 'closed') {
    closeCleanup(plan);
    closedByMerge(plan, view, facts, settings);
    return { plan, facts, view, final: true };
  }
  revertUntrustedChanges(plan, view, settings);
  repairLabels(plan, view, facts, settings);

  const timeline = view.timeline || [];
  const reopened = lastIndex(timeline, (e) => e.type === 'reopened') > (facts.at.intake ?? -1);
  const external = plan.has(L.ORIGIN.external);
  const waiting = ['needs-answer', 'needs-approval'].includes(plan.state);
  if (!plan.state || reopened) intake(plan, view, facts, reopened);
  else if (askChanged(facts) && waiting) handleState(plan, view, facts, settings); // D37: the owner acts first
  else if (askChanged(facts) && external) externalEdit(plan, facts);
  else if (askChanged(facts)) retriage(plan, facts);
  else handleState(plan, view, facts, settings);
  return { plan, facts, view, final: false };
}

function decideIssue(view, ctx) {
  const staged = decideState(view, ctx);
  if (!staged.final) startAgent(staged.plan, view, staged.facts, ctx);
  return staged.plan;
}

const ACTIVE = ['in-progress', 'in-review'];

// The record as it stands after the plan: a null value deletes the key.
function recordAfter(s) {
  const r = { ...s.facts.record };
  for (const [k, v] of Object.entries(s.plan.record)) {
    if (v === null) delete r[k];
    else r[k] = v;
  }
  return r;
}

// D22: `in-progress` and `in-review` hold a slot, and so does a `needs-answer` issue that
// returns to one of them.
function holdsSlot(s) {
  if (ACTIVE.includes(s.plan.state)) return true;
  const waiting = s.plan.state === 'needs-answer' && recordAfter(s).waiting;
  return Boolean(waiting && ACTIVE.includes(waiting.from));
}

// Decides every view in issue-number order, in two passes (D47): first every state moves,
// then the free implementation slots go to the `ready` issues, lowest number first.
// `ctx.activeElsewhere` counts the slot holders not among the views.
function decideAll(views, ctx) {
  const staged = [...views].sort((a, b) => a.number - b.number).map((v) => decideState(v, ctx));
  const live = staged.filter((s) => !s.final);
  const active = Number(ctx.activeElsewhere || 0) + live.filter(holdsSlot).length;
  const candidates = live
    .filter((s) => s.plan.state === 'ready')
    .map((s) => ({ number: s.view.number, labels: [...s.plan.labels], record: { ...s.facts.record, ...s.plan.record }, dependencies: s.view.dependencies }));
  const queue = startableQueue(candidates, active, ctx.settings);
  for (const s of live) startAgent(s.plan, s.view, s.facts, { ...ctx, queue });
  return staged.map((s) => s.plan);
}

module.exports = { decideIssue, decideAll, decideState, readFacts, toNeedsAnswer, ROLE_FOR_STATE, SESSION_RETRIES };
