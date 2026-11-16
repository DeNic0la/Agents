// Entry point of the merge-gate workflow: sets the `merge-gate` commit status on a pull request.
// Reads GITHUB_EVENT_PATH, GITHUB_TOKEN, GITHUB_REPOSITORY (and GITHUB_API_URL); owner from cloud/settings.json.
'use strict';
const fs = require('fs');
const path = require('path');
const { createClient } = require('./github/client.js');
const { mergeGate } = require('./decide/merge-gate.js');

function readOwner() {
  const file = path.join(__dirname, '..', 'settings.json');
  if (!fs.existsSync(file)) throw new Error('cloud/settings.json is missing: it must define the "owner" login');
  const owner = JSON.parse(fs.readFileSync(file, 'utf8')).owner;
  if (!owner) throw new Error('cloud/settings.json has no "owner" field');
  return owner;
}

function prNumberFromEvent(event) {
  const n = (event.pull_request && event.pull_request.number) || (event.inputs && event.inputs.pr);
  const number = Number(n);
  if (!Number.isInteger(number) || number < 1) throw new Error('No pull request number in the event');
  return number;
}

async function main() {
  const { GITHUB_TOKEN: token, GITHUB_REPOSITORY: repository, GITHUB_API_URL: apiUrl, GITHUB_EVENT_PATH: eventPath } = process.env;
  if (!token || !repository || !eventPath) throw new Error('GITHUB_TOKEN, GITHUB_REPOSITORY and GITHUB_EVENT_PATH are required');
  const owner = readOwner();
  const number = prNumberFromEvent(JSON.parse(fs.readFileSync(eventPath, 'utf8')));
  const client = createClient({ token, repository, ...(apiUrl ? { apiUrl } : {}) });

  const prData = await client.request('GET', `/repos/${repository}/pulls/${number}`);
  const reviewData = await client.paginate(`/repos/${repository}/pulls/${number}/reviews`);
  const pr = { author: prData.user && prData.user.login, headSha: prData.head.sha, draft: Boolean(prData.draft) };
  const reviews = reviewData.map((r) => ({
    user: r.user && r.user.login,
    state: r.state,
    commitId: r.commit_id,
    submittedAt: r.submitted_at,
  }));

  const { state, description } = mergeGate({ pr, reviews, owner });
  await client.request('POST', `/repos/${repository}/statuses/${pr.headSha}`, {
    state,
    description,
    context: 'merge-gate',
  });
  console.log(`PR #${number} @ ${pr.headSha}: merge-gate ${state} - ${description}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
