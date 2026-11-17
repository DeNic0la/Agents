// Tests for cloud/dispatcher/decide/merge-gate.js and the merge-gate entry point.
// Run: node --test "tests/*.test.js"
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { judgePull, issueNumberOf, classOf, gateAtSha, statusesAtSha, pullsAtSha } =
  require(path.join(__dirname, '..', 'cloud/dispatcher/decide/merge-gate.js'));

const settings = { owner: 'owner', agentLogin: 'agents[bot]', dispatcherLogin: 'github-actions[bot]' };
const agentPr = (over = {}) => ({ author: 'agents[bot]', headSha: 'sha2', body: 'Implements the spec.\n\nCloses #7', ...over });
const issue = (labels, record = {}, over = {}) => ({ number: 7, state: 'open', labels: ['in-review', ...labels], record, ...over });
const judge = (pr, iss) => judgePull({ pr, issue: iss, settings });
const states = (r) => [r['merge-gate'].state, r['owner-merge'].state];

// ---- D17: merge-gate for the agent's rule, owner-merge for everything else -----------

test('D17, CW-65: the owner\'s own pull request is the owner\'s to merge; authorship passes neither gate', () => {
  const r = judge(agentPr({ author: 'owner' }), issue(['merge:self'], { mergeCheck: { sha: 'sha2', merge: 'merge:self' } }));
  assert.deepEqual(states(r), ['success', 'pending']);
  assert.match(r['owner-merge'].description, /only the owner merges it/);
});

test('D17: a pull request by anyone else is the owner\'s to merge', () => {
  assert.deepEqual(states(judge(agentPr({ author: 'someone' }), issue(['merge:agent']))), ['success', 'pending']);
});

test('D17, CW-65: an agent pull request for a merge:human issue is the owner\'s to merge', () => {
  const r = judge(agentPr(), issue(['merge:human']));
  assert.deepEqual(states(r), ['success', 'pending']);
  assert.match(r['owner-merge'].description, /#7 is merge:human/);
});

test('D17: an agent pull request without one open issue with a merge class is the owner\'s to merge', () => {
  assert.deepEqual(states(judge(agentPr(), null)), ['success', 'pending']);
  assert.deepEqual(states(judge(agentPr(), issue([]))), ['success', 'pending']);
  assert.deepEqual(states(judge(agentPr(), issue(['merge:agent'], {}, { state: 'closed' }))), ['success', 'pending']);
});

test('CW-67: with several merge class labels the highest counts', () => {
  assert.equal(classOf(['merge:self', 'merge:human']), 'merge:human');
  assert.equal(classOf(['merge:agent', 'merge:self']), 'merge:agent');
  assert.equal(classOf(['ready']), null);
  assert.deepEqual(states(judge(agentPr(), issue(['merge:agent', 'merge:human']))), ['success', 'pending']);
});

test('CW-50: an agent pull request is for the one issue it closes', () => {
  assert.equal(issueNumberOf({ body: 'Closes #7' }), 7);
  assert.equal(issueNumberOf({ body: 'Closes #7, fixes #8' }), null);
  assert.equal(issueNumberOf({ body: 'See #7' }), null);
});

test('CW-63: merge:self passes only with the dispatcher\'s check at the head commit', () => {
  const at = (mergeCheck) => judge(agentPr(), issue(['merge:self'], { mergeCheck }));
  assert.deepEqual(states(at({ sha: 'sha2', merge: 'merge:self' })), ['success', 'success']);
  assert.deepEqual(states(at({ sha: 'sha1', merge: 'merge:self' })), ['pending', 'success']);
  assert.deepEqual(states(at({ sha: 'sha2', merge: 'merge:agent' })), ['pending', 'success']);
  assert.deepEqual(states(at(undefined)), ['pending', 'success']);
});

test('CW-64, D18: merge:agent passes only with the review agent\'s approval of the head commit', () => {
  const at = (review) => judge(agentPr(), issue(['merge:agent'], { review }));
  assert.deepEqual(states(at({ sha: 'sha2', verdict: 'approved' })), ['success', 'success']);
  assert.deepEqual(states(at({ sha: 'sha1', verdict: 'approved' })), ['pending', 'success']);
  assert.deepEqual(states(at({ sha: 'sha2', verdict: 'changes' })), ['pending', 'success']);
  // A merge check is no approval.
  assert.deepEqual(states(judge(agentPr(), issue(['merge:agent'], { mergeCheck: { sha: 'sha2', merge: 'merge:self' } }))), ['pending', 'success']);
});

test('the descriptions stay within 140 characters', () => {
  const long = agentPr({ author: 'x'.repeat(200) });
  for (const r of [judge(long, null), judge(agentPr(), issue(['merge:self'])), judge(agentPr(), issue(['merge:agent']))]) {
    for (const s of Object.values(r)) assert.ok(s.description.length <= 140);
  }
});

test('D17, D50: both statuses are set for a commit, each from every pull request at it', () => {
  const owners = { number: 3, statuses: judge(agentPr({ author: 'owner' }), null) };
  const agents = { number: 5, statuses: judge(agentPr(), issue(['merge:agent'], { review: { sha: 'sha2', verdict: 'approved' } })) };
  assert.deepEqual(statusesAtSha([agents]).map((s) => [s.context, s.state]), [['merge-gate', 'success'], ['owner-merge', 'success']]);
  const both = statusesAtSha([owners, agents]);
  assert.deepEqual(both.map((s) => [s.context, s.state]), [['merge-gate', 'success'], ['owner-merge', 'pending']]);
  assert.match(both[1].description, /^#3: /);
});

test('D17: the owner-merge ruleset requires owner-merge and lets only the repository admin bypass it', () => {
  const rs = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'cloud/ruleset-owner-merge.json'), 'utf8'));
  assert.deepEqual(rs.conditions.ref_name.include, ['~DEFAULT_BRANCH']);
  assert.deepEqual(rs.bypass_actors, [{ actor_id: 5, actor_type: 'RepositoryRole', bypass_mode: 'always' }]);
  const checks = rs.rules.find((r) => r.type === 'required_status_checks').parameters.required_status_checks;
  assert.deepEqual(checks, [{ context: 'owner-merge', integration_id: 15368 }]);
  const main = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'cloud/ruleset-main.json'), 'utf8'));
  assert.deepEqual(main.bypass_actors, []);
});

