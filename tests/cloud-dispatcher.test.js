// Tests for the dispatcher's decision rules (cloud/dispatcher/decide) and its GitHub
// mapping. Test names start with the requirement they check (docs/specs/cloud-development-workflow.md).
// Run: node --test "tests/*.test.js"
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const req = (p) => require(path.join(root, 'cloud/dispatcher', p));
const { decideIssue, decideAll } = req('decide/index.js');
const { formatRecord } = req('decide/markers.js');
const { digest, SPEC_START, SPEC_END } = req('decide/spec.js');
const { startableQueue, checkReady } = req('decide/ready.js');
const { unsetCaps, settingsProblems } = req('decide/settings.js');
const { requestsFor, dryRunComment, planHash } = req('github/apply.js');
const { mapTimeline, referencingPulls, mapIssue } = req('github/snapshot.js');
const { focusIssues, reconcileTargets, loadSettings } = req('cli.js');

const OWNER = 'owner';
const AGENT = 'agent[bot]';
const BOT = 'github-actions[bot]';
const STRANGER = 'stranger';

const settings = (over = {}) => ({
  owner: OWNER,
  agentLogin: AGENT,
  dispatcherLogin: BOT,
  mode: 'dry-run',
  caps: { monthlyUsd: 100, perIssueUsd: { direct: 2, lean: 8, full: 25 }, perRunUsd: { triage: 1, scout: 5 } },
  parallelImplementations: 2,
  reviewRounds: 3,
  warningLevel: 0.8,
  ...over,
});

const ev = {
  label: (label, actor = OWNER) => ({ type: 'labeled', label, actor }),
  unlabel: (label, actor = OWNER) => ({ type: 'unlabeled', label, actor }),
  comment: (actor, body = 'a comment') => ({ type: 'commented', actor, body }),
  record: (data) => ({ type: 'commented', actor: BOT, body: `Note.\n\n${formatRecord(data)}` }),
  reopened: (actor = OWNER) => ({ type: 'reopened', actor }),
  closed: (actor = OWNER) => ({ type: 'closed', actor }),
};

const ASK = 'Add a --dry-run flag to bin/agents sync.';
const SPEC = 'Goal: preview a sync.\n\nAcceptance: `bin/agents sync --dry-run` writes nothing.';
const withSpec = (spec = SPEC, ask = ASK) => `${ask}\n\n${SPEC_START}\n${spec}\n${SPEC_END}`;
const TRIAGED = { triage: { estimateUsd: 3 }, ask: digest(ASK) };

// An issue whose labels came from the owner or the dispatcher, so nothing gets reverted.
function view({ number = 1, author = OWNER, labels = [], body = ASK, timeline, state = 'open', dependencies = [], pull = null } = {}) {
  return { number, state, author, body, labels, isPull: false, timeline: timeline || labels.map((l) => ev.label(l, BOT)), dependencies, pull };
}
const ctx = (over = {}) => ({ settings: settings(), control: { stopped: false }, running: new Set(), queue: [], ...over });
const decide = (v, c) => decideIssue(v, ctx(c));

// A ready issue that meets every item of the Definition of Ready.
const readyView = (over = {}) => {
  const labels = over.labels || ['origin:owner', 'route:lean', 'merge:agent', 'approved', 'ready'];
  return view({
    body: withSpec(),
    labels,
    timeline: [...labels.map((l) => ev.label(l, l === 'approved' ? OWNER : BOT)), ev.record({ ...TRIAGED, state: 'ready', approvedSpec: digest(SPEC) })],
    ...over,
  });
};

// ---- CW-3: state labels -------------------------------------------------------------

test('CW-3: a new issue by the owner gets triage and origin:owner, and the triage agent starts', () => {
  const p = decide(view({ labels: [], timeline: [] }));
  assert.deepEqual(p.add.sort(), ['origin:owner', 'triage']);
  assert.deepEqual(p.start, { role: 'triage', limitUsd: 1 });
  assert.equal(p.record.ask, digest(ASK));
});

test('CW-3: an issue with several state labels keeps the one the dispatcher recorded', () => {
  const labels = ['origin:owner', 'route:lean', 'refining', 'ready'];
  const p = decide(view({ labels, timeline: [...labels.map((l) => ev.label(l, BOT)), ev.record({ ...TRIAGED, state: 'refining' })] }));
  assert.deepEqual(p.remove, ['ready']);
  assert.equal(p.state, 'refining');
  assert.match(p.say.join(' '), /exactly one state label/);
});

test('CW-3: without a record, several state labels fall back to the earliest in life order', () => {
  const p = decide(view({ labels: ['origin:owner', 'in-review', 'triage'] }));
  assert.deepEqual(p.remove, ['in-review']);
  assert.equal(p.state, 'triage');
});

test('CW-3: an open issue whose state label the owner removed counts as triage', () => {
  const p = decide(view({
    labels: ['origin:owner'],
    timeline: [ev.label('origin:owner', BOT), ev.label('refining', BOT), ev.record({ ...TRIAGED, intake: true, state: 'refining' }), ev.unlabel('refining', OWNER)],
  }));
  assert.equal(p.state, 'triage');
  assert.equal(p.start.role, 'triage');
});

test('CW-3, U13: closing removes the state label, approved, paused and budget:extend, and starts nothing', () => {
  const p = decide(view({ state: 'closed', labels: ['origin:owner', 'route:lean', 'merge:agent', 'in-progress', 'approved', 'paused', 'budget:extend'] }));
  assert.deepEqual(p.remove.sort(), ['approved', 'budget:extend', 'in-progress', 'paused']);
  assert.deepEqual(p.add, []);
  assert.equal(p.start, null);
});

// ---- CW-4: origin -------------------------------------------------------------------

for (const [author, origin] of [[OWNER, 'origin:owner'], [AGENT, 'origin:agent'], [STRANGER, 'origin:external'], ['Owner', 'origin:owner']]) {
  test(`CW-4: an issue by ${author} gets ${origin}`, () => {
    const p = decide(view({ author, labels: [], timeline: [] }));
    assert.ok(p.add.includes(origin), `added ${p.add}`);
  });
}

test('CW-4: the owner changing origin:agent to origin:owner is kept', () => {
  const p = decide(view({
    author: AGENT,
    labels: ['origin:owner', 'triage'],
    timeline: [ev.label('origin:agent', BOT), ev.label('triage', BOT), ev.record({ intake: true, ask: digest(ASK), state: 'triage' }), ev.unlabel('origin:agent', OWNER), ev.label('origin:owner', OWNER)],
  }));
  assert.deepEqual(p.add, []);
  assert.deepEqual(p.remove, []);
});

test('CW-4, CW-13: an agent changing the origin is reverted', () => {
  const p = decide(view({
    author: AGENT,
    labels: ['origin:owner', 'triage'],
    timeline: [ev.label('origin:agent', BOT), ev.label('triage', BOT), ev.record({ intake: true, ask: digest(ASK), state: 'triage' }), ev.unlabel('origin:agent', AGENT), ev.label('origin:owner', AGENT)],
  }));
  assert.deepEqual(p.add, ['origin:agent']);
  assert.deepEqual(p.remove, ['origin:owner']);
  assert.match(p.say.join(' '), /@agent\[bot\]/);
});

