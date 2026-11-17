// Entry point of the session workflow (.github/workflows/session.yml): runs one agent
// session for one issue and applies its result. The dispatcher requested it with a
// `session` record on the issue; that record, not the workflow input, sets the hard
// limit, so a run started by hand can't raise it. The agent identity posts the agent's
// comment and issues (D52); the dispatcher sets the state and records the cost.
'use strict';

const fs = require('fs');
const path = require('path');
const { createClient } = require('./github/client');
const { loadIssueView, listIssueIndex } = require('./github/snapshot');
const { applyPlan } = require('./github/apply');
const { dispatchWorkflow, DISPATCH_WORKFLOW } = require('./github/actions');
const { readFacts, ROLE_FOR_STATE } = require('./decide');
const { Plan } = require('./decide/plan');
const L = require('./decide/labels');
const { taskMessage } = require('./decide/task');
const { agentActions, dispatcherOutcome, parseResult, validateResult, scrubSecrets } = require('./decide/outcome');
const { parseDefinition } = require('./platform/sync');
const { createPlatformClient } = require('./platform/client');
const { installationToken } = require('./platform/app-token');
const { runSession } = require('./platform/session');
const { loadSettings } = require('./cli');

const AGENTS_DIR = path.join(__dirname, '..', 'agents');

// Why this run starts nothing, or null when the issue still asks for this role.
function skipReason(view, record, role) {
  if (view.state !== 'open') return 'the issue is closed';
  const state = L.STATES.find((s) => view.labels.includes(s));
  if (ROLE_FOR_STATE[state] !== role) return `its state ${state ? `\`${state}\`` : '(none)'} doesn't call for the ${role} agent`;
  if (!record.session || record.session.role !== role) return 'the dispatcher requested no such session';
  return null;
}

// One session, start to end. Every outside dependency is passed in.
async function runForIssue({ issue, role, settings, gh, agentClient, platform, mintToken, readDefinition, defaultBranch = 'main', stopped = false, now, sleep, log = console.log }) {
  let view = await loadIssueView(gh, issue);
  let facts = readFacts(view, settings);
  const skip = stopped ? 'the stop switch CLOUD_STOPPED is on' : skipReason(view, facts.record, role);
  if (skip) {
    log(`::notice::No ${role} session for #${issue}: ${skip}.`);
    // This run's own request is dropped, so the dispatcher doesn't count it as lost (D54).
    if (facts.record.session && facts.record.session.role === role) {
      const plan = new Plan(issue, view.labels);
      plan.remember({ session: null });
      await applyPlan(gh, plan, 'live');
    }
    return 'skipped';
  }
  const limitUsd = Number(facts.record.session.limitUsd);
  const tokens = [];
  const mint = async () => {
    const token = await mintToken();
    tokens.push(token);
    return token;
  };

  let session;
  try {
    const def = parseDefinition(readDefinition(role), `${role}.md`);
    const environmentName = def.environment === 'web' ? settings.platform.webEnvironment : settings.platform.repoEnvironment;
    const issues = role === 'triage' ? await listIssueIndex(gh) : [];
    const message = taskMessage({ role, view, record: facts.record, settings, limitUsd, issues, branch: defaultBranch });
    session = await runSession({ client: platform, role, environmentName, settings, limitUsd, message, branch: defaultBranch, mintToken: mint, metadata: { issue: String(issue), role }, now, sleep, log });
  } catch (err) {
    session = { id: null, link: null, phase: 'failed', text: '', error: err.message };
  }
  // CW-91: no credential reaches GitHub, whatever the session printed.
  session.text = scrubSecrets(session.text, tokens);
  if (session.error) session.error = scrubSecrets(session.error, tokens);
  log(`session ${session.id || '(not started)'}: ${session.phase}, $${Number(session.costUsd || 0).toFixed(2)}`);

  view = await loadIssueView(gh, issue);
  facts = readFacts(view, settings);
  const stale = Boolean(skipReason(view, facts.record, role));
  const parsed = parseResult(session.text);
  const created = [];
  if (!stale && parsed.ok && validateResult(role, parsed.result, issue, settings).ok) {
    const agent = await agentClient(await mint());
    const actions = agentActions(role, parsed.result, issue);
    for (const i of actions.issues) {
      try {
        const made = await agent.request('POST', `/repos/${agent.repo}/issues`, { title: i.title, body: i.body });
        created.push({ kind: i.kind, number: made.number });
      } catch (err) {
        log(`::warning::Could not open the issue "${i.title}": ${scrubSecrets(err.message, tokens)}`);
      }
    }
    if (actions.comment) await agent.request('POST', `/repos/${agent.repo}/issues/${issue}/comments`, { body: actions.comment });
  }
  const { plan } = dispatcherOutcome({ role, view, record: facts.record, session, text: session.text, created, settings, stale });
  plan.remember({ session: null });
  await applyPlan(gh, plan, 'live');
  // Label changes by GITHUB_TOKEN start no run, so the next step is asked for here.
  await dispatchWorkflow(gh, DISPATCH_WORKFLOW, defaultBranch, { issue });
  return session.phase;
}

function liveEnvProblems(env) {
  const missing = ['GITHUB_TOKEN', 'GITHUB_REPOSITORY', 'ANTHROPIC_API_KEY', 'AGENT_APP_ID', 'AGENT_APP_PRIVATE_KEY'].filter((k) => !env[k]);
  return missing.length ? [`missing ${missing.join(', ')}`] : [];
}

async function main(env = process.env) {
  const settings = loadSettings();
  const issue = Number(env.ISSUE);
  const role = String(env.ROLE || '');
  if (!Number.isInteger(issue) || issue < 1 || !Object.values(ROLE_FOR_STATE).includes(role)) throw new Error('ISSUE must be an issue number and ROLE a role the dispatcher starts');
  if (settings.mode !== 'live') return console.log(`::notice::cloud/settings.json says "mode": "${settings.mode}"; no session runs.`);
  const problems = liveEnvProblems(env);
  if (problems.length) throw new Error(`the session job is not set up: ${problems.join('; ')} (build plan, owner steps 4 and 5)`);

  const apiUrl = env.GITHUB_API_URL || 'https://api.github.com';
  const gh = createClient({ token: env.GITHUB_TOKEN, repository: env.GITHUB_REPOSITORY, apiUrl });
  const platform = createPlatformClient({ apiKey: env.ANTHROPIC_API_KEY, apiUrl: settings.platform.apiUrl });
  const mintToken = async () => (await installationToken({
    appId: env.AGENT_APP_ID, privateKeyPem: env.AGENT_APP_PRIVATE_KEY, repository: env.GITHUB_REPOSITORY, permissions: settings.agentPermissions, apiUrl,
  })).token;
  await runForIssue({
    issue, role, settings, gh, platform, mintToken,
    agentClient: async (token) => createClient({ token, repository: env.GITHUB_REPOSITORY, apiUrl }),
    readDefinition: (r) => fs.readFileSync(path.join(AGENTS_DIR, `${r}.md`), 'utf8'),
    defaultBranch: env.DEFAULT_BRANCH || 'main',
    stopped: env.CLOUD_STOPPED === 'true',
  });
  return undefined;
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { runForIssue, skipReason, liveEnvProblems, main };
