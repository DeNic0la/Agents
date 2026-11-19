// Tests of the agent sync (CW-101): cloud/dispatcher/platform/sync.js (pure),
// cloud/dispatcher/sync-agents.js (I/O entry) and the multipart skill calls of the client.
// Run: node --test "tests/cloud-*.test.js"
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const sync = require(path.join(root, 'cloud/dispatcher/platform/sync.js'));
const { main } = require(path.join(root, 'cloud/dispatcher/sync-agents.js'));
const { createPlatformClient, SKILL_TITLE_FIELD } = require(path.join(root, 'cloud/dispatcher/platform/client.js'));

const settings = JSON.parse(fs.readFileSync(path.join(root, 'cloud/settings.json'), 'utf8'));

const DEF = '---\nrole: demo\ntier: deep   # comment\nskills: [alpha, beta]\npersonas: [wise]\nenvironment: repo\n---\nYou are demo.\n';

test('CW-101: every real file in cloud/agents parses and its role matches the file name', () => {
  const dir = path.join(root, 'cloud/agents');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'README.md');
  assert.ok(files.length >= 7);
  for (const f of files) {
    const def = sync.parseDefinition(fs.readFileSync(path.join(dir, f), 'utf8'), f);
    assert.equal(def.role, f.replace(/\.md$/, ''));
    assert.ok(def.body.length > 0);
    assert.ok(settings.models[def.tier]);
  }
});

// The platform rejects a skill (400 on /v1/skills) whose name or description holds an XML tag
// or the reserved words "anthropic" or "claude", so a placeholder like `<commit>` breaks the sync.
test('CW-101: every skill a cloud agent uploads has a name and description the platform accepts', () => {
  const dir = path.join(root, 'cloud/agents');
  const skills = new Set(fs.readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'README.md')
    .flatMap((f) => sync.parseDefinition(fs.readFileSync(path.join(dir, f), 'utf8'), f).skills));
  assert.ok(skills.size > 0);
  for (const name of skills) {
    const text = fs.readFileSync(path.join(root, 'preset/skills', name, 'SKILL.md'), 'utf8');
    const front = text.split(/\r?\n---/)[0];
    for (const key of ['name', 'description']) {
      const value = (front.match(new RegExp(`^${key}:(.*)$`, 'm')) || [])[1] || '';
      assert.ok(value.trim(), `${name}: no ${key}`);
      assert.doesNotMatch(value, /<\/?[A-Za-z][^>]*>/, `${name}: ${key} holds an XML tag`);
      assert.doesNotMatch(value, /anthropic|claude/i, `${name}: ${key} holds a reserved word`);
    }
  }
});

test('CW-20, CW-23, CW-100: the triage agent runs at the deep tier and names the full-route triggers', () => {
  const text = fs.readFileSync(path.join(root, 'cloud/agents/triage.md'), 'utf8');
  const def = sync.parseDefinition(text, 'triage.md');
  assert.equal(def.tier, 'deep');
  const full = def.body.split('\n').find((l) => l.includes('`full`:'));
  for (const trigger of ['several areas', 'install or sync behavior', 'design decision has alternatives', 'asked for a plan']) {
    assert.ok(full.includes(trigger), `full route misses "${trigger}"`);
  }
});

test('CW-101: parseDefinition reads values, lists and comments', () => {
  const def = sync.parseDefinition(DEF, 'demo.md');
  assert.deepEqual(def, { role: 'demo', tier: 'deep', environment: 'repo', skills: ['alpha', 'beta'], personas: ['wise'], body: 'You are demo.' });
});

test('CW-101: bad frontmatter is an error', () => {
  assert.throws(() => sync.parseDefinition('no frontmatter', 'demo.md'), /no frontmatter/);
  assert.throws(() => sync.parseDefinition(DEF, 'other.md'), /differs from the file name/);
  assert.throws(() => sync.parseDefinition(DEF.replace('tier: deep', 'tier: huge'), 'demo.md'), /tier/);
  assert.throws(() => sync.parseDefinition(DEF.replace('environment: repo', 'environment: moon'), 'demo.md'), /environment/);
  assert.throws(() => sync.parseDefinition(DEF.replace('role: demo', 'role demo'), 'demo.md'), /bad frontmatter line/);
  assert.throws(() => sync.parseDefinition(DEF.replace('[alpha, beta]', 'alpha'), 'demo.md'), /must be a list/);
});