test('CW-4: of two origin labels the one added last stays', () => {
  const p = decide(view({ labels: ['origin:agent', 'origin:owner', 'triage'], timeline: [ev.label('origin:owner', OWNER), ev.label('triage', BOT), ev.label('origin:agent', OWNER)] }));
  assert.deepEqual(p.remove, ['origin:owner']);
});

// ---- CW-10: deterministic -----------------------------------------------------------

test('CW-10: the same repository state always gives the same plan', () => {
  const v = readyView();
  const a = decideIssue(v, ctx({ queue: [1] }));
  const b = decideIssue(JSON.parse(JSON.stringify(v)), ctx({ queue: [1] }));
  assert.deepEqual({ ...a, labels: [...a.labels] }, { ...b, labels: [...b.labels] });
});

test('CW-10: the rules take no event, only state: decideIssue reads the view and the context', () => {
  assert.equal(decideIssue.length, 2);
});

// ---- CW-11: which agent starts ------------------------------------------------------

test('CW-11: refining starts the refine agent with what is left of the issue cap', () => {
  const labels = ['origin:owner', 'route:lean', 'merge:agent', 'refining'];
  const p = decide(view({ labels, timeline: [...labels.map((l) => ev.label(l, BOT)), ev.record({ ...TRIAGED, state: 'refining', spentUsd: 1.5 })] }));
  assert.deepEqual(p.start, { role: 'refine', limitUsd: 6.5 });
});

test('CW-11: refining without a route starts nothing and says why', () => {
  const p = decide(view({ labels: ['origin:owner', 'refining'], timeline: [ev.label('origin:owner', BOT), ev.label('refining', BOT), ev.record({ ...TRIAGED, state: 'refining' })] }));
  assert.equal(p.start, null);
  assert.match(p.notes.join(' '), /no route/);
});

test('CW-11: a ready issue with a free slot starts the implement agent and moves to in-progress', () => {
  const p = decide(readyView(), { queue: [1] });
  assert.deepEqual(p.start, { role: 'implement', limitUsd: 8 });
  assert.deepEqual(p.add, ['in-progress']);
  assert.deepEqual(p.remove, ['ready']);
});

test('CW-11: an open pull request by the agent starts the review agent once per head commit', () => {
  const labels = ['origin:owner', 'route:lean', 'merge:agent', 'approved', 'in-review'];
  const base = { body: withSpec(), labels, pull: { number: 9, author: AGENT, state: 'open', merged: false, headSha: 'abc' } };
  const timeline = [...labels.map((l) => ev.label(l, l === 'approved' ? OWNER : BOT)), ev.record({ ...TRIAGED, state: 'in-review', approvedSpec: digest(SPEC) })];
  assert.equal(decide(view({ ...base, timeline })).start.role, 'review');
  assert.equal(decide(view({ ...base, timeline: [...timeline, ev.record({ reviewedSha: 'abc' })] })).start, null);
  assert.equal(decide(view({ ...base, timeline, pull: { ...base.pull, author: OWNER } })).start, null);
});

// ---- Phase 5: the merge class on every push, conflicts, the owner's merge ---------------

const DOCS = [{ path: 'docs/guide.md', status: 'modified', additions: 3, deletions: 1, executable: false }];
const reviewView = ({ merge = 'merge:self', pull = {}, record = {} } = {}) => {
  const labels = ['origin:owner', 'route:direct', merge, 'approved', 'in-review'];
  return view({
    body: withSpec(),
    labels,
    timeline: [...labels.map((l) => ev.label(l, l === 'approved' ? OWNER : BOT)), ev.record({ ...TRIAGED, state: 'in-review', approvedSpec: digest(SPEC), ...record })],
    pull: { number: 9, author: AGENT, state: 'open', merged: false, headSha: 'abc1234', mergeable: true, mergeableState: 'clean', files: DOCS, ...pull },
  });
};

