// Definition of Ready, items 3 to 8 (CW-14), and which ready issues may start now (CW-12).
// Items 1, 2 and 9 are about the spec's content; agents check them, not this code.
'use strict';

const L = require('./labels');

const routeLabel = (labels) => [...L.ROUTES].reverse().find((r) => labels.has(r)) || null;

// `issue`: { labels: Set|array, record, dependencies: [{ number, state }] }.
function checkReady(issue, settings) {
  const labels = issue.labels instanceof Set ? issue.labels : new Set(issue.labels);
  const record = issue.record || {};
  const route = routeLabel(labels);
  const failing = [];
  const fail = (item, text) => failing.push({ item, text });

  if (!route || !L.MERGES.some((m) => labels.has(m))) fail(3, 'it needs a route label and a merge label');
  if (labels.has(L.OBJECTION)) fail(4, 'it has an objection the owner hasn\'t approved over');
  if (!record.triage) fail(5, 'triage hasn\'t run on it (duplicates and `.out-of-scope/` unchecked)');
  const open = (issue.dependencies || []).filter((d) => d.state !== 'closed').map((d) => `#${d.number}`);
  if (open.length) fail(6, `it depends on open issues: ${open.join(', ')}`);
  // The latest estimate: the spec's (phase 4) once there is one, else triage's.
  const latest = record.estimateUsd ?? (record.triage ? record.triage.estimateUsd : undefined);
  const estimate = latest == null ? NaN : Number(latest);
  const cap = route && settings.caps && settings.caps.perIssueUsd ? settings.caps.perIssueUsd[L.routeOf(route)] : undefined;
  if (!labels.has(L.BUDGET_EXTEND) && !(Number.isFinite(estimate) && Number.isFinite(cap) && estimate <= cap)) {
    fail(7, 'its cost estimate is missing or above the per-issue cap, and there is no `budget:extend`');
  }
  const direct = route === 'route:direct' && labels.has(L.ORIGIN.owner);
  if (!labels.has(L.APPROVED) && !direct) fail(8, 'it isn\'t approved: the owner adds `approved`, or it is a `direct` issue the owner wrote');

  return { ok: failing.length === 0, failing };
}

// Issues in `in-progress` or `in-review` hold a slot. An issue that is `ready`, or
// resumes into `in-progress`, starts only when a slot is free (D47).
const hasLabel = (issue, label) => (issue.labels instanceof Set ? issue.labels.has(label) : (issue.labels || []).includes(label));

// CW-12: the issues that start now, lowest number first, as many as slots are free.
// A paused issue takes no slot.
function startableQueue(readyIssues, activeCount, settings) {
  const free = Math.max(0, Number(settings.parallelImplementations || 0) - activeCount);
  return readyIssues
    .filter((i) => checkReady(i, settings).ok && !hasLabel(i, L.PAUSED))
    .map((i) => i.number)
    .sort((a, b) => a - b)
    .slice(0, free);
}

module.exports = { checkReady, startableQueue, routeLabel };