test('CW-101: desiredAgent maps the tier to a model and appends personas without their frontmatter', () => {
  const def = sync.parseDefinition(DEF, 'demo.md');
  const want = sync.desiredAgent(def, settings, { wise: '---\nname: wise\n---\nBe wise.\n' }, { alpha: 'skill_a', beta: 'skill_b' });
  assert.equal(want.name, 'agents-demo');
  assert.equal(want.model, settings.models.deep);
  assert.equal(want.system, 'You are demo.\n\n## Persona: wise\n\nBe wise.');
  assert.deepEqual(want.tools, [{ type: 'agent_toolset_20260401' }]);
  assert.deepEqual(want.skills, [
    { type: 'custom', skill_id: 'skill_a', version: 'latest' },
    { type: 'custom', skill_id: 'skill_b', version: 'latest' },
  ]);
  assert.equal(want.metadata.role, 'demo');
  assert.equal(want.metadata.source, 'cloud/agents/demo.md');
  assert.match(want.metadata.digest, /^[0-9a-f]{64}$/);
});

test('CW-101: agentChanged compares the digest, and the fields when there is none', () => {
  const def = sync.parseDefinition(DEF, 'demo.md');
  const ids = { alpha: 'a', beta: 'b' };
  const texts = { wise: 'Be wise.' };
  const want = sync.desiredAgent(def, settings, texts, ids);
  assert.equal(sync.agentChanged({ ...want, id: 'agent_1', version: 3 }, want), false);
  const other = sync.desiredAgent({ ...def, body: 'Changed.' }, settings, texts, ids);
  assert.equal(sync.agentChanged(want, other), true);
  const noDigest = { ...want, metadata: {} };
  assert.equal(sync.agentChanged(noDigest, want), false);
  assert.equal(sync.agentChanged({ ...noDigest, model: 'x' }, want), true);
});

test('CW-101: desiredEnvironments limits the repo environment to the allowed hosts', () => {
  const envs = sync.desiredEnvironments(settings);
  assert.equal(envs.repo.name, settings.platform.repoEnvironment);
  assert.deepEqual(envs.repo.config, {
    type: 'cloud',
    networking: { type: 'limited', allowed_hosts: settings.allowedHosts, allow_package_managers: true, allow_mcp_servers: false },
  });
  assert.equal(envs.web.name, settings.platform.webEnvironment);
  assert.equal(envs.web.config.networking.type, 'unrestricted');
});

test('CW-101: skillDigest ignores the order and sees path and content changes', () => {
  const a = [['s/SKILL.md', 'x'], ['s/references/r.md', 'y']];
  assert.equal(sync.skillDigest(a), sync.skillDigest([...a].reverse()));
  assert.notEqual(sync.skillDigest(a), sync.skillDigest([['s/SKILL.md', 'x2'], a[1]]));
  assert.notEqual(sync.skillDigest(a), sync.skillDigest([['s/SKILL.md', 'x'], ['s/references/q.md', 'y']]));
});