test('CW-61, CW-63: merge:self gets no review; the dispatcher confirms the class at the head commit', () => {
  const plan = decide(reviewView());
  assert.equal(plan.start, null);
  assert.match(plan.notes.join('\n'), /no review for `merge:self`/);
  assert.deepEqual(plan.record.mergeCheck, { sha: 'abc1234', merge: 'merge:self', pull: 9 });
  assert.match(plan.say.join('\n'), /Confirmed `merge:self` for #9 at abc1234/);
  // Confirmed once per head commit.
  const again = decide(reviewView({ record: { mergeCheck: { sha: 'abc1234', merge: 'merge:self', pull: 9 } } }));
  assert.equal(again.record.mergeCheck, undefined);
  assert.equal(again.say.length, 0);
  // A new push is confirmed again.
  assert.equal(decide(reviewView({ pull: { headSha: 'def5678' }, record: { mergeCheck: { sha: 'abc1234', merge: 'merge:self' } } })).record.mergeCheck.sha, 'def5678');
});

test('CW-62, CW-67: a push that touches a merge:human path raises the class and confirms nothing', () => {
  const files = [...DOCS, { path: 'cloud/settings.json', status: 'modified', additions: 1, deletions: 1 }];
  const plan = decide(reviewView({ pull: { files } }));
  assert.ok(plan.add.includes('merge:human'));
  assert.ok(plan.remove.includes('merge:self'));
  assert.match(plan.say.join('\n'), /Raised the merge class to `merge:human` for #9: touches cloud\//);
  assert.equal(plan.record.mergeCheck, undefined);
  // Never lowered: a merge:agent issue with docs-only changes stays merge:agent.
  const agent = decide(reviewView({ merge: 'merge:agent' }));
  assert.ok(!agent.add.some((l) => l.startsWith('merge:')) && !agent.remove.some((l) => l.startsWith('merge:')));
  assert.equal(agent.record.mergeCheck, undefined);
  assert.equal(agent.start.role, 'review');
});

test('CW-62: an executable file raises the class even outside the merge:human paths', () => {
  const plan = decide(reviewView({ pull: { files: [{ path: 'docs/run', status: 'added', additions: 2, deletions: 0, executable: true }] } }));
  assert.ok(plan.add.includes('merge:human'));
});

test('CW-55: a pull request that conflicts with the default branch goes back to in-progress', () => {
  const plan = decide(reviewView({ pull: { mergeable: false, mergeableState: 'dirty' } }));
  assert.ok(plan.add.includes('in-progress'));
  assert.ok(plan.remove.includes('in-review'));
  assert.match(plan.say.join('\n'), /#9 conflicts with the default branch/);
  // Not yet computed is no conflict.
  assert.equal(decide(reviewView({ pull: { mergeable: null, mergeableState: 'unknown' } })).add.includes('in-progress'), false);
});

test('CW-69: after the owner merged, the dispatcher posts the closing comment once', () => {
  const closedView = (record = {}, mergedBy = OWNER) => view({
    state: 'closed',
    labels: ['origin:owner', 'merge:agent'],
    timeline: [ev.record({ state: 'in-review', totalUsd: 3.5, filed: [12], ...record })],
    pull: { number: 9, title: 'Add --dry-run', author: AGENT, state: 'closed', merged: true, mergedBy, mergeSha: 'fff0000', headSha: 'abc' },
  });
  const plan = decide(closedView());
  const text = plan.say.join('\n');
  assert.match(text, /Merged #9 \(Add --dry-run\) by the owner/);
  assert.match(text, /\$3\.50/);
  assert.match(text, /#12/);
  assert.deepEqual(plan.record.merged, { pull: 9, sha: 'fff0000', by: 'owner' });
  assert.equal(decide(closedView({ merged: { pull: 9, by: 'owner' } })).say.length, 0);
  // The agent's merge job posts its own closing comment.
  assert.equal(decide(closedView({}, AGENT)).say.length, 0);
});

test('CW-62: the snapshot maps a pull request with its files and their executable bit', () => {
  const { mapPull, mapFiles } = req('github/snapshot.js');
  const files = mapFiles(
    [{ filename: 'a.sh', status: 'added', additions: 2, deletions: 0 }, { filename: 'b.md', previous_filename: 'old.md', status: 'renamed', additions: 1, deletions: 1 }, { filename: 'c.md', status: 'removed' }],
    { tree: [{ path: 'a.sh', mode: '100755' }, { path: 'b.md', mode: '100644' }] },
  );
  assert.deepEqual(files.map((f) => [f.path, f.previousPath, f.executable]), [['a.sh', null, true], ['b.md', 'old.md', false], ['c.md', null, undefined]]);
  const pr = mapPull({ number: 9, title: 'T', user: { login: AGENT }, state: 'open', draft: false, merged: false, merged_by: null, head: { sha: 'abc', ref: 'cloud/issue-1' }, mergeable_state: 'clean' }, { files });
  assert.equal(pr.mergeable, null);
  assert.equal(pr.mergeableState, 'clean');
  assert.equal(pr.headRef, 'cloud/issue-1');
  assert.equal(pr.files.length, 3);
});

test('CW-11: the owner answering restores the state the issue came from and starts its agent', () => {
  const labels = ['origin:owner', 'route:lean', 'merge:agent', 'needs-answer'];
  const p = decide(view({
    labels,
    timeline: [
      ...labels.slice(0, 3).map((l) => ev.label(l, BOT)),
      ev.record({ ...TRIAGED, state: 'refining' }),
      ev.unlabel('refining', BOT),
      ev.label('needs-answer', BOT),
      ev.record({ state: 'needs-answer', waiting: { from: 'refining', reason: 'question' } }),
      ev.comment(OWNER, 'Use the existing flag parser.'),
    ],
  }));
  assert.equal(p.state, 'refining');
  assert.equal(p.start.role, 'refine');
  assert.equal(p.record.waiting, null);
});

test('CW-11: without a record, the state removed before needs-answer is restored', () => {
  const labels = ['origin:owner', 'route:lean', 'merge:agent', 'approved', 'needs-answer'];
  const p = decide(view({
    body: withSpec(),
    labels,
    timeline: [...labels.slice(0, 4).map((l) => ev.label(l, l === 'approved' ? OWNER : BOT)), ev.record({ ...TRIAGED, approvedSpec: digest(SPEC) }), ev.unlabel('in-progress', OWNER), ev.label('needs-answer', OWNER), ev.comment(OWNER, 'go on')],
  }), { queue: [1] });
  assert.equal(p.state, 'in-progress');
});

// D44, D22: answering a question during implementation keeps the approval, and the
// implementation goes on in the slot it kept while it waited.
const askedDuringWork = () => {
  const labels = ['origin:owner', 'route:lean', 'merge:agent', 'approved', 'needs-answer'];
  return view({
    body: withSpec(),
    labels,
    timeline: [
      ...labels.slice(0, 4).map((l) => ev.label(l, l === 'approved' ? OWNER : BOT)),
      ev.label('needs-answer', BOT),
      ev.record({ ...TRIAGED, state: 'needs-answer', approvedSpec: digest(SPEC), waiting: { from: 'in-progress', reason: 'question' } }),
      ev.comment(OWNER, 'Use the existing parser.'),
    ],
  });
};

test('D44: an approval given for the current spec survives needs-answer', () => {
  const p = decide(askedDuringWork(), { queue: [1] });
  assert.equal(p.state, 'in-progress');
  assert.ok(!p.remove.includes('approved'), JSON.stringify(p.visible));
  assert.equal(p.start.role, 'implement');
});

test('D44: in needs-answer, approved for a spec that has changed since is removed', () => {
  const p = decide({ ...askedDuringWork(), body: withSpec('Goal: something else.') }, { queue: [1] });
  assert.ok(p.remove.includes('approved'));
  assert.match(p.say.join(' '), /spec changed after approval/);
});

test('D22: a resumed implementation goes on in the slot it kept, without queueing', () => {
  const p = decide(askedDuringWork(), { queue: [] });
  assert.equal(p.state, 'in-progress');
  assert.equal(p.start.role, 'implement');
  assert.doesNotMatch(p.notes.join(' '), /free implementation slot/);
});

test('D22, CW-12: a needs-answer issue that returns to in-progress holds its slot, so a ready issue waits', () => {
  const unanswered = () => {
    const v = askedDuringWork();
    return { ...v, number: 2, timeline: v.timeline.filter((e) => !(e.type === 'commented' && e.body === 'Use the existing parser.')) };
  };
  const working = readyView({ number: 1, labels: ['origin:owner', 'route:lean', 'merge:agent', 'approved', 'in-progress'] });
  const plans = decideAll([working, unanswered(), readyView({ number: 3 })], ctx({ running: new Set([1]) }));
  assert.deepEqual(plans.map((p) => [p.number, p.state, Boolean(p.start)]), [[1, 'in-progress', false], [2, 'needs-answer', false], [3, 'ready', false]]);
  assert.match(plans[2].notes.join(' '), /free implementation slot/);
  // Waiting from refinement holds no slot.
  const refining = unanswered();
  refining.timeline = refining.timeline.map((e) => (e.body && e.body.includes('dispatcher-record') ? ev.record({ ...TRIAGED, state: 'needs-answer', waiting: { from: 'refining', reason: 'question' } }) : e));
  const free = decideAll([working, refining, readyView({ number: 3 })], ctx({ running: new Set([1]) }));
  assert.equal(free[2].state, 'in-progress');
});

test('D47, D22: one run hands the free slots to ready issues lowest number first, after the resumed ones', () => {
  const plans = decideAll([readyView({ number: 3 }), { ...askedDuringWork(), number: 2 }, readyView({ number: 4 })], ctx({ activeElsewhere: 1 }));
  assert.deepEqual(plans.map((p) => [p.number, p.state, Boolean(p.start)]), [[2, 'in-progress', true], [3, 'ready', false], [4, 'ready', false]]);
});

test('D47: a paused ready issue takes no slot', () => {
  const s = settings();
  const ready = [3, 5].map((number) => ({ number, labels: ['origin:owner', 'route:lean', 'merge:agent', 'approved', 'ready', ...(number === 3 ? ['paused'] : [])], record: TRIAGED, dependencies: [] }));
  assert.deepEqual(startableQueue(ready, 1, s), [5]);
});

// ---- CW-12: one session per issue, limited implementations --------------------------

test('CW-12: no second session for an issue that has one running', () => {
  const p = decide(readyView({ labels: ['origin:owner', 'route:lean', 'merge:agent', 'approved', 'in-progress'] }), { running: new Set([1]) });
  assert.equal(p.start, null);
  assert.match(p.notes.join(' '), /already running/);
});

test('CW-12: a ready issue without a free slot waits', () => {
  const p = decide(readyView(), { queue: [] });
  assert.equal(p.start, null);
  assert.deepEqual(p.add, []);
  assert.match(p.notes.join(' '), /free implementation slot/);
});

test('CW-12: ready issues start lowest number first, as many as slots are free', () => {
  const s = settings();
  const ready = [7, 3, 5].map((number) => ({ number, labels: ['origin:owner', 'route:lean', 'merge:agent', 'approved', 'ready'], record: TRIAGED, dependencies: [] }));
  assert.deepEqual(startableQueue(ready, 0, s), [3, 5]);
  assert.deepEqual(startableQueue(ready, 1, s), [3]);
  assert.deepEqual(startableQueue(ready, 2, s), []);
});

test('CW-12: one run over several issues starts only the queued ones', () => {
  const plans = decideAll([readyView({ number: 4 }), readyView({ number: 2 }), readyView({ number: 3 })], ctx({ queue: [2, 3] }));
  assert.deepEqual(plans.map((p) => [p.number, Boolean(p.start)]), [[2, true], [3, true], [4, false]]);
});

// ---- CW-13: label actors ------------------------------------------------------------

test('CW-13: approved added by an agent is removed and the comment names who added it', () => {
  const labels = ['origin:owner', 'route:lean', 'merge:agent', 'needs-approval', 'approved'];
  const p = decide(view({ body: withSpec(), labels, timeline: [...labels.slice(0, 4).map((l) => ev.label(l, BOT)), ev.record({ ...TRIAGED, state: 'needs-approval' }), ev.label('approved', AGENT)] }));
  assert.deepEqual(p.remove, ['approved']);
  assert.equal(p.state, 'needs-approval');
  assert.match(p.say[0], /removed `approved` \(added by @agent\[bot\]\)/);
  assert.equal(p.start, null);
});

test('CW-13: budget:extend added by someone else is removed', () => {
  const labels = ['origin:owner', 'route:lean', 'merge:agent', 'refining', 'budget:extend'];
  const p = decide(view({ labels, timeline: [...labels.slice(0, 4).map((l) => ev.label(l, BOT)), ev.record({ ...TRIAGED, state: 'refining' }), ev.label('budget:extend', STRANGER)] }));
  assert.ok(p.remove.includes('budget:extend'));
});

test('CW-13, CW-67: an agent may raise a merge class but removing one is undone', () => {
  const labels = ['origin:owner', 'route:lean', 'triage'];
  const base = [...labels.map((l) => ev.label(l, BOT)), ev.record({ intake: true, ask: digest(ASK), state: 'triage' })];
  const raised = decide(view({ labels: [...labels, 'merge:human'], timeline: [...base, ev.label('merge:human', AGENT)] }));
  assert.deepEqual(raised.add, []);
  assert.deepEqual(raised.remove, []);
  const lowered = decide(view({ labels: [...labels, 'merge:self'], timeline: [...base, ev.label('merge:human', AGENT), ev.unlabel('merge:human', AGENT), ev.label('merge:self', AGENT)] }));
  assert.deepEqual(lowered.add, ['merge:human']);
  assert.deepEqual(lowered.remove, ['merge:self']);
  const byOwner = decide(view({ labels: [...labels, 'merge:self'], timeline: [...base, ev.label('merge:human', AGENT), ev.unlabel('merge:human', OWNER), ev.label('merge:self', OWNER)] }));
  assert.deepEqual(byOwner.remove, []);
});

test('CW-13, U11: an agent moving the state label is reverted; the owner moving it is kept', () => {
  const labels = ['origin:owner', 'route:lean', 'merge:agent'];
  const base = [...labels.map((l) => ev.label(l, BOT)), ev.label('refining', BOT), ev.record({ ...TRIAGED, state: 'refining' })];
  const byAgent = decide(view({ labels: [...labels, 'needs-approval'], timeline: [...base, ev.unlabel('refining', AGENT), ev.label('needs-approval', AGENT)] }));
  assert.deepEqual(byAgent.add, ['refining']);
  assert.deepEqual(byAgent.remove, ['needs-approval']);
  const byOwner = decide(view({ labels: [...labels, 'needs-approval'], timeline: [...base, ev.unlabel('refining', OWNER), ev.label('needs-approval', OWNER)] }));
  assert.deepEqual(byOwner.add, []);
  assert.deepEqual(byOwner.remove, []);
});

test('D46: an approval an agent added and removed again is not restored', () => {
  const labels = ['origin:owner', 'route:lean', 'merge:agent', 'needs-approval'];
  const p = decide(view({ body: withSpec(), labels, timeline: [...labels.map((l) => ev.label(l, BOT)), ev.record({ ...TRIAGED, state: 'needs-approval' }), ev.label('approved', AGENT), ev.unlabel('approved', AGENT)] }));
  assert.ok(!p.add.includes('approved'), JSON.stringify(p.visible));
});

test('D46: an approval the owner gave and an agent removed is restored', () => {
  const labels = ['origin:owner', 'route:lean', 'merge:agent', 'ready'];
  const p = decide(view({ body: withSpec(), labels, timeline: [...labels.map((l) => ev.label(l, BOT)), ev.label('approved', OWNER), ev.record({ ...TRIAGED, state: 'ready', approvedSpec: digest(SPEC) }), ev.unlabel('approved', AGENT)] }));
  assert.ok(p.add.includes('approved'));
  assert.match(p.say[0], /restored `approved` \(removed by @agent\[bot\]\)/);
});

test('U12, CW-22: duplicate route and merge labels are reduced, and route:direct needs origin:owner', () => {
  const p = decide(view({ author: AGENT, labels: ['origin:agent', 'route:direct', 'merge:self', 'merge:agent', 'triage'] }));
  assert.deepEqual(p.remove.sort(), ['merge:self', 'route:direct']);
  assert.deepEqual(p.add, ['route:lean']);
});

// ---- CW-14: Definition of Ready -----------------------------------------------------

test('CW-14: an issue failing the Definition of Ready does not start and the comment says which items fail', () => {
  const labels = ['origin:owner', 'route:lean', 'merge:agent', 'approved', 'ready'];
  const p = decide(view({ body: withSpec(), labels, timeline: [...labels.map((l) => ev.label(l, l === 'approved' ? OWNER : BOT)), ev.record({ state: 'ready', ask: digest(ASK), approvedSpec: digest(SPEC) })] }), { queue: [1] });
  assert.equal(p.start, null);
  assert.match(p.say.join(' '), /item 5 fails.*item 7 fails/);
  assert.equal(p.record.dorFailing, '5,7');
});

test('CW-14: the same failing items are not commented again', () => {
  const labels = ['origin:owner', 'route:lean', 'merge:agent', 'approved', 'ready'];
  const p = decide(view({ body: withSpec(), labels, timeline: [...labels.map((l) => ev.label(l, l === 'approved' ? OWNER : BOT)), ev.record({ state: 'ready', ask: digest(ASK), approvedSpec: digest(SPEC), dorFailing: '5,7' })] }), { queue: [1] });
  assert.deepEqual(p.say, []);
  assert.equal(p.start, null);
});

test('CW-14: items 3 to 8 each fail on their own', () => {
  const s = settings();
  const ok = { labels: ['route:lean', 'merge:agent', 'approved', 'origin:owner'], record: TRIAGED, dependencies: [] };
  const failing = (issue) => checkReady({ ...ok, ...issue }, s).failing.map((f) => f.item);
  assert.deepEqual(failing({}), []);
  assert.deepEqual(failing({ labels: ['route:lean', 'approved'] }), [3]);
  assert.deepEqual(failing({ labels: [...ok.labels, 'objection'] }), [4]);
  assert.deepEqual(failing({ record: {} }), [5, 7]);
  assert.deepEqual(failing({ dependencies: [{ number: 4, state: 'open' }, { number: 5, state: 'closed' }] }), [6]);
  assert.deepEqual(failing({ record: { triage: { estimateUsd: 9 } } }), [7]);
  assert.deepEqual(failing({ record: { triage: { estimateUsd: 9 } }, labels: [...ok.labels, 'budget:extend'] }), []);
  assert.deepEqual(failing({ labels: ['route:lean', 'merge:agent', 'origin:owner'] }), [8]);
  assert.deepEqual(failing({ labels: ['route:direct', 'merge:self', 'origin:owner'], record: { triage: { estimateUsd: 1 } } }), []);
  assert.deepEqual(failing({ labels: ['route:direct', 'merge:self', 'origin:agent'], record: { triage: { estimateUsd: 1 } } }), [8]);
});

// ---- CW-17, CW-18, CW-19: needs-answer, reopening, external issues ------------------

test('CW-19, CW-17, scenario 13: an external issue waits in needs-answer with one comment and no session', () => {
  const p = decide(view({ author: STRANGER, labels: [], timeline: [] }));
  assert.deepEqual(p.add.sort(), ['needs-answer', 'origin:external']);
  assert.equal(p.say.length, 1);
  assert.match(p.say[0], /came from `triage`/);
  assert.match(p.say[0], /neither the owner nor an agent/);
  assert.equal(p.start, null);
  assert.deepEqual(p.record.waiting, { from: 'triage', reason: 'external' });
});

const waitingExternal = (...later) => view({
  author: STRANGER,
  labels: ['origin:external', 'needs-answer'],
  timeline: [ev.label('origin:external', BOT), ev.label('needs-answer', BOT), ev.record({ intake: true, ask: digest(ASK), state: 'needs-answer', waiting: { from: 'triage', reason: 'external' } }), ...later],
});

test('CW-19, CW-44, scenario 13: an external issue stays put while others comment or edit it', () => {
  const p = decide({ ...waitingExternal(ev.comment(STRANGER, 'any news?'), ev.comment(AGENT, 'noted')), body: 'A different ask now.' });
  assert.ok(p.isEmpty, JSON.stringify(p.visible));
});

test('CW-19: when the owner comments on an external issue it moves to triage and the triage agent starts', () => {
  const p = decide(waitingExternal(ev.comment(OWNER, 'Worth a look.')));
  assert.equal(p.state, 'triage');
  assert.deepEqual(p.start, { role: 'triage', limitUsd: 1 });
  assert.equal(p.record.waiting, null);
});

test('CW-18, U13: a reopened issue is triaged as new, without approved and route', () => {
  const labels = ['origin:owner', 'route:lean', 'merge:agent', 'approved'];
  const p = decide(view({
    labels,
    timeline: [...labels.map((l) => ev.label(l, l === 'approved' ? OWNER : BOT)), ev.record({ ...TRIAGED, intake: true, state: 'in-review' }), ev.closed(), ev.unlabel('in-review', BOT), ev.reopened()],
  }));
  assert.equal(p.state, 'triage');
  assert.deepEqual(p.remove.sort(), ['approved', 'route:lean']);
  assert.equal(p.record.triage, null);
  assert.equal(p.start.role, 'triage');
});

test('CW-18, CW-19: a reopened external issue goes back to needs-answer', () => {
  const p = decide(view({ author: STRANGER, labels: ['origin:external'], timeline: [ev.label('origin:external', BOT), ev.record({ intake: true }), ev.closed(), ev.reopened(STRANGER)] }));
  assert.equal(p.state, 'needs-answer');
  assert.equal(p.start, null);
});

test('CW-18, CW-17: the owner closing the pull request unmerged moves the issue to needs-answer from in-progress', () => {
  const labels = ['origin:owner', 'route:lean', 'merge:agent', 'approved', 'in-review'];
  const timeline = [...labels.map((l) => ev.label(l, l === 'approved' ? OWNER : BOT)), ev.record({ ...TRIAGED, state: 'in-review', approvedSpec: digest(SPEC) })];
  const pull = { number: 9, author: AGENT, state: 'closed', merged: false, closedBy: OWNER, headSha: 'abc' };
  const p = decide(view({ body: withSpec(), labels, timeline, pull }));
  assert.equal(p.state, 'needs-answer');
  assert.match(p.say.join(' '), /came from `in-progress`/);
  assert.deepEqual(p.record.waiting, { from: 'in-progress', reason: 'pr-closed' });
  assert.equal(p.start, null);
  const byAgent = decide(view({ body: withSpec(), labels, timeline, pull: { ...pull, closedBy: AGENT } }));
  assert.equal(byAgent.state, 'in-review');
});

// ---- CW-26, CW-40 to CW-42: approval -------------------------------------------------

test('CW-40: approved by the owner on needs-approval makes the issue ready and records the spec', () => {
  const labels = ['origin:owner', 'route:lean', 'merge:agent', 'needs-approval'];
  const p = decide(view({ body: withSpec(), labels: [...labels, 'approved'], timeline: [...labels.map((l) => ev.label(l, BOT)), ev.record({ ...TRIAGED, state: 'needs-approval' }), ev.label('approved', OWNER)] }), { queue: [] });
  assert.equal(p.state, 'ready');
  assert.equal(p.record.approvedSpec, digest(SPEC));
  assert.ok(!p.say.join(' ').includes('objection'));
});

test('CW-40: approved before the spec is complete is removed', () => {
  const labels = ['origin:owner', 'route:lean', 'merge:agent', 'refining'];
  const p = decide(view({ labels: [...labels, 'approved'], timeline: [...labels.map((l) => ev.label(l, BOT)), ev.record({ ...TRIAGED, state: 'refining' }), ev.label('approved', OWNER)] }));
  assert.deepEqual(p.remove, ['approved']);
  assert.equal(p.state, 'refining');
});

test('U10: the owner commenting on needs-approval without approving sends it back to refining', () => {
  const labels = ['origin:owner', 'route:lean', 'merge:agent', 'needs-approval'];
  const p = decide(view({ body: withSpec(), labels, timeline: [...labels.map((l) => ev.label(l, BOT)), ev.record({ ...TRIAGED, state: 'needs-approval' }), ev.comment(OWNER, 'Also cover Windows.')] }));
  assert.equal(p.state, 'refining');
  assert.equal(p.start.role, 'refine');
});

test('CW-41: approved on an issue with objection makes it ready and says "approved over objection"', () => {
  const labels = ['origin:owner', 'route:lean', 'merge:agent', 'objection', 'needs-approval'];
  const p = decide(view({ body: withSpec(), labels: [...labels, 'approved'], timeline: [...labels.map((l) => ev.label(l, BOT)), ev.record({ ...TRIAGED, state: 'needs-approval' }), ev.label('approved', OWNER)] }));
  assert.equal(p.state, 'ready');
  assert.ok(p.remove.includes('objection'));
  assert.match(p.say.join(' '), /Approved over objection/i);
});

test('CW-41: a direct issue waiting on an objection becomes ready when the owner approves', () => {
  const labels = ['origin:owner', 'route:direct', 'merge:self', 'objection', 'needs-answer'];
  const p = decide(view({ body: withSpec(), labels: [...labels, 'approved'], timeline: [...labels.map((l) => ev.label(l, BOT)), ev.record({ ...TRIAGED, triage: { estimateUsd: 1 }, state: 'needs-answer', waiting: { from: 'triage', reason: 'objection' } }), ev.label('approved', OWNER)] }), { queue: [1] });
  assert.equal(p.state, 'in-progress');
  assert.match(p.say.join(' '), /approved over objection/i);
  assert.equal(p.start.role, 'implement');
});

test('D45, scenario 5: approved over an objection on a lean issue sends it back to the objecting agent', () => {
  const labels = ['origin:owner', 'route:lean', 'merge:agent', 'objection', 'needs-answer'];
  const p = decide(view({ labels: [...labels, 'approved'], timeline: [...labels.map((l) => ev.label(l, BOT)), ev.record({ ...TRIAGED, state: 'needs-answer', waiting: { from: 'refining', reason: 'objection' } }), ev.label('approved', OWNER)] }));
  assert.equal(p.state, 'refining');
  assert.deepEqual(p.remove.sort(), ['approved', 'needs-answer', 'objection']);
  assert.match(p.say.join(' '), /Approved over objection/);
  assert.equal(p.record.objectionOverridden, true);
  assert.equal(p.start.role, 'refine');
});

test('D48: the author changing an external issue after the owner let it in sends it back to the owner', () => {
  const labels = ['origin:external', 'route:lean', 'merge:agent', 'refining'];
  const p = decide(view({ author: STRANGER, body: 'Something else now.', labels, timeline: [...labels.map((l) => ev.label(l, BOT)), ev.record({ ...TRIAGED, state: 'refining' })] }));
  assert.equal(p.state, 'needs-answer');
  assert.deepEqual(p.record.waiting, { from: 'triage', reason: 'external' });
  assert.equal(p.start, null);
});

test('D37: an owner issue edited while waiting is triaged again once the owner answers', () => {
  const labels = ['origin:owner', 'route:lean', 'merge:agent', 'needs-answer'];
  const p = decide(view({ body: 'A new ask.', labels, timeline: [...labels.map((l) => ev.label(l, BOT)), ev.record({ ...TRIAGED, state: 'needs-answer', waiting: { from: 'refining', reason: 'question' } }), ev.comment(OWNER, 'see the new text')] }));
  assert.equal(p.state, 'triage');
  assert.equal(p.start.role, 'triage');
});

test('CW-42: a change to the marked section after approval removes approved and returns to needs-approval', () => {
  const p = decide(readyView({ body: withSpec('Goal: something else entirely.') }), { queue: [1] });
  assert.deepEqual(p.remove.sort(), ['approved', 'ready']);
  assert.deepEqual(p.add, ['needs-approval']);
  assert.equal(p.start, null);
});

test('CW-42: an unchanged spec keeps approved', () => {
  const p = decide(readyView(), { queue: [] });
  assert.ok(!p.remove.includes('approved'));
});

test('CW-26: the owner changing what the issue asks for re-triages it without approved', () => {
  const p = decide(readyView({ body: withSpec(SPEC, 'Add a --force flag instead.') }), { queue: [1] });
  assert.equal(p.state, 'triage');
  assert.ok(p.remove.includes('approved'));
  assert.equal(p.start.role, 'triage');
});

// ---- CW-44: waiting costs nothing ---------------------------------------------------

test('CW-44: needs-answer and needs-approval stay silent until the owner acts', () => {
  for (const state of ['needs-answer', 'needs-approval']) {
    const labels = ['origin:owner', 'route:lean', 'merge:agent', state];
    const p = decide(view({
      body: withSpec(),
      labels,
      timeline: [...labels.map((l) => ev.label(l, BOT)), ev.record({ ...TRIAGED, state, waiting: { from: 'refining', reason: 'question' } }), ev.comment(AGENT, 'still waiting'), ev.comment(STRANGER, '+1')],
    }));
    assert.ok(p.isEmpty, `${state}: ${JSON.stringify(p.visible)}`);
  }
});

// ---- CW-80, CW-81, CW-84: caps and the stop switch ----------------------------------

test('CW-80: no session starts while a cap is unset', () => {
  const s = settings({ caps: { monthlyUsd: 100, perIssueUsd: { direct: 2, lean: 8 }, perRunUsd: { triage: 1, scout: 0 } } });
  assert.deepEqual(unsetCaps(s), ['caps.perIssueUsd.full', 'caps.perRunUsd.scout']);
  const p = decideIssue(view({ labels: [], timeline: [] }), ctx({ settings: s }));
  assert.equal(p.start, null);
  assert.deepEqual(p.add.sort(), ['origin:owner', 'triage']);
  assert.match(p.notes.join(' '), /caps are unset/);
});

test('CW-81: the hard limit is what is left of the issue cap, and never more than the month has left', () => {
  const p = decide(readyView({ timeline: [...readyView().timeline, ev.record({ spentUsd: 2.25 })] }), { queue: [1], spend: { monthUsd: 95 } });
  assert.deepEqual(p.start, { role: 'implement', limitUsd: 5 });
  const spent = decide(readyView({ timeline: [...readyView().timeline, ev.record({ spentUsd: 8 })] }), { queue: [1] });
  assert.equal(spent.start, null);
  assert.match(spent.notes.join(' '), /nothing is left/);
});

test('CW-84: while stopped, labels are still kept in order but nothing starts', () => {
  const p = decide(view({ labels: [], timeline: [] }), { control: { stopped: true } });
  assert.equal(p.start, null);
  assert.ok(p.add.includes('triage'));
  assert.match(p.notes.join(' '), /stop switch/);
});

test('a paused issue starts nothing', () => {
  const labels = ['origin:owner', 'route:lean', 'merge:agent', 'refining', 'paused'];
  const p = decide(view({ labels, timeline: [...labels.map((l) => ev.label(l, BOT)), ev.record({ ...TRIAGED, state: 'refining' })] }));
  assert.equal(p.start, null);
});

test('pull requests and issues the dispatcher opened are left alone', () => {
  assert.ok(decide({ ...view({ labels: [] }), isPull: true }).isEmpty);
  assert.ok(decide(view({ author: BOT, labels: [], timeline: [] })).isEmpty);
});

// ---- Applying a plan ----------------------------------------------------------------

test('dry run: one comment saying what would happen, never twice the same', () => {
  const p = decide(view({ labels: [], timeline: [] }));
  const reqs = requestsFor(p, 'dry-run', 'o/r');
  assert.equal(reqs.length, 1);
  assert.equal(reqs[0].path, '/repos/o/r/issues/1/comments');
  assert.match(reqs[0].body.body, /^\*\*Dry run\.\*\*/);
  assert.match(reqs[0].body.body, /start the triage agent with a hard limit of \$1\.00/);
  assert.match(reqs[0].body.body, new RegExp(`<!-- dispatcher-dry-run ${planHash(p)} -->`));
  assert.ok(!reqs[0].body.body.includes('dispatcher-record'), 'a dry run writes no record');
  p.lastDryRun = planHash(p);
  assert.deepEqual(requestsFor(p, 'dry-run', 'o/r'), []);
});

test('dry run: the hash marker of the last dry-run comment is read back from the timeline', () => {
  const first = decide(view({ labels: [], timeline: [] }));
  const comment = dryRunComment(first);
  const again = decide(view({ labels: [], timeline: [{ type: 'commented', actor: BOT, body: comment }] }));
  assert.deepEqual(requestsFor(again, 'dry-run', 'o/r'), []);
  const forged = decide(view({ labels: [], timeline: [{ type: 'commented', actor: STRANGER, body: comment }] }));
  assert.equal(requestsFor(forged, 'dry-run', 'o/r').length, 1);
});

test('dry run: a plan with nothing to do posts nothing', () => {
  assert.deepEqual(requestsFor(decide(waitingExternal()), 'dry-run', 'o/r'), []);
});

test('live: labels are removed, then added, then one comment carries the record', () => {
  const labels = ['origin:owner', 'route:lean', 'merge:agent', 'needs-approval'];
  const p = decide(view({ body: withSpec(), labels: [...labels, 'approved'], timeline: [...labels.map((l) => ev.label(l, BOT)), ev.record({ ...TRIAGED, state: 'needs-approval' }), ev.label('approved', OWNER)] }));
  const reqs = requestsFor(p, 'live', 'o/r');
  assert.deepEqual(reqs.map((r) => `${r.method} ${r.path}`), ['DELETE /repos/o/r/issues/1/labels/needs-approval', 'POST /repos/o/r/issues/1/labels', 'POST /repos/o/r/issues/1/comments']);
  assert.match(reqs[2].body.body, /<!-- dispatcher-record \{.*"state":"ready".*\} -->/);
});

// ---- Reading GitHub -----------------------------------------------------------------

test('snapshot: timeline events map to what the rules read, and other events are dropped', () => {
  const raw = [
    { event: 'labeled', actor: { login: OWNER }, label: { name: 'approved' }, created_at: 't1' },
    { event: 'commented', actor: { login: STRANGER }, body: 'hi', created_at: 't2' },
    { event: 'subscribed', actor: { login: OWNER } },
    { event: 'reopened', actor: { login: OWNER }, created_at: 't3' },
  ];
  assert.deepEqual(mapTimeline(raw), [
    { type: 'labeled', actor: OWNER, label: 'approved', at: 't1' },
    { type: 'commented', actor: STRANGER, body: 'hi', at: 't2' },
    { type: 'reopened', actor: OWNER, at: 't3' },
  ]);
});

test('snapshot: referencing pull requests come newest first, issues are skipped', () => {
  const xref = (number, pr) => ({ event: 'cross-referenced', source: { issue: { number, ...(pr ? { pull_request: {} } : {}) } } });
  assert.deepEqual(referencingPulls([xref(3, true), xref(4, false), xref(5, true), xref(3, true)]), [3, 5]);
});

test('snapshot: a pull request in another repository that mentions the issue is skipped', () => {
  const xref = (number, repo) => ({ event: 'cross-referenced', source: { issue: { number, pull_request: {}, repository_url: `https://api.github.com/repos/${repo}` } } });
  assert.deepEqual(referencingPulls([xref(3, 'o/r'), xref(7, 'someone/fork'), xref(8, 'O/R')], 'o/r'), [8, 3]);
});

test('snapshot: an issue maps to its number, title, author, labels and kind', () => {
  assert.deepEqual(mapIssue({ number: 2, title: 'Fix it', state: 'open', user: { login: OWNER }, body: null, labels: [{ name: 'triage' }, 'paused'], pull_request: { url: 'x' } }), {
    number: 2, title: 'Fix it', state: 'open', stateReason: null, author: OWNER, body: '', labels: ['triage', 'paused'], isPull: true, updatedAt: null,
  });
});

test('cli: events map to the issues they concern', () => {
  assert.deepEqual(focusIssues('issues', { issue: { number: 4 } }), [4]);
  assert.deepEqual(focusIssues('issue_comment', { issue: { number: 4 } }), [4]);
  assert.deepEqual(focusIssues('issue_comment', { issue: { number: 9, pull_request: {}, body: 'Closes #4' } }), [4]);
  assert.deepEqual(focusIssues('pull_request_target', { pull_request: { body: 'Fixes #4, resolves #6' } }), [4, 6]);
  assert.deepEqual(focusIssues('workflow_dispatch', { inputs: { issue: '12' } }), [12]);
  assert.equal(focusIssues('workflow_dispatch', { inputs: { issue: '' } }), 'all');
  assert.deepEqual(focusIssues('push', {}), []);
});

test('D49: a run also reconciles recently changed issues, ready issues and recently closed ones with labels left', () => {
  const now = Date.parse('2026-11-16T12:00:00Z');
  const at = (min) => new Date(now - min * 60000).toISOString();
  const open = [
    { number: 1, labels: ['triage'], updatedAt: at(5) },
    { number: 2, labels: ['ready'], updatedAt: at(600) },
    { number: 3, labels: ['in-progress'], updatedAt: at(600) },
    { number: 4, labels: ['refining'], updatedAt: at(600) },
    { number: 7, labels: ['in-review'], updatedAt: at(1) },
  ];
  const closed = [{ number: 5, labels: ['approved'], updatedAt: at(2) }, { number: 6, labels: [], updatedAt: at(2) }];
  assert.deepEqual(reconcileTargets({ focus: [4], open, closed, now }), { numbers: [1, 2, 4, 5, 7], activeElsewhere: 1 });
  // D22: with a ready issue waiting, every needs-answer issue is read for the slot it may hold.
  const asking = [...open, { number: 8, labels: ['needs-answer'], updatedAt: at(600) }];
  assert.deepEqual(reconcileTargets({ focus: [], open: asking, closed: [], now }).numbers, [1, 2, 7, 8]);
  assert.deepEqual(reconcileTargets({ focus: [], open: asking.filter((i) => i.number !== 2), closed: [], now }).numbers, [1, 7]);
  assert.deepEqual(reconcileTargets({ focus: 'all', open, closed: [], now }).activeElsewhere, 0);
});

// ---- Settings -----------------------------------------------------------------------

test('settings: cloud/settings.json is valid, sets every cap and starts in dry-run mode', () => {
  const s = loadSettings();
  assert.deepEqual(settingsProblems(s), []);
  assert.deepEqual(unsetCaps(s), []);
  assert.equal(s.mode, 'dry-run');
});

test('settings: broken values are reported', () => {
  assert.deepEqual(settingsProblems(settings({ owner: '', mode: 'on', parallelImplementations: 0, reviewRounds: 1.5, warningLevel: 2 })).length, 5);
});

test('settings: amounts live only in cloud/settings.json, not in the dispatcher code or workflows', () => {
  const files = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(js|ya?ml)$/.test(e.name)) files.push(p);
    }
  };
  walk(path.join(root, 'cloud/dispatcher'));
  walk(path.join(root, '.github/workflows'));
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    assert.doesNotMatch(text, /(Usd|USD|\$)\s*[:=]?\s*\d+(\.\d+)?\b(?!\})/, `${path.relative(root, f)} has an amount`);
  }
});

