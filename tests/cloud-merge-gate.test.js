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
