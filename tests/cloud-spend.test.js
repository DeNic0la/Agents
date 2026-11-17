// Tests for the spend controls (phase 8): the issue cap with `budget:extend`, the month's
// ledger and reserve, and the owner's stop switch. Test names start with the requirement
// they check (docs/specs/cloud-development-workflow.md).
// Run: node --test "tests/*.test.js"
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const root = path.join(__dirname, '..');
const req = (p) => require(path.join(root, 'cloud/dispatcher', p));
const { decideIssue, decideAll } = req('decide/index.js');
const { formatRecord } = req('decide/markers.js');
const { digest, SPEC_START, SPEC_END } = req('decide/spec.js');
const { checkReady, startableQueue } = req('decide/ready.js');
const { issueCap, costRecord, monthStart, monthSpend, monthStatus } = req('decide/spend.js');
const { sessionsFor, stoppedPlan } = req('decide/control.js');
const { dispatcherOutcome } = req('decide/outcome.js');
const { reservedUsd } = req('cli.js');
const { stopAll, resumeAll, summary } = req('control-cli.js');
const { STOPPABLE_WORKFLOWS } = req('github/actions.js');

const OWNER = 'owner';
const BOT = 'github-actions[bot]';
const settings = {
  owner: OWNER,
  agentLogin: 'agent[bot]',
  dispatcherLogin: BOT,
  mode: 'live',
  caps: { monthlyUsd: 100, perIssueUsd: { direct: 2, lean: 8, full: 25 }, perRunUsd: { triage: 1, scout: 5 } },
  platform: { sessionLink: 'https://platform.example/sessions/{id}', sessionTimeoutMinutes: 330 },
  parallelImplementations: 2,
  reviewRounds: 3,
  warningLevel: 0.8,
};

const ev = {
  label: (label, actor = BOT) => ({ type: 'labeled', label, actor }),
  record: (data) => ({ type: 'commented', actor: BOT, body: `Note.\n\n${formatRecord(data)}` }),
};
const ASK = 'Add a --dry-run flag to bin/agents sync.';
const SPEC = 'Goal: preview a sync.';
const BODY = `${ASK}\n\n${SPEC_START}\n${SPEC}\n${SPEC_END}`;
const TRIAGED = { triage: { estimateUsd: 3 }, ask: digest(ASK) };

function view({ number = 1, labels, record = {}, extra = [] }) {
  return {
    number, state: 'open', author: OWNER, body: BODY, labels, isPull: false, dependencies: [], pull: null,
    timeline: [...labels.map((l) => ev.label(l, ['approved', 'budget:extend'].includes(l) ? OWNER : BOT)), ev.record({ ...TRIAGED, approvedSpec: digest(SPEC), ...record }), ...extra],
  };
}
const ctx = (over = {}) => ({ settings, control: { stopped: false }, running: new Set(), queue: [], ...over });
const BUILDING = ['origin:owner', 'route:lean', 'merge:agent', 'approved', 'in-progress'];

// ---- CW-82: the issue cap and budget:extend ---------------------------------------

test('CW-82: an extension raises the issue cap by one cap each', () => {
  assert.equal(issueCap('lean', {}, settings), 8);
  assert.equal(issueCap('lean', { extensions: 2 }, settings), 24);
});

test('CW-82: a paused issue starts nothing and says budget:extend continues it', () => {
  const p = decideIssue(view({ labels: [...BUILDING, 'paused'], record: { state: 'in-progress', spentUsd: 8 } }), ctx());
  assert.equal(p.start, null);
  assert.match(p.notes.join(' '), /paused.*budget:extend/);
});

test('CW-82, scenario 9: budget:extend on a paused issue removes both labels and restarts the agent with one more cap', () => {
  const p = decideIssue(view({ labels: [...BUILDING, 'paused', 'budget:extend'], record: { state: 'in-progress', spentUsd: 8.1 } }), ctx());
  assert.deepEqual(p.remove.sort(), ['budget:extend', 'paused']);
  assert.equal(p.record.extensions, 1);
  assert.deepEqual(p.start, { role: 'implement', limitUsd: 7.9 });
  assert.match(p.say.join('\n'), /Used `budget:extend` and removed `paused`: this issue may now spend 2 caps of \$16\.00 in all \(CW-82\)/);
});

