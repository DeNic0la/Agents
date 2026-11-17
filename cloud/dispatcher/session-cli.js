// Entry point of the session workflow (.github/workflows/session.yml): runs one agent
// session for one issue and applies its result. The dispatcher requested it with a
// `session` record on the issue; that record, not the workflow input, sets the hard
// limit, so a run started by hand can't raise it. The agent identity posts the agent's
// comment and issues (D52); the dispatcher sets the state and records the cost.
'use strict';

const fs = require('fs');
const path = require('path');
const { createClient } = require('./github/client');
const { loadIssueView, listIssueIndex, listCommentsSince } = require('./github/snapshot');
const { statusComment } = require('./github/status');
const { monthStart, monthSpend, monthStatus } = require('./decide/spend');
const { applyPlan } = require('./github/apply');
const { dispatchWorkflow, DISPATCH_WORKFLOW, MERGE_GATE_WORKFLOW } = require('./github/actions');
const { readFacts, ROLES, roleFor } = require('./decide');
const { Plan } = require('./decide/plan');
const L = require('./decide/labels');
const { taskMessage, fence } = require('./decide/task');
const { withSpec, splitBody } = require('./decide/spec');
const { agentActions, dispatcherOutcome, parseResult, validateResult, scrubSecrets } = require('./decide/outcome');
const { branchName, pullBody, pullToReuse, mergeLabelOf, mergeClassCheck } = require('./decide/merge');
const { parseDefinition } = require('./platform/sync');
const { createPlatformClient } = require('./platform/client');
const { installationToken } = require('./platform/app-token');
const { runSession } = require('./platform/session');
const { loadSettings } = require('./cli');

const AGENTS_DIR = path.join(__dirname, '..', 'agents');
const MAX_BODY = 65536; // GitHub's limit for an issue body

// Why this run starts nothing, or null when the issue still asks for this role.
function skipReason(view, record, role) {
  if (view.state !== 'open') return 'the issue is closed';
  const state = L.STATES.find((s) => view.labels.includes(s));
  if (roleFor(state, view.labels) !== role) return `its state ${state ? `\`${state}\`` : '(none)'} doesn't call for the ${role} agent`;
  if (view.labels.includes(L.PAUSED)) return 'the issue is paused';
  if (!record.session || record.session.role !== role) return 'the dispatcher requested no such session';
  return null;
}

// The ask or the spec changed while the session ran: its result answers an older issue.
function bodyChanged(before, after) {
  const a = splitBody(before.body);
  const b = splitBody(after.body);
  return a.ask !== b.ask || a.spec !== b.spec;
}

// Only a session that ended by itself, and is known to have stopped, speaks for the agent.
const publishable = (session) => session.phase === 'done' && !session.running;

// The head commit of a branch, or null when it doesn't exist.
async function branchHead(client, branch) {
  try {
    const b = await client.request('GET', `/repos/${client.repo}/branches/${encodeURIComponent(branch)}`);
    return (b && b.commit && b.commit.sha) || null;
  } catch (err) {
    if (err && err.status === 404) return null;
    throw err;
  }
}

// CW-50, CW-55: the implement agent works on the issue's one branch. It continues the
// branch when it exists, else creates it from the default branch.
function branchSection(branch, exists, defaultBranch) {
  const b = `\`${branch}\``;
  const d = `\`${defaultBranch}\``;
  return {
    title: 'Branch',
    text: exists
      ? `Your branch ${b} exists and is mounted: continue it. If ${d} moved on, merge it in and resolve the conflicts first. Push only to ${b}.`
      : `The branch ${b} doesn't exist yet, so ${d} is mounted. Create ${b} from it and push only to ${b}.`,
  };
}

// CW-68: an implementation the review or CI sent back. The review's findings are in its
// newest comment on the issue.
function reviewRoundSection(record, settings) {
  const round = Number(record.reviewRounds || 0);
  if (!round) return null;
  return {
    title: 'Review round',
    text: `This is review round ${round} of ${settings.reviewRounds}. The newest review comment on this issue lists each item and its result, or \`ci\` failed at your last push. Fix every failed item, or say in the pull request body why it stands. Push to the same branch and report \`pushed\` again.`,
  };
}

