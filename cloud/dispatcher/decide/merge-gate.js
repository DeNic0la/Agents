// Pure decisions for the two required commit statuses of a pull request (D17, D18, CW-63 to
// CW-66). No I/O.
//
// `merge-gate` says whether the agent's own merge rule is met. For a pull request the agent
// identity opened, it's green under `merge:self` when the dispatcher confirmed that class at
// the head commit (CW-62, CW-63), and under `merge:agent` when the review agent approved the
// head commit (CW-64, D18). Every other pull request isn't the agent's to merge, so
// `merge-gate` passes it on to `owner-merge`.
//
// `owner-merge` stays pending unless the agent may merge: an agent pull request whose issue is
// `merge:self` or `merge:agent`. Its ruleset lets only the owner bypass it, so `merge:human`,
// the owner's own pull requests and anyone else's are merged by the owner (CW-65). Authorship
// is not authorization (D17): an owner-authored pull request changes neither gate.
'use strict';

const { actorKind } = require('./actors');
const { closingIssues } = require('./spec');

const MAX_DESCRIPTION = 140;
const AGENT_CLASSES = ['merge:self', 'merge:agent'];
const CLASSES = ['merge:human', 'merge:agent', 'merge:self']; // highest first (CW-67)

function result(state, description) {
  return { state, description: description.slice(0, MAX_DESCRIPTION) };
}

// The merge class label of an issue; with several, the highest counts.
const classOf = (labels) => CLASSES.find((c) => (labels || []).includes(c)) || null;

// The one issue an agent pull request is for (one branch and pull request per issue, CW-50).
function issueNumberOf(pr) {
  const numbers = closingIssues(pr.body);
  return numbers.length === 1 ? numbers[0] : null;
}

// `pr`: { author, headSha, body }; `issue`: { number, state, labels, record } or null.
function judgePull({ pr, issue, settings }) {
  const ownerDecides = (why) => ({
    'merge-gate': result('success', `${why}: owner-merge decides`),
    'owner-merge': result('pending', `${why}: only the owner merges it`),
  });
  if (actorKind(pr.author, settings) !== 'agent') return ownerDecides('Not opened by the agent');
  if (!issue) return ownerDecides('Names no single issue it closes');
  if (issue.state !== 'open') return ownerDecides(`Issue #${issue.number} is not open`);
  const cls = classOf(issue.labels);
  if (!AGENT_CLASSES.includes(cls)) return ownerDecides(cls ? `Issue #${issue.number} is ${cls}` : `Issue #${issue.number} has no merge class`);

  const record = issue.record || {};
  const owner = result('success', `Issue #${issue.number} is ${cls}: the agent may merge`);
  if (cls === 'merge:self') {
    const check = record.mergeCheck;
    const ok = check && check.sha === pr.headSha && check.merge === 'merge:self';
    return {
      'merge-gate': ok ? result('success', 'The dispatcher confirmed merge:self at this commit')
        : result('pending', 'Waiting for the dispatcher to confirm merge:self at this commit'),
      'owner-merge': owner,
    };
  }
  const review = record.review;
  const ok = review && review.sha === pr.headSha && review.verdict === 'approved';
  return {
    'merge-gate': ok ? result('success', 'The review agent approved this commit')
      : result('pending', "Waiting for the review agent's approval of this commit"),
    'owner-merge': owner,
  };
}

// D50: a status belongs to a commit, and several pull requests can share one head commit.
// It is `success` only when every open pull request at that commit passes; otherwise it
// names the first one that does not.
function gateAtSha(gates) {
  if (!gates.length) return result('pending', 'No open pull request at this commit');
  const blocked = gates.filter((g) => g.result.state !== 'success').sort((a, b) => a.number - b.number);
  if (!blocked.length) return gates.length === 1 ? gates[0].result : result('success', `All ${gates.length} pull requests at this commit pass`);
  const [first] = blocked;
  return result(first.result.state, gates.length === 1 ? first.result.description : `#${first.number}: ${first.result.description}`);
}

// Both statuses for one commit, from the judged pull requests at it.
const CONTEXTS = ['merge-gate', 'owner-merge'];
function statusesAtSha(judged) {
  return CONTEXTS.map((context) => ({ context, ...gateAtSha(judged.map((j) => ({ number: j.number, result: j.statuses[context] }))) }));
}

// The open pull requests whose head is exactly this commit.
const pullsAtSha = (pulls, sha) => (pulls || []).filter((p) => p.state === 'open' && p.head && p.head.sha === sha);

module.exports = { judgePull, issueNumberOf, classOf, gateAtSha, statusesAtSha, pullsAtSha, CONTEXTS };