test('CW-82, scenario 9: the full sequence: over the cap, extended, paused again, extended again', () => {
  // 1. The estimate is above the lean cap: Definition of Ready item 7 fails without the label.
  const over = { state: 'ready', estimateUsd: 12 };
  const ready = ['origin:owner', 'route:lean', 'merge:agent', 'approved', 'ready'];
  const held = decideIssue(view({ labels: ready, record: over }), ctx({ queue: [1] }));
  assert.equal(held.start, null);
  assert.match(held.say.join('\n'), /item 7 fails/);
  // 2. With budget:extend it starts, and the extension is used at once.
  const extended = decideIssue(view({ labels: [...ready, 'budget:extend'], record: over }), ctx({ queue: [1] }));
  assert.deepEqual(extended.start, { role: 'implement', limitUsd: 16 });
  assert.equal(extended.record.extensions, 1);
  assert.ok(extended.remove.includes('budget:extend'));
  // 3. The estimate stays covered by the extension already used (no new label needed).
  assert.deepEqual(checkReady({ labels: ready, record: { ...TRIAGED, ...over, extensions: 1 } }, settings).failing, []);
  // 4. It reaches the doubled cap: paused (the session job's outcome).
  const { plan: paused } = dispatcherOutcome({
    role: 'implement', view: { number: 1, labels: [...BUILDING] }, record: { ...TRIAGED, ...over, state: 'in-progress', extensions: 1, spentUsd: 0 },
    session: { id: 's1', link: 'l', phase: 'budget', costUsd: 16 }, text: '', settings,
  });
  assert.ok(paused.add.includes('paused'));
  assert.equal(paused.record.spentUsd, 16);
  // 5. Extended again: one more cap, the agent restarts with what is left of it.
  const again = decideIssue(view({ labels: [...BUILDING, 'paused', 'budget:extend'], record: { ...over, state: 'in-progress', extensions: 1, spentUsd: 16 } }), ctx());
  assert.equal(again.record.extensions, 2);
  assert.deepEqual(again.start, { role: 'implement', limitUsd: 8 });
});

test('CW-82: budget:extend waits while the stop switch is on, and triage never uses it', () => {
  const stopped = decideIssue(view({ labels: [...BUILDING, 'paused', 'budget:extend'], record: { state: 'in-progress', spentUsd: 8 } }), ctx({ control: { stopped: true } }));
  assert.equal(stopped.start, null);
  assert.deepEqual(stopped.remove, []);
  const triage = decideIssue(view({ labels: ['origin:owner', 'triage', 'budget:extend'], record: { state: 'triage' } }), ctx());
  assert.equal(triage.start.role, 'triage');
  assert.equal(triage.record.extensions, undefined);
  assert.ok(!triage.remove.includes('budget:extend'));
});

test('CW-82: a paused ready issue with budget:extend may take a slot', () => {
  const issue = (labels) => ({ number: 4, labels: ['origin:owner', 'route:lean', 'merge:agent', 'approved', 'ready', ...labels], record: TRIAGED, dependencies: [] });
  assert.deepEqual(startableQueue([issue(['paused'])], 0, settings), []);
  assert.deepEqual(startableQueue([issue(['paused', 'budget:extend'])], 0, settings), [4]);
});

// ---- CW-83, CW-85, CW-86: the month ------------------------------------------------

test('CW-85: every session adds one ledger entry to its issue record; triage does not count toward the issue cap', () => {
  assert.deepEqual(costRecord({ totalUsd: 1, spentUsd: 2 }, 'implement', 0.456), { sessionCostUsd: 0.46, totalUsd: 1.46, spentUsd: 2.46 });
  assert.deepEqual(costRecord({ totalUsd: 1 }, 'triage', 0.5), { sessionCostUsd: 0.5, totalUsd: 1.5 });
  const { plan } = dispatcherOutcome({ role: 'review', view: { number: 1, labels: ['in-review'] }, record: {}, session: { id: null, phase: 'failed', costUsd: 0 }, text: '', settings });
  assert.equal(plan.record.sessionCostUsd, 0);
});

