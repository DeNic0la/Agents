// The pinned status issue (CW-74, CW-83, CW-86, D38): which open issue it is, what its body
// says, and when it must be rewritten at once. Pure: the issues, pull requests and the
// month's spend come from the caller. The body is rewritten in full on every update; the
// owner's reminders are only here (CW-44).
'use strict';

const L = require('./labels');
const { actorKind } = require('./actors');
const { formatRecord, parseRecord, neutralizeMarkers } = require('./markers');

const STATUS_TITLE = 'Cloud workflow status';
const MAX_LIST = 50; // entries per list; the body stays far below GitHub's 65,536 characters
const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 7; // the first window, before any scout run (scout.schedule: weekly)
const usd = (n) => `$${Number(n).toFixed(2)}`;
const code = (s) => `\`${s}\``;

// The dispatcher's open issue whose body carries the status record. The newest wins when
// a race left two.
function findStatusIssue(open, settings) {
  const mine = (open || []).filter((i) => actorKind(i.author, settings) === 'dispatcher' && isStatusRecord(parseRecord(i.body)));
  return mine.sort((a, b) => b.number - a.number)[0] || null;
}

const isStatusRecord = (r) => Boolean(r && r.statusIssue === true);

// The flags whose change rewrites the status issue at once (CW-83, CW-86, CW-84).
function statusFlags({ month, stopped }) {
  return { paused: Boolean(month.reached), warning: Boolean(month.warning && !month.reached), stopped: Boolean(stopped) };
}

// Whether the status issue says something else than `flags`. Without a status issue,
// only a flag that is on needs one.
function flagsChanged(status, flags) {
  const was = (status && (parseRecord(status.body) || {}).flags) || {};
  return ['paused', 'warning', 'stopped'].some((k) => Boolean(was[k]) !== flags[k]);
}

// CW-74, CW-63: "merged since the last run". A scout run moves the window to start at the
// run before it; the updates between scout runs keep the window, so the list grows until
// the next scout run and every merge is listed at one scout update at least.
function statusWindow(record, now, scoutRun) {
  const fallback = new Date(now - WINDOW_DAYS * DAY_MS).toISOString();
  const r = record || {};
  if (scoutRun) return { since: r.scoutAt || r.since || fallback, scoutAt: new Date(now).toISOString() };
  return { since: r.since || fallback, scoutAt: r.scoutAt || null };
}

// A title from GitHub on one line, unable to carry a marker or to notify anyone.
function safeTitle(title) {
  return neutralizeMarkers(String(title || '').replace(/\s+/g, ' ').trim()).replace(/@(?=\w)/g, '@​').slice(0, 200);
}

const stateOf = (labels) => L.STATES.find((s) => labels.includes(s)) || null;

// What waits for the owner: a question or an approval, a paused issue, and a pull request
// only the owner may merge (CW-65).
function waitsForOwner(issue) {
  const state = stateOf(issue.labels);
  if (state === 'needs-answer' || state === 'needs-approval') return state;
  if (issue.labels.includes(L.PAUSED)) return `${state || 'no state'}, paused`;
  if (state === 'in-review' && issue.labels.includes('merge:human')) return 'in-review, merge:human';
  return null;
}

// The merge class a pull request states in its body (D85's last `Merge class:` line).
function mergeClassOf(body) {
  const all = [...String(body || '').matchAll(/^Merge class: (merge:(?:self|agent|human))\s*$/gm)];
  return all.length ? all[all.length - 1][1] : null;
}

function list(entries, line) {
  if (!entries.length) return ['None.'];
  const shown = entries.slice(0, MAX_LIST).map(line);
  if (entries.length > MAX_LIST) shown.push(`- and ${entries.length - MAX_LIST} more`);
  return shown;
}

const MERGE_GROUPS = [
  ['merge:self', '`merge:self`, merged by the implement agent (CW-63)'],
  ['merge:agent', '`merge:agent`, approved and merged by the review agent'],
  ['merge:human', '`merge:human`, merged by the owner'],
  [null, 'no merge class (not an agent\'s pull request)'],
];

// The status issue's body. `open`: open issues [{ number, title, labels, author, body }];
// `merged`: pull requests merged in the window [{ number, title, mergeClass, mergedAt, issues }];
// `month`: monthStatus(); `flags`: statusFlags(); `window`: statusWindow().
function statusBody({ open, merged, month, flags, window, mode, settings, statusNumber = null }) {
  const issues = (open || []).filter((i) => i.number !== statusNumber && !(actorKind(i.author, settings) === 'dispatcher' && isStatusRecord(parseRecord(i.body))));
  const waiting = [];
  const progress = [];
  for (const i of issues.sort((a, b) => a.number - b.number)) {
    const why = waitsForOwner(i);
    if (why) waiting.push({ ...i, why });
    else if (stateOf(i.labels)) progress.push({ ...i, why: stateOf(i.labels) });
  }

  const state = flags.stopped ? '**Stopped** by the stop switch: nothing starts and running sessions were interrupted. Actions, `resume`, Run workflow starts it again; a `CLOUD_STOPPED` variable set to `true` must be removed as well.'
    : flags.paused ? `**Paused**: the monthly cap of ${usd(month.capUsd)} is reached. Nothing starts until the month turns or the cap is raised; issues keep their labels.`
      : '**Running.**';
  const pct = month.capUsd > 0 ? Math.round((month.monthUsd / month.capUsd) * 100) : 0;
  const lines = [
    'The dispatcher keeps this issue up to date and rewrites this text on every update, so edits here are lost. It is the only reminder you get: an issue that waits for you is never changed or nagged about (CW-44).',
    '',
    `State: ${state}${mode === 'live' ? '' : ' The dispatcher runs in dry run (`cloud/settings.json` `mode`): it only comments what it would do and starts no session.'}`,
    '',
    `Spend this month (UTC): ${usd(month.monthUsd)} of ${usd(month.capUsd)} (${pct}%).${flags.warning ? ` **Warning:** past ${Math.round(Number(settings.warningLevel) * 100)}% of the monthly cap (CW-86).` : ''}`,
    '',
    `## Waits for you (${waiting.length})`,
    '',
    ...list(waiting, (i) => `- #${i.number} ${code(i.why)}: ${safeTitle(i.title)}`),
    '',
    `## In progress (${progress.length})`,
    '',
    ...list(progress, (i) => `- #${i.number} ${code(i.why)}: ${safeTitle(i.title)}`),
    '',
    `## Merged since ${String(window.since).slice(0, 10)} (${(merged || []).length})`,
    '',
  ];
  if (!(merged || []).length) lines.push('None.');
  for (const [cls, label] of MERGE_GROUPS) {
    const group = (merged || []).filter((p) => (p.mergeClass || null) === cls).sort((a, b) => a.number - b.number);
    if (!group.length) continue;
    lines.push(`${label}:`, '', ...list(group, (p) => `- #${p.number} ${safeTitle(p.title)}${p.issues && p.issues.length ? ` (closes ${p.issues.map((n) => `#${n}`).join(', ')})` : ''}`), '');
  }
  const record = { statusIssue: true, since: window.since, scoutAt: window.scoutAt, flags };
  return `${lines.join('\n').trimEnd()}\n\n${formatRecord(record)}`;
}

module.exports = { STATUS_TITLE, findStatusIssue, statusFlags, flagsChanged, statusWindow, statusBody, mergeClassOf, waitsForOwner, safeTitle };
