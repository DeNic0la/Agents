// Tests of the GitHub App token module (cloud/dispatcher/platform/app-token.js): the JWT
// verifies with the public key and the installation token request is scoped to one repository.
// Run: node --test "tests/cloud-*.test.js"
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('http');
const path = require('path');

const { createAppJwt, installationToken, AppTokenError } =
  require(path.join(__dirname, '..', 'cloud/dispatcher/platform/app-token.js'));

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' });

function fake(handler) {
  const calls = [];
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      const rec = { method: req.method, url: req.url, headers: req.headers, body: raw ? JSON.parse(raw) : null };
      calls.push(rec);
      const [status, data] = handler(rec);
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () =>
    resolve({ server, calls, url: `http://127.0.0.1:${server.address().port}` })));
}

test('createAppJwt: RS256, iat/exp window, iss, verifies with the public key', () => {
  const jwt = createAppJwt({ appId: 123, privateKeyPem, now: 1000000 });
  const [h, b, s] = jwt.split('.');
  assert.deepEqual(JSON.parse(Buffer.from(h, 'base64url')), { alg: 'RS256', typ: 'JWT' });
  assert.deepEqual(JSON.parse(Buffer.from(b, 'base64url')), { iat: 1000000 - 60, exp: 1000000 + 540, iss: '123' });
  assert.ok(crypto.verify('RSA-SHA256', Buffer.from(`${h}.${b}`), publicKey, Buffer.from(s, 'base64url')));
});

test('installationToken: looks up the installation, then requests a scoped token', async () => {
  const f = await fake((req) => {
    if (req.url === '/repos/o/r/installation') return [200, { id: 42 }];
    if (req.url === '/app/installations/42/access_tokens') return [201, { token: 'ghs_abc', expires_at: '2026-11-16T12:00:00Z' }];
    return [404, { message: 'Not Found' }];
  });
  try {
    const permissions = { contents: 'write', issues: 'write' };
    const out = await installationToken({ appId: 123, privateKeyPem, repository: 'o/r', permissions, apiUrl: f.url, now: 2000000 });
    assert.deepEqual(out, { token: 'ghs_abc', expiresAt: '2026-11-16T12:00:00Z' });
    assert.equal(f.calls.length, 2);
    assert.equal(f.calls[0].method, 'GET');
    assert.equal(f.calls[1].method, 'POST');
    assert.deepEqual(f.calls[1].body, { repositories: ['r'], permissions });
    for (const c of f.calls) {
      const m = c.headers.authorization.match(/^Bearer (\S+)\.(\S+)\.(\S+)$/);
      assert.ok(m, 'bearer JWT');
      assert.ok(crypto.verify('RSA-SHA256', Buffer.from(`${m[1]}.${m[2]}`), publicKey, Buffer.from(m[3], 'base64url')));
    }
  } finally { f.server.close(); }
});

test('installationToken: errors carry the status and never the key, JWT or token', async () => {
  const f = await fake((req) => [401, { message: `Bad credentials ${req.headers.authorization.slice(7)}` }]);
  try {
    await assert.rejects(
      installationToken({ appId: 1, privateKeyPem, repository: 'o/r', permissions: {}, apiUrl: f.url }),
      (e) => {
        assert.ok(e instanceof AppTokenError);
        assert.equal(e.status, 401);
        assert.doesNotMatch(e.message, /eyJ/);
        assert.ok(!e.message.includes('PRIVATE KEY'));
        return true;
      },
    );
    await assert.rejects(installationToken({ appId: 1, privateKeyPem, repository: 'bad', permissions: {} }), /owner\/name/);
  } finally { f.server.close(); }
});
