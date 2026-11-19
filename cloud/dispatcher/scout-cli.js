// Entry point of the scout workflow (.github/workflows/scout.yml): once a week, one scout
// session looks for improvements and recommends at most `scout.issuesPerRun` issues
// (CW-70 to CW-73). The session gets a read-only token (CW-93); the agent identity files
// the recommendations; the dispatcher reports the run and its cost on the status issue
// (CW-74, CW-85, D27) and rewrites that issue's body.
'use strict';

const fs = require('fs');
const path = require('path');
const { createClient } = require('./github/client');
const { listOpenIssues, listIssueIndex, listCommentsSince, loadIssueView } = require('./github/snapshot');
const { activeSessionIssues } = require('./github/actions');
const { refreshStatus, statusComment, dispatchDisabled } = require('./github/status');
const { parseDefinition } = require('./platform/sync');
const { createPlatformClient } = require('./platform/client');
const { installationToken } = require('./platform/app-token');
const { runSession, agentTexts } = require('./platform/session');
const { scoutBlocks, scoutPlan, scoutReport, scoutMessage, recommendationBody } = require('./decide/scout');
const { scrubSecrets } = require('./decide/outcome');
const { neutralizeMarkers } = require('./decide/markers');
const { unsetCaps } = require('./decide/settings');
const { monthStart, monthSpend, monthStatus } = require('./decide/spend');
const { loadSettings, reservedUsd, liveSetupMissing } = require('./cli');

const AGENTS_DIR = path.join(__dirname, '..', 'agents');
// CW-93: the scout reads the repository and can't push.
const READ_ONLY = { metadata: 'read', contents: 'read' };
const cents = (n) => Math.floor(Number(n) * 100) / 100;

// The scout's hard limit: its per-run cap, and never more than the month has left after
// what running sessions may still spend (CW-83).
function scoutLimit(settings, month, reserved) {
  const left = Number(settings.caps.monthlyUsd) - month.monthUsd - reserved;
  return cents(Math.min(Number(settings.caps.perRunUsd.scout), left));
}

