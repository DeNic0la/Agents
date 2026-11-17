// Client for the Claude Managed Agents platform API (beta): agents, environments, sessions,
// events and session resources. No dependencies, fetch and sleep injectable for tests.
'use strict';

const API_VERSION = '2026-10-21';
const BETA = 'managed-agents-2026-04-01';
const MAX_RETRIES = 3;

// Field names the research notes do not settle. Each is used in exactly one place.
const PAGE_PARAM = 'page'; // query parameter that carries the page cursor
const NEXT_PAGE_FIELD = 'next_page'; // response field with the next cursor (null/absent at the end)
const LIST_FIELD = 'data'; // response field holding the items of a list
const AFTER_PARAM = 'after'; // events listing: only events after this event id
const METADATA_FIELD = 'metadata'; // session create: free-form string map (unconfirmed)
const ROTATE_METHOD = 'POST'; // method of the resource token rotation call (unconfirmed)
const SKILL_FILES_FIELD = 'files[]'; // skill upload: multipart field that carries each file
const SKILL_TITLE_FIELD = 'display_title'; // skill upload: form field and list field with the title (unconfirmed)

class PlatformError extends Error {
  constructor(status, path, message) {
    super(`Platform API ${status} on ${path}: ${message}`);
    this.name = 'PlatformError';
    this.status = status;
    this.path = path;
  }
}

// US dollars to a cents string for the session budget, rounded down.
function usdToBudget(usd) {
  return String(Math.floor(Number(usd) * 100 + 1e-9));
}

// Cost of a session in US dollars, from usage.list_cost (cents as a string).
function costUsd(session) {
  const lc = session && session.usage && session.usage.list_cost;
  const cents = lc && lc.amount !== undefined ? Number(lc.amount) : 0;
  return Number.isFinite(cents) ? cents / 100 : 0;
}

// 'running' | 'done' | 'needs-action' | 'budget' | 'failed'
function sessionPhase(session) {
  const status = session && session.status;
  if (status === 'terminated') return 'failed';
  if (status !== 'idle') return 'running';
  const reason = session.stop_reason && session.stop_reason.type;
  if (reason === 'requires_action') return 'needs-action';
  if (reason === 'budget_reached') return 'budget';
  return 'done';
}

function textEvent(text) {
  return { type: 'user.message', content: [{ type: 'text', text }] };
}

function collectTokens(value, out) {
  if (!value || typeof value !== 'object') return out;
  for (const [k, v] of Object.entries(value)) {
    if (k === 'authorization_token' && typeof v === 'string' && v) out.push(v);
    else collectTokens(v, out);
  }
  return out;
}

function createPlatformClient({
  apiKey,
  apiUrl = 'https://api.anthropic.com',
  fetchImpl = globalThis.fetch,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
}) {
  const base = apiUrl.replace(/\/+$/, '');

  function headers(hasBody, multipart) {
    const h = { 'x-api-key': apiKey, 'anthropic-version': API_VERSION, 'anthropic-beta': BETA };
    // fetch sets the multipart content type with its boundary itself
    if (hasBody && !multipart) h['content-type'] = 'application/json';
    return h;
  }

  function delayMs(res, attempt) {
    // A missing header is null, and Number(null) is 0: that would retry at once.
    const raw = res.headers && res.headers.get ? res.headers.get('retry-after') : null;
    const ra = raw === null || raw === undefined || String(raw).trim() === '' ? NaN : Number(raw);
    if (Number.isFinite(ra) && ra >= 0) return ra * 1000;
    return 500 * 2 ** attempt;
  }

  async function request(method, path, body, query) {
    const hasBody = body !== undefined && body !== null;
    const multipart = hasBody && typeof FormData !== 'undefined' && body instanceof FormData;
    const secrets = [apiKey, ...collectTokens(body, [])].filter(Boolean);
    const scrub = (s) => secrets.reduce((acc, x) => acc.split(x).join('[redacted]'), String(s));
    let qs = '';
    if (query) {
      const p = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null) p.set(k, String(v));
      if (String(p)) qs = `?${p}`;
    }
    for (let attempt = 0; ; attempt++) {
      const res = await fetchImpl(base + path + qs, {
        method,
        headers: headers(hasBody, multipart),
        body: !hasBody ? undefined : multipart ? body : JSON.stringify(body),
      });
      if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
        await sleep(delayMs(res, attempt));
        continue;
      }
      const text = await res.text();
      let data = null;
      if (text) {
        try { data = JSON.parse(text); } catch { data = null; }
      }
      if (!res.ok) {
        const message = (data && data.error && data.error.message) || (data && data.message) || text || res.statusText || 'request failed';
        throw new PlatformError(res.status, path, scrub(message));
      }
      return data;
    }
  }

  async function listAll(path, query) {
    const all = [];
    let page;
    do {
      const data = await request('GET', path, null, { ...query, [PAGE_PARAM]: page });
      all.push(...((data && data[LIST_FIELD]) || []));
      page = data && data[NEXT_PAGE_FIELD];
    } while (page);
    return all;
  }

  // files: [[path, content]]; every path starts with the one top-level skill folder.
  function skillForm(files, title) {
    const form = new FormData();
    if (title) form.set(SKILL_TITLE_FIELD, title);
    for (const [filePath, content] of files) form.append(SKILL_FILES_FIELD, new Blob([content]), filePath);
    return form;
  }

  return {
    listSkills: () => listAll('/v1/skills'),
    createSkill: (files, title) => request('POST', '/v1/skills', skillForm(files, title)),
    createSkillVersion: (id, files, title) => request('POST', `/v1/skills/${id}/versions`, skillForm(files, title)),
    listAgents: () => listAll('/v1/agents'),
    getAgent: (id) => request('GET', `/v1/agents/${id}`),
    createAgent: (body) => request('POST', '/v1/agents', body),
    updateAgent: (id, version, body) => request('POST', `/v1/agents/${id}`, { ...body, version }),
    listEnvironments: () => listAll('/v1/environments'),
    createEnvironment: (body) => request('POST', '/v1/environments', body),
    createSession({ agentId, environmentId, resources, budget, initialMessage, metadata }) {
      const body = { agent: agentId, environment_id: environmentId };
      if (resources) body.resources = resources;
      if (budget !== undefined && budget !== null) {
        body.budget = typeof budget === 'object' ? budget : { type: 'limit', max_list_cost: { amount: String(budget), currency: 'USD' } };
      }
      if (initialMessage) body.initial_events = [textEvent(initialMessage)];
      if (metadata) body[METADATA_FIELD] = metadata;
      return request('POST', '/v1/sessions', body);
    },
    getSession: (id) => request('GET', `/v1/sessions/${id}`),
    listSessions: ({ agentId, limit } = {}) => listAll('/v1/sessions', { agent_id: agentId, limit, order: 'desc' }),
    sendMessage: (id, text) => request('POST', `/v1/sessions/${id}/events`, { events: [textEvent(text)] }),
    interrupt: (id) => request('POST', `/v1/sessions/${id}/events`, { events: [{ type: 'user.interrupt' }] }),
    listEvents: (id, { after } = {}) => listAll(`/v1/sessions/${id}/events`, { [AFTER_PARAM]: after }),
    listResources: (id) => listAll(`/v1/sessions/${id}/resources`),
    setResourceToken: (id, resourceId, token) =>
      request(ROTATE_METHOD, `/v1/sessions/${id}/resources/${resourceId}`, { authorization_token: token }),
  };
}

module.exports = { createPlatformClient, SKILL_TITLE_FIELD, PlatformError, usdToBudget, costUsd, sessionPhase };
