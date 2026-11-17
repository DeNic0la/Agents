// What a finished session leads to (cloud/agents/README.md, "The result"). Pure: the
// session job feeds in the session's last message and what it created, and gets back
// what to do as the agent identity and as the dispatcher. Every outcome is checked
// here, against the role that reported it, before anything reaches GitHub (D52).
'use strict';

const L = require('./labels');
const { Plan } = require('./plan');
const { toNeedsAnswer, reviewRound, SESSION_RETRIES: RETRIES } = require('./index');
const { routeLabel } = require('./ready');
const { higher } = require('./merge-class');
const { fence } = require('./task');
const { SPEC_START, SPEC_END } = require('./spec');
const { pullBody } = require('./merge');

// Outcomes each role may report. `questions` and `objection` are shared.
const OUTCOMES = {
  triage: ['duplicate', 'out-of-scope', 'objection', 'over-cap', 'split', 'routed', 'questions'],
  refine: ['objection', 'questions', 'spec'],
  plan: ['objection', 'questions', 'spec'],
  implement: ['questions', 'pushed', 'spec-wrong'],
  review: ['questions', 'approve', 'changes', 'recommend'],
  scout: ['recommendations'],
  record: ['questions', 'recorded', 'skipped'],
};
const MAX_FILED = 3; // CW-7
const MAX_COMMENT = 60000; // GitHub's limit is 65536 characters; the dispatcher adds lines
const MAX_SPEC = 40000; // leaves room for the owner's text in the same body
// CW-30: the parts every spec has. Recommendations are optional.
const SPEC_PARTS = [['the outcome', /\boutcome\b/i], ['what is out of scope', /\bout of scope\b/i], ['acceptance criteria', /\bacceptance criteria\b/i]];
const usd = (n) => `$${Number(n).toFixed(2)}`;
const code = (s) => `\`${s}\``;
const round = (n) => Math.round(n * 100) / 100;

// Token shapes of GitHub and the Claude platform. The session holds a GitHub token in
// its git setup; nothing it prints may carry one to GitHub (CW-91).
const SECRET_PATTERNS = [/\bgh[pousr]_[A-Za-z0-9_]{20,}/g, /\bgithub_pat_[A-Za-z0-9_]{20,}/g, /\bsk-ant-[A-Za-z0-9_-]{10,}/g, /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g];

function scrubSecrets(text, known = []) {
  let out = String(text || '');
  for (const k of known) if (k) out = out.split(k).join('[redacted]');
  for (const re of SECRET_PATTERNS) out = out.replace(re, '[redacted]');
  return out;
}

// The last `agent-result` block of the session's last message.
function parseResult(text) {
  const re = /(?:^|\n)(`{3,})agent-result[ \t]*\n([\s\S]*?)\n\1[ \t]*(?=\n|$)/g;
  let last = null;
  for (let m = re.exec(text || ''); m; m = re.exec(text || '')) last = m[2];
  if (last === null) return { ok: false, error: 'the session ended without an `agent-result` block' };
  try {
    const data = JSON.parse(last);
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, error: 'the `agent-result` block is not a JSON object' };
    return { ok: true, result: data };
  } catch (err) {
    return { ok: false, error: `the \`agent-result\` block is not valid JSON (${err.message})` };
  }
}

const isText = (v, max = MAX_COMMENT) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const isUsd = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const issueList = (v, min, max) => Array.isArray(v) && v.length >= min && v.length <= max && v.every((i) => i && isText(i.title, 256) && typeof i.body === 'string' && i.body.length <= MAX_COMMENT);

const MAX_ITEMS = 50;
function itemsError(r) {
  const ok = Array.isArray(r.items) && r.items.length >= 1 && r.items.length <= MAX_ITEMS
    && r.items.every((i) => i && isText(i.item, 300) && typeof i.pass === 'boolean' && (i.note === undefined || i.note === null || (typeof i.note === 'string' && i.note.length <= 2000)));
  return ok ? null : `\`items\` must be 1 to ${MAX_ITEMS} \`{ item, pass, note }\``;
}

