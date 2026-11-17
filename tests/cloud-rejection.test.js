// Phase 10: the record of the owner's rejection in `.out-of-scope/` (CW-43), from the close
// to the agent's merge of the record pull request. Decision layer and the merge job.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const req = (p) => require(path.join(__dirname, '..', 'cloud/dispatcher', p));
const { recordBranch, ownerCloses, pendingRejection, isRecordPull, recordConfirmed, recordClass } = req('decide/rejection.js');
const { decideIssue, decideAll, readFacts } = req('decide/index.js');
const { dispatcherOutcome, validateResult, agentActions } = req('decide/outcome.js');
const { stoppedPlan } = req('decide/control.js');
const { judgePull } = req('decide/merge-gate.js');
const { mergeVerdict } = req('decide/merge.js');
const { runMerge } = req('merge-cli.js');
const { formatRecord, readRecord } = req('decide/markers.js');

const OWNER = 'owner';
const AGENT = 'agents[bot]';
const BOT = 'github-actions[bot]';
const settings = {
  owner: OWNER,
  agentLogin: AGENT,
  dispatcherLogin: BOT,
  mode: 'live',
  caps: { monthlyUsd: 100, perIssueUsd: { direct: 2, lean: 8, full: 25 }, perRunUsd: { triage: 1, scout: 5 } },
  platform: { sessionLink: 'https://platform.example/sessions/{id}', sessionTimeoutMinutes: 330 },
  parallelImplementations: 2,
  reviewRounds: 3,
  warningLevel: 0.8,
  typoSizeLines: 10,
  bigChange: { lines: 400, files: 15 },
};
const ctx = (over = {}) => ({ settings, control: { stopped: false }, running: new Set(), queue: [], ...over });
const rec = (data) => ({ type: 'commented', actor: BOT, body: `Note.\n\n${formatRecord(data)}` });
const closed = (actor = OWNER) => ({ type: 'closed', actor });
const reopened = () => ({ type: 'reopened', actor: OWNER });

// A closed issue the dispatcher took in. `events` follow the record comment.
function view({ record = {}, events = [closed()], reason = 'not_planned', number = 7 } = {}) {
  return {
    number, state: 'closed', stateReason: reason, author: OWNER, body: 'Add a GUI.', labels: [], isPull: false, dependencies: [], pull: null,
    timeline: [rec({ state: 'triage', intake: true, ...record }), ...events],
  };
}
const pending = (v) => pendingRejection(v, readFacts(v, settings), settings);

// ---- which close is recorded -----------------------------------------------------------

test('CW-43: the owner\'s close as not planned of an issue the dispatcher took in asks for a record', () => {
  assert.equal(recordBranch(7), 'cloud/out-of-scope-7');
  assert.deepEqual(pending(view()), { closes: 1 });
  assert.equal(pending(view({ reason: 'completed' })), null);
  assert.equal(pending(view({ events: [closed(AGENT)] })), null);
  assert.equal(pending({ ...view(), state: 'open' }), null);
  // D113: an issue closed before the dispatcher's intake was never part of the workflow.
  const old = view();
  old.timeline = [closed()];
  assert.equal(pending(old), null);
});

test('CW-43: a record made for this close is not asked for again; a later close asks anew', () => {
  assert.equal(pending(view({ record: { rejection: { closes: 1, outcome: 'recorded', pull: 50 } } })), null);
  assert.equal(pending(view({ record: { rejection: { closes: 1, outcome: 'failed' } } })), null);
  const again = view({ record: { rejection: { closes: 1, outcome: 'skipped' } }, events: [closed(), reopened(), closed()] });
  assert.equal(ownerCloses(again, settings), 2);
  assert.deepEqual(pending(again), { closes: 2 });
});

test('CW-43, D114: the dispatcher starts the record agent on the triage per-run cap', () => {
  const plan = decideIssue(view(), ctx());
  assert.deepEqual(plan.start, { role: 'record', limitUsd: 1 });
  assert.equal(decideIssue(view({ reason: 'completed' }), ctx()).start, null);
  assert.equal(decideIssue(view(), ctx({ control: { stopped: true } })).start, null);
  assert.equal(decideIssue(view(), ctx({ running: new Set([7]) })).start, null);
  const all = decideAll([view(), view({ number: 8 })], ctx({ spend: { spentUsd: 0, reservedUsd: 0 } }));
  assert.deepEqual(all.map((p) => p.start && p.start.role), ['record', 'record']);
});

