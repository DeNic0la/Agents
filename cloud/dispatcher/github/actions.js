// The session workflow as the dispatcher sees it: which issues have a session run
// queued or running, and how a run is started. A run's name carries its issue and
// role (`run-name` in .github/workflows/session.yml), so one listing answers both.
'use strict';

const SESSION_WORKFLOW = 'session.yml';
const DISPATCH_WORKFLOW = 'dispatch.yml';
const MERGE_GATE_WORKFLOW = 'merge-gate.yml';
const MERGE_WORKFLOW = 'merge.yml';
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

// CW-84: the workflows the stop switch turns off. merge-gate stays on: it is a required
// check and only reports; without dispatch, session and merge nothing it reports acts.
const STOPPABLE_WORKFLOWS = [DISPATCH_WORKFLOW, SESSION_WORKFLOW, MERGE_WORKFLOW];

function setWorkflowEnabled(client, workflow, enabled) {
  return client.request('PUT', `/repos/${client.repo}/actions/workflows/${workflow}/${enabled ? 'enable' : 'disable'}`);
}

// Runs of a workflow that are queued or running: [{ id, name }].
async function activeRuns(client, workflow) {
  const runs = new Map();
  for (const status of ACTIVE_STATUSES) {
    const data = await client.request('GET', `/repos/${client.repo}/actions/workflows/${workflow}/runs?status=${status}&per_page=100`);
    for (const run of (data && data.workflow_runs) || []) runs.set(run.id, { id: run.id, name: run.display_title || run.name });
  }
  return [...runs.values()];
}

function cancelRun(client, id) {
  return client.request('POST', `/repos/${client.repo}/actions/runs/${id}/cancel`);
}

async function runStatus(client, id) {
  const run = await client.request('GET', `/repos/${client.repo}/actions/runs/${id}`);
  return run && run.status;
}

module.exports = {
  activeSessionIssues, dispatchWorkflow, parseRunName, runName, setWorkflowEnabled, activeRuns, cancelRun, runStatus,
  SESSION_WORKFLOW, DISPATCH_WORKFLOW, MERGE_GATE_WORKFLOW, MERGE_WORKFLOW, STOPPABLE_WORKFLOWS,
};
