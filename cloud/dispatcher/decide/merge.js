// Pure rules of the implementation's pull request and the agent's merge (CW-50 to CW-55,
// CW-62, CW-63, CW-69). No I/O: the session job, the dispatcher and the merge job feed in
// what they read and do what comes back.
'use strict';

const L = require('./labels');
const { actorKind } = require('./actors');
const { closingIssues, qualifiedClosing } = require('./spec');
const { lowestMergeClass, higher } = require('./merge-class');
const { judgePull, classOf, CONTEXTS } = require('./merge-gate');

const usd = (n) => `$${Number(n || 0).toFixed(2)}`;
const code = (s) => `\`${s}\``;

// CW-50, CW-55: one branch per issue, and the session pushes only there.
const branchName = (number) => `cloud/issue-${number}`;

// The merge class label of an issue; with several, the highest counts (CW-67).
const mergeLabelOf = (labels) => classOf([...(labels || [])]);

// CW-51: the pull request closes its issue and carries its merge class. The body the
// agent wrote may close this issue or none; a body that closes another issue is refused,
// because the merge gate judges a pull request by the one issue it closes.
function pullBody(body, number, mergeClass) {
  const text = String(body || '').trim();
  const closes = closingIssues(text);
  const qualified = qualifiedClosing(text);
  if (qualified.length) return { ok: false, error: `the pull request body closes ${qualified.join(', ')}; name the issue only as #${number}` };
  if (closes.some((n) => n !== number)) return { ok: false, error: `the pull request body closes ${closes.filter((n) => n !== number).map((n) => `#${n}`).join(', ')}; it may close only #${number}` };
  const lines = [text];
  if (mergeClass && !/^Merge class: merge:(self|agent|human)\s*$/m.test(text)) lines.push(`Merge class: ${mergeClass}`);
  if (!closes.length) lines.push(`Closes #${number}`);
  return { ok: true, body: lines.join('\n\n') };
}

// Which existing pull request from the issue's branch a continuing session updates: the
// open one, else the newest closed one that was never merged (CW-55: one pull request).
// `pulls`: GitHub's list for head=<owner>:<branch>, state=all.
function pullToReuse(pulls) {
  const list = [...(pulls || [])].sort((a, b) => b.number - a.number);
  return list.find((p) => p.state === 'open') || list.find((p) => p.state === 'closed' && !p.merged_at) || null;
}

// CW-62: the lowest class the changed paths, file types and size allow, raised onto the
// issue when it's higher than its label. `pull.files` comes from the snapshot.
function mergeClassCheck(labels, pull, settings) {
  const now = mergeLabelOf(labels);
  const { mergeClass, reasons } = lowestMergeClass({ files: pull.files || [] }, settings);
  const effective = now ? higher(now, mergeClass) : mergeClass;
  return { now, computed: mergeClass, effective, raised: effective !== now, reasons };
}

// The merge job's verdict on one open pull request. `pr`: { number, author, draft,
// headSha, body, mergeable, mergeableState }; `issue`: { number, state, labels, record }
// or null; `checkRuns`: [{ id, name, status, conclusion }] at the head; `statuses`: the
// combined status's [{ context, state }]. Actions: merge, conflict (back to the implement
// agent), regate (run merge-gate again), wait (with `why`), or skip (not the agent's to merge). A branch behind the default
// branch still merges: the rulesets don't require it up to date (D74).
const REQUIRED_CHECK = 'ci';
function mergeVerdict({ pr, issue, checkRuns = [], statuses = [], settings, stopped = false }) {
  const skip = (why) => ({ action: 'skip', why });
  const wait = (why) => ({ action: 'wait', why });
  if (actorKind(pr.author, settings) !== 'agent') return skip('not opened by the agent');
  if (!issue) return skip('it names no single issue it closes');
  if (issue.state !== 'open') return skip(`issue #${issue.number} is not open`);
  const cls = mergeLabelOf(issue.labels);
  if (!['merge:self', 'merge:agent'].includes(cls)) return skip(`issue #${issue.number} is ${cls || 'without a merge class'}`);
  if ((pr.labels || []).includes('merge:human')) return skip('the pull request is merge:human');
  if (stopped) return wait('the stop switch CLOUD_STOPPED is on');
  if (pr.draft) return wait('it is a draft');
  if (!issue.labels.includes('in-review')) return wait(`issue #${issue.number} is not \`in-review\``);
  if (issue.labels.includes(L.PAUSED)) return wait(`issue #${issue.number} is \`paused\``);
  const gate = judgePull({ pr, issue, settings });
  for (const c of CONTEXTS) if (gate[c].state !== 'success') return wait(`${c}: ${gate[c].description}`);
  if (pr.mergeableState === 'dirty' || pr.mergeable === false) return { action: 'conflict', why: 'it conflicts with the default branch' };
  if (pr.mergeable == null) return wait('GitHub has not yet computed whether it merges cleanly');

  // D75: what the rulesets require, no more: the newest `ci` check run must have passed.
  const ci = checkRuns.filter((r) => r.name === REQUIRED_CHECK).sort((a, b) => b.id - a.id)[0];
  if (!ci) return wait('no `ci` check at the head commit yet');
  if (ci.status !== 'completed') return wait('`ci` is still running');
  if (ci.conclusion !== 'success') return wait(`\`ci\` ended with ${ci.conclusion}`);
  // The statuses the merge-gate workflow set at this commit, not just what judgePull says
  // now: the rulesets may not be enforced (owner step 3), so the job checks them itself.
  for (const c of CONTEXTS) {
    const s = statuses.find((x) => x.context === c);
    // judgePull passes, so a status that isn't success is stale or never arrived (a lost
    // dispatch, a failed merge-gate run): the job runs the gate again (D85).
    if (!s || s.state !== 'success') return { action: 'regate', why: `the \`${c}\` status at the head commit is ${s ? s.state : 'missing'}` };
  }
  return { action: 'merge', mergeClass: cls };
}

// CW-69: the closing comment, by the agent after its merge or by the dispatcher after
// the owner's. `record` is the issue's dispatcher record.
function closingComment({ pull, title, by, record = {} }) {
  const filed = (record.filed || []).map((n) => `#${n}`);
  return [
    `Merged #${pull}${title ? ` (${title})` : ''} ${by === 'owner' ? 'by the owner' : 'as the agent'}. What changed is in the pull request: its summary and how each acceptance criterion was met.`,
    `Cost of this issue across all its sessions: ${usd(record.totalUsd)}.`,
    `Issues filed along the way: ${filed.length ? filed.join(', ') : 'none'}.`,
  ].join('\n\n');
}

module.exports = { branchName, mergeLabelOf, pullBody, pullToReuse, mergeClassCheck, mergeVerdict, closingComment };