test('CW-43, D116: a lost record session is retried once, then left to the owner with a comment', () => {
  const lost = { session: { role: 'record', limitUsd: 1, at: '2026-11-17T10:00:00Z' } };
  const first = decideIssue(view({ record: lost }), ctx());
  assert.equal(first.start.role, 'record');
  assert.equal(first.record.recordFailures, 1);
  assert.match(first.say.join('\n'), /Retrying once/);

  const second = decideIssue(view({ record: { ...lost, recordFailures: 1 } }), ctx());
  assert.equal(second.start, null);
  assert.deepEqual(second.record.rejection, { closes: 1, outcome: 'failed' });
  assert.match(second.say.join('\n'), /by hand/);
  assert.ok(!second.labels.has('needs-answer'));

  // A request from before the close, which its session job skipped, is no failure.
  const left = decideIssue(view({ record: { session: { role: 'implement', limitUsd: 6, at: 'x' } } }), ctx());
  assert.equal(left.start.role, 'record');
  assert.equal(left.record.recordFailures, undefined);
});

// ---- the record session's result ------------------------------------------------------

const SESSION = { id: 'sesn_9', link: 'https://platform.example/sessions/sesn_9', phase: 'done', costUsd: 0.3 };
const block = (obj) => `\`\`\`agent-result\n${JSON.stringify(obj)}\n\`\`\``;
const RECORDED = { outcome: 'recorded', title: 'docs: record out-of-scope decision for a GUI', body: 'Records the GUI rejection in .out-of-scope/gui.md.' };
const PULL = { kind: 'pull', number: 50, headSha: 'abc', merge: 'merge:self', reasons: [] };
function outcome({ result = RECORDED, text, record = {}, session = SESSION, created = [PULL] } = {}) {
  return dispatcherOutcome({ role: 'record', view: view({ record }), record: { intake: true, ...record }, session, text: text === undefined ? block(result) : text, created, settings }).plan;
}

test('CW-43: the record agent reports a pull request body that closes only its issue', () => {
  assert.equal(validateResult('record', RECORDED, 7, settings).ok, true);
  assert.equal(validateResult('record', { ...RECORDED, body: 'Closes #8' }, 7, settings).ok, false);
  assert.equal(validateResult('record', { outcome: 'recorded', body: 'x' }, 7, settings).ok, false);
  assert.equal(validateResult('record', { outcome: 'pushed', title: 't', body: 'b' }, 7, settings).ok, false);
  assert.deepEqual(agentActions('record', RECORDED).pull, { title: RECORDED.title, body: RECORDED.body });
});

