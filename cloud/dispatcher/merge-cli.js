// Entry point of the merge workflow (.github/workflows/merge.yml): the agent merges its
// own pull requests when their issue's merge class allows it and every required check is
// green (CW-63, CW-64). Level-triggered (D5): each run looks at every open pull request by
// the agent, so a lost or repeated trigger changes nothing.
//
// The agent identity merges and posts the closing comment (D52, CW-69); the dispatcher
// (GITHUB_TOKEN) records the merge on the issue. A conflict goes back to the dispatcher,
// which returns the issue to the implement agent (CW-55).
'use strict';

const { createClient } = require('./github/client');
const { applyPlan } = require('./github/apply');
const { dispatchWorkflow, DISPATCH_WORKFLOW, MERGE_GATE_WORKFLOW } = require('./github/actions');
const { installationToken } = require('./platform/app-token');
const { issueNumberOf } = require('./decide/merge-gate');
const { mergeVerdict, closingComment } = require('./decide/merge');
const { actorKind } = require('./decide/actors');
const { Plan } = require('./decide/plan');
const { loadSettings } = require('./cli');
const { loadIssue } = require('./merge-gate');

const mapPr = (p) => ({
  number: p.number,
  title: p.title || '',
  author: p.user && p.user.login,
  draft: Boolean(p.draft),
  headSha: p.head && p.head.sha,
  body: p.body || '',
  labels: (p.labels || []).map((l) => (typeof l === 'string' ? l : l.name)),
  mergeable: p.mergeable === undefined ? null : p.mergeable,
  mergeableState: p.mergeable_state || null,
});

// Everything mergeVerdict needs for one pull request.
async function loadCandidate(gh, number, settings) {
  const r = `/repos/${gh.repo}`;
  const pr = mapPr(await gh.request('GET', `${r}/pulls/${number}`));
  const issueNumber = issueNumberOf(pr);
  const issue = issueNumber ? await loadIssue(gh, gh.repo, issueNumber, settings) : null;
  const runs = await gh.request('GET', `${r}/commits/${pr.headSha}/check-runs?per_page=100`);
  const combined = await gh.request('GET', `${r}/commits/${pr.headSha}/status`);
  const checkRuns = ((runs && runs.check_runs) || []).map((c) => ({ id: c.id, name: c.name, status: c.status, conclusion: c.conclusion }));
  const statuses = ((combined && combined.statuses) || []).map((s) => ({ context: s.context, state: s.state }));
  return { pr, issue, checkRuns, statuses };
}

