// Spend rules (CW-81 to CW-86): an issue's cap with its extensions, what one session's
// cost adds to an issue's record, and the month's spend read from the dispatcher's records.
// Pure: the comments come from the caller.
'use strict';

const { actorKind } = require('./actors');
const { parseRecord } = require('./markers');

const round = (usd) => Math.round(usd * 100) / 100;

// CW-82: each `budget:extend` the owner gave allows one more cap.
function issueCap(routeName, record, settings) {
  const per = settings.caps && settings.caps.perIssueUsd ? Number(settings.caps.perIssueUsd[routeName]) : NaN;
  return per * (1 + Number((record && record.extensions) || 0));
}

// CW-81, CW-85: what one session's cost adds to its issue's record. Triage runs on its own
// per-run cap, so it counts toward the issue's total and the month, not the issue's cap.
// `sessionCostUsd` is the month ledger's entry: it is in exactly one record per session.
function costRecord(record, role, costUsd) {
  const cost = round(Number(costUsd || 0));
  const entry = { sessionCostUsd: cost, totalUsd: round(Number(record.totalUsd || 0) + cost) };
  // Triage and record run on their per-run cap, not the issue's (CW-87, D114).
  if (role !== 'triage' && role !== 'record') entry.spentUsd = round(Number(record.spentUsd || 0) + cost);
  return entry;
}

// The first instant of the calendar month (UTC) `now` falls in.
function monthStart(now = Date.now()) {
  const d = new Date(now);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

// CW-83, CW-85: the month's spend, summed from the session costs in the dispatcher's
// records. `comments` are the repository's issue comments (GitHub's shape: user.login,
// created_at, body); GitHub's `since` filters on the update time, so the creation time
// is checked here.
function monthSpend(comments, settings, now = Date.now()) {
  const start = Date.parse(monthStart(now));
  let usd = 0;
  let sessions = 0;
  for (const c of comments || []) {
    if (actorKind(c.user && c.user.login, settings) !== 'dispatcher') continue;
    if (!(Date.parse(c.created_at) >= start)) continue;
    const record = parseRecord(c.body);
    const cost = record ? Number(record.sessionCostUsd) : NaN;
    if (!Number.isFinite(cost)) continue;
    usd += cost;
    sessions += 1;
  }
  return { monthUsd: round(usd), sessions };
}

// CW-83, CW-86: where the month stands against its cap and the warning level.
function monthStatus(monthUsd, settings) {
  const cap = Number(settings.caps.monthlyUsd);
  const level = Number(settings.warningLevel);
  return {
    monthUsd,
    capUsd: cap,
    leftUsd: round(Math.max(0, cap - monthUsd)),
    reached: monthUsd >= cap,
    warning: Number.isFinite(level) && monthUsd >= cap * level,
  };
}

module.exports = { issueCap, costRecord, monthStart, monthSpend, monthStatus };
