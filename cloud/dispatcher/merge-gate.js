// Entry point of the merge-gate workflow: sets the `merge-gate` commit status on a head commit.
// Reads GITHUB_EVENT_NAME, GITHUB_EVENT_PATH, GITHUB_TOKEN, GITHUB_REPOSITORY (and GITHUB_API_URL);
// the owner comes from cloud/settings.json.
//
// Events: `pull_request_target` (a pull request changed), `workflow_run` of review-relay (a
// review changed; D50) and `workflow_dispatch` with a pull request number. Each is reduced to
// a head commit, and every open pull request at that commit is judged.
'use strict';
const fs = require('fs');
const path = require('path');
const { createClient } = require('./github/client.js');
const { mergeGate, gateAtSha, pullsAtSha } = require('./decide/merge-gate.js');

function readOwner() {
  const file = path.join(__dirname, '..', 'settings.json');
  if (!fs.existsSync(file)) throw new Error('cloud/settings.json is missing: it must define the "owner" login');
  const owner = JSON.parse(fs.readFileSync(file, 'utf8')).owner;
  if (!owner) throw new Error('cloud/settings.json has no "owner" field');
  return owner;
}

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

async function judge(client, repository, number, owner) {
  const prData = await client.request('GET', `/repos/${repository}/pulls/${number}`);
  const reviewData = await client.paginate(`/repos/${repository}/pulls/${number}/reviews`);
  const pr = { author: prData.user && prData.user.login, headSha: prData.head.sha, draft: Boolean(prData.draft) };
  const reviews = reviewData.map((r) => ({ user: r.user && r.user.login, state: r.state, commitId: r.commit_id, submittedAt: r.submitted_at }));
  return { number, headSha: pr.headSha, open: prData.state === 'open', result: mergeGate({ pr, reviews, owner }) };
}

async function main() {
  const env = process.env;
  const { GITHUB_TOKEN: token, GITHUB_REPOSITORY: repository, GITHUB_API_URL: apiUrl, GITHUB_EVENT_PATH: eventPath } = env;
  if (!token || !repository || !eventPath) throw new Error('GITHUB_TOKEN, GITHUB_REPOSITORY and GITHUB_EVENT_PATH are required');
  const owner = readOwner();
  const client = createClient({ token, repository, ...(apiUrl ? { apiUrl } : {}) });
  const target = targetOf(env.GITHUB_EVENT_NAME, JSON.parse(fs.readFileSync(eventPath, 'utf8')));

  let sha = target.sha;
  if (!sha) sha = (await client.request('GET', `/repos/${repository}/pulls/${target.number}`)).head.sha;
  // workflow_run.pull_requests is empty for pull requests from forks, so look them up by commit.
  const numbers = new Set(pullsAtSha(await client.paginate(`/repos/${repository}/commits/${sha}/pulls`), sha).map((p) => p.number));
  if (target.number) numbers.add(target.number);

  const gates = [];
  for (const n of [...numbers].sort((a, b) => a - b)) {
    const g = await judge(client, repository, n, owner);
    if (g.open && g.headSha === sha) gates.push(g); // a pull request that moved on gets its own run
  }
  const { state, description } = gateAtSha(gates);
  await client.request('POST', `/repos/${repository}/statuses/${sha}`, { state, description, context: 'merge-gate' });
  console.log(`${sha} (${gates.map((g) => `#${g.number}`).join(', ') || 'no open pull request'}): merge-gate ${state} - ${description}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { targetOf };