test('CW-83, CW-85: the month spend sums the dispatcher\'s ledger entries created this month (UTC), nothing else', () => {
  const now = Date.parse('2026-11-17T12:00:00Z');
  const c = (login, created, data) => ({ user: { login }, created_at: created, body: `x\n\n${formatRecord(data)}` });
  const comments = [
    c(BOT, '2026-11-01T00:00:00Z', { sessionCostUsd: 1.25, totalUsd: 1.25 }),
    c(BOT, '2026-11-10T08:00:00Z', { sessionCostUsd: 2.5, totalUsd: 9 }),
    c(BOT, '2026-10-31T23:59:59Z', { sessionCostUsd: 50 }), // last month, updated this month
    c('someone', '2026-11-11T00:00:00Z', { sessionCostUsd: 40 }), // a forged record
    c(BOT, '2026-11-12T00:00:00Z', { totalUsd: 3 }), // no session in it
  ];
  assert.equal(monthStart(now), '2026-11-01T00:00:00.000Z');
  assert.deepEqual(monthSpend(comments, settings, now), { monthUsd: 3.75, sessions: 2 });
});

test('CW-86: the warning level and the cap', () => {
  assert.deepEqual(monthStatus(79.99, settings), { monthUsd: 79.99, capUsd: 100, leftUsd: 20.01, reached: false, warning: false });
  assert.equal(monthStatus(80, settings).warning, true);
  assert.equal(monthStatus(100, settings).reached, true);
});

test('CW-83, scenario 10: at the monthly cap nothing starts and the labels stay', () => {
  const p = decideIssue(view({ labels: ['origin:owner', 'triage'], record: { state: 'triage' } }), ctx({ spend: { monthUsd: 100, reservedUsd: 0 } }));
  assert.equal(p.start, null);
  assert.deepEqual([p.add, p.remove], [[], []]);
  assert.match(p.notes.join(' '), /monthly cap of \$100\.00 is reached/);
  // What running sessions may still spend counts as spent.
  const reserved = decideIssue(view({ labels: ['origin:owner', 'triage'], record: { state: 'triage' } }), ctx({ spend: { monthUsd: 90, reservedUsd: 10 } }));
  assert.equal(reserved.start, null);
  // The turn of the month (or a raised cap) starts it again on the next run.
  const fresh = decideIssue(view({ labels: ['origin:owner', 'triage'], record: { state: 'triage' } }), ctx({ spend: { monthUsd: 0, reservedUsd: 0 } }));
  assert.deepEqual(fresh.start, { role: 'triage', limitUsd: 1 });
});

test('CW-83: the sessions one run starts reserve their limits, lowest issue number first', () => {
  const issue = (number) => view({ number, labels: ['origin:owner', 'route:lean', 'merge:agent', 'approved', 'ready'], record: { state: 'ready' } });
  const plans = decideAll([issue(3), issue(2)], ctx({ spend: { monthUsd: 88, reservedUsd: 0 } }));
  assert.deepEqual(plans.map((p) => [p.number, p.start && p.start.limitUsd]), [[2, 8], [3, 4]]);
});

test('CW-83: the reserve is the hard limit of every running session, inside and outside the run', () => {
  const v = (number, session) => ({ number, timeline: [ev.record(session ? { session } : { state: 'triage' })] });
  const views = [v(1, { role: 'implement', limitUsd: 6.5, at: 'x' }), v(2, { role: 'triage', limitUsd: 1, at: 'x' }), v(3)];
  assert.equal(reservedUsd(views, new Set([1, 3]), [v(9, { role: 'review', limitUsd: 2.25, at: 'x' })], settings), 8.75);
});

// ---- CW-84: the stop switch ------------------------------------------------------

