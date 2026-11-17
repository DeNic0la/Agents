// Entry point of the dispatch workflow: reads the event, loads the issues it concerns,
// decides and applies. Reads GITHUB_EVENT_NAME, GITHUB_EVENT_PATH, GITHUB_TOKEN,
// GITHUB_REPOSITORY, optional GITHUB_API_URL and CLOUD_STOPPED (repository variable).
// In live mode it also starts each session as a run of the session workflow; the job
// passes whether the secrets that workflow needs exist (HAS_* = 'true').
'use strict';

const fs = require('fs');
const path = require('path');
const { createClient } = require('./github/client');
const { loadIssueView, listOpenIssues, listClosedSince, listCommentsSince } = require('./github/snapshot');
const { applyPlan, dryRunComment } = require('./github/apply');
const { decideAll, readFacts } = require('./decide');
const { activeSessionIssues, activeRuns, dispatchWorkflow, SESSION_WORKFLOW, MERGE_GATE_WORKFLOW, SCOUT_WORKFLOW } = require('./github/actions');
const { refreshStatus, statusComment } = require('./github/status');
const { findStatusIssue, statusFlags, flagsChanged } = require('./decide/status');
const { closingIssues } = require('./decide/spec');
const L = require('./decide/labels');
const { settingsProblems } = require('./decide/settings');
const { monthStart, monthSpend, monthStatus } = require('./decide/spend');

const SETTINGS = path.join(__dirname, '..', 'settings.json');

// D49: all dispatch runs share one concurrency group, and a newer pending run replaces
// an older one. So each run also reconciles every issue that changed recently: what a
// replaced run would have looked at is never lost.
const RECENT_MINUTES = 30;
const ACTIVE = ['in-progress', 'in-review'];
const CLEANUP = [...L.STATES, L.APPROVED, L.PAUSED, L.BUDGET_EXTEND];

// Which issues an event concerns: a list of numbers, or 'all' for a full reconcile.
function focusIssues(name, event) {
  switch (name) {
    case 'issues':
      return [event.issue.number];
    case 'issue_comment':
      return event.issue.pull_request ? closingIssues(event.issue.body) : [event.issue.number];
    case 'pull_request':
    case 'pull_request_target':
      return closingIssues(event.pull_request.body);
    case 'workflow_dispatch': {
      const n = Number(event.inputs && event.inputs.issue);
      return Number.isInteger(n) && n > 0 ? [n] : 'all';
    }
    case 'schedule':
      return 'all';
    // D90: the run names the pull request, not the issue; a full reconcile finds it.
    case 'workflow_run':
      return 'all';
    default:
      return [];
  }
}

// Which issues one run decides: the ones the event concerns, every open issue changed
// recently, every recently closed issue that still carries labels to clean, and every
// `ready` issue, which competes for the free slots (D47). While one waits, every
// `needs-answer` issue comes along too: only its record says whether it holds a slot (D22).
// `activeElsewhere` counts the active issues outside that set.
function reconcileTargets({ focus, open, closed = [], now = Date.now(), recentMinutes = RECENT_MINUTES }) {
  const since = now - recentMinutes * 60 * 1000;
  const recent = (i) => i.updatedAt && Date.parse(i.updatedAt) >= since;
  const numbers = new Set(focus === 'all' ? open.map((i) => i.number) : focus);
  for (const i of open) if (recent(i) || i.labels.includes('ready')) numbers.add(i.number);
  if (open.some((i) => i.labels.includes('ready'))) for (const i of open) if (i.labels.includes('needs-answer')) numbers.add(i.number);
  for (const i of closed) if (recent(i) && i.labels.some((l) => CLEANUP.includes(l))) numbers.add(i.number);
  const activeElsewhere = open.filter((i) => !numbers.has(i.number) && i.labels.some((l) => ACTIVE.includes(l))).length;
  return { numbers: [...numbers].sort((a, b) => a - b), activeElsewhere };
}

