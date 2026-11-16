// Entry point of the dispatch workflow: reads the event, loads the issues it concerns,
// decides and applies. Reads GITHUB_EVENT_NAME, GITHUB_EVENT_PATH, GITHUB_TOKEN,
// GITHUB_REPOSITORY, optional GITHUB_API_URL and CLOUD_STOPPED (repository variable).
'use strict';

const fs = require('fs');
const path = require('path');
const { createClient } = require('./github/client');
const { loadIssueView, listOpenIssues, listClosedSince } = require('./github/snapshot');
const { applyPlan, dryRunComment } = require('./github/apply');
const { decideAll } = require('./decide');
const { closingIssues } = require('./decide/spec');
const L = require('./decide/labels');
const { settingsProblems } = require('./decide/settings');

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
    default:
      return [];
  }
}

// Which issues one run decides: the ones the event concerns, every open issue changed
// recently, every recently closed issue that still carries labels to clean, and every
// `ready` issue, which competes for the free slots (D47). `activeElsewhere` counts the
// active issues outside that set.
function reconcileTargets({ focus, open, closed = [], now = Date.now(), recentMinutes = RECENT_MINUTES }) {
  const since = now - recentMinutes * 60 * 1000;
  const recent = (i) => i.updatedAt && Date.parse(i.updatedAt) >= since;
  const numbers = new Set(focus === 'all' ? open.map((i) => i.number) : focus);
  for (const i of open) if (recent(i) || i.labels.includes('ready')) numbers.add(i.number);
  for (const i of closed) if (recent(i) && i.labels.some((l) => CLEANUP.includes(l))) numbers.add(i.number);
  const activeElsewhere = open.filter((i) => !numbers.has(i.number) && i.labels.some((l) => ACTIVE.includes(l))).length;
  return { numbers: [...numbers].sort((a, b) => a - b), activeElsewhere };
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
  if (settings.mode === 'live') throw new Error('live mode needs the platform client, which phase 3 adds; set "mode": "dry-run"');

  const event = JSON.parse(fs.readFileSync(env.GITHUB_EVENT_PATH, 'utf8'));
  const focus = focusIssues(env.GITHUB_EVENT_NAME, event);
  const client = createClient({ token: env.GITHUB_TOKEN, repository: env.GITHUB_REPOSITORY, ...(env.GITHUB_API_URL ? { apiUrl: env.GITHUB_API_URL } : {}) });

  const open = await listOpenIssues(client);
  const closed = await listClosedSince(client, new Date(Date.now() - RECENT_MINUTES * 60 * 1000).toISOString());
  const { numbers, activeElsewhere } = reconcileTargets({ focus, open, closed });
  if (!numbers.length) return console.log('No issue to reconcile.');

  const views = [];
  for (const n of numbers) views.push(await loadIssueView(client, n));
  const ctx = { settings, control: { stopped: env.CLOUD_STOPPED === 'true' }, running: new Set(), activeElsewhere };

  for (const plan of decideAll(views, ctx)) {
    await applyPlan(client, plan, settings.mode);
    const summary = dryRunComment(plan);
    console.log(`#${plan.number}: ${summary ? summary.split('\n').filter((l) => l.startsWith('- ')).join(' ') : 'nothing to do'}`);
  }
  return undefined;
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { focusIssues, reconcileTargets, loadSettings };