// Extra fields per outcome: a check that returns an error text or null.
const NEEDS = {
  duplicate: (r, n) => (Number.isInteger(r.of) && r.of > 0 && r.of !== n ? null : '`of` must be the number of another issue'),
  'out-of-scope': (r) => (isText(r.record, 300) && r.record.startsWith('.out-of-scope/') && !r.record.includes('..') ? null : '`record` must be a path in `.out-of-scope/`'),
  'over-cap': (r) => (isUsd(r.estimateUsd) ? null : '`estimateUsd` must be an amount'),
  split: (r) => (issueList(r.issues, 2, 5) ? null : '`issues` must be 2 to 5 `{ title, body }`'),
  routed: (r) => {
    if (!['direct', 'lean', 'full'].includes(r.route)) return '`route` must be direct, lean or full';
    if (!L.MERGES.includes(r.merge)) return '`merge` must be a merge label';
    if (!isUsd(r.estimateUsd)) return '`estimateUsd` must be an amount';
    if (r.route === 'direct' && !isText(r.acceptanceCheck, 2000)) return '`direct` needs an `acceptanceCheck` (CW-27)';
    return null;
  },
  spec: (r) => {
    if (!isText(r.spec, MAX_SPEC) || !isUsd(r.estimateUsd)) return `\`spec\` (at most ${MAX_SPEC} characters) and \`estimateUsd\` are required`;
    if (r.spec.includes(SPEC_START) || r.spec.includes(SPEC_END) || r.spec.includes('<!-- dispatcher-')) return '`spec` must not contain the section or record markers';
    const missing = SPEC_PARTS.filter(([, re]) => !re.test(r.spec)).map(([name]) => name);
    if (missing.length) return `\`spec\` lacks ${missing.join(', ')} (CW-30)`;
    return isText(r.comment) ? null : '`comment` must hold the approval request (CW-34)';
  },
  pushed: (r, n) => {
    if (!isText(r.title, 256) || !isText(r.body)) return '`title` and `body` of the pull request are required';
    const checked = pullBody(r.body, n, null); // CW-50: one issue per pull request
    return checked.ok ? null : checked.error;
  },
  // CW-61: the review states its result per item (D88).
  approve: (r) => itemsError(r) || (r.items.every((i) => i.pass) ? null : '`approve` needs every item to pass; use `changes`'),
  changes: (r) => itemsError(r) || (r.items.some((i) => !i.pass) ? null : '`changes` needs at least one item that fails'),
  recommend: (r) => {
    if (typeof r.merge !== 'boolean') return '`merge` must be true or false';
    if (!isText(r.explanation, 2000)) return '`explanation` is required (CW-65)';
    if (r.merge && !isText(r.classReason, 2000)) return '`classReason` is required to recommend merging (CW-65)';
    return itemsError(r);
  },
  recommendations: (r, n, s) => (issueList(r.issues || [], 0, Number(s.scout && s.scout.issuesPerRun) || 3) ? null : '`issues` has too many entries or a bad one'),
  recorded: (r) => (isText(r.title, 256) && isText(r.body) ? null : '`title` and `body` are required'),
};

// Checks a parsed result against its role. Returns { ok, error }.
function validateResult(role, r, number, settings) {
  const allowed = OUTCOMES[role] || [];
  if (!allowed.includes(r.outcome)) return { ok: false, error: `${code(String(r.outcome))} is not an outcome of the ${role} agent` };
  if (r.comment !== undefined && !(typeof r.comment === 'string' && r.comment.length <= MAX_COMMENT)) return { ok: false, error: '`comment` must be text' };
  if (r.file !== undefined && !issueList(r.file, 0, MAX_FILED)) return { ok: false, error: `\`file\` must be at most ${MAX_FILED} \`{ title, body }\` (CW-7)` };
  // null is "nothing found", as every role's example shows.
  if (r.injection !== undefined && r.injection !== null && typeof r.injection !== 'string') return { ok: false, error: '`injection` must be text or null' };
  if (r.raiseMerge !== undefined) {
    if (!['merge:agent', 'merge:human'].includes(r.raiseMerge)) return { ok: false, error: '`raiseMerge` must be `merge:agent` or `merge:human`' };
    if (!isText(r.raiseReason, 2000)) return { ok: false, error: '`raiseMerge` needs a `raiseReason`' };
  }
  const check = NEEDS[r.outcome];
  const error = check ? check(r, number, settings) : null;
  return error ? { ok: false, error } : { ok: true, error: null };
}

