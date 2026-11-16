// Entry point of the dispatch workflow: reads the event, loads the issues it concerns,
// decides and applies. Reads GITHUB_EVENT_NAME, GITHUB_EVENT_PATH, GITHUB_TOKEN,
// GITHUB_REPOSITORY, optional GITHUB_API_URL and CLOUD_STOPPED (repository variable).
'use strict';

const fs = require('fs');
const path = require('path');
const { createClient } = require('./github/client');
const { loadIssueView, listOpenIssues } = require('./github/snapshot');
const { applyPlan, dryRunComment } = require('./github/apply');
const { decideAll } = require('./decide');
const { readRecord } = require('./decide/markers');
const { closingIssues } = require('./decide/spec');
const { startableQueue, activeCount } = require('./decide/ready');
const { settingsProblems } = require('./decide/settings');

const SETTINGS = path.join(__dirname, '..', 'settings.json');

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
  const numbers = focus === 'all' ? open.map((i) => i.number) : focus;
  if (!numbers.length) return console.log('No issue to reconcile.');
  const readyNumbers = open.filter((i) => i.labels.includes('ready')).map((i) => i.number);

  const views = new Map();
  for (const n of new Set([...numbers, ...readyNumbers])) views.set(n, await loadIssueView(client, n));

  const queue = startableQueue(
    readyNumbers.map((n) => {
      const v = views.get(n);
      return { number: n, labels: v.labels, record: readRecord(v.timeline, settings).record, dependencies: v.dependencies };
    }),
    activeCount(open),
    settings,
  );
  const ctx = { settings, control: { stopped: env.CLOUD_STOPPED === 'true' }, running: new Set(), queue };

  for (const plan of decideAll(numbers.map((n) => views.get(n)), ctx)) {
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

module.exports = { focusIssues, loadSettings };
