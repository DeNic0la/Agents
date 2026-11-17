// Tests for cloud/dispatcher/github/client.js.
// Run: node --test "tests/*.test.js"
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { createClient, GitHubError, parseNextLink } = require(path.join(__dirname, '..', 'cloud/dispatcher/github/client.js'));

function response(status, body, headers = {}) {
  const text = body === undefined ? '' : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: '',
    headers: { get: (k) => headers[k.toLowerCase()] ?? null },
    text: async () => text,
  };
}

function fakeFetch(responses) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, init });
    return responses.shift();
  };
  return { impl, calls };
}

test('request sends the headers and a JSON body and returns parsed JSON', async () => {
  const f = fakeFetch([response(200, { ok: true })]);
  const c = createClient({ token: 't0k', repository: 'o/r', fetchImpl: f.impl });
  const data = await c.request('POST', '/repos/o/r/labels', { name: 'x' });
  assert.deepEqual(data, { ok: true });
  assert.equal(c.repo, 'o/r');
  const { url, init } = f.calls[0];
  assert.equal(url, 'https://api.github.com/repos/o/r/labels');
  assert.equal(init.method, 'POST');
  assert.equal(init.headers.Authorization, 'Bearer t0k');
  assert.equal(init.headers.Accept, 'application/vnd.github+json');
  assert.equal(init.headers['X-GitHub-Api-Version'], '2022-11-28');
  assert.equal(init.headers['User-Agent'], 'agents-dispatcher');
  assert.equal(init.headers['Content-Type'], 'application/json');
  assert.equal(init.body, '{"name":"x"}');
});

test('request without a body sends no content type; apiUrl is configurable', async () => {
  const f = fakeFetch([response(200, [])]);
  const c = createClient({ token: 't', repository: 'o/r', apiUrl: 'https://ghe.example/api/v3', fetchImpl: f.impl });
  await c.request('GET', '/repos/o/r/issues/1');
  assert.equal(f.calls[0].url, 'https://ghe.example/api/v3/repos/o/r/issues/1');
  assert.equal(f.calls[0].init.headers['Content-Type'], undefined);
  assert.equal(f.calls[0].init.body, undefined);
});

test('request returns null for 204 and for an empty body', async () => {
  const f = fakeFetch([response(204), response(200)]);
  const c = createClient({ token: 't', repository: 'o/r', fetchImpl: f.impl });
  assert.equal(await c.request('DELETE', '/x'), null);
  assert.equal(await c.request('GET', '/y'), null);
});

test('request throws a GitHubError with status, path and message', async () => {
  const f = fakeFetch([response(422, { message: 'Validation Failed' })]);
  const c = createClient({ token: 't', repository: 'o/r', fetchImpl: f.impl });
  await assert.rejects(c.request('POST', '/repos/o/r/labels', {}), (err) => {
    assert.ok(err instanceof GitHubError);
    assert.equal(err.status, 422);
    assert.equal(err.path, '/repos/o/r/labels');
    assert.match(err.message, /Validation Failed/);
    return true;
  });
});

test('paginate adds per_page, follows Link rel=next and concatenates', async () => {
  const next = 'https://api.github.com/repositories/1/labels?per_page=100&page=2';
  const f = fakeFetch([
    response(200, [{ n: 1 }, { n: 2 }], { link: `<${next}>; rel="next", <https://api.github.com/x?page=2>; rel="last"` }),
    response(200, [{ n: 3 }], { link: '<https://api.github.com/x?page=1>; rel="prev"' }),
  ]);
  const c = createClient({ token: 't', repository: 'o/r', fetchImpl: f.impl });
  const all = await c.paginate('/repos/o/r/labels');
  assert.deepEqual(all, [{ n: 1 }, { n: 2 }, { n: 3 }]);
  assert.equal(f.calls[0].url, 'https://api.github.com/repos/o/r/labels?per_page=100');
  assert.equal(f.calls[1].url, next);
});

test('paginate appends per_page with & when the path has a query', async () => {
  const f = fakeFetch([response(200, [])]);
  const c = createClient({ token: 't', repository: 'o/r', fetchImpl: f.impl });
  await c.paginate('/repos/o/r/issues?state=open');
  assert.equal(f.calls[0].url, 'https://api.github.com/repos/o/r/issues?state=open&per_page=100');
});

test('parseNextLink', () => {
  assert.equal(parseNextLink(null), null);
  assert.equal(parseNextLink(''), null);
  assert.equal(parseNextLink('<https://a/b?page=1>; rel="prev"'), null);
  assert.equal(parseNextLink('<https://a/b?page=3>; rel="next", <https://a/b?page=9>; rel="last"'), 'https://a/b?page=3');
  assert.equal(parseNextLink('<https://a/b?page=1>; rel="prev", <https://a/b?page=3>; rel="next"'), 'https://a/b?page=3');
});