// ---- The Claude GitHub App: an assistant, not an actor the rules trust (D51) --------

test('D51: claude[bot] neither answers for the owner nor approves', () => {
  const CLAUDE = 'claude[bot]';
  const labels = ['origin:owner', 'route:lean', 'merge:agent', 'needs-answer'];
  const waiting = decide(view({ labels, timeline: [...labels.map((l) => ev.label(l, BOT)), ev.record({ ...TRIAGED, state: 'needs-answer', waiting: { from: 'refining', reason: 'question' } }), ev.comment(CLAUDE, 'Here is an answer.')] }));
  assert.ok(waiting.isEmpty, JSON.stringify(waiting.visible));
  const approval = ['origin:owner', 'route:lean', 'merge:agent', 'needs-approval'];
  const p = decide(view({ body: withSpec(), labels: [...approval, 'approved'], timeline: [...approval.map((l) => ev.label(l, BOT)), ev.record({ ...TRIAGED, state: 'needs-approval' }), ev.label('approved', CLAUDE)] }));
  assert.deepEqual(p.remove, ['approved']);
  assert.equal(p.start, null);
});

// ---- Phase 3: labels the agent invents, lost session runs ------------------------------

test('D26: a label outside cloud/labels.json that the agent identity added comes off, with a comment', () => {
  const labels = ['origin:owner', 'triage'];
  const base = [...labels.map((l) => ev.label(l, BOT)), ev.record({ intake: true, ask: digest(ASK), state: 'triage' })];
  const p = decide(view({ labels: [...labels, 'wontfix', 'bug'], timeline: [...base, ev.label('wontfix', AGENT), ev.label('bug', OWNER)] }), { running: new Set([1]) });
  assert.deepEqual(p.remove, ['wontfix']);
  assert.match(p.say.join('\n'), /Removed `wontfix`: the agent identity added it.*D26/);
});