// CW-60, CW-61: the review agent sees the pull request's head commit, its merge class and
// what the changed files allow (CW-62).
// The title and the reasons (taken from file paths) come from GitHub: fenced, as data (CW-92).
function pullSection(pull, check) {
  const lines = [
    `Review #${pull.number} at head commit ${pull.headSha}, branch \`${pull.headRef}\`, which is mounted. Your verdict is for this head commit only: a later push gets a new review.`,
    `Its merge class is \`${check.effective}\`. The lowest class the changed files allow is \`${check.computed}\`.`,
    '',
    'Its title, from GitHub:',
    '',
    fence(pull.title),
  ];
  if (check.reasons.length) lines.push('', `What in the changed files raises the class, from their paths:`, '', fence(check.reasons.join('\n')));
  else lines.push('', 'Nothing in the changed files raises the class.');
  return { title: 'Pull request', text: lines.join('\n') };
}

// The pull request changed while the review ran: its verdict is about an older commit.
// Without one at the start no session ran, and the failure is reported as such.
function pullChanged(before, after) {
  const a = before.pull;
  const b = after.pull;
  if (!a) return false;
  return !b || a.number !== b.number || a.headSha !== b.headSha || b.state !== 'open';
}

// CW-51, CW-55: opens the issue's one pull request, or updates it; one closed without
// merging is reopened. Returns the entry for `created`.
async function publishPull(agent, { issue, pull, labels, defaultBranch }) {
  const branch = branchName(issue);
  const headSha = await branchHead(agent, branch);
  if (!headSha) throw new Error(`the agent reported \`pushed\`, but the branch ${branch} doesn't exist`);
  const checked = pullBody(pull.body, issue, mergeLabelOf(labels));
  if (!checked.ok) throw new Error(checked.error);
  const owner = String(agent.repo).split('/')[0];
  const r = `/repos/${agent.repo}/pulls`;
  const existing = pullToReuse(await agent.paginate(`${r}?state=all&head=${encodeURIComponent(`${owner}:${branch}`)}`));
  if (existing) {
    const patch = { title: pull.title, body: checked.body, ...(existing.state === 'closed' ? { state: 'open' } : {}) };
    await agent.request('PATCH', `${r}/${existing.number}`, patch);
    return { kind: 'pull', number: existing.number, headSha, reused: true };
  }
  const made = await agent.request('POST', r, { title: pull.title, head: branch, base: defaultBranch, body: checked.body });
  return { kind: 'pull', number: made.number, headSha, reused: false };
}