// One pass over the agent's open pull requests. `agentClient(token)` and `mint()` give the
// agent identity; `live` false only reports. Returns [{ number, action, why }].
async function runMerge({ gh, agentClient, mint, settings, live, stopped = false, defaultBranch = 'main', now = () => new Date(), log = console.log }) {
  const open = await gh.paginate(`/repos/${gh.repo}/pulls?state=open`);
  const mine = open.filter((p) => actorKind(p.user && p.user.login, settings) === 'agent').sort((a, b) => a.number - b.number);
  const report = [];
  let agent = null;
  for (const p of mine) {
    const c = await loadCandidate(gh, p.number, settings);
    const verdict = mergeVerdict({ ...c, settings, stopped });
    report.push({ number: p.number, action: verdict.action, why: verdict.why || verdict.mergeClass });
    log(`#${p.number}: ${verdict.action}${verdict.why ? ` (${verdict.why})` : ''}`);
    if (!live) continue;
    if (verdict.action === 'conflict') {
      // The dispatcher sees the conflict in its snapshot and moves the issue (CW-55).
      await dispatchWorkflow(gh, DISPATCH_WORKFLOW, defaultBranch, { issue: c.issue.number });
      continue;
    }
    if (verdict.action === 'regate') {
      await dispatchWorkflow(gh, MERGE_GATE_WORKFLOW, defaultBranch, { pr: String(p.number) });
      continue;
    }
    if (verdict.action !== 'merge') continue;
    if (!agent) agent = await agentClient(await mint());
    let merged;
    try {
      // `sha`: GitHub refuses the merge if the branch moved after the checks ran.
      merged = await agent.request('PUT', `/repos/${agent.repo}/pulls/${p.number}/merge`, { sha: c.pr.headSha, merge_method: 'merge' });
    } catch (err) {
      log(`::warning::Could not merge #${p.number}: ${err.message}`);
      report[report.length - 1] = { number: p.number, action: 'wait', why: `the merge failed: ${err.message}` };
      continue;
    }
    const record = c.issue.record || {};
    if (verdict.record) {
      // CW-43: the issue was closed by the owner; the dispatcher's note is all it gets.
      const plan = new Plan(c.issue.number, c.issue.labels);
      plan.say.push(`The agent merged #${p.number}, the record of this rejection in \`.out-of-scope/\`, at ${String(merged && merged.sha).slice(0, 7)}.`);
      plan.remember({ rejection: { ...record.rejection, merged: { sha: (merged && merged.sha) || null, at: now().toISOString() } } });
      await applyPlan(gh, plan, 'live');
      continue;
    }
    // D86: the closing comment first; when it fails, the record says so and the dispatcher
    // posts it on its next run (a merged pull request isn't listed here again).
    let commented = true;
    try {
      await agent.request('POST', `/repos/${agent.repo}/issues/${c.issue.number}/comments`, { body: closingComment({ pull: p.number, title: c.pr.title, by: 'agent', record }) });
    } catch (err) {
      commented = false;
      log(`::warning::Could not post the closing comment on #${c.issue.number}: ${err.message}`);
    }
    const plan = new Plan(c.issue.number, c.issue.labels);
    plan.say.push(`The agent merged #${p.number} (\`${verdict.mergeClass}\`) at ${String(merged && merged.sha).slice(0, 7)}.`);
    plan.remember({ merged: { pull: p.number, sha: (merged && merged.sha) || null, by: 'agent', at: now().toISOString(), commented } });
    await applyPlan(gh, plan, 'live');
  }
  return report;
}

function liveEnvProblems(env) {
  const missing = ['GITHUB_TOKEN', 'GITHUB_REPOSITORY', 'AGENT_APP_ID', 'AGENT_APP_PRIVATE_KEY'].filter((k) => !env[k]);
  return missing.length ? [`missing ${missing.join(', ')}`] : [];
}

async function main(env = process.env) {
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPOSITORY) throw new Error('GITHUB_TOKEN and GITHUB_REPOSITORY are required');
  const settings = loadSettings();
  const live = settings.mode === 'live';
  const problems = live ? liveEnvProblems(env) : [];
  if (problems.length) throw new Error(`the merge job is not set up: ${problems.join('; ')} (build plan, owner step 4)`);
  if (!live) console.log(`::notice::cloud/settings.json says "mode": "${settings.mode}": reporting only, nothing is merged.`);
  const apiUrl = env.GITHUB_API_URL || 'https://api.github.com';
  const gh = createClient({ token: env.GITHUB_TOKEN, repository: env.GITHUB_REPOSITORY, apiUrl });
  const mint = async () => (await installationToken({
    appId: env.AGENT_APP_ID, privateKeyPem: env.AGENT_APP_PRIVATE_KEY, repository: env.GITHUB_REPOSITORY, permissions: settings.agentPermissions, apiUrl,
  })).token;
  await runMerge({
    gh, mint, settings, live,
    agentClient: async (token) => createClient({ token, repository: env.GITHUB_REPOSITORY, apiUrl }),
    stopped: env.CLOUD_STOPPED === 'true',
    defaultBranch: env.DEFAULT_BRANCH || 'main',
  });
  return undefined;
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { runMerge, loadCandidate, liveEnvProblems, main };
