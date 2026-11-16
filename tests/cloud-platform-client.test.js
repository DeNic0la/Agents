// Tests of the Managed Agents platform client (cloud/dispatcher/platform/client.js) against a
// fake HTTP server: headers, bodies, paging, retries, secret-free errors and the pure helpers.
// Run: node --test "tests/cloud-*.test.js"
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const path = require('path');

const { createPlatformClient, PlatformError, usdToBudget, costUsd, sessionPhase } =
  require(path.join(__dirname, '..', 'cloud/dispatcher/platform/client.js'));

const KEY = 'sk-ant-secret-key';

// handler(req, body, call index) -> [status, data, extraHeaders]
function fake(handler) {
  const calls = [];
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      const rec = { method: req.method, url: req.url, headers: req.headers, body: raw ? JSON.parse(raw) : null };
      calls.push(rec);
      const [status, data, extra] = handler(rec, calls.length - 1);
      res.writeHead(status, { 'Content-Type': 'application/json', ...(extra || {}) });
      res.end(JSON.stringify(data));
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () =>
    resolve({ server, calls, url: `http://127.0.0.1:${server.address().port}` })));
}

async function withClient(handler, fn) {
  const f = await fake(handler);
  const sleeps = [];
  const client = createPlatformClient({ apiKey: KEY, apiUrl: f.url, sleep: async (ms) => { sleeps.push(ms); } });
  try { await fn(client, f.calls, sleeps); } finally { f.server.close(); }
}

test('sends the platform headers and the session request body', async () => {
  await withClient(() => [200, { id: 'sesn_1' }], async (client, calls) => {
    const resources = [{ type: 'github_repository', url: 'https://github.com/o/r', mount_path: '/workspace/r', authorization_token: 'ghs_tok' }];
    await client.createSession({
      agentId: 'agent_1', environmentId: 'env_1', resources,
      budget: usdToBudget(2.5), initialMessage: 'hello', metadata: { issue: '7' },
    });
    const c = calls[0];
    assert.equal(`${c.method} ${c.url}`, 'POST /v1/sessions');
    assert.equal(c.headers['x-api-key'], KEY);
    assert.equal(c.headers['anthropic-version'], '2026-10-21');
    assert.equal(c.headers['anthropic-beta'], 'managed-agents-2026-04-01');
    assert.deepEqual(c.body, {
      agent: 'agent_1',
      environment_id: 'env_1',
      resources,
      budget: { type: 'limit', max_list_cost: { amount: '250', currency: 'USD' } },
      initial_events: [{ type: 'user.message', content: [{ type: 'text', text: 'hello' }] }],
      metadata: { issue: '7' },
    });
  });
});

test('updateAgent sends the version and a 409 surfaces as PlatformError with status', async () => {
  await withClient((req) => (req.body.version === 3 ? [200, { id: 'a', version: 4 }] : [409, { error: { message: 'version mismatch' } }]),
    async (client, calls) => {
      const ok = await client.updateAgent('a', 3, { name: 'n' });
      assert.equal(ok.version, 4);
      assert.deepEqual(calls[0].body, { name: 'n', version: 3 });
      assert.equal(calls[0].url, '/v1/agents/a');
      await assert.rejects(client.updateAgent('a', 2, {}), (e) => e instanceof PlatformError && e.status === 409 && /version mismatch/.test(e.message));
    });
});

test('listSessions follows pages and sends the filters', async () => {
  await withClient((req) => {
    const u = new URL(req.url, 'http://x');
    return u.searchParams.get('page') === 'p2'
      ? [200, { data: [{ id: 's3' }], next_page: null }]
      : [200, { data: [{ id: 's1' }, { id: 's2' }], next_page: 'p2' }];
  }, async (client, calls) => {
    const all = await client.listSessions({ agentId: 'agent_1', limit: 2 });
    assert.deepEqual(all.map((s) => s.id), ['s1', 's2', 's3']);
    const u = new URL(calls[0].url, 'http://x');
    assert.equal(u.pathname, '/v1/sessions');
    assert.equal(u.searchParams.get('agent_id'), 'agent_1');
    assert.equal(u.searchParams.get('limit'), '2');
    assert.equal(new URL(calls[1].url, 'http://x').searchParams.get('page'), 'p2');
  });
});

