// Pure decision for the `merge-gate` commit status of a pull request. No I/O.
// Phase 1 rules only: the owner's own pull requests pass, others need the owner's approval
// of the current head commit. Later phases add the `merge:self` and `merge:agent` classes.
'use strict';

const MAX_DESCRIPTION = 140;

function result(state, description) {
  return { state, description: description.slice(0, MAX_DESCRIPTION) };
}

function mergeGate({ pr, reviews, owner }) {
  if (pr.author === owner) return result('success', 'Opened by the owner');

  const decisive = (reviews || [])
    .filter((r) => r.user === owner && r.state !== 'COMMENTED')
    .sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
  const latest = decisive[decisive.length - 1];
  if (latest && latest.state === 'APPROVED' && latest.commitId === pr.headSha) {
    return result('success', 'Approved by the owner');
  }
  return result('pending', "Waiting for the owner's approval");
}

module.exports = { mergeGate };