// Owner steps 4 and 5: what the session workflow needs before live mode may start one.
function liveSetupMissing(env) {
  const missing = [];
  if (env.HAS_ANTHROPIC_API_KEY !== 'true') missing.push('the secret ANTHROPIC_API_KEY');
  if (!env.AGENT_APP_ID) missing.push('the variable AGENT_APP_ID');
  if (env.HAS_AGENT_APP_PRIVATE_KEY !== 'true') missing.push('the secret AGENT_APP_PRIVATE_KEY');
  return missing;
}

// An issue has a session running when the dispatcher requested one (its `session`
// record) and a session run for it is queued or running, or was requested so recently
// that GitHub may not list the run yet. A run that ended without clearing the record has
// crashed: the rules count a failure and start the agent again (CW-16).
const START_GRACE_MINUTES = 10;
function runningSessions(views, activeIssues, settings, now = Date.now()) {
  return new Set(views.filter((v) => {
    const session = readFacts(v, settings).record.session;
    if (!session) return false;
    return activeIssues.has(v.number) || now - Date.parse(session.at || 0) < START_GRACE_MINUTES * 60000;
  }).map((v) => v.number));
}

// CW-83: what running sessions may still spend: the hard limit each was started with.
// `views` are the issues this run decides; `others` holds the views of issues outside
// them that have a session run active.
function reservedUsd(views, running, others, settings) {
  let usd = 0;
  for (const v of [...views.filter((x) => running.has(x.number)), ...others]) {
    const session = readFacts(v, settings).record.session;
    if (session && Number.isFinite(Number(session.limitUsd))) usd += Number(session.limitUsd);
  }
  return Math.round(usd * 100) / 100;
}

// CW-74, CW-83, CW-86: when this run rewrites the status issue. The hourly schedule and a
// full reconcile by hand bring it up to date and create it; any other run only when the
// cap, the warning or the stop switch flipped, so the owner learns of it at once.
// Returns { create } or null.
function statusRefresh({ eventName, focus, status, flags }) {
  if (eventName === 'schedule' || (eventName === 'workflow_dispatch' && focus === 'all')) return { create: true };
  if (flagsChanged(status, flags)) return { create: Object.values(flags).some(Boolean) };
  return null;
}

// A running scout session may spend up to its per-run cap (D103).
async function scoutReserveUsd(client, settings) {
  const runs = await activeRuns(client, SCOUT_WORKFLOW);
  const cap = Number(settings.caps.perRunUsd && settings.caps.perRunUsd.scout);
  return runs.length && Number.isFinite(cap) ? cap : 0;
}

function loadSettings(file = SETTINGS) {
  if (!fs.existsSync(file)) throw new Error('cloud/settings.json is missing');
  const settings = JSON.parse(fs.readFileSync(file, 'utf8'));
  const problems = settingsProblems(settings);
  if (problems.length) throw new Error(`cloud/settings.json: ${problems.join('; ')}`);
  return settings;
}

