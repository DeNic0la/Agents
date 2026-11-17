// The owner's stop switch and its resume (CW-84), run by .github/workflows/stop.yml and
// resume.yml. COMMAND=stop turns off the dispatch, session and merge workflows, cancels
// their runs, interrupts every running agent session on the platform and records each
// interrupted session's cost on its issue. COMMAND=resume turns them on again and starts a
// full reconcile. Reads GITHUB_TOKEN, GITHUB_REPOSITORY, optional GITHUB_API_URL,
// DEFAULT_BRANCH, CLOUD_STOPPED and, for the platform, ANTHROPIC_API_KEY.
'use strict';

const fs = require('fs');
const { createClient } = require('./github/client');
const { listOpenIssues, loadIssueView } = require('./github/snapshot');
const { applyPlan } = require('./github/apply');
const actions = require('./github/actions');
const { readFacts, ROLES } = require('./decide');
const L = require('./decide/labels');
const { sessionsFor, stoppedPlan } = require('./decide/control');
const { createPlatformClient, sessionPhase, costUsd } = require('./platform/client');
const { agentName } = require('./platform/session');
const { scrubSecrets } = require('./decide/outcome');
const { loadSettings } = require('./cli');

const POLL_MS = 5000;
const RUN_CANCEL_WAIT_MS = 90000; // how long cancelled runs get to end before the platform is touched
const STOP_GRACE_MS = 120000; // how long an interrupted session gets to go idle
// An ended session older than the longest a session may run can't be part of an open
// request. A running one is kept at any age: its job may have died without stopping it.
const recentEnough = (settings, now) => (s) => sessionPhase(s) === 'running'
  || now() - Date.parse(s.created_at || 0) < (Number(settings.platform.sessionTimeoutMinutes) + 60) * 60000;

// The platform's agent sessions of every role, newest first, mapped to { id, issue, role, createdAt, raw }.
async function agentSessions(platform, settings, now) {
  const names = new Map(ROLES.map((r) => [agentName(r), r]));
  const agents = (await platform.listAgents()).filter((a) => names.has(a.name));
  const out = [];
  for (const agent of agents) {
    const sessions = (await platform.listSessions({ agentId: agent.id })).filter(recentEnough(settings, now));
    for (const s of sessions) {
      const meta = s.metadata || {};
      out.push({ id: s.id, issue: meta.issue, role: meta.role || names.get(agent.name), request: meta.request, createdAt: s.created_at, raw: s });
    }
  }
  return out;
}

// Interrupts the running sessions and waits until each has ended or the grace has passed.
// Returns the final view of every session it was given: { id, running, costUsd }.
async function interruptAll(platform, sessions, { now, sleep, log }) {
  const running = sessions.filter((s) => sessionPhase(s.raw) === 'running');
  for (const s of running) {
    try {
      await platform.interrupt(s.id);
      log(`interrupted session ${s.id} (#${s.issue || '?'} ${s.role || '?'})`);
    } catch (err) {
      log(`::warning::Could not interrupt session ${s.id}: ${err.message}`);
    }
  }
  const latest = new Map(sessions.map((s) => [s.id, s.raw]));
  const started = now();
  let open = running.map((s) => s.id);
  while (open.length && now() - started <= STOP_GRACE_MS) {
    await sleep(POLL_MS);
    for (const id of open) {
      try {
        latest.set(id, await platform.getSession(id));
      } catch (err) {
        log(`::warning::Could not read session ${id}: ${err.message}`);
      }
    }
    open = open.filter((id) => sessionPhase(latest.get(id)) === 'running');
  }
  return new Map([...latest].map(([id, raw]) => [id, { running: sessionPhase(raw) === 'running', costUsd: costUsd(raw) }]));
}

// Cancels the queued and running runs of the stoppable workflows and waits for them to end,
// so no session job reports a session after the stop has recorded it.
async function cancelRuns(gh, { now, sleep, log }) {
  const ids = [];
  for (const workflow of actions.STOPPABLE_WORKFLOWS) {
    for (const run of await actions.activeRuns(gh, workflow)) {
      try {
        await actions.cancelRun(gh, run.id);
        ids.push(run.id);
        log(`cancelled run ${run.id} (${run.name})`);
      } catch (err) {
        log(`::warning::Could not cancel run ${run.id} (${run.name}): ${err.message}`);
      }
    }
  }
  const started = now();
  let open = ids;
  while (open.length && now() - started <= RUN_CANCEL_WAIT_MS) {
    await sleep(POLL_MS);
    const still = [];
    for (const id of open) if ((await actions.runStatus(gh, id)) !== 'completed') still.push(id);
    open = still;
  }
  if (open.length) log(`::warning::Runs still not completed after the cancel: ${open.join(', ')}`);
  return ids;
}