// What the agent identity does on GitHub: the spec in the marked section (CW-8), its
// comment and the issues it opens. Split issues name the issue they come from (CW-21);
// every one is `origin:agent` by author.
function agentActions(role, r, number) {
  const issues = (r.file || []).map((i) => ({ kind: 'file', title: i.title, body: i.body }));
  if (r.outcome === 'split') issues.push(...r.issues.map((i) => ({ kind: 'split', title: i.title, body: `${i.body.trim()}\n\nSplit from #${number}.` })));
  if (r.outcome === 'recommendations') issues.push(...(r.issues || []).map((i) => ({ kind: 'recommendation', title: i.title, body: i.body })));
  const spec = r.outcome === 'spec' ? r.spec.trim() : null;
  const pull = r.outcome === 'pushed' ? { title: r.title.trim(), body: r.body } : null;
  const comment = role === 'review' && REVIEW_OUTCOMES.includes(r.outcome) ? reviewComment(r)
    : typeof r.comment === 'string' && r.comment.trim() ? r.comment : null;
  return { spec, pull, comment, issues };
}

// The review comment the agent identity posts on the issue (D88): the verdict, in the
// workflow document's wording for a recommendation (CW-65), then one row per item (CW-61).
const REVIEW_OUTCOMES = ['approve', 'changes', 'recommend'];
const sentence = (s) => String(s).trim().replace(/[.\s]+$/, '');
const cell = (s) => String(s == null ? '' : s).replace(/\r?\n+/g, ' ').replace(/\|/g, '\\|').trim();
function reviewComment(r) {
  const head = {
    approve: '**Review: approve.** Every item passes.',
    changes: '**Review: changes requested.** Each failed item below needs a fix, or the pull request body says why not.',
    recommend: r.merge
      ? `Recommend merging. Human approval is required because ${sentence(r.classReason || '')}. Recommended because ${sentence(r.explanation || '')}.`
      : `Recommend not merging, because ${sentence(r.explanation || '')}.`,
  }[r.outcome];
  const rows = (r.items || []).map((i) => `| ${cell(i.item)} | ${i.pass ? 'pass' : '**fail**'} | ${cell(i.note)} |`);
  const parts = [head, ['| Item | Result | Note |', '|---|---|---|', ...rows].join('\n')];
  if (typeof r.comment === 'string' && r.comment.trim()) parts.push(r.comment.trim());
  return parts.join('\n\n');
}

const mergeLabel = (labels) => [...L.MERGES].reverse().find((m) => labels.has(m)) || null;

function setOne(plan, group, label) {
  for (const l of group) if (l !== label) plan.removeLabel(l);
  plan.addLabel(label);
}

// CW-67: raise only.
function raiseMerge(plan, to, reason) {
  const now = mergeLabel(plan.labels);
  const next = now ? higher(now, to) : to;
  if (next === now) return;
  setOne(plan, L.MERGES, next);
  plan.say.push(`Raised the merge class to ${code(next)}: ${reason}`);
}

function capOf(route, settings) {
  return settings.caps.perIssueUsd[route];
}

