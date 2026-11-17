// Runs one Managed Agents session to its end: finds the role's agent and environment,
// starts the session with the issue's task and a hard cost limit, keeps its GitHub
// token fresh, stops it at the time limit and returns its last message. The clock,
// the sleep and the token minting are injected, so tests run it against fakes.
'use strict';

const { usdToBudget, costUsd, sessionPhase } = require('./client');

// Unconfirmed names of the beta, kept in one place.
const AGENT_MESSAGE_EVENT = 'agent.message';
const REPO_RESOURCE = 'github_repository';
const POLL_MS = 15000;
const STARTUP_GRACE_MS = 120000; // idle without a stop reason right after creation means not started yet
const STOP_GRACE_MS = 120000; // how long an interrupted session gets to go idle

class SetupError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SetupError';
  }
}

const agentName = (role) => `agents-${role}`;
const repoName = (repository) => String(repository).split('/')[1];

// The text of the last agent message: the one that holds the result.
function lastAgentText(events) {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const e = events[i];
    if (e && e.type === AGENT_MESSAGE_EVENT) {
      const blocks = Array.isArray(e.content) ? e.content : [];
      return blocks.filter((b) => b && b.type === 'text').map((b) => b.text).join('\n');
    }
  }
  return '';
}

// What's left after one request's overshoot (the budget stops between requests).
function sessionBudget(limitUsd, settings) {
  const margin = Number(settings.platform.requestMarginUsd || 0);
  const usd = Math.floor((Number(limitUsd) - margin) * 100) / 100;
  if (!(usd > 0)) throw new SetupError(`the hard limit of $${Number(limitUsd).toFixed(2)} leaves nothing after the request margin`);
  return { type: 'limit', max_list_cost: { amount: usdToBudget(usd), currency: 'USD' } };
}

async function findSetup(client, role, environmentName) {
  const [agents, environments] = await Promise.all([client.listAgents(), client.listEnvironments()]);
  const agent = agents.find((a) => a.name === agentName(role) && !a.archived_at);
  if (!agent) throw new SetupError(`the agent ${agentName(role)} doesn't exist yet: run the sync-agents workflow`);
  const env = environments.find((e) => e.name === environmentName && !e.archived_at);
  if (!env) throw new SetupError(`the environment ${environmentName} doesn't exist yet: run the sync-agents workflow`);
  return { agent, env };
}

async function rotateToken(client, sessionId, mintToken) {
  const token = await mintToken();
  const resources = await client.listResources(sessionId);
  const repo = resources.find((r) => r.type === REPO_RESOURCE);
  if (repo) await client.setResourceToken(sessionId, repo.id, token);
}

// Returns { id, link, phase, costUsd, text, running?, error? }; phase is 'done', 'needs-action',
// 'budget', 'failed' or 'timeout'. `running`: the session didn't stop when interrupted.
async function runSession({
  client, role, environmentName, settings, limitUsd, message, branch = 'main', metadata,
  mintToken, now = Date.now, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), log = () => {},
}) {
  const { agent, env } = await findSetup(client, role, environmentName);
  const budget = sessionBudget(limitUsd, settings);
  const repo = repoName(settings.repository);
  const resources = [{
    type: REPO_RESOURCE,
    url: `https://github.com/${settings.repository}`,
    mount_path: `/workspace/${repo}`,
    authorization_token: await mintToken(),
    checkout: { type: 'branch', name: branch },
  }];
  const created = await client.createSession({ agentId: agent.id, environmentId: env.id, resources, budget, initialMessage: message, metadata });
  const id = created.id;
  const link = settings.platform.sessionLink.replace('{id}', id);
  log(`session ${id} started for ${agentName(role)}`);

  const started = now();
  const rotateMs = Number(settings.platform.tokenRotationMinutes) * 60000;
  const timeoutMs = Number(settings.platform.sessionTimeoutMinutes) * 60000;
  let rotated = started;
  let stoppedAt = null;
  let session = created;
  try {
    return await pollSession();
  } catch (err) {
    // Started, then lost: keep its id and what it cost so far (CW-102). It may still run,
    // so no retry starts a second one.
    return { id, link, phase: 'failed', running: true, costUsd: costUsd(session), text: '', error: err.message };
  }

  async function pollSession() {
    for (;;) {
      await sleep(POLL_MS);
      session = await client.getSession(id);
      let phase = sessionPhase(session);
      if (phase === 'done' && !session.stop_reason && now() - started < STARTUP_GRACE_MS) phase = 'running';
      if (phase !== 'running') {
        const text = phase === 'failed' ? '' : lastAgentText(await client.listEvents(id));
        return { id, link, phase: stoppedAt !== null && phase === 'done' ? 'timeout' : phase, costUsd: costUsd(session), text };
      }
      if (stoppedAt !== null) {
        // Still running after the interrupt: say so, so no retry starts a second session.
        if (now() - stoppedAt > STOP_GRACE_MS) return { id, link, phase: 'timeout', running: true, costUsd: costUsd(session), text: '' };
        continue;
      }
      if (now() - started >= timeoutMs) {
        log(`session ${id} reached the time limit; interrupting`);
        await client.interrupt(id);
        stoppedAt = now();
        continue;
      }
      if (now() - rotated >= rotateMs) {
        await rotateToken(client, id, mintToken);
        rotated = now();
      }
    }
  }
}

module.exports = { runSession, lastAgentText, sessionBudget, agentName, SetupError, AGENT_MESSAGE_EVENT };