async function stopAll({ gh, platform, settings, now = Date.now, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), log = console.log }) {
  const report = { disabled: [], failed: [], cancelled: [], interrupted: 0, issues: [], unmatched: [] };
  for (const workflow of actions.STOPPABLE_WORKFLOWS) {
    try {
      await actions.setWorkflowEnabled(gh, workflow, false);
      report.disabled.push(workflow);
    } catch (err) {
      report.failed.push(`${workflow}: ${err.message}`);
      log(`::warning::Could not disable ${workflow}: ${err.message}`);
    }
  }
  report.cancelled = await cancelRuns(gh, { now, sleep, log });

  let sessions = [];
  let ended = new Map();
  if (platform) {
    sessions = await agentSessions(platform, settings, now);
    report.interrupted = sessions.filter((s) => sessionPhase(s.raw) === 'running').length;
    ended = await interruptAll(platform, sessions, { now, sleep, log });
  } else {
    log('::warning::ANTHROPIC_API_KEY is not set: no platform session was interrupted.');
  }

  // Every open issue with an open session request gets the cost of its sessions and the
  // request cleared. The view is read after the runs ended: a request a session job
  // cleared in time is not recorded twice.
  const matched = new Set();
  for (const issue of await listOpenIssues(gh)) {
    if (!issue.labels.some((l) => L.STATES.includes(l))) continue;
    const view = await loadIssueView(gh, issue.number);
    const record = readFacts(view, settings).record;
    if (!record.session) continue;
    const mine = sessionsFor(view.number, record.session, sessions);
    for (const s of mine) matched.add(s.id);
    const link = (id) => settings.platform.sessionLink.replace('{id}', id);
    const plan = stoppedPlan(view, record, mine.map((s) => ({ id: s.id, link: link(s.id), ...(ended.get(s.id) || { running: false, costUsd: costUsd(s.raw) }) })), { unchecked: !platform });
    // A request is only recorded by a live run, and the stop really ended its session: the
    // cost and the cleared request are written even if the owner switched to dry run since.
    await applyPlan(gh, plan, 'live');
    report.issues.push(view.number);
  }
  // A session no open request accounts for: interrupted all the same, named in the summary.
  report.unmatched = sessions.filter((s) => !matched.has(s.id) && sessionPhase(s.raw) === 'running').map((s) => s.id);
  return report;
}

async function resumeAll({ gh, ref, stoppedVariable, log = console.log }) {
  const report = { enabled: [], failed: [] };
  for (const workflow of actions.STOPPABLE_WORKFLOWS) {
    try {
      await actions.setWorkflowEnabled(gh, workflow, true);
      report.enabled.push(workflow);
    } catch (err) {
      report.failed.push(`${workflow}: ${err.message}`);
      log(`::warning::Could not enable ${workflow}: ${err.message}`);
    }
  }
  if (stoppedVariable) log('::warning::The repository variable CLOUD_STOPPED is still `true`: the dispatcher starts nothing until the owner removes it.');
  // A full reconcile: what changed while stopped is decided now (level-triggered).
  if (report.enabled.includes(actions.DISPATCH_WORKFLOW)) await actions.dispatchWorkflow(gh, actions.DISPATCH_WORKFLOW, ref, {});
  return report;
}

function summary(command, report) {
  if (command === 'resume') {
    return [`Resumed: enabled ${report.enabled.join(', ') || 'nothing'}.`, ...report.failed.map((f) => `- Not enabled: ${f}`), 'A full reconcile run of `dispatch` was started.'].join('\n');
  }
  return [
    `Stopped: disabled ${report.disabled.join(', ') || 'nothing'}; cancelled ${report.cancelled.length} run(s); interrupted ${report.interrupted} session(s).`,
    ...report.failed.map((f) => `- Not disabled: ${f}`),
    report.issues.length ? `Recorded on: ${report.issues.map((n) => `#${n}`).join(', ')}.` : 'No issue had a session open.',
    ...(report.unmatched.length ? [`Interrupted sessions no issue accounts for: ${report.unmatched.join(', ')}.`] : []),
  ].join('\n');
}

async function main(env = process.env) {
  const command = env.COMMAND;
  if (!['stop', 'resume'].includes(command)) throw new Error('COMMAND must be stop or resume');
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPOSITORY) throw new Error('GITHUB_TOKEN and GITHUB_REPOSITORY are required');
  const settings = loadSettings();
  const gh = createClient({ token: env.GITHUB_TOKEN, repository: env.GITHUB_REPOSITORY, ...(env.GITHUB_API_URL ? { apiUrl: env.GITHUB_API_URL } : {}) });
  const secrets = [env.GITHUB_TOKEN, env.ANTHROPIC_API_KEY].filter(Boolean);
  const log = (line) => console.log(scrubSecrets(line, secrets));
  const report = command === 'stop'
    ? await stopAll({ gh, platform: env.ANTHROPIC_API_KEY ? createPlatformClient({ apiKey: env.ANTHROPIC_API_KEY, apiUrl: settings.platform.apiUrl }) : null, settings, log })
    : await resumeAll({ gh, ref: env.DEFAULT_BRANCH || 'main', stoppedVariable: env.CLOUD_STOPPED === 'true', log });
  const text = scrubSecrets(summary(command, report), secrets);
  log(text);
  if (env.GITHUB_STEP_SUMMARY) fs.appendFileSync(env.GITHUB_STEP_SUMMARY, `${text}\n`);
  if (report.failed.length) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((err) => {
    console.error(scrubSecrets(err.message, [process.env.GITHUB_TOKEN, process.env.ANTHROPIC_API_KEY].filter(Boolean)));
    process.exit(1);
  });
}

module.exports = { stopAll, resumeAll, summary, agentSessions, main };