test('CW-84: the stop matches platform sessions to the issue\'s open request by issue, role and time', () => {
  const request = { role: 'implement', limitUsd: 8, at: '2026-11-17T10:00:00Z' };
  const sessions = [
    { id: 'a', issue: '5', role: 'implement', createdAt: '2026-11-17T10:01:00Z' },
    { id: 'b', issue: '5', role: 'implement', createdAt: '2026-11-17T08:00:00Z' }, // an earlier session, already recorded
    { id: 'c', issue: '5', role: 'review', createdAt: '2026-11-17T10:01:00Z' },
    { id: 'd', issue: '6', role: 'implement', createdAt: '2026-11-17T10:01:00Z' },
  ];
  assert.deepEqual(sessionsFor(5, request, sessions).map((s) => s.id), ['a']);
});

test('CW-84, CW-85: the stopped issue records the cost and clears the request, so resuming counts no failure', () => {
  const v = { number: 5, labels: ['in-progress', 'route:lean'] };
  const record = { totalUsd: 2, spentUsd: 2, session: { role: 'implement', limitUsd: 6, at: 'x' } };
  const plan = stoppedPlan(v, record, [{ id: 's1', link: 'L', costUsd: 1.5, running: false }]);
  assert.deepEqual(plan.record, { sessionCostUsd: 1.5, totalUsd: 3.5, spentUsd: 3.5, session: null });
  assert.deepEqual([plan.add, plan.remove], [[], []]);
  assert.match(plan.say.join('\n'), /stop switch ended the implement session \[s1\]\(L\)\. It cost \$1\.50/);
  const before = stoppedPlan(v, record, []);
  assert.match(before.say.join('\n'), /before its session started/);
  assert.equal(before.record.sessionCostUsd, 0);
  const stuck = stoppedPlan(v, record, [{ id: 's2', link: 'L2', costUsd: 3, running: true }]);
  assert.match(stuck.say.join('\n'), /could not be confirmed stopped/);
});

// A GitHub fake for the stop: one open issue (#5) with an open implement request.
function fakeGitHub({ request = { role: 'implement', limitUsd: 6, at: '2026-11-17T10:00:00Z' }, runs = [] } = {}) {
  const calls = [];
  const labels = ['origin:owner', 'route:lean', 'merge:agent', 'in-progress'];
  const issue = { number: 5, title: 'Flag', state: 'open', user: { login: OWNER }, body: ASK, labels: labels.map((name) => ({ name })) };
  const quiet = { number: 6, title: 'Idea', state: 'open', user: { login: OWNER }, body: 'x', labels: [] };
  const timeline = [...labels.map((l) => ({ event: 'labeled', actor: { login: BOT }, label: { name: l } })),
    { event: 'commented', actor: { login: BOT }, body: `Started.\n\n${formatRecord({ state: 'in-progress', totalUsd: 1, spentUsd: 1, session: request })}` }];
  const gh = {
    repo: 'o/r',
    calls,
    request: async (method, p, body) => {
      calls.push([method, p, body]);
      if (method === 'GET' && p === '/repos/o/r/issues/5') return issue;
      if (method === 'GET' && p.includes('/runs?status=queued') && p.includes('session.yml')) return { workflow_runs: runs };
      if (method === 'GET' && p.includes('/runs?status=')) return { workflow_runs: [] };
      if (method === 'GET' && /\/actions\/runs\/\d+$/.test(p)) return { status: 'completed' };
      if (method === 'GET') throw Object.assign(new Error(`unexpected GET ${p}`), { status: 404 });
      return {};
    },
    paginate: async (p) => {
      if (p.includes('/issues?state=open')) return [issue, quiet];
      if (p.endsWith('/issues/5/timeline')) return timeline;
      if (p.includes('/dependencies/')) return [];
      throw new Error(`unexpected paginate ${p}`);
    },
  };
  return gh;
}

