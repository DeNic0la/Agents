// Reads what the status issue reports and writes it (CW-74, CW-83, CW-103, D27): the
// rewrite of its body and the dispatcher's comments on it. Uses the Actions token, so the
// dispatcher is the author and the rules leave the issue alone (D38).
'use strict';

const { listOpenIssues } = require('./snapshot');
const { DISPATCH_WORKFLOW } = require('./actions');
const S = require('../decide/status');
const { parseRecord, formatRecord, neutralizeMarkers } = require('../decide/markers');
const { closingIssues } = require('../decide/spec');
const { actorKind } = require('../decide/actors');

// Pull requests merged since `since` (ISO time), newest update first. Stops at the first
// page entry updated before `since`: a merge updates the pull request.
async function listMergedSince(client, since, maxPages = 5) {
  const from = Date.parse(since);
  const out = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const pulls = await client.request('GET', `/repos/${client.repo}/pulls?state=closed&sort=updated&direction=desc&per_page=100&page=${page}`);
    if (!Array.isArray(pulls) || !pulls.length) break;
    for (const p of pulls) {
      if (p.merged_at && Date.parse(p.merged_at) >= from) {
        out.push({ number: p.number, title: p.title || '', mergedAt: p.merged_at, mergeClass: S.mergeClassOf(p.body), issues: closingIssues(p.body) });
      }
    }
    if (pulls.length < 100 || Date.parse(pulls[pulls.length - 1].updated_at) < from) break;
  }
  return out;
}

// CW-84: the stop switch disabled the dispatch workflow. Unknown counts as not stopped.
async function dispatchDisabled(client) {
  try {
    const w = await client.request('GET', `/repos/${client.repo}/actions/workflows/${DISPATCH_WORKFLOW}`);
    return Boolean(w && w.state && w.state !== 'active');
  } catch {
    return false;
  }
}

// Pins the new status issue. Pinning needs more than the Actions token may have (D107):
// a failure is logged and the owner pins it by hand.
async function pin(client, nodeId, log) {
  try {
    const r = await client.request('POST', '/graphql', { query: 'mutation($id: ID!) { pinIssue(input: { issueId: $id }) { issue { number } } }', variables: { id: nodeId } });
    if (r && r.errors && r.errors.length) throw new Error(r.errors.map((e) => e.message).join('; '));
  } catch (err) {
    log(`::warning::Could not pin the status issue: ${err.message}. Pin it by hand.`);
  }
}

// Rewrites the status issue when its text changed; creates it when `create` is set and
// none is open. Returns { number, changed } or null when there is none and none was made.
// `stopped`: the CLOUD_STOPPED variable; the disabled dispatch workflow counts as well.
async function refreshStatus(client, settings, { monthStatus: month, stopped = false, scoutRun = false, create = false, open = null, now = Date.now(), log = console.log }) {
  const issues = open || await listOpenIssues(client);
  let status = S.findStatusIssue(issues, settings);
  if (!status && !create) return null;
  const isStopped = Boolean(stopped) || await dispatchDisabled(client);
  const flags = S.statusFlags({ month, stopped: isStopped });
  const window = S.statusWindow(status ? parseRecord(status.body) : null, now, scoutRun);
  const merged = await listMergedSince(client, window.since);
  const body = S.statusBody({ open: issues, merged, month, flags, window, mode: settings.mode, settings, statusNumber: status ? status.number : null });
  if (!status) {
    // Another run may have made it meanwhile (D107).
    status = S.findStatusIssue(await listOpenIssues(client), settings);
    if (!status) {
      const made = await client.request('POST', `/repos/${client.repo}/issues`, { title: S.STATUS_TITLE, body });
      log(`Opened the status issue #${made.number}.`);
      if (made.node_id) await pin(client, made.node_id, log);
      return { number: made.number, changed: true };
    }
  }
  if (status.body === body) return { number: status.number, changed: false };
  await client.request('PATCH', `/repos/${client.repo}/issues/${status.number}`, { body });
  return { number: status.number, changed: true };
}

// A dispatcher comment on the status issue (a scout run's report, a start error). The
// record carries a session's cost for the month ledger (D97). Without `number` it brings
// the issue up to date first, and creates it if needed.
async function statusComment(client, settings, { text, record = null, number = null, monthStatus: month, log = console.log }) {
  const target = number || (await refreshStatus(client, settings, { monthStatus: month, create: true, log })).number;
  const body = `${neutralizeMarkers(text)}${record ? `\n\n${formatRecord(record)}` : ''}`;
  await client.request('POST', `/repos/${client.repo}/issues/${target}/comments`, { body });
  return target;
}

// The scout sessions the status issue's timeline has a cost record of (D108).
function recordedScoutSessions(timeline, settings) {
  const ids = new Set();
  for (const e of timeline || []) {
    if (e.type !== 'commented' || actorKind(e.actor, settings) !== 'dispatcher') continue;
    const r = parseRecord(e.body);
    if (r && r.scoutSession) ids.add(r.scoutSession);
  }
  return ids;
}

module.exports = { listMergedSince, dispatchDisabled, refreshStatus, statusComment, recordedScoutSessions };
