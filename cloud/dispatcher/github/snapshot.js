// Reads what the rules need from GitHub. The mapping functions are pure and tested;
// loadIssueView and listOpenIssues do the requests.
'use strict';

const { splitBody, dependsOn, closingIssues } = require('../decide/spec');

const loginOf = (u) => (u && u.login) || null;
const labelNames = (labels) => (labels || []).map((l) => (typeof l === 'string' ? l : l.name)).filter(Boolean);

// Timeline events the rules read, oldest first.
function mapTimeline(raw) {
  const out = [];
  for (const e of raw || []) {
    switch (e.event) {
      case 'labeled':
      case 'unlabeled':
        out.push({ type: e.event, actor: loginOf(e.actor), label: e.label && e.label.name, at: e.created_at });
        break;
      case 'commented':
        out.push({ type: 'commented', actor: loginOf(e.actor) || loginOf(e.user), body: e.body || '', at: e.created_at });
        break;
      case 'closed':
      case 'reopened':
        out.push({ type: e.event, actor: loginOf(e.actor), at: e.created_at });
        break;
      default:
    }
  }
  return out;
}

// The repository "owner/name" of an issue or pull request in a timeline source.
const repoOf = (issue) => {
  if (issue.repository && issue.repository.full_name) return issue.repository.full_name;
  const m = /\/repos\/([^/]+\/[^/]+)$/.exec(issue.repository_url || '');
  return m ? m[1] : null;
};

// Pull requests of this repository that mention the issue, newest first. A reference
// from another repository is skipped: its number means nothing here.
function referencingPulls(raw, repo) {
  const seen = new Set();
  const out = [];
  for (let i = (raw || []).length - 1; i >= 0; i--) {
    const e = raw[i];
    const src = e.event === 'cross-referenced' && e.source && e.source.issue;
    if (!src || !src.pull_request || seen.has(src.number)) continue;
    if (repo && repoOf(src) && repoOf(src).toLowerCase() !== repo.toLowerCase()) continue;
    seen.add(src.number);
    out.push(src.number);
  }
  return out;
}

function mapIssue(issue) {
  return {
    number: issue.number,
    title: issue.title || '',
    state: issue.state,
    stateReason: issue.state_reason || null,
    author: loginOf(issue.user),
    body: issue.body || '',
    labels: labelNames(issue.labels),
    isPull: Boolean(issue.pull_request),
    updatedAt: issue.updated_at || null,
  };
}

async function optional(promise, fallback) {
  try {
    return await promise;
  } catch (err) {
    if (err && (err.status === 404 || err.status === 410)) return fallback;
    throw err;
  }
}

async function loadIssueView(client, number) {
  const r = `/repos/${client.repo}`;
  const issue = mapIssue(await client.request('GET', `${r}/issues/${number}`));
  if (issue.isPull) return { ...issue, timeline: [], dependencies: [], pull: null };
  const raw = await client.paginate(`${r}/issues/${number}/timeline`);

  const blockedBy = await optional(client.paginate(`${r}/issues/${number}/dependencies/blocked_by`), []);
  const deps = new Map(blockedBy.map((d) => [d.number, d.state]));
  for (const n of dependsOn(splitBody(issue.body).spec)) {
    if (!deps.has(n)) deps.set(n, (await optional(client.request('GET', `${r}/issues/${n}`), { state: 'open' })).state);
  }

  let pull = null;
  for (const n of referencingPulls(raw, client.repo)) {
    const pr = await client.request('GET', `${r}/pulls/${n}`);
    if (!closingIssues(pr.body).includes(number)) continue;
    const closedBy = pr.state === 'closed' ? loginOf((await client.request('GET', `${r}/issues/${n}`)).closed_by) : null;
    pull = { number: n, author: loginOf(pr.user), state: pr.state, merged: Boolean(pr.merged), closedBy, headSha: pr.head && pr.head.sha };
    break;
  }

  return {
    ...issue,
    timeline: mapTimeline(raw),
    dependencies: [...deps].map(([n, state]) => ({ number: n, state })).sort((a, b) => a.number - b.number),
    pull,
  };
}

async function listOpenIssues(client) {
  const all = await client.paginate(`/repos/${client.repo}/issues?state=open`);
  return all.map(mapIssue).filter((i) => !i.isPull);
}

// Issues closed since `since` (ISO time): a closed issue may still carry labels to clean.
async function listClosedSince(client, since) {
  const all = await client.paginate(`/repos/${client.repo}/issues?state=closed&since=${encodeURIComponent(since)}`);
  return all.map(mapIssue).filter((i) => !i.isPull);
}

// Number, title and state of every issue, newest first, for triage's duplicate check.
async function listIssueIndex(client, max = 500) {
  const all = await client.paginate(`/repos/${client.repo}/issues?state=all&sort=created&direction=desc`);
  return all.map(mapIssue).filter((i) => !i.isPull).slice(0, max).map(({ number, title, state }) => ({ number, title, state }));
}

module.exports = { mapTimeline, referencingPulls, mapIssue, loadIssueView, listOpenIssues, listClosedSince, listIssueIndex };