function fakePlatform() {
  const log = { interrupts: [] };
  const state = {
    s_run: { id: 's_run', status: 'running', metadata: { issue: '5', role: 'implement' }, created_at: '2026-11-17T10:01:00Z', usage: { list_cost: { amount: '120' } } },
    s_other: { id: 's_other', status: 'running', metadata: {}, created_at: '2026-11-17T10:30:00Z', usage: { list_cost: { amount: '10' } } },
  };
  return {
    log,
    listAgents: async () => [{ id: 'ag_impl', name: 'agents-implement' }, { id: 'ag_tri', name: 'agents-triage' }, { id: 'ag_x', name: 'someone-else' }],
    listSessions: async ({ agentId }) => (agentId === 'ag_impl' ? [state.s_run, state.s_other] : []),
    interrupt: async (id) => {
      log.interrupts.push(id);
      state[id] = { ...state[id], status: 'idle', stop_reason: { type: 'end_turn' }, usage: { list_cost: { amount: id === 's_run' ? '150' : '10' } } };
    },
    getSession: async (id) => state[id],
  };
}

test('CW-84, scenario 10: stop turns off the workflows, cancels their runs, interrupts every session and records the cost', async () => {
  const gh = fakeGitHub({ runs: [{ id: 77, display_title: 'session #5 implement' }] });
  const platform = fakePlatform();
  let t = Date.parse('2026-11-17T11:00:00Z');
  const report = await stopAll({ gh, platform, settings, now: () => t, sleep: async (ms) => { t += ms; }, log: () => {} });
  const writes = gh.calls.filter(([m]) => m !== 'GET');
  assert.deepEqual(writes.filter(([m]) => m === 'PUT').map(([, p]) => p), STOPPABLE_WORKFLOWS.map((w) => `/repos/o/r/actions/workflows/${w}/disable`));
  assert.ok(writes.some(([m, p]) => m === 'POST' && p === '/repos/o/r/actions/runs/77/cancel'));
  assert.deepEqual(platform.log.interrupts.sort(), ['s_other', 's_run']);
  const comment = writes.find(([m, p]) => m === 'POST' && p === '/repos/o/r/issues/5/comments');
  assert.match(comment[2].body, /ended the implement session \[s_run\]\(https:\/\/platform\.example\/sessions\/s_run\)\. It cost \$1\.50/);
  assert.match(comment[2].body, /"sessionCostUsd":1\.5,"totalUsd":2\.5,"spentUsd":2\.5,"session":null/);
  assert.deepEqual(report.issues, [5]);
  assert.deepEqual(report.unmatched, ['s_other']);
  assert.equal(report.interrupted, 2);
  assert.match(summary('stop', report), /Stopped: disabled dispatch\.yml, session\.yml, merge\.yml; cancelled 1 run\(s\); interrupted 2 session\(s\)\.\nRecorded on: #5\.\nInterrupted sessions no issue accounts for: s_other\./);
});

test('CW-84: without the platform key the stop still turns everything off and clears the requests', async () => {
  const gh = fakeGitHub();
  const lines = [];
  const report = await stopAll({ gh, platform: null, settings, now: () => 0, sleep: async () => {}, log: (l) => lines.push(l) });
  assert.equal(report.disabled.length, STOPPABLE_WORKFLOWS.length);
  assert.deepEqual(report.issues, [5]);
  assert.ok(lines.some((l) => /ANTHROPIC_API_KEY is not set/.test(l)));
});

test('CW-84: resume turns the workflows on and starts a full reconcile', async () => {
  const gh = fakeGitHub();
  const lines = [];
  const report = await resumeAll({ gh, ref: 'main', stoppedVariable: true, log: (l) => lines.push(l) });
  const writes = gh.calls.filter(([m]) => m !== 'GET');
  assert.deepEqual(writes.slice(0, 3).map(([, p]) => p), STOPPABLE_WORKFLOWS.map((w) => `/repos/o/r/actions/workflows/${w}/enable`));
  assert.deepEqual(writes[3], ['POST', '/repos/o/r/actions/workflows/dispatch.yml/dispatches', { ref: 'main', inputs: {} }]);
  assert.deepEqual(report.failed, []);
  assert.ok(lines.some((l) => /CLOUD_STOPPED is still `true`/.test(l)));
});