// An in-memory platform behind a fetch function; records every call.
function fakePlatform() {
  const state = { agents: [], environments: [], skills: [], calls: [] };
  let n = 0;
  const reply = (data, status = 200) => ({ ok: status < 300, status, statusText: '', text: async () => JSON.stringify(data) });
  const fetchImpl = async (url, init) => {
    const p = new URL(url).pathname;
    state.calls.push(`${init.method} ${p}`);
    const body = init.body && typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
    if (init.method === 'GET') {
      return reply({ data: { '/v1/agents': state.agents, '/v1/environments': state.environments, '/v1/skills': state.skills }[p] });
    }
    if (p === '/v1/skills') {
      const s = { id: `skill_${++n}`, display_title: body.get(SKILL_TITLE_FIELD) };
      state.skills.push(s);
      return reply(s);
    }
    if (p.startsWith('/v1/skills/')) {
      const s = state.skills.find((x) => p.includes(x.id));
      s.display_title = body.get(SKILL_TITLE_FIELD);
      return reply(s);
    }
    if (p === '/v1/environments') {
      const e = { id: `env_${++n}`, ...body };
      state.environments.push(e);
      return reply(e);
    }
    if (p === '/v1/agents') {
      const a = { id: `agent_${++n}`, version: 1, ...body };
      state.agents.push(a);
      return reply(a);
    }
    const a = state.agents.find((x) => p === `/v1/agents/${x.id}`);
    Object.assign(a, body, { version: a.version + 1 });
    return reply(a);
  };
  return { state, fetchImpl };
}

// A repo in memory: agent definitions, personas, skills.
function fakeIo(files) {
  return {
    readText: (rel) => {
      if (!(rel in files)) throw new Error(`no file ${rel}`);
      return files[rel];
    },
    listDir: (rel) => Object.keys(files).filter((f) => f.startsWith(`${rel}/`)).map((f) => f.slice(rel.length + 1)).sort(),
    listTree: (rel) => Object.keys(files).filter((f) => f.startsWith(`${rel}/`)).sort(),
  };
}

const REPO = {
  'cloud/agents/README.md': 'not a definition',
  'cloud/agents/demo.md': DEF,
  'cloud/agents/quick.md': '---\nrole: quick\ntier: fast\nskills: []\npersonas: []\nenvironment: web\n---\nQuick.\n',
  'preset/agents/wise.md': '---\nname: wise\n---\nBe wise.\n',
  'preset/skills/alpha/SKILL.md': 'alpha',
  'preset/skills/alpha/references/r.md': 'ref',
  'preset/skills/beta/SKILL.md': 'beta',
};

function run(plat, files, mode) {
  const lines = [];
  const client = createPlatformClient({ apiKey: 'k', apiUrl: 'http://x', fetchImpl: plat.fetchImpl, sleep: async () => {} });
  return main({
    client, io: fakeIo(files), env: { ANTHROPIC_API_KEY: 'k' }, settings: { ...settings, mode }, log: (l) => lines.push(l),
  }).then((code) => ({ code, lines }));
}

test('CW-101: the dry-run mode skips the sync with a notice when the key is not set', async () => {
  const lines = [];
  const code = await main({ io: fakeIo(REPO), env: {}, settings: { ...settings, mode: 'dry-run' }, log: (l) => lines.push(l) });
  assert.equal(code, 0);
  assert.equal(lines.length, 1);
  assert.match(lines[0], /^::notice::.*skipped.*ANTHROPIC_API_KEY is not set/);
});

test('CW-101: the live mode fails when the key is not set', async () => {
  const lines = [];
  const code = await main({ io: fakeIo(REPO), env: { ANTHROPIC_API_KEY: '' }, settings: { ...settings, mode: 'live' }, log: (l) => lines.push(l) });
  assert.equal(code, 1);
  assert.match(lines[0], /ANTHROPIC_API_KEY is not set/);
});

