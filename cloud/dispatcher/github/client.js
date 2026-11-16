// Minimal GitHub REST client: no dependencies, fetch injectable for tests.
'use strict';

class GitHubError extends Error {
  constructor(status, path, message) {
    super(`GitHub API ${status} on ${path}: ${message}`);
    this.name = 'GitHubError';
    this.status = status;
    this.path = path;
  }
}

// Returns the URL of rel="next" in a Link header, or null.
function parseNextLink(header) {
  if (!header) return null;
  for (const part of String(header).split(',')) {
    const m = part.match(/<([^>]*)>\s*;\s*rel="?next"?/);
    if (m) return m[1];
  }
  return null;
}

function createClient({ token, repository, apiUrl = 'https://api.github.com', fetchImpl = globalThis.fetch }) {
  const base = apiUrl.replace(/\/+$/, '');

  function headers(hasBody) {
    const h = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'agents-dispatcher',
    };
    if (hasBody) h['Content-Type'] = 'application/json';
    return h;
  }

  async function send(method, url, path, body) {
    const hasBody = body !== undefined && body !== null;
    const res = await fetchImpl(url, {
      method,
      headers: headers(hasBody),
      body: hasBody ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data = null;
    if (text) {
      try { data = JSON.parse(text); } catch { data = null; }
    }
    if (!res.ok) {
      const message = (data && data.message) || text || res.statusText || 'request failed';
      throw new GitHubError(res.status, path, message);
    }
    return { data, res };
  }

  async function request(method, path, body) {
    const { data } = await send(method, base + path, path, body);
    return data;
  }

  async function paginate(path) {
    const sep = path.includes('?') ? '&' : '?';
    let url = `${base}${path}${sep}per_page=100`;
    const all = [];
    while (url) {
      const { data, res } = await send('GET', url, path);
      if (Array.isArray(data)) all.push(...data);
      url = parseNextLink(res.headers && res.headers.get ? res.headers.get('link') : null);
    }
    return all;
  }

  return { repo: repository, request, paginate };
}

module.exports = { createClient, GitHubError, parseNextLink };