test('CW-16, D54: a session the dispatcher requested whose run is gone counts as a failure, once', () => {
  const labels = ['origin:owner', 'triage'];
  const lost = { role: 'triage', limitUsd: 1, at: '2026-11-17T10:00:00Z' };
  const timeline = (record) => [...labels.map((l) => ev.label(l, BOT)), ev.record({ intake: true, ask: digest(ASK), state: 'triage', ...record })];
  const first = decide(view({ labels, timeline: timeline({ session: lost }) }));
  assert.deepEqual(first.start, { role: 'triage', limitUsd: 1 });
  assert.equal(first.record.failures, 1);
  assert.equal(first.record.session, null);
  assert.match(first.say.join('\n'), /The triage session run ended without a result\. Retrying once\./);

  const second = decide(view({ labels, timeline: timeline({ session: lost, failures: 1 }) }));
  assert.equal(second.start, null);
  assert.equal(second.state, 'needs-answer');
  assert.equal(second.record.failures, null);
  assert.deepEqual(second.record.waiting.from, 'triage');

  const running = decide(view({ labels, timeline: timeline({ session: lost }) }), { running: new Set([1]) });
  assert.equal(running.start, null);
  assert.equal(running.record.failures, undefined);
});

// ---- Phase 4: refinement, questions and approval ----------------------------------------