test('listEvents passes after; messages, interrupt and resources hit the right endpoints', async () => {
  await withClient(() => [200, { data: [] }], async (client, calls) => {
    await client.listEvents('s1', { after: 'ev9' });
    assert.equal(new URL(calls[0].url, 'http://x').searchParams.get('after'), 'ev9');
    await client.sendMessage('s1', 'hi');
    assert.deepEqual(calls[1].body, { events: [{ type: 'user.message', content: [{ type: 'text', text: 'hi' }] }] });
    await client.interrupt('s1');
    assert.deepEqual(calls[2].body, { events: [{ type: 'user.interrupt' }] });
    assert.equal(calls[2].url, '/v1/sessions/s1/events');
    await client.listResources('s1');
    assert.equal(new URL(calls[3].url, 'http://x').pathname, '/v1/sessions/s1/resources');
    await client.setResourceToken('s1', 'sesrsc_1', 'ghs_new');
    assert.equal(`${calls[4].method} ${calls[4].url}`, 'POST /v1/sessions/s1/resources/sesrsc_1');
    assert.deepEqual(calls[4].body, { authorization_token: 'ghs_new' });
  });
});

test('retries 429 honoring retry-after, then 5xx with backoff, and gives up after 3 retries', async () => {
  await withClient((req, i) => (i === 0 ? [429, { error: { message: 'slow down' } }, { 'retry-after': '2' }] : [200, { id: 'a' }]),
    async (client, calls, sleeps) => {
      assert.deepEqual(await client.getAgent('a'), { id: 'a' });
      assert.equal(calls.length, 2);
      assert.deepEqual(sleeps, [2000]);
    });
  await withClient(() => [503, { error: { message: 'down' } }], async (client, calls, sleeps) => {
    await assert.rejects(client.getAgent('a'), (e) => e.status === 503);
    assert.equal(calls.length, 4);
    assert.equal(sleeps.length, 3);
  });
  await withClient(() => [400, { error: { message: 'bad' } }], async (client, calls) => {
    await assert.rejects(client.getAgent('a'), (e) => e.status === 400);
    assert.equal(calls.length, 1);
  });
});

test('error messages contain neither the API key nor an authorization token', async () => {
  const echo = (req) => [400, { error: { message: `invalid token ${req.body.resources[0].authorization_token} for key ${KEY}` } }];
  await withClient(echo, async (client) => {
    const resources = [{ type: 'github_repository', url: 'u', authorization_token: 'ghs_supersecret' }];
    await assert.rejects(client.createSession({ agentId: 'a', environmentId: 'e', resources }), (e) => {
      assert.doesNotMatch(e.message, /ghs_supersecret/);
      assert.ok(!e.message.includes(KEY));
      assert.match(e.message, /\[redacted\]/);
      return true;
    });
  });
});

test('pure helpers: usdToBudget, costUsd, sessionPhase', () => {
  assert.equal(usdToBudget(2), '200');
  assert.equal(usdToBudget(1.999), '199');
  assert.equal(usdToBudget(0.29), '29');
  assert.equal(costUsd({ usage: { list_cost: { amount: '125', currency: 'USD' } } }), 1.25);
  assert.equal(costUsd({}), 0);
  assert.equal(sessionPhase({ status: 'running' }), 'running');
  assert.equal(sessionPhase({ status: 'rescheduling' }), 'running');
  assert.equal(sessionPhase({ status: 'idle', stop_reason: { type: 'end_turn' } }), 'done');
  assert.equal(sessionPhase({ status: 'idle', stop_reason: { type: 'requires_action' } }), 'needs-action');
  assert.equal(sessionPhase({ status: 'idle', stop_reason: { type: 'budget_reached' } }), 'budget');
  assert.equal(sessionPhase({ status: 'terminated' }), 'failed');
});
