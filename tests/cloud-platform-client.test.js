// Tests of the Managed Agents platform client (cloud/dispatcher/platform/client.js) against a
// fake HTTP server: headers, bodies, paging, retries, secret-free errors and the pure helpers.
// Run: node --test "tests/cloud-*.test.js"
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const path = require('path');

const { createPlatformClient, PlatformError, usdToBudget, costUsd, sessionPhase, sessionRunning } =
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

test('listEvents sends no after parameter; messages, interrupt and resources hit the right endpoints', async () => {
  await withClient(() => [200, { data: [] }], async (client, calls) => {
    await client.listEvents('s1');
    const u = new URL(calls[0].url, 'http://x');
    assert.equal(u.pathname, '/v1/sessions/s1/events');
    assert.equal(u.searchParams.has('after'), false);
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
  // Without a Retry-After header the client backs off; a missing header is not "wait 0".
  await withClient((req, i) => (i === 0 ? [429, { error: { message: 'slow down' } }] : [200, { id: 'a' }]),
    async (client, calls, sleeps) => {
      await client.getAgent('a');
      assert.equal(sleeps.length, 1);
      assert.ok(sleeps[0] > 0, `slept ${sleeps[0]} ms`);
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
});

// Event shape from https://platform.claude.com/docs/en/api/beta/sessions/events/list:
// { id, type, stop_reason: { type }, processed_at } on session.status_idle.
// Session shape from https://platform.claude.com/docs/en/api/beta/sessions/retrieve: no stop_reason.
const userMessage = (id = 'sevt_u1') => ({ id, type: 'user.message', content: [{ type: 'text', text: 'task' }], processed_at: '2026-11-20T10:00:00Z' });
const idleEvent = (reason, id = 'sevt_i1') => ({ id, type: 'session.status_idle', stop_reason: reason === undefined ? undefined : { type: reason }, processed_at: '2026-11-20T10:05:00Z' });
const threadIdle = (reason) => ({ id: 'sevt_t1', type: 'session.thread_status_idle', stop_reason: { type: reason }, processed_at: '2026-11-20T10:04:00Z' });
const phaseOf = (status, events) => sessionPhase({ id: 'sesn_1', status }, events);

test('sessionPhase: running and rescheduling are running, with or without events', () => {
  assert.equal(phaseOf('running', [userMessage()]), 'running');
  assert.equal(phaseOf('rescheduling', [userMessage()]), 'running');
  assert.equal(phaseOf('running', [userMessage(), idleEvent('end_turn')]), 'running');
});

test('sessionPhase: a fresh idle session with only its user.message is running', () => {
  assert.equal(phaseOf('idle', [userMessage()]), 'running');
  assert.equal(phaseOf('idle', []), 'running');
  assert.equal(phaseOf('idle', undefined), 'running');
});

test('sessionPhase: an idle event from before the last user.message does not count', () => {
  assert.equal(phaseOf('idle', [userMessage('a'), idleEvent('refusal'), userMessage('b')]), 'running');
});

test('sessionPhase: idle maps each stop reason to its phase', () => {
  const after = (reason) => phaseOf('idle', [userMessage(), idleEvent(reason)]);
  assert.equal(after('end_turn'), 'done');
  assert.equal(after('requires_action'), 'needs-action');
  assert.equal(after('budget_reached'), 'budget');
  assert.equal(after('retries_exhausted'), 'failed');
  assert.equal(after('refusal'), 'failed');
  assert.equal(after('something_new'), 'failed');
  assert.equal(after(undefined), 'failed');
});

test('sessionPhase: an end_turn after an interrupt is done (runSession maps it to timeout)', () => {
  const events = [userMessage(), { id: '', type: 'user.interrupt' }, idleEvent('end_turn')];
  assert.equal(phaseOf('idle', events), 'done');
});

test('sessionPhase: the last session.status_idle wins; thread idle events are ignored', () => {
  assert.equal(phaseOf('idle', [userMessage(), idleEvent('requires_action', 'i1'), idleEvent('end_turn', 'i2')]), 'done');
  assert.equal(phaseOf('idle', [userMessage(), threadIdle('budget_reached'), idleEvent('end_turn')]), 'done');
  assert.equal(phaseOf('idle', [userMessage(), threadIdle('end_turn')]), 'running');
});

test('sessionPhase: terminated is done after end_turn, otherwise failed', () => {
  assert.equal(phaseOf('terminated', [userMessage(), idleEvent('end_turn')]), 'done');
  assert.equal(phaseOf('terminated', [userMessage(), idleEvent('refusal')]), 'failed');
  assert.equal(phaseOf('terminated', [userMessage()]), 'failed');
  assert.equal(phaseOf('terminated', undefined), 'failed');
  // an end_turn that answered an earlier message doesn't count for the last one
  assert.equal(phaseOf('terminated', [userMessage(), idleEvent('end_turn'), userMessage()]), 'failed');
});

test('sessionRunning is a status check: neither idle nor terminated', () => {
  assert.equal(sessionRunning({ status: 'running' }), true);
  assert.equal(sessionRunning({ status: 'rescheduling' }), true);
  assert.equal(sessionRunning({ status: 'idle' }), false);
  assert.equal(sessionRunning({ status: 'terminated' }), false);
});
