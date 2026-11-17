// Turns a plan into GitHub requests. A dry run posts one comment that says what a live
// run would do, and only when that differs from the last dry-run comment on the issue.
'use strict';

const crypto = require('crypto');
const { formatRecord, formatDryRun, neutralizeMarkers } = require('../decide/markers');

const ROLE_NAMES = { triage: 'triage', refine: 'refine', implement: 'implement', review: 'review' };
const usd = (n) => `$${Number(n).toFixed(2)}`;
const code = (l) => `\`${l}\``;

function planHash(plan) {
  return crypto.createHash('sha256').update(JSON.stringify(plan.visible)).digest('hex').slice(0, 16);
}

function dryRunComment(plan) {
  const lines = [];
  if (plan.add.length) lines.push(`- add ${plan.add.map(code).join(', ')}`);
  if (plan.remove.length) lines.push(`- remove ${plan.remove.map(code).join(', ')}`);
  for (const s of plan.say) lines.push(`- comment: ${neutralizeMarkers(s)}`);
  if (plan.start) lines.push(`- start the ${ROLE_NAMES[plan.start.role]} agent with a hard limit of ${usd(plan.start.limitUsd)}`);
  if (plan.close) lines.push(`- close the issue as ${plan.close.replace('_', ' ')}`);
  for (const n of plan.notes) lines.push(`- start nothing: ${neutralizeMarkers(n)}`);
  if (!lines.length) return null;
  return `**Dry run.** The dispatcher would:\n\n${lines.join('\n')}\n\n${formatDryRun(planHash(plan))}`;
}

function liveComment(plan) {
  // Said lines can quote an agent (CW-92); only the record below may carry a marker.
  const lines = plan.say.map(neutralizeMarkers);
  if (plan.start) lines.push(`Starting the ${ROLE_NAMES[plan.start.role]} agent with a hard limit of ${usd(plan.start.limitUsd)}.`);
  const hasRecord = Object.keys(plan.record).length > 0;
  if (!lines.length && !hasRecord) return null;
  if (!lines.length) lines.push('Dispatcher state recorded.');
  return `${lines.join('\n\n')}${hasRecord ? `\n\n${formatRecord(plan.record)}` : ''}`;
}

// Returns the requests a plan needs, in order. Pure, so the order is tested.
function requestsFor(plan, mode, repo) {
  const base = `/repos/${repo}/issues/${plan.number}`;
  if (mode === 'dry-run') {
    const body = dryRunComment(plan);
    if (!body || planHash(plan) === plan.lastDryRun) return [];
    return [{ method: 'POST', path: `${base}/comments`, body: { body } }];
  }
  const out = [];
  for (const label of plan.remove) out.push({ method: 'DELETE', path: `${base}/labels/${encodeURIComponent(label)}`, ignore404: true });
  if (plan.add.length) out.push({ method: 'POST', path: `${base}/labels`, body: { labels: plan.add } });
  const body = liveComment(plan);
  if (body) out.push({ method: 'POST', path: `${base}/comments`, body: { body } });
  if (plan.close) out.push({ method: 'PATCH', path: base, body: { state: 'closed', state_reason: plan.close } });
  return out;
}

async function applyPlan(client, plan, mode) {
  for (const req of requestsFor(plan, mode, client.repo)) {
    try {
      await client.request(req.method, req.path, req.body);
    } catch (err) {
      if (!(req.ignore404 && err.status === 404)) throw err;
    }
  }
}

module.exports = { dryRunComment, liveComment, requestsFor, applyPlan, planHash };