// ---- D50: one status per commit, judged from the default branch ---------------------

const { targetOf } = require(path.join(__dirname, '..', 'cloud/dispatcher/merge-gate.js'));

const ok = { state: 'success', description: 'The review agent approved this commit' };
const waiting = { state: 'pending', description: "Waiting for the review agent's approval of this commit" };

test('D50: a commit shared by two pull requests passes only when both pass', () => {
  assert.equal(gateAtSha([{ number: 3, result: ok }, { number: 5, result: ok }]).state, 'success');
  const r = gateAtSha([{ number: 3, result: ok }, { number: 5, result: waiting }]);
  assert.equal(r.state, 'pending');
  assert.match(r.description, /^#5: /);
  assert.deepEqual(gateAtSha([{ number: 3, result: ok }]), ok);
  assert.equal(gateAtSha([]).state, 'pending');
});

test('D50: only open pull requests whose head is the commit are judged', () => {
  const pulls = [
    { number: 1, state: 'open', head: { sha: 'a' } },
    { number: 2, state: 'closed', head: { sha: 'a' } },
    { number: 3, state: 'open', head: { sha: 'b' } },
  ];
  assert.deepEqual(pullsAtSha(pulls, 'a').map((p) => p.number), [1]);
});

test('D50: every trigger is reduced to a head commit', () => {
  assert.deepEqual(targetOf('workflow_run', { workflow_run: { head_sha: 'abc', pull_requests: [] } }), { sha: 'abc', number: null });
  assert.deepEqual(targetOf('pull_request_target', { pull_request: { number: 4, head: { sha: 'def' } } }), { sha: 'def', number: 4 });
  assert.deepEqual(targetOf('workflow_dispatch', { inputs: { pr: '7' } }), { sha: null, number: 7 });
  assert.throws(() => targetOf('workflow_dispatch', { inputs: {} }));
});

test('D50: the review relay holds no permissions and merge-gate never runs on pull_request_review', () => {
  const wf = (name) => fs.readFileSync(path.join(__dirname, '..', '.github/workflows', name), 'utf8');
  assert.match(wf('review-relay.yml'), /^permissions: \{\}$/m);
  assert.doesNotMatch(wf('review-relay.yml'), /uses:|checkout|secrets\./);
  assert.doesNotMatch(wf('merge-gate.yml'), /^\s+pull_request_review:/m);
  assert.match(wf('merge-gate.yml'), /workflows: \[review-relay\]/);
});