const TRIAGE = {
  duplicate(plan, r) {
    plan.remember({ triage: { outcome: 'duplicate', of: r.of } });
    plan.say.push(`Duplicate of #${r.of}. Closing this issue.`);
    plan.close = 'not_planned';
  },
  'out-of-scope'(plan, r) {
    plan.remember({ triage: { outcome: 'out-of-scope', record: r.record } });
    toNeedsAnswer(plan, 'triage', `it matches the rejection recorded in ${code(r.record)}, and only the owner rejects an issue (CW-25)`, 'Triage found a prior rejection of this request.');
  },
  'over-cap'(plan, r) {
    plan.remember({ triage: { outcome: 'over-cap', estimateUsd: r.estimateUsd } });
    toNeedsAnswer(plan, 'triage', `the estimate of ${usd(r.estimateUsd)} is above the per-issue cap; add \`budget:extend\` or narrow the request`, 'Triage estimates this issue above its cap.');
  },
  split(plan, r, ctx) {
    const made = ctx.created.filter((c) => c.kind === 'split');
    // No retry: a second triage would open the split issues again.
    if (made.length !== r.issues.length) return toNeedsAnswer(plan, 'triage', `only ${made.length} of ${r.issues.length} split issues could be created`, 'The split is incomplete.');
    plan.remember({ triage: { outcome: 'split', into: made.map((c) => c.number) } });
    plan.say.push(`Split into ${made.map((c) => `#${c.number}`).join(', ')}. Closing this issue.`);
    plan.close = 'completed';
    return undefined;
  },
  routed(plan, r, ctx) {
    let route = `route:${r.route}`;
    const before = routeLabel(plan.labels);
    if (before && L.ROUTES.indexOf(before) > L.ROUTES.indexOf(route)) route = before; // the owner's route has more process
    if (route === 'route:direct' && !plan.has(L.ORIGIN.owner)) {
      route = 'route:lean';
      plan.say.push('Not `route:direct`: only an issue the owner wrote can skip approval (CW-22).');
    }
    setOne(plan, L.ROUTES, route);
    const merge = mergeLabel(plan.labels);
    setOne(plan, L.MERGES, merge ? higher(merge, r.merge) : r.merge);
    const name = L.routeOf(route);
    plan.remember({ triage: { outcome: 'routed', route: name, merge: mergeLabel(plan.labels), estimateUsd: r.estimateUsd, ...(name === 'direct' ? { acceptanceCheck: r.acceptanceCheck } : {}) } });
    plan.say.push(`Triage: ${code(route)}, ${code(mergeLabel(plan.labels))}, estimate ${usd(r.estimateUsd)}.`);
    if (name === 'direct') plan.say.push(`Acceptance check: ${r.acceptanceCheck.trim()}`);
    const next = name === 'direct' ? 'ready' : 'refining';
    const cap = capOf(name, ctx.settings);
    if (r.estimateUsd > cap && !plan.has(L.BUDGET_EXTEND)) {
      return toNeedsAnswer(plan, next, `the estimate of ${usd(r.estimateUsd)} is above the ${name} cap of ${usd(cap)}; add \`budget:extend\` or narrow the request`, 'Routed, but over the cap.');
    }
    plan.setState(next);
    return undefined;
  },
};

// The lean route's refine agent (phase 4); the full route's plan agent adds to it (phase 7).
const REFINE = {
  spec(plan, r, ctx) {
    // The session job wrote the spec into the marked section before this runs.
    if (!ctx.created.some((c) => c.kind === 'spec')) return fail(plan, ctx, 'the spec could not be written into the issue body');
    plan.remember({ estimateUsd: r.estimateUsd });
    plan.setState('needs-approval');
    // Raised here, so the approval request names the class that applies; the later call is a no-op.
    if (r.raiseMerge) raiseMerge(plan, r.raiseMerge, r.raiseReason.trim());
    const route = routeLabel(plan.labels);
    const merge = mergeLabel(plan.labels);
    plan.say.push(`The spec is in this issue's marked section: route ${route ? code(route) : '(none)'}, merge class ${merge ? code(merge) : '(none)'}, estimate ${usd(r.estimateUsd)}. Add \`approved\` to build it as it stands now, or comment to have it revised (CW-34).`);
    const cap = route ? capOf(L.routeOf(route), ctx.settings) : undefined;
    if (Number.isFinite(cap) && r.estimateUsd > cap && !plan.has(L.BUDGET_EXTEND)) {
      plan.say.push(`The estimate is above the ${L.routeOf(route)} cap of ${usd(cap)}, so it starts only with \`budget:extend\` as well (Definition of Ready, item 7).`);
    }
    return undefined;
  },
};
// The implement agent (phase 5). The session job opened or updated the pull request from
// the issue's branch as the agent identity before this runs (D52, CW-55).
const IMPLEMENT = {
  pushed(plan, r, ctx) {
    const pull = ctx.created.find((c) => c.kind === 'pull');
    if (!pull) return fail(plan, ctx, 'the pull request could not be opened or updated');
    plan.remember({ pull: { number: pull.number, sha: pull.headSha || null } });
    plan.setState('in-review');
    plan.say.push(`Pull request #${pull.number} ${pull.reused ? 'is updated' : 'is open'}: \`in-review\`.`);
    return undefined;
  },
  // CW-53: the spec is wrong or incomplete, so it goes back to refinement without approval.
  'spec-wrong'(plan) {
    plan.removeLabel(L.APPROVED);
    plan.remember({ approvedSpec: null });
    plan.setState('refining');
    plan.say.push('The implement agent found the spec wrong or incomplete (its comment says why): back to `refining` without `approved` (CW-53).');
  },
};

// The review agent (phase 6). Its verdict is recorded for the head commit it saw (D87);
// `merge-gate` reads `review` from the record (CW-64). The class that counts is the label
// after the agent's own raise (CW-67), and a verdict the class doesn't allow goes to the
// owner, recording nothing that could pass the gate (D89).
function reviewed(plan, r, ctx, verdict) {
  const pull = ctx.pull;
  if (!pull || !pull.headSha) return fail(plan, ctx, 'the pull request it reviewed is unknown');
  if (r.raiseMerge) raiseMerge(plan, r.raiseMerge, r.raiseReason.trim());
  const cls = mergeLabel(plan.labels);
  const at = `#${pull.number} at ${pull.headSha.slice(0, 7)}`;
  const wrong = (why) => toNeedsAnswer(plan, 'in-review', why, `The review of ${at} doesn't fit the merge class.`);
  if (verdict === 'approved' && cls !== 'merge:agent') {
    return wrong(`the review agent approved, but the issue is ${cls ? code(cls) : 'without a merge class'}; only \`merge:agent\` is approved by an agent (CW-64, CW-65)`);
  }
  if (verdict.startsWith('recommend') && cls !== 'merge:human') {
    return wrong(`the review agent recommended instead of approving or asking for changes, but the issue is ${cls ? code(cls) : 'without a merge class'} (CW-65)`);
  }
  // A verdict that fits is final for this head commit: the next review waits for a push.
  plan.remember({ reviewedSha: pull.headSha, review: { pull: pull.number, sha: pull.headSha, verdict } });
  if (verdict === 'changes') {
    const failed = r.items.filter((i) => i.pass === false).length;
    return reviewRound(plan, ctx.record, ctx.settings, `the review asked for changes to ${at}, ${failed} item${failed === 1 ? '' : 's'} failed (its comment lists them)`);
  }
  plan.remember({ reviewRounds: null });
  if (verdict === 'approved') plan.say.push(`The review agent approved ${at} (CW-64). The agent merges it when \`ci\` and \`merge-gate\` are green.`);
  else plan.say.push(`The review agent ${verdict === 'recommend-merge' ? 'recommends merging' : 'recommends not merging'} ${at}; it is \`merge:human\`, so the owner decides (CW-65).`);
  return undefined;
}
const REVIEW = {
  approve: (plan, r, ctx) => reviewed(plan, r, ctx, 'approved'),
  changes: (plan, r, ctx) => reviewed(plan, r, ctx, 'changes'),
  recommend: (plan, r, ctx) => reviewed(plan, r, ctx, r.merge ? 'recommend-merge' : 'recommend-not'),
};
const HANDLERS = { triage: TRIAGE, refine: REFINE, implement: IMPLEMENT, review: REVIEW };

const SHARED = {
  questions(plan, r, ctx) {
    toNeedsAnswer(plan, ctx.state, `the ${ctx.role} agent asked questions (see its comment)`, `The ${ctx.role} agent needs answers.`);
  },
  objection(plan, r, ctx) {
    plan.addLabel(L.OBJECTION);
    toNeedsAnswer(plan, ctx.state, `the ${ctx.role} agent objects; add \`approved\` to go on anyway, or comment`, `The ${ctx.role} agent objects (CW-24).`);
  },
};

// CW-16: the issue keeps its state; one retry, then the owner.
function fail(plan, ctx, error) {
  const failures = Number(ctx.record.failures || 0) + 1;
  plan.say.push(`The ${ctx.role} session failed: ${error}.`);
  if (failures > RETRIES) {
    plan.remember({ failures: null });
    toNeedsAnswer(plan, ctx.state, `the ${ctx.role} session failed ${failures} times`, 'Not retrying again.');
  } else {
    plan.remember({ failures });
    plan.say.push('Retrying once.');
  }
}

// CW-87, CW-82: what reaching the hard limit means for the role.
function budgetReached(plan, ctx) {
  if (ctx.role === 'triage') {
    return toNeedsAnswer(plan, 'triage', 'the triage reached its per-run cap (CW-87)', 'Triage stopped at its cap.');
  }
  plan.addLabel(L.PAUSED);
  plan.say.push(`Paused at the cap: this issue has cost ${usd(ctx.spentUsd)} so far. Add \`budget:extend\` to allow one more cap (CW-82).`);
  return undefined;
}

const PHASE_ERRORS = {
  'needs-action': 'it waited for a tool confirmation no one can give',
  timeout: 'it ran past the time limit and was stopped',
  failed: 'it ended with an error',
};

// `session`: { id, link, phase, costUsd, error }; phase is 'done', 'needs-action', 'budget',
// 'failed' or 'timeout'. `text`: its last agent message. `created`: [{ kind, number }]
// the session job opened from agentActions. `stale`: the issue moved on meanwhile.
// `pull`: { number, headSha } of the pull request the session was given (the review).
function dispatcherOutcome({ role, view, record = {}, session, text, created = [], settings, stale = false, pull = null }) {
  const plan = new Plan(view.number, view.labels);
  const state = plan.state;
  const cost = round(Number(session.costUsd || 0));
  // CW-81: triage runs on its own per-run cap; the issue's cap counts from refinement on.
  const spentUsd = role === 'triage' ? Number(record.spentUsd || 0) : round(Number(record.spentUsd || 0) + cost);
  plan.remember({ totalUsd: round(Number(record.totalUsd || 0) + cost), ...(role === 'triage' ? {} : { spentUsd }) });
  const ctx = { role, state, record, created, settings, spentUsd, pull };

  const parsed = parseResult(text);
  const checked = parsed.ok ? validateResult(role, parsed.result, view.number, settings) : parsed;
  // The session's end is authoritative: a result block written before a budget stop or a
  // timeout is not acted on (publishable() in the session job holds the same rule).
  const r = checked.ok && session.phase === 'done' ? parsed.result : null;
  const outcome = r ? r.outcome : session.running ? 'not confirmed stopped' : session.phase === 'budget' ? 'budget reached' : 'failed';
  // CW-102: every session links its record and cost on the issue.
  if (session.id) plan.say.push(`The ${role} session [${session.id}](${session.link}) ended: ${outcome}. It cost ${usd(cost)}.`);
  else plan.say.push(`The ${role} session did not start.`);

  if (stale) {
    plan.say.push('The issue moved on while the session ran, so its result is not applied.');
    return { plan, result: r };
  }
  if (r && r.injection && r.injection.trim()) {
    plan.say.push(`The agent found an instruction in this issue's content and did not follow it (CW-92):\n\n${fence(r.injection.trim())}`);
  }
  const filed = created.filter((c) => c.kind === 'file');
  if (filed.length) {
    plan.say.push(`Filed ${filed.map((c) => `#${c.number}`).join(', ')} for things outside this issue (CW-7).`);
    // CW-69: the closing comment lists them.
    plan.remember({ filed: [...(record.filed || []), ...filed.map((c) => c.number)] });
  }

  if (session.running) {
    // The platform still reports it running: a retry could run a second paid session.
    toNeedsAnswer(plan, state, `the ${role} session could not be confirmed stopped; check it at its link and stop it there`, `The ${role} session may still be running.`);
  } else if (r) {
    if (record.failures) plan.remember({ failures: null });
    // A new triage result replaces the old route's estimate (DoR item 7).
    if (role === 'triage' && record.estimateUsd !== undefined) plan.remember({ estimateUsd: null });
    const handler = (HANDLERS[role] && HANDLERS[role][r.outcome]) || SHARED[r.outcome];
    // Later phases add the other roles' outcomes; until then the owner decides.
    if (handler) handler(plan, r, ctx);
    else toNeedsAnswer(plan, state, `the dispatcher can't act on the ${role} outcome ${code(r.outcome)} yet`, 'Not built yet.');
    if (r.raiseMerge && !plan.close) raiseMerge(plan, r.raiseMerge, r.raiseReason.trim());
  } else if (session.phase === 'budget') {
    budgetReached(plan, ctx);
  } else {
    const why = session.error || (session.phase === 'done' ? checked.error : PHASE_ERRORS[session.phase] || checked.error);
    fail(plan, ctx, why);
  }
  return { plan, result: r };
}

module.exports = { parseResult, validateResult, agentActions, dispatcherOutcome, scrubSecrets, reviewComment, OUTCOMES };
