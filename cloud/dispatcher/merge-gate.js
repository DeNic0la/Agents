// Entry point of the merge-gate workflow: sets the `merge-gate` and `owner-merge` commit
// statuses on a head commit (D17, D50). Reads GITHUB_EVENT_NAME, GITHUB_EVENT_PATH,
// GITHUB_TOKEN, GITHUB_REPOSITORY (and GITHUB_API_URL); the owner and the agent's login come
// from cloud/settings.json.
//
// Events: `pull_request_target` (a pull request changed), `workflow_run` of review-relay (a
// review changed; D50) and `workflow_dispatch` with a pull request number (the dispatcher
// after it recorded a merge check or a review). Each is reduced to a head commit, and every
// open pull request at that commit is judged.
'use strict';
const fs = require('fs');
const { createClient } = require('./github/client.js');
const { loadSettings } = require('./cli.js');
const { readRecord } = require('./decide/markers.js');
const { judgePull, issueNumberOf, statusesAtSha, pullsAtSha } = require('./decide/merge-gate.js');

// The head commit an event concerns, and the pull request it names, if any.
function targetOf(name, event) {
  if (name === 'workflow_run') {
    const sha = event.workflow_run && event.workflow_run.head_sha;
    if (!sha) throw new Error('No head commit in the workflow_run event');
    return { sha, number: null };
  }
  if (event.pull_request) return { sha: event.pull_request.head.sha, number: event.pull_request.number };
  const number = Number(event.inputs && event.inputs.pr);
  if (!Number.isInteger(number) || number < 1) throw new Error('No pull request number in the event');
  return { sha: null, number };
}

// The issue an agent pull request closes, with its dispatcher record. Only the dispatcher's
// own comments count as record (markers.js), so nobody else can write a merge check.
async function loadIssue(client, repository, number, settings) {
  const data = await client.request('GET', `/repos/${repository}/issues/${number}`);
  if (data.pull_request) return null;
  const comments = await client.paginate(`/repos/${repository}/issues/${number}/comments`);
  const timeline = comments.map((c) => ({ type: 'commented', actor: c.user && c.user.login, body: c.body }));
  return {
    number,
    state: data.state,
    labels: (data.labels || []).map((l) => (typeof l === 'string' ? l : l.name)),
    record: readRecord(timeline, settings).record,
  };
}

async function judge(client, repository, number, settings) {
  const prData = await client.request('GET', `/repos/${repository}/pulls/${number}`);
  const pr = { author: prData.user && prData.user.login, headSha: prData.head.sha, body: prData.body || '' };
  const issueNumber = issueNumberOf(pr);
  const issue = issueNumber ? await loadIssue(client, repository, issueNumber, settings) : null;
  return { number, headSha: pr.headSha, open: prData.state === 'open', statuses: judgePull({ pr, issue, settings }) };
}

async function main() {
  const env = process.env;
  const { GITHUB_TOKEN: token, GITHUB_REPOSITORY: repository, GITHUB_API_URL: apiUrl, GITHUB_EVENT_PATH: eventPath } = env;
  if (!token || !repository || !eventPath) throw new Error('GITHUB_TOKEN, GITHUB_REPOSITORY and GITHUB_EVENT_PATH are required');
  const settings = loadSettings();
  const client = createClient({ token, repository, ...(apiUrl ? { apiUrl } : {}) });
  const target = targetOf(env.GITHUB_EVENT_NAME, JSON.parse(fs.readFileSync(eventPath, 'utf8')));

  let sha = target.sha;
  if (!sha) sha = (await client.request('GET', `/repos/${repository}/pulls/${target.number}`)).head.sha;
  // workflow_run.pull_requests is empty for pull requests from forks, so look them up by commit.
  const numbers = new Set(pullsAtSha(await client.paginate(`/repos/${repository}/commits/${sha}/pulls`), sha).map((p) => p.number));
  if (target.number) numbers.add(target.number);

  const judged = [];
  for (const n of [...numbers].sort((a, b) => a - b)) {
    const j = await judge(client, repository, n, settings);
    if (j.open && j.headSha === sha) judged.push(j); // a pull request that moved on gets its own run
  }
  const where = judged.map((j) => `#${j.number}`).join(', ') || 'no open pull request';
  for (const { context, state, description } of statusesAtSha(judged)) {
    await client.request('POST', `/repos/${repository}/statuses/${sha}`, { state, description, context });
    console.log(`${sha} (${where}): ${context} ${state} - ${description}`);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { targetOf, loadIssue };
