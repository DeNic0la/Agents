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

// D50: the status belongs to a commit, and several pull requests can share one head
// commit. It is `success` only when every open pull request at that commit passes;
// otherwise it names the first one that does not.
function gateAtSha(gates) {
  if (!gates.length) return result('pending', 'No open pull request at this commit');
  const blocked = gates.filter((g) => g.result.state !== 'success').sort((a, b) => a.number - b.number);
  if (!blocked.length) return gates.length === 1 ? gates[0].result : result('success', `All ${gates.length} pull requests at this commit pass`);
  const [first] = blocked;
  return result(first.result.state, gates.length === 1 ? first.result.description : `#${first.number}: ${first.result.description}`);
}

// The open pull requests whose head is exactly this commit.
const pullsAtSha = (pulls, sha) => (pulls || []).filter((p) => p.state === 'open' && p.head && p.head.sha === sha);

module.exports = { mergeGate, gateAtSha, pullsAtSha };