// One scout run, start to end. Every outside dependency is passed in. Returns the
// session's phase, or 'skipped' with the reason logged.
async function runScout({
  settings, gh, platform, mintReadToken, mintWriteToken, agentClient, readDefinition,
  defaultBranch = 'main', stopped = false, now = Date.now, sleep, log = console.log,
}) {
  const t = now();
  const { monthUsd } = monthSpend(await listCommentsSince(gh, monthStart(t)), settings, t);
  const month = monthStatus(monthUsd, settings);
  const isStopped = stopped || await dispatchDisabled(gh);
  const status = (extra = {}) => refreshStatus(gh, settings, { monthStatus: month, stopped: isStopped, create: true, now: t, log, ...extra });

  // D104: a dry run starts nothing, but it is the scout's turn: the window moves on.
  if (settings.mode !== 'live') {
    log(`::notice::cloud/settings.json says "mode": "${settings.mode}"; the scout starts no session.`);
    await status({ scoutRun: true });
    return 'skipped';
  }
  let skip = null;
  if (isStopped) skip = 'the stop switch is on';
  else if (unsetCaps(settings).length) skip = `caps not set: ${unsetCaps(settings).join(', ')} (CW-80)`;
  else if (month.reached) skip = `the monthly cap of $${month.capUsd.toFixed(2)} is reached`;
  let limitUsd;
  if (!skip) {
    const others = [];
    for (const n of await activeSessionIssues(gh)) others.push(await loadIssueView(gh, n));
    const reserved = reservedUsd([], new Set(), others, settings);
    limitUsd = scoutLimit(settings, month, reserved);
    if (!(limitUsd > 0)) skip = `the month has nothing left after the $${reserved.toFixed(2)} running sessions may still spend`;
  }
  if (skip) {
    log(`::notice::No scout session: ${skip}.`);
    await status();
    return 'skipped';
  }

  const tokens = [];
  const keep = (mint) => async () => {
    const token = await mint();
    tokens.push(token);
    return token;
  };
  const open = await listOpenIssues(gh);
  const index = await listIssueIndex(gh);
  let session;
  try {
    const def = parseDefinition(readDefinition('scout'), 'scout.md');
    const environmentName = def.environment === 'web' ? settings.platform.webEnvironment : settings.platform.repoEnvironment;
    const message = scoutMessage({ settings, limitUsd, issues: index, branch: defaultBranch });
    session = await runSession({ client: platform, role: 'scout', environmentName, settings, limitUsd, message, branch: defaultBranch, mintToken: keep(mintReadToken), metadata: { role: 'scout' }, now, sleep, log });
  } catch (err) {
    session = { id: null, link: null, phase: 'failed', text: '', error: err.message };
  }
  if (session.error) session.error = scrubSecrets(session.error, tokens);
  log(`session ${session.id || '(not started)'}: ${session.phase}, $${Number(session.costUsd || 0).toFixed(2)}`);

  // Every block it reported counts, whatever phase it ended in (a run cut off at its
  // limit files what it has). Without the events, its last message is all there is.
  let texts = [session.text];
  if (session.id) {
    try {
      texts = agentTexts(await platform.listEvents(session.id));
    } catch (err) {
      log(`::warning::Could not read the scout session's messages: ${scrubSecrets(err.message, tokens)}`);
    }
  }
  texts = texts.map((x) => scrubSecrets(x || '', tokens)); // CW-91
  const { results, errors } = scoutBlocks(texts, settings);
  const labelsOf = new Map(open.map((i) => [i.number, i.labels]));
  const plan = scoutPlan(results, index.map((i) => ({ ...i, labels: labelsOf.get(i.number) || [] })), settings);

  const filed = [];
  const failed = [];
  const evidenceOn = [];
  if (plan.file.length || plan.evidence.onIssue.length) {
    let agent = null;
    try {
      agent = await agentClient(await keep(mintWriteToken)());
    } catch (err) {
      log(`::warning::Could not get the agent identity's token: ${scrubSecrets(err.message, tokens)}`);
    }
    for (const i of plan.file) {
      try {
        if (!agent) throw new Error('no token');
        const made = await agent.request('POST', `/repos/${agent.repo}/issues`, { title: i.title, body: recommendationBody(i.body, session) });
        filed.push({ number: made.number, title: i.title });
      } catch (err) {
        failed.push(i.title);
        log(`::warning::Could not file "${i.title}": ${scrubSecrets(err.message, tokens)}`);
      }
    }
    for (const e of plan.evidence.onIssue) {
      try {
        if (!agent) throw new Error('no token');
        const body = `New evidence from the scout session [${session.id}](${session.link}):\n\n${neutralizeMarkers(e.body)}`;
        await agent.request('POST', `/repos/${agent.repo}/issues/${e.issue}/comments`, { body });
        evidenceOn.push(e.issue);
      } catch (err) {
        plan.evidence.onStatus.push(e);
        log(`::warning::Could not comment the evidence on #${e.issue}: ${scrubSecrets(err.message, tokens)}`);
      }
    }
  }

  const report = scoutReport({ session, limitUsd, plan, filed, failed, evidenceOn, errors });
  const after = report.record ? monthStatus(Math.round((month.monthUsd + report.record.sessionCostUsd) * 100) / 100, settings) : month;
  const target = await refreshStatus(gh, settings, { monthStatus: after, stopped: isStopped, create: true, scoutRun: Boolean(session.id), now: t, log });
  await statusComment(gh, settings, { text: report.text, record: report.record, number: target.number, log });
  if (!session.id) {
    // CW-103: the run fails visibly as well.
    log(`::error::The scout session could not start: ${session.error}`);
    return 'not-started';
  }
  return session.phase;
}

async function main(env = process.env) {
  const settings = loadSettings();
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPOSITORY) throw new Error('GITHUB_TOKEN and GITHUB_REPOSITORY are required');
  const apiUrl = env.GITHUB_API_URL || 'https://api.github.com';
  const gh = createClient({ token: env.GITHUB_TOKEN, repository: env.GITHUB_REPOSITORY, apiUrl });
  if (settings.mode === 'live') {
    const missing = liveSetupMissing({ ...env, HAS_ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY ? 'true' : '', HAS_AGENT_APP_PRIVATE_KEY: env.AGENT_APP_PRIVATE_KEY ? 'true' : '' });
    if (missing.length) throw new Error(`the scout job is not set up: missing ${missing.join(', ')} (build plan, owner steps 4 and 5)`);
  }
  const mint = (permissions) => async () => (await installationToken({
    appId: env.AGENT_APP_ID, privateKeyPem: env.AGENT_APP_PRIVATE_KEY, repository: env.GITHUB_REPOSITORY, permissions, apiUrl,
  })).token;
  const phase = await runScout({
    settings, gh,
    platform: settings.mode === 'live' ? createPlatformClient({ apiKey: env.ANTHROPIC_API_KEY, apiUrl: settings.platform.apiUrl }) : null,
    mintReadToken: mint(READ_ONLY),
    mintWriteToken: mint(settings.agentPermissions),
    agentClient: async (token) => createClient({ token, repository: env.GITHUB_REPOSITORY, apiUrl }),
    readDefinition: (r) => fs.readFileSync(path.join(AGENTS_DIR, `${r}.md`), 'utf8'),
    defaultBranch: env.DEFAULT_BRANCH || 'main',
    stopped: env.CLOUD_STOPPED === 'true',
  });
  if (phase === 'not-started') process.exitCode = 1;
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { runScout, scoutLimit, READ_ONLY, main };
