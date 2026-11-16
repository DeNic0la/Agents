// GitHub App authentication: signs the App JWT (RS256) and exchanges it for a short-lived
// installation token scoped to one repository. No dependencies, fetch injectable for tests.
'use strict';
const crypto = require('node:crypto');

class AppTokenError extends Error {
  constructor(status, path, message) {
    super(`GitHub App API ${status} on ${path}: ${message}`);
    this.name = 'AppTokenError';
    this.status = status;
    this.path = path;
  }
}

const b64url = (buf) => Buffer.from(buf).toString('base64url');

// now: seconds since the epoch.
function createAppJwt({ appId, privateKeyPem, now = Math.floor(Date.now() / 1000) }) {
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify({ iat: now - 60, exp: now + 540, iss: String(appId) }));
  const sig = crypto.sign('RSA-SHA256', Buffer.from(`${head}.${body}`), privateKeyPem);
  return `${head}.${body}.${b64url(sig)}`;
}

// Returns { token, expiresAt } for `repository` ("owner/name") with the given permissions.
async function installationToken({
  appId, privateKeyPem, repository, permissions,
  apiUrl = 'https://api.github.com', fetchImpl = globalThis.fetch, now,
}) {
  const base = apiUrl.replace(/\/+$/, '');
  const [owner, name] = String(repository).split('/');
  if (!owner || !name) throw new Error('repository must be "owner/name"');
  const jwt = createAppJwt({ appId, privateKeyPem, now });

  async function call(method, path, body) {
    const res = await fetchImpl(base + path, {
      method,
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'agents-dispatcher',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data = null;
    if (text) {
      try { data = JSON.parse(text); } catch { data = null; }
    }
    if (!res.ok) {
      // Only GitHub's message is reported; request details never are.
      const message = (data && data.message) || res.statusText || 'request failed';
      throw new AppTokenError(res.status, path, String(message).split(jwt).join('[redacted]'));
    }
    return data;
  }

  const inst = await call('GET', `/repos/${owner}/${name}/installation`);
  const out = await call('POST', `/app/installations/${inst.id}/access_tokens`, { repositories: [name], permissions });
  return { token: out.token, expiresAt: out.expires_at };
}

module.exports = { createAppJwt, installationToken, AppTokenError };