test('CW-43: a confirmed merge:self record is remembered for the merge job; the issue keeps no state', () => {
  const plan = outcome();
  assert.deepEqual(plan.record.rejection, { closes: 1, outcome: 'recorded', pull: 50, sha: 'abc', merge: 'merge:self' });
  assert.equal(plan.record.recordFailures, null);
  assert.match(plan.say.join('\n'), /#50 records this rejection.*The agent merges it/);
  assert.equal(plan.state, null);
  assert.equal(plan.labels.size, 0);
  // D114: a record session counts toward the month, not toward the closed issue's cap.
  assert.equal(plan.record.spentUsd, undefined);
  assert.equal(plan.record.totalUsd, 0.3);
});

test('CW-43, D118: a record that is not merge:self is the owner\'s to merge', () => {
  const plan = outcome({ created: [{ ...PULL, merge: 'merge:agent', reasons: ['README.md is outside `.out-of-scope/`'] }] });
  assert.equal(plan.record.rejection.merge, 'merge:agent');
  assert.match(plan.say.join('\n'), /not `merge:self` \(README\.md is outside/);
  const unchecked = outcome({ created: [{ ...PULL, merge: undefined, reasons: undefined }] });
  assert.equal(unchecked.record.rejection.merge, null);
  assert.match(unchecked.say.join('\n'), /could not be read/);
});

test('CW-43, D116: skipped, questions, a budget stop and failures end in a comment, never needs-answer', () => {
  const skipped = outcome({ result: { outcome: 'skipped', comment: 'This is a bug, not an enhancement.' }, created: [] });
  assert.equal(skipped.record.rejection.outcome, 'skipped');
  const asked = outcome({ result: { outcome: 'questions', comment: 'Which concept is this?' }, created: [] });
  assert.equal(asked.record.rejection.outcome, 'questions');
  assert.match(asked.say.join('\n'), /reopen the issue and close it as not planned again/);
  const budget = outcome({ text: 'stopped', session: { ...SESSION, phase: 'budget' }, created: [] });
  assert.equal(budget.record.rejection.outcome, 'budget');

  const failed = outcome({ text: 'no block', created: [] });
  assert.equal(failed.record.rejection, undefined);
  assert.equal(failed.record.recordFailures, 1);
  assert.match(failed.say.join('\n'), /Retrying once/);
  const twice = outcome({ text: 'no block', created: [], record: { recordFailures: 1 } });
  assert.deepEqual(twice.record.rejection, { closes: 1, outcome: 'failed' });

  const noPull = outcome({ created: [] });
  assert.match(noPull.say.join('\n'), /could not be opened/);
  for (const p of [skipped, asked, budget, failed, twice, noPull]) assert.ok(!p.labels.has('needs-answer'));
});

test('CW-43: a record session the stop switch ended leaves its closed issue without a question', () => {
  const v = view({ record: { session: { role: 'record', limitUsd: 1, at: 'x' } } });
  const facts = readFacts(v, settings);
  const plan = stoppedPlan(v, facts.record, [{ id: 's', link: 'l', costUsd: 0.1, running: false }]);
  assert.equal(plan.record.session, null);
  assert.match(plan.say.join('\n'), /starts the record agent again/);
  assert.ok(!plan.labels.has('needs-answer'));
  assert.match(stoppedPlan(v, facts.record, [], { unchecked: true }).say.join('\n'), /Check the platform/);
});

// ---- the record pull request's class and merge ------------------------------------------

const file = (p, over = {}) => ({ path: p, status: 'added', additions: 20, deletions: 0, executable: false, ...over });

test('D118: a record is merge:self only when every changed path is in .out-of-scope/', () => {
  assert.deepEqual(recordClass([file('.out-of-scope/gui.md')], settings), { mergeClass: 'merge:self', reasons: [] });
  const docs = recordClass([file('.out-of-scope/gui.md'), file('docs/guide.md')], settings);
  assert.equal(docs.mergeClass, 'merge:agent');
  assert.match(docs.reasons.join(), /docs\/guide\.md is outside/);
  const moved = recordClass([file('.out-of-scope/gui.md', { previousPath: 'README.md', status: 'renamed' })], settings);
  assert.equal(moved.mergeClass, 'merge:agent');
  assert.equal(recordClass([file('.github/workflows/ci.yml')], settings).mergeClass, 'merge:human');
});

const recordIssue = (rejection = { closes: 1, outcome: 'recorded', pull: 50, sha: 'abc', merge: 'merge:self' }, over = {}) =>
  ({ number: 7, state: 'closed', labels: [], record: { intake: true, rejection }, ...over });
const recordPr = (over = {}) => ({ number: 50, author: AGENT, draft: false, headSha: 'abc', body: 'Records it.\n\nCloses #7', mergeable: true, mergeableState: 'clean', labels: [], ...over });
const states = (r) => [r['merge-gate'].state, r['owner-merge'].state];

test('CW-43: merge-gate passes a record the dispatcher confirmed at the head commit, and nothing else', () => {
  assert.equal(isRecordPull(recordPr(), recordIssue()), true);
  assert.equal(recordConfirmed(recordPr(), recordIssue()), true);
  assert.deepEqual(states(judgePull({ pr: recordPr(), issue: recordIssue(), settings })), ['success', 'success']);
  // A push after the check, another class, another pull request, a reopened issue.
  assert.deepEqual(states(judgePull({ pr: recordPr({ headSha: 'def' }), issue: recordIssue(), settings })), ['success', 'pending']);
  assert.deepEqual(states(judgePull({ pr: recordPr(), issue: recordIssue({ closes: 1, outcome: 'recorded', pull: 50, sha: 'abc', merge: 'merge:agent' }), settings })), ['success', 'pending']);
  assert.deepEqual(states(judgePull({ pr: recordPr({ number: 51 }), issue: recordIssue(), settings })), ['success', 'pending']);
  assert.deepEqual(states(judgePull({ pr: recordPr(), issue: recordIssue(undefined, { state: 'open', labels: ['triage'] }), settings })), ['success', 'pending']);
  assert.deepEqual(states(judgePull({ pr: recordPr({ author: OWNER }), issue: recordIssue(), settings })), ['success', 'pending']);
});

const green = { checkRuns: [{ id: 1, name: 'ci', status: 'completed', conclusion: 'success' }], statuses: [{ context: 'merge-gate', state: 'success' }, { context: 'owner-merge', state: 'success' }] };
const verdict = (over = {}) => mergeVerdict({ pr: recordPr(), issue: recordIssue(), ...green, settings, ...over });

test('CW-43: the merge job merges a confirmed record of a closed issue, with the usual checks', () => {
  assert.deepEqual(verdict(), { action: 'merge', mergeClass: 'merge:self', record: true });
  assert.equal(verdict({ pr: recordPr({ headSha: 'def' }) }).action, 'skip');
  assert.equal(verdict({ pr: recordPr({ labels: ['merge:human'] }) }).action, 'skip');
  assert.equal(verdict({ stopped: true }).action, 'wait');
  assert.equal(verdict({ pr: recordPr({ draft: true }) }).action, 'wait');
  assert.equal(verdict({ checkRuns: [] }).action, 'wait');
  assert.equal(verdict({ statuses: [green.statuses[0]] }).action, 'regate');
  // No agent takes a closed issue's conflict back.
  const conflict = verdict({ pr: recordPr({ mergeable: false, mergeableState: 'dirty' }) });
  assert.equal(conflict.action, 'skip');
  assert.match(conflict.why, /only the owner resolves it/);
});

function fakeRepo({ rejection } = {}) {
  const writes = [];
  const raw = { number: 50, title: 'Record the GUI rejection', user: { login: AGENT }, draft: false, head: { sha: 'abc' }, body: 'Records it.\n\nCloses #7', mergeable: true, mergeable_state: 'clean', labels: [] };
  const gh = {
    repo: 'o/r',
    request: async (method, p, body) => {
      if (method === 'GET') {
        if (p === '/repos/o/r/pulls/50') return raw;
        if (p === '/repos/o/r/issues/7') return { number: 7, state: 'closed', labels: [] };
        if (p.endsWith('/check-runs?per_page=100')) return { check_runs: green.checkRuns };
        if (p.endsWith('/status')) return { statuses: green.statuses };
        throw Object.assign(new Error(`unexpected GET ${p}`), { status: 404 });
      }
      writes.push({ who: 'gh', method, path: p, body });
      return {};
    },
    paginate: async (p) => {
      if (p.endsWith('/pulls?state=open')) return [raw];
      if (p.endsWith('/issues/7/comments')) return [{ user: { login: BOT }, body: `Recorded.\n\n${formatRecord({ intake: true, totalUsd: 0.3, rejection: rejection || { closes: 1, outcome: 'recorded', pull: 50, sha: 'abc', merge: 'merge:self' } })}` }];
      throw new Error(`unexpected paginate ${p}`);
    },
  };
  const agent = {
    repo: 'o/r',
    request: async (method, p, body) => {
      writes.push({ who: 'agent', method, path: p, body });
      return method === 'PUT' ? { sha: 'merge987654', merged: true } : {};
    },
  };
  const deps = { gh, settings, live: true, now: () => new Date('2026-11-17T10:00:00Z'), log: () => {}, mint: async () => 'ghs_x', agentClient: async () => agent };
  return { deps, writes };
}

test('CW-43: the agent merges the record; the dispatcher notes it on the closed issue without a closing comment', async () => {
  const { deps, writes } = fakeRepo();
  assert.deepEqual(await runMerge(deps), [{ number: 50, action: 'merge', why: 'merge:self' }]);
  const put = writes.find((w) => w.method === 'PUT');
  assert.deepEqual([put.who, put.path, put.body], ['agent', '/repos/o/r/pulls/50/merge', { sha: 'abc', merge_method: 'merge' }]);
  assert.ok(!writes.some((w) => w.who === 'agent' && w.method === 'POST'));
  const note = writes.find((w) => w.who === 'gh' && w.path.endsWith('/issues/7/comments'));
  assert.match(note.body.body, /The agent merged #50, the record of this rejection in `\.out-of-scope\/`, at merge98/);
  const { record } = readRecord([{ type: 'commented', actor: BOT, body: note.body.body }], settings);
  assert.deepEqual(record.rejection.merged, { sha: 'merge987654', at: '2026-11-17T10:00:00.000Z' });
  assert.equal(record.rejection.pull, 50);
  assert.equal(record.merged, undefined);
  // The issue is closed already: no label, state or close request.
  assert.ok(!writes.some((w) => w.method === 'PATCH' || w.path.endsWith('/labels')));
});

test('CW-43: an unconfirmed record is never merged by the agent', async () => {
  const { deps, writes } = fakeRepo({ rejection: { closes: 1, outcome: 'recorded', pull: 50, sha: 'abc', merge: 'merge:agent' } });
  assert.equal((await runMerge(deps))[0].action, 'skip');
  assert.equal(writes.length, 0);
});