async function main() {
  const env = process.env;
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPOSITORY || !env.GITHUB_EVENT_PATH) {
    throw new Error('GITHUB_TOKEN, GITHUB_REPOSITORY and GITHUB_EVENT_PATH are required');
  }
  const settings = loadSettings();
  const live = settings.mode === 'live';
  const missing = live ? liveSetupMissing(env) : [];
  if (missing.length) throw new Error(`live mode needs ${missing.join(', ')} (build plan, owner steps 4 and 5); keep "mode": "dry-run" until then`);

  const event = JSON.parse(fs.readFileSync(env.GITHUB_EVENT_PATH, 'utf8'));
  const focus = focusIssues(env.GITHUB_EVENT_NAME, event);
  const client = createClient({ token: env.GITHUB_TOKEN, repository: env.GITHUB_REPOSITORY, ...(env.GITHUB_API_URL ? { apiUrl: env.GITHUB_API_URL } : {}) });

  const open = await listOpenIssues(client);
  const closed = await listClosedSince(client, new Date(Date.now() - RECENT_MINUTES * 60 * 1000).toISOString());
  const { numbers, activeElsewhere } = reconcileTargets({ focus, open, closed });
  if (!numbers.length) return console.log('No issue to reconcile.');

  const views = [];
  for (const n of numbers) views.push(await loadIssueView(client, n));
  const active = live ? await activeSessionIssues(client) : new Set();
  const running = live ? runningSessions(views, active, settings) : new Set();
  const others = [];
  for (const n of active) if (!numbers.includes(n)) others.push(await loadIssueView(client, n));
  // CW-83, CW-85: the month's spend from the session costs recorded on issues.
  const { monthUsd } = monthSpend(await listCommentsSince(client, monthStart()), settings);
  const scoutUsd = live ? await scoutReserveUsd(client, settings) : 0;
  const spend = { monthUsd, reservedUsd: Math.round((reservedUsd(views, running, others, settings) + scoutUsd) * 100) / 100 };
  const month = monthStatus(monthUsd, settings);
  console.log(`Month so far: $${monthUsd.toFixed(2)} of $${month.capUsd.toFixed(2)}; running sessions may still spend $${spend.reservedUsd.toFixed(2)}.`);
  if (month.reached) console.log(`::warning::The monthly cap of $${month.capUsd.toFixed(2)} is reached: no session starts until the turn of the month or a raised cap.`);
  else if (month.warning) console.log(`::warning::The month's spend has passed the warning level of ${Math.round(settings.warningLevel * 100)}% of the cap.`);
  const stopped = env.CLOUD_STOPPED === 'true';
  const ctx = { settings, control: { stopped }, running, activeElsewhere, spend };

  // CW-103: a session that could not be started is reported, and the run fails visibly.
  const failures = [];
  const start = async (workflow, inputs, what) => {
    try {
      await dispatchWorkflow(client, workflow, env.DEFAULT_BRANCH || 'main', inputs);
    } catch (err) {
      failures.push(`${what}: ${err.message}`);
      console.log(`::error::Could not start ${what}: ${err.message}`);
    }
  };
  for (const plan of decideAll(views, ctx)) {
    if (live && plan.start) plan.remember({ session: { role: plan.start.role, limitUsd: plan.start.limitUsd, at: new Date().toISOString() } });
    await applyPlan(client, plan, settings.mode);
    if (live && plan.start) await start(SESSION_WORKFLOW, { issue: plan.number, role: plan.start.role }, `the ${plan.start.role} session for #${plan.number}`);
    // CW-63: merge-gate reads the record just written; its run then starts the merge job.
    const check = plan.record.mergeCheck;
    if (live && check && check.pull) await start(MERGE_GATE_WORKFLOW, { pr: String(check.pull) }, `merge-gate for #${check.pull}`);
    const summary = dryRunComment(plan);
    console.log(`#${plan.number}: ${summary ? summary.split('\n').filter((l) => l.startsWith('- ')).join(' ') : 'nothing to do'}`);
  }

  const refresh = statusRefresh({ eventName: env.GITHUB_EVENT_NAME, focus, status: findStatusIssue(open, settings), flags: statusFlags({ month, stopped }) });
  if (refresh || failures.length) await refreshStatus(client, settings, { monthStatus: month, stopped, create: Boolean((refresh && refresh.create) || failures.length) });
  if (failures.length) {
    const text = ['The dispatcher could not start what it decided (CW-103). A requested session counts as lost on its issue and starts again on a later run.', '', ...failures.map((f) => `- ${f}`)].join('\n');
    await statusComment(client, settings, { text, monthStatus: month });
    process.exitCode = 1;
  }
  return undefined;
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { reservedUsd, statusRefresh, scoutReserveUsd, focusIssues, reconcileTargets, loadSettings, liveSetupMissing, runningSessions };
