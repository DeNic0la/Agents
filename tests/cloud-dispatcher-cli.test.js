// End-to-end test of the dispatch entry point (cloud/dispatcher/cli.js) against a fake
// GitHub API: a new issue in dry-run mode gets exactly one comment and no label change.
// Run: node --test "tests/*.test.js"
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

const root = path.join(__dirname, '..');
const settings = JSON.parse(fs.readFileSync(path.join(root, 'cloud/settings.json'), 'utf8'));

function fakeGitHub(issues, timelines) {
  const writes = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      const url = new URL(req.url, 'http://x');
      const send = (status, data) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      };
      if (req.headers.authorization !== 'Bearer test-token') return send(401, { message: 'Bad credentials' });
      if (req.method !== 'GET') {
        writes.push({ method: req.method, path: url.pathname, body: body ? JSON.parse(body) : null });
        return send(201, {});
      }
      let m;
      if (url.pathname === '/repos/o/r/issues') return send(200, issues.filter((i) => i.state === (url.searchParams.get('state') || 'open')));
      if ((m = url.pathname.match(/^\/repos\/o\/r\/issues\/(\d+)$/))) {
        const issue = issues.find((i) => i.number === Number(m[1]));
        return issue ? send(200, issue) : send(404, { message: 'Not Found' });
      }
      if ((m = url.pathname.match(/^\/repos\/o\/r\/issues\/(\d+)\/timeline$/))) return send(200, timelines[m[1]] || []);
      if (url.pathname.endsWith('/dependencies/blocked_by')) return send(404, { message: 'Not Found' });
      return send(404, { message: 'Not Found' });
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, writes, url: `http://127.0.0.1:${server.address().port}` })));
}

function runCli(env) {
  return new Promise((resolve) => {
    execFile(process.execPath, [path.join(root, 'cloud/dispatcher/cli.js')], { env: { ...process.env, ...env }, cwd: root }, (err, stdout, stderr) => {
      resolve({ code: err ? err.code : 0, stdout, stderr });
    });
  });
}

function eventFile(name, event) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dispatch-')), `${name}.json`);
  fs.writeFileSync(file, JSON.stringify(event));
  return file;
}

test('cli, dry run: a new issue by a stranger gets one dry-run comment and no label change, and a second run posts nothing', async () => {
  const issue = { number: 5, state: 'open', user: { login: 'someone-else' }, body: 'Please add X.', labels: [] };
  const timelines = {};
  const gh = await fakeGitHub([issue], timelines);
  try {
    const env = {
      GITHUB_TOKEN: 'test-token',
      GITHUB_REPOSITORY: 'o/r',
      GITHUB_API_URL: gh.url,
      GITHUB_EVENT_NAME: 'issues',
      GITHUB_EVENT_PATH: eventFile('issues', { action: 'opened', issue: { number: 5 } }),
      CLOUD_STOPPED: '',
    };
    const first = await runCli(env);
    assert.equal(first.code, 0, first.stderr);
    assert.equal(gh.writes.length, 1, JSON.stringify(gh.writes));
    const [w] = gh.writes;
    assert.equal(`${w.method} ${w.path}`, 'POST /repos/o/r/issues/5/comments');
    assert.match(w.body.body, /add `origin:external`, `needs-answer`/);
    assert.match(w.body.body, /came from `triage`/);
    assert.doesNotMatch(w.body.body, /start the/);

    // The comment is on the issue now, written by the dispatcher.
    timelines[5] = [{ event: 'commented', actor: { login: settings.dispatcherLogin }, body: w.body.body }];
    const second = await runCli(env);
    assert.equal(second.code, 0, second.stderr);
    assert.equal(gh.writes.length, 1, 'the same dry run is not commented twice');
  } finally {
    gh.server.close();
  }
});

test('cli: a failing GitHub request fails the run', async () => {
  const gh = await fakeGitHub([], {});
  try {
    const r = await runCli({
      GITHUB_TOKEN: 'wrong',
      GITHUB_REPOSITORY: 'o/r',
      GITHUB_API_URL: gh.url,
      GITHUB_EVENT_NAME: 'workflow_dispatch',
      GITHUB_EVENT_PATH: eventFile('dispatch', { inputs: {} }),
    });
    assert.notEqual(r.code, 0);
    assert.match(r.stderr, /401/);
    assert.equal(gh.writes.length, 0);
  } finally {
    gh.server.close();
  }
});
