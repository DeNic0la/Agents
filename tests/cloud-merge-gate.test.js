// Tests for cloud/dispatcher/decide/merge-gate.js.
// Run: node --test "tests/*.test.js"
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { mergeGate } = require(path.join(__dirname, '..', 'cloud/dispatcher/decide/merge-gate.js'));

const owner = 'owner';
const pr = { author: 'someone', headSha: 'sha2', draft: false };
const review = (user, state, commitId, submittedAt) => ({ user, state, commitId, submittedAt });
const gate = (reviews, over = {}) => mergeGate({ pr: { ...pr, ...over }, reviews, owner });

test('a pull request opened by the owner passes', () => {
  const r = gate([], { author: owner });
  assert.deepEqual(r, { state: 'success', description: 'Opened by the owner' });
});

test('no reviews: pending', () => {
  const r = gate([]);
  assert.equal(r.state, 'pending');
  assert.equal(r.description, "Waiting for the owner's approval");
});

test('owner approval of the head commit passes', () => {
  const r = gate([review(owner, 'APPROVED', 'sha2', '2026-01-01T10:00:00Z')]);
  assert.deepEqual(r, { state: 'success', description: 'Approved by the owner' });
});

test('an approval on an older commit does not count', () => {
  assert.equal(gate([review(owner, 'APPROVED', 'sha1', '2026-01-01T10:00:00Z')]).state, 'pending');
});

test('a later CHANGES_REQUESTED after APPROVED blocks', () => {
  const r = gate([
    review(owner, 'APPROVED', 'sha2', '2026-01-01T10:00:00Z'),
    review(owner, 'CHANGES_REQUESTED', 'sha2', '2026-01-01T11:00:00Z'),
  ]);
  assert.equal(r.state, 'pending');
});

test('an approval after CHANGES_REQUESTED passes, whatever the input order', () => {
  const r = gate([
    review(owner, 'APPROVED', 'sha2', '2026-01-01T11:00:00Z'),
    review(owner, 'CHANGES_REQUESTED', 'sha2', '2026-01-01T10:00:00Z'),
  ]);
  assert.equal(r.state, 'success');
});

test('a COMMENTED review after APPROVED keeps the approval', () => {
  const r = gate([
    review(owner, 'APPROVED', 'sha2', '2026-01-01T10:00:00Z'),
    review(owner, 'COMMENTED', 'sha2', '2026-01-01T11:00:00Z'),
  ]);
  assert.equal(r.state, 'success');
});

test('a dismissed approval is the latest decisive review and does not count', () => {
  const r = gate([
    review(owner, 'APPROVED', 'sha2', '2026-01-01T10:00:00Z'),
    review(owner, 'DISMISSED', 'sha2', '2026-01-01T11:00:00Z'),
  ]);
  assert.equal(r.state, 'pending');
});

test('reviews by others never count', () => {
  const r = gate([review('agent-bot', 'APPROVED', 'sha2', '2026-01-01T10:00:00Z')]);
  assert.equal(r.state, 'pending');
});

test('the description stays within 140 characters', () => {
  for (const r of [gate([]), gate([], { author: owner })]) assert.ok(r.description.length <= 140);
});

// ---- D50: one status per commit, judged from the default branch ---------------------

const { gateAtSha, pullsAtSha } = require(path.join(__dirname, '..', 'cloud/dispatcher/decide/merge-gate.js'));
const { targetOf } = require(path.join(__dirname, '..', 'cloud/dispatcher/merge-gate.js'));
const fs = require('fs');

const ok = { state: 'success', description: 'Approved by the owner' };
const waiting = { state: 'pending', description: "Waiting for the owner's approval" };

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