test('Scenario 6, CW-32, CW-35: a refine question waits for the owner, then the refine agent continues', () => {
  const labels = ['origin:owner', 'route:lean', 'merge:agent', 'needs-answer'];
  const base = [...labels.map((l) => ev.label(l, BOT)), ev.record({ ...TRIAGED, state: 'needs-answer', waiting: { from: 'refining', reason: 'question' } })];
  const quiet = decide(view({ labels, timeline: base }));
  assert.ok(quiet.isEmpty, JSON.stringify(quiet.visible));
  const others = decide(view({ labels, timeline: [...base, ev.comment(STRANGER, 'Use Rust.'), ev.comment(AGENT, 'Also this.')] }));
  assert.ok(others.isEmpty, JSON.stringify(others.visible));
  const answered = decide(view({ labels, timeline: [...base, ev.comment(OWNER, 'Yes, as recommended.')] }));
  assert.equal(answered.state, 'refining');
  assert.deepEqual(answered.start, { role: 'refine', limitUsd: 8 });
});

test('CW-34, CW-35: a spec waiting for approval goes back to refining on the owner\'s comment only', () => {
  const labels = ['origin:owner', 'route:lean', 'merge:agent', 'needs-approval'];
  const base = [...labels.map((l) => ev.label(l, BOT)), ev.record({ ...TRIAGED, state: 'needs-approval', estimateUsd: 4 })];
  const stranger = decide(view({ body: withSpec(), labels, timeline: [...base, ev.comment(STRANGER, 'Approve it!')] }));
  assert.ok(stranger.isEmpty, JSON.stringify(stranger.visible));
  const owner = decide(view({ body: withSpec(), labels, timeline: [...base, ev.comment(OWNER, 'Drop the second criterion.')] }));
  assert.equal(owner.state, 'refining');
  assert.equal(owner.start.role, 'refine');
});

test('DoR 7: the spec\'s estimate replaces triage\'s once there is one', () => {
  const issue = (record) => ({ labels: ['route:lean', 'merge:agent', 'approved', 'ready'], record: { triage: { estimateUsd: 3 }, ...record } });
  assert.equal(checkReady(issue({}), settings()).ok, true);
  assert.deepEqual(checkReady(issue({ estimateUsd: 9 }), settings()).failing.map((f) => f.item), [7]);
  assert.equal(checkReady(issue({ estimateUsd: 2, triage: { estimateUsd: 9 } }), settings()).ok, true);
  assert.deepEqual(checkReady(issue({ triage: {} }), settings()).failing.map((f) => f.item), [7]);
});
