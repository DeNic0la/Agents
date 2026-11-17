// The session workflow as the dispatcher sees it: which issues have a session run
// queued or running, and how a run is started. A run's name carries its issue and
// role (`run-name` in .github/workflows/session.yml), so one listing answers both.
'use strict';

const SESSION_WORKFLOW = 'session.yml';
const DISPATCH_WORKFLOW = 'dispatch.yml';
const ACTIVE_STATUSES = ['queued', 'in_progress', 'waiting', 'pending', 'requested'];

const runName = (issue, role) => `session #${issue} ${role}`;

// "session #12 triage" -> { issue: 12, role: 'triage' }, anything else -> null.
function parseRunName(name) {
  const m = /^session #(\d+) ([a-z]+)$/.exec(String(name || '').trim());
  return m ? { issue: Number(m[1]), role: m[2] } : null;
}

async function activeSessionIssues(client) {
  const issues = new Set();
  for (const status of ACTIVE_STATUSES) {
    const data = await client.request('GET', `/repos/${client.repo}/actions/workflows/${SESSION_WORKFLOW}/runs?status=${status}&per_page=100`);
    for (const run of (data && data.workflow_runs) || []) {
      const parsed = parseRunName(run.display_title || run.name);
      if (parsed) issues.add(parsed.issue);
    }
  }
  return issues;
}

// GITHUB_TOKEN may start a workflow_dispatch run: the one event it triggers.
function dispatchWorkflow(client, workflow, ref, inputs) {
  const body = { ref, inputs: Object.fromEntries(Object.entries(inputs).map(([k, v]) => [k, String(v)])) };
  return client.request('POST', `/repos/${client.repo}/actions/workflows/${workflow}/dispatches`, body);
}

module.exports = { activeSessionIssues, dispatchWorkflow, parseRunName, runName, SESSION_WORKFLOW, DISPATCH_WORKFLOW };