// One session, start to end. Every outside dependency is passed in.
async function runForIssue({ issue, role, settings, gh, agentClient, platform, mintToken, readDefinition, defaultBranch = 'main', stopped = false, now, sleep, log = console.log }) {
  const before = await loadIssueView(gh, issue);
  let view = before;
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
    let mount = defaultBranch;
    const sections = [];
    if (role === 'implement') {
      const branch = branchName(issue);
      const exists = Boolean(await branchHead(gh, branch));
      if (exists) mount = branch;
      sections.push(branchSection(branch, exists, defaultBranch));
      const round = reviewRoundSection(facts.record, settings);
      if (round) sections.push(round);
    }
    if (role === 'review') {
      const pull = before.pull;
      if (!pull || pull.state !== 'open' || !pull.headRef) throw new Error('the issue has no open pull request to review');
      mount = pull.headRef;
      sections.push(pullSection(pull, mergeClassCheck(view.labels, pull, settings)));
    }
    const message = taskMessage({ role, view, record: facts.record, settings, limitUsd, issues, branch: mount, sections });
    session = await runSession({ client: platform, role, environmentName, settings, limitUsd, message, branch: mount, mintToken: mint, metadata: { issue: String(issue), role, request: String(facts.record.session.at || '') }, now, sleep, log });
  } catch (err) {
    session = { id: null, link: null, phase: 'failed', text: '', error: err.message };
  }
  // CW-91: no credential reaches GitHub, whatever the session printed.
  session.text = scrubSecrets(session.text, tokens);
  if (session.error) session.error = scrubSecrets(session.error, tokens);
  log(`session ${session.id || '(not started)'}: ${session.phase}, $${Number(session.costUsd || 0).toFixed(2)}`);
  // CW-103: a session that could not start is reported on the status issue at once, and
  // on its issue below (CW-16).
  if (!session.id) {
    try {
      const { monthUsd } = monthSpend(await listCommentsSince(gh, monthStart()), settings);
      const text = `The ${role} session for #${issue} could not start (CW-103): ${session.error}`;
      await statusComment(gh, settings, { text, monthStatus: monthStatus(monthUsd, settings), log });
    } catch (err) {
      log(`::warning::Could not report the start failure on the status issue: ${scrubSecrets(err.message, tokens)}`);
    }
  }

  view = await loadIssueView(gh, issue);
  facts = readFacts(view, settings);
  const stale = Boolean(skipReason(view, facts.record, role)) || bodyChanged(before, view) || (role === 'review' && pullChanged(before, view));
  const parsed = parseResult(session.text);
  const created = [];
  if (!stale && publishable(session) && parsed.ok && validateResult(role, parsed.result, issue, settings).ok) {
    try {
      await publish();
    } catch (err) {
      // The dispatcher still records the session; `created` says what got through.
      log(`::warning::Could not publish the ${role} agent's result on #${issue}: ${scrubSecrets(err.message, tokens)}`);
    }
  }
  async function publish() {
    const agent = await agentClient(await mint());
    const actions = agentActions(role, parsed.result, issue);
    let specFailed = false;
    if (actions.spec) {
      // CW-8: only the marked section changes; the body is the one just read.
      try {
        const body = withSpec(view.body, actions.spec);
        if (body.length > MAX_BODY) throw new Error(`the body would be ${body.length} characters, over GitHub's ${MAX_BODY}`);
        await agent.request('PATCH', `/repos/${agent.repo}/issues/${issue}`, { body });
        created.push({ kind: 'spec' });
      } catch (err) {
        specFailed = true;
        log(`::warning::Could not write the spec into #${issue}: ${scrubSecrets(err.message, tokens)}`);
      }
    }
    if (actions.pull) {
      try {
        created.push(await publishPull(agent, { issue, pull: actions.pull, labels: view.labels, defaultBranch }));
      } catch (err) {
        log(`::warning::Could not open or update the pull request for #${issue}: ${scrubSecrets(err.message, tokens)}`);
      }
    }
    for (const i of actions.issues) {
      try {
        const made = await agent.request('POST', `/repos/${agent.repo}/issues`, { title: i.title, body: i.body });
        created.push({ kind: i.kind, number: made.number });
      } catch (err) {
        log(`::warning::Could not open the issue "${i.title}": ${scrubSecrets(err.message, tokens)}`);
      }
    }
    // An approval request without its spec would ask for approval of nothing.
    if (actions.comment && !specFailed) {
      await agent.request('POST', `/repos/${agent.repo}/issues/${issue}/comments`, { body: actions.comment });
      created.push({ kind: 'comment' });
    }
  }
  const reviewed = role === 'review' && before.pull ? { number: before.pull.number, headSha: before.pull.headSha } : null;
  const { plan } = dispatcherOutcome({ role, view, record: facts.record, session, text: session.text, created, settings, stale, pull: reviewed });
  plan.remember({ session: null });
  await applyPlan(gh, plan, 'live');
  // Label changes by GITHUB_TOKEN start no run, so the next step is asked for here.
  await dispatchWorkflow(gh, DISPATCH_WORKFLOW, defaultBranch, { issue });
  // CW-64: merge-gate reads the approval just recorded; its run then starts the merge job.
  const review = plan.record.review;
  if (review && review.verdict === 'approved') await dispatchWorkflow(gh, MERGE_GATE_WORKFLOW, defaultBranch, { pr: String(review.pull) });
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
  if (!Number.isInteger(issue) || issue < 1 || !ROLES.includes(role)) throw new Error('ISSUE must be an issue number and ROLE a role the dispatcher starts');
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

module.exports = { runForIssue, skipReason, bodyChanged, pullChanged, publishable, liveEnvProblems, branchSection, reviewRoundSection, pullSection, publishPull, main };
