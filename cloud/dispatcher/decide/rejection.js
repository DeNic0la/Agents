// CW-43: the owner's rejection of an issue, recorded in `.out-of-scope/` by the record agent
// in a `merge:self` pull request. Pure rules; the session job and the merge job do the I/O.
//
// The issue's dispatcher record keeps `rejection: { closes, outcome, pull, sha, merge }`.
// `closes` counts the owner's closes of the issue, so reopening and closing it as not
// planned again asks for a new record; every other event finds the record already made.
'use strict';

const { actorKind } = require('./actors');
const { lowestMergeClass } = require('./merge-class');

const recordBranch = (number) => `cloud/out-of-scope-${number}`;

// How often the owner closed the issue.
const ownerCloses = (view, settings) => (view.timeline || []).filter((e) => e.type === 'closed' && actorKind(e.actor, settings) === 'owner').length;

// The close the record agent should record, or null. Only the owner's close as not planned
// counts, and only of an issue the dispatcher took in (D113): one closed before that was
// never part of the workflow. Whether it is an enhancement, a bug or an already-built
// feature is the record agent's call (`skipped`).
function pendingRejection(view, facts, settings) {
  if (view.state !== 'closed' || view.stateReason !== 'not_planned') return null;
  const closes = (view.timeline || []).filter((e) => e.type === 'closed');
  const last = closes[closes.length - 1];
  if (!last || actorKind(last.actor, settings) !== 'owner') return null;
  if (!facts.record.intake) return null;
  const count = ownerCloses(view, settings);
  const done = facts.record.rejection;
  if (done && Number(done.closes) >= count) return null;
  return { closes: count };
}

// The record pull request of a closed issue: the one the record session opened for it.
// `pr`: { number }; `issue`: { state, record }.
function isRecordPull(pr, issue) {
  const r = issue && issue.state === 'closed' && issue.record && issue.record.rejection;
  return Boolean(r && r.pull && r.pull === pr.number);
}

// CW-43: the agent merges a record pull request only when the dispatcher confirmed, at its
// head commit, that it changes nothing but `.out-of-scope/` (`merge:self`).
function recordConfirmed(pr, issue) {
  if (!isRecordPull(pr, issue)) return false;
  const r = issue.record.rejection;
  return r.merge === 'merge:self' && Boolean(r.sha) && r.sha === pr.headSha;
}

// The record pull request's class (D118): the repository's rules, and nothing outside
// `.out-of-scope/`. A record that also changes docs, which those rules allow the agent to
// merge, is still more than CW-43 lets the record agent merge alone.
// `files`: [{ path, previousPath, ... }] as loadPullFiles maps them.
function recordClass(files, settings) {
  const check = lowestMergeClass({ files }, settings);
  const outside = (files || []).flatMap((f) => [f.previousPath, f.path]).filter(Boolean)
    .map((p) => String(p).replace(/\\/g, '/').replace(/^\.\//, ''))
    .filter((p) => !p.startsWith('.out-of-scope/'));
  if (!outside.length) return check;
  return {
    mergeClass: check.mergeClass === 'merge:human' ? 'merge:human' : 'merge:agent',
    reasons: [...check.reasons, `${outside[0]} is outside \`.out-of-scope/\``],
  };
}

module.exports = { recordBranch, ownerCloses, pendingRejection, isRecordPull, recordConfirmed, recordClass };