test('CW-101: a full sync creates environments, skills and agents, and a second run changes nothing', async () => {
  const plat = fakePlatform();
  const first = await run(plat, REPO, 'live');
  assert.equal(first.code, 0);
  assert.equal(plat.state.environments.length, 2);
  assert.equal(plat.state.skills.length, 2);
  assert.equal(plat.state.agents.length, 2);
  assert.ok(first.lines.includes('agent agents-demo: created'));
  assert.ok(first.lines.includes('agent agents-quick: created'));
  const demo = plat.state.agents.find((a) => a.name === 'agents-demo');
  assert.equal(demo.skills.length, 2);
  assert.match(plat.state.skills[0].display_title, /^agents-alpha [0-9a-f]{12}$/);
  assert.ok(!first.lines.join('\n').includes('"k"'));

  plat.state.calls.length = 0;
  const second = await run(plat, REPO, 'live');
  assert.equal(second.code, 0);
  assert.deepEqual(plat.state.calls.filter((c) => !c.startsWith('GET')), []);
  assert.ok(second.lines.includes('agent agents-demo: unchanged'));
  assert.ok(second.lines.includes('agent agents-quick: unchanged'));

  // a changed prompt updates only that agent; a changed skill file uploads a new version of that skill
  plat.state.calls.length = 0;
  const changed = { ...REPO, 'cloud/agents/quick.md': REPO['cloud/agents/quick.md'].replace('Quick.', 'Quicker.'), 'preset/skills/beta/SKILL.md': 'beta2' };
  const third = await run(plat, changed, 'live');
  assert.ok(third.lines.includes('agent agents-quick: updated'));
  assert.ok(third.lines.includes('agent agents-demo: unchanged'));
  assert.ok(third.lines.includes('skill beta: new version'));
  assert.equal(plat.state.calls.filter((c) => c.startsWith('POST /v1/skills/')).length, 1);
});

test('CW-101: an environment that exists but differs is warned about and left alone', async () => {
  const plat = fakePlatform();
  plat.state.environments.push({ id: 'env_x', name: settings.platform.repoEnvironment, config: { type: 'cloud', networking: { type: 'unrestricted' } } });
  const res = await run(plat, REPO, 'live');
  assert.ok(res.lines.some((l) => l.startsWith('::warning::') && l.includes(settings.platform.repoEnvironment)));
  assert.equal(plat.state.environments.length, 2);
  assert.equal(plat.state.environments[0].config.networking.type, 'unrestricted');
});

test('CW-91, CW-101: an environment with one allowed host more than the settings is drift, not unchanged', async () => {
  const want = sync.desiredEnvironments(settings).repo;
  const hosts = want.config.networking.allowed_hosts;
  const withHosts = (list) => ({ id: 'env_x', name: want.name, config: { ...want.config, networking: { ...want.config.networking, allowed_hosts: list } } });
  const extra = fakePlatform();
  extra.state.environments.push(withHosts([...hosts, 'evil.example']));
  const res = await run(extra, REPO, 'live');
  assert.ok(res.lines.some((l) => l.startsWith('::warning::') && l.includes(want.name)), res.lines.join('\n'));
  const same = fakePlatform();
  same.state.environments.push(withHosts([...hosts]));
  const ok = await run(same, REPO, 'live');
  assert.ok(ok.lines.includes(`environment ${want.name} (repo): unchanged`), ok.lines.join('\n'));
});

test('CW-101: the client uploads a skill as multipart with files[] named by their paths', async () => {
  const seen = [];
  const fetchImpl = async (url, init) => {
    seen.push({ url, init });
    return { ok: true, status: 200, statusText: '', text: async () => JSON.stringify({ id: 'skill_1' }) };
  };
  const client = createPlatformClient({ apiKey: 'k', apiUrl: 'http://x/', fetchImpl, sleep: async () => {} });
  const files = [['alpha/SKILL.md', 'body'], ['alpha/references/r.md', 'ref']];
  await client.createSkill(files, 'agents-alpha abc');
  await client.createSkillVersion('skill_1', files, 'agents-alpha def');
  assert.equal(seen[0].url, 'http://x/v1/skills');
  assert.equal(seen[1].url, 'http://x/v1/skills/skill_1/versions');
  for (const { init } of seen) {
    assert.equal(init.method, 'POST');
    assert.ok(init.body instanceof FormData);
    assert.equal(init.headers['content-type'], undefined);
    assert.equal(init.headers['x-api-key'], 'k');
    assert.deepEqual(init.body.getAll('files[]').map((f) => f.name), ['alpha/SKILL.md', 'alpha/references/r.md']);
    assert.equal(await init.body.getAll('files[]')[0].text(), 'body');
  }
  assert.equal(seen[0].init.body.get(SKILL_TITLE_FIELD), 'agents-alpha abc');
});
