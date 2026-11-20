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
const { createPlatformClient, SKILL_NAME_FIELD } = require(path.join(root, 'cloud/dispatcher/platform/client.js'));

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
  const want = sync.desiredAgent(def, settings, { wise: '---\nname: wise\n---\nBe wise.\n' }, { alpha: 'skill_a', beta: 'skill_b' }, { alpha: 'aaaaaaaaaaaa', beta: 'bbbbbbbbbbbb' });
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
  const dg = { alpha: 'aaaaaaaaaaaa', beta: 'bbbbbbbbbbbb' };
  const want = sync.desiredAgent(def, settings, texts, ids, dg);
  assert.equal(sync.agentChanged({ ...want, id: 'agent_1', version: 3 }, want), false);
  const other = sync.desiredAgent({ ...def, body: 'Changed.' }, settings, texts, ids, dg);
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

// An in-memory platform behind a fetch function. The shapes follow the documentation, with the
// field names written out here and not taken from the code under test; it records every request.
//   Skill list/create: https://platform.claude.com/docs/en/api/skills/create
//   SkillVersion: https://platform.claude.com/docs/en/api/skills/versions/create
//   Agents (a read returns model as an object): https://platform.claude.com/docs/en/api/beta/agents
// A list response is { data: [...], next_page: null }.
function fakePlatform() {
  const state = { agents: [], environments: [], skills: [], calls: [], requests: [], forms: [] };
  let n = 0;
  const reply = (data, status = 200) => ({ ok: status < 300, status, statusText: '', text: async () => JSON.stringify(data) });
  const skillName = (form) => {
    const f = form.getAll('files[]').find((x) => /(^|\/)SKILL\.md$/.test(x.name));
    return f ? f.__text.match(/^name:\s*(.+)$/m)[1].trim() : undefined;
  };
  const fetchImpl = async (url, init) => {
    const u = new URL(url);
    const p = u.pathname;
    state.calls.push(`${init.method} ${p}`);
    state.requests.push({ method: init.method, url: String(url) });
    let body = init.body && typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
    if (init.method === 'GET') {
      const all = { '/v1/agents': state.agents, '/v1/environments': state.environments, '/v1/skills': state.skills }[p];
      return reply({ data: all || [], next_page: null });
    }
    if (body instanceof FormData) {
      for (const f of body.getAll('files[]')) f.__text = await f.text();
      state.forms.push({ path: p, keys: [...new Set([...body.keys()])] });
    }
    if (p === '/v1/skills') {
      const s = {
        type: 'skill', id: `skill_${++n}`, display_name: body.get('display_name') || skillName(body),
        latest_version_id: `skillver_${++n}`, source: { type: 'custom' }, created_at: 't', updated_at: 't',
      };
      state.skills.push(s);
      return reply(s);
    }
    if (p.startsWith('/v1/skills/')) {
      const s = state.skills.find((x) => p.includes(x.id));
      s.latest_version_id = `skillver_${++n}`;
      return reply({ type: 'skill_version', id: s.latest_version_id, skill_id: s.id, name: s.display_name, description: 'd', created_at: 't' });
    }
    if (p === '/v1/environments') {
      const e = { id: `env_${++n}`, ...body };
      state.environments.push(e);
      return reply(e);
    }
    const asRead = (b) => ({ ...b, ...(typeof b.model === 'string' ? { model: { id: b.model, speed: 'standard' } } : {}) });
    if (p === '/v1/agents') {
      const a = { id: `agent_${++n}`, version: 1, ...asRead(body) };
      state.agents.push(a);
      return reply(a);
    }
    const a = state.agents.find((x) => p === `/v1/agents/${x.id}`);
    Object.assign(a, asRead(body), { version: a.version + 1 });
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
  'preset/skills/alpha/SKILL.md': '---\nname: alpha\ndescription: a\n---\nalpha',
  'preset/skills/alpha/references/r.md': 'ref',
  'preset/skills/beta/SKILL.md': '---\nname: beta\ndescription: b\n---\nbeta',
};

function run(plat, files, mode, extraEnv = {}) {
  const lines = [];
  const client = createPlatformClient({ apiKey: 'k', apiUrl: 'http://x', fetchImpl: plat.fetchImpl, sleep: async () => {} });
  return main({
    client, io: fakeIo(files), env: { ANTHROPIC_API_KEY: 'k', ...extraEnv }, settings: { ...settings, mode }, log: (l) => lines.push(l),
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

// CK-8
test('CK-8: firstDifference names the path, and arrays of primitives compare as sets', () => {
  const want = { config: { networking: { type: 'limited', allowed_hosts: ['a', 'b'] } } };
  const have = (hosts) => ({ id: 'x', config: { networking: { type: 'limited', allowed_hosts: hosts, more: 1 } } });
  assert.equal(sync.firstDifference(have(['b', 'a']), want), null);
  assert.equal(sync.covers(have(['b', 'a']), want), true);
  assert.equal(sync.firstDifference(have(['a', 'b', 'c']), want), 'config.networking.allowed_hosts');
  assert.equal(sync.firstDifference(have(['a']), want), 'config.networking.allowed_hosts');
  assert.equal(sync.covers(have(['a', 'c']), want), false);
  assert.equal(sync.firstDifference({ config: { networking: { type: 'unrestricted' } } }, want), 'config.networking.type');
  assert.equal(sync.firstDifference({}, { a: { b: 1 } }), 'a');
  assert.equal(sync.firstDifference([{ x: 1 }, { x: 2 }], [{ x: 1 }, { x: 3 }]), '[1].x');
});

test('CK-8: the agent fallback treats a model object and its id string as the same model', () => {
  const def = sync.parseDefinition(DEF, 'demo.md');
  const want = sync.desiredAgent(def, settings, { wise: 'Be wise.' }, { alpha: 'a', beta: 'b' }, { alpha: 'x', beta: 'y' });
  const noDigest = { ...want, metadata: {} };
  const asObject = { ...noDigest, model: { id: want.model, speed: 'standard', effort: null, inference_geo: null } };
  assert.equal(sync.agentChanged(asObject, want), false);
  assert.equal(sync.agentChanged({ ...asObject, model: { id: 'other' } }, want), true);
});

test('CK-3: desiredAgent records the skills as sorted name=digest pairs and the digest covers them', () => {
  const def = sync.parseDefinition(DEF, 'demo.md');
  const ids = { alpha: 'a', beta: 'b' };
  const digests = { beta: 'bbbbbbbbbbbb', alpha: 'aaaaaaaaaaaa' };
  const want = sync.desiredAgent(def, settings, { wise: 'Be wise.' }, ids, digests);
  assert.equal(want.metadata.skills, 'alpha=aaaaaaaaaaaa,beta=bbbbbbbbbbbb');
  assert.ok(want.metadata.skills.length <= 512);
  for (const v of Object.values(want.metadata)) assert.ok(String(v).length <= 512);
  assert.deepEqual(sync.parseSkillsMeta(want.metadata.skills), { alpha: 'aaaaaaaaaaaa', beta: 'bbbbbbbbbbbb' });
  const other = sync.desiredAgent(def, settings, { wise: 'Be wise.' }, ids, { ...digests, alpha: 'cccccccccccc' });
  assert.notEqual(want.metadata.digest, other.metadata.digest);
  assert.equal(sync.agentChanged(want, other), true);
  const quick = sync.parseDefinition('---\nrole: quick\ntier: fast\nskills: []\npersonas: []\nenvironment: web\n---\nQ\n', 'quick.md');
  assert.equal('skills' in sync.desiredAgent(quick, settings, {}, {}, {}).metadata, false);
});

// The skill list the first live run left: custom skills named after their SKILL.md name
// (https://platform.claude.com/docs/en/api/skills/create).
// The field the old code sent and the API doesn't have; the tests assert it's never sent.
const OLD_TITLE_FIELD = 'display_title';
const seededSkill = (name, id) => ({
  type: 'skill', id, display_name: name, latest_version_id: `ver_${id}`, source: { type: 'custom' }, created_at: 't', updated_at: 't',
});
const seedFirstRun = (plat) => plat.state.skills.push(seededSkill('alpha', 'skill_seed_a'), seededSkill('beta', 'skill_seed_b'));
const writes = (plat) => plat.state.calls.filter((c) => !c.startsWith('GET'));
const FULL_UNCHANGED = [
  'skill alpha: unchanged (skill_seed_a)', 'skill beta: unchanged (skill_seed_b)',
  'agent agents-demo: unchanged', 'agent agents-quick: unchanged',
];

test('CK-1: seeded with the skills of the first live run, the sync creates none and uploads one version each', async () => {
  const plat = fakePlatform();
  seedFirstRun(plat);
  const res = await run(plat, REPO, 'live');
  assert.equal(res.code, 0);
  assert.ok(!plat.state.calls.includes('POST /v1/skills'), plat.state.calls.join('\n'));
  assert.equal(plat.state.calls.filter((c) => c === 'POST /v1/skills/skill_seed_a/versions').length, 1);
  assert.equal(plat.state.calls.filter((c) => c === 'POST /v1/skills/skill_seed_b/versions').length, 1);
  assert.equal(plat.state.skills.length, 2);
  assert.equal(plat.state.agents.length, 2);
  assert.ok(res.lines.includes('skill alpha: new version (skill_seed_a)'), res.lines.join('\n'));
  assert.ok(res.lines.includes('agent agents-demo: created'));
  const demo = plat.state.agents.find((a) => a.name === 'agents-demo');
  assert.deepEqual(demo.skills.map((s) => s.skill_id), ['skill_seed_a', 'skill_seed_b']);
  assert.ok(!res.lines.join('\n').includes('"k"'));
});

test('CK-1: against an empty platform the sync creates each skill under its name', async () => {
  const plat = fakePlatform();
  const res = await run(plat, REPO, 'live');
  assert.equal(res.code, 0);
  assert.equal(plat.state.environments.length, 2);
  assert.deepEqual(plat.state.skills.map((s) => s.display_name), ['alpha', 'beta']);
  assert.ok(res.lines.includes('skill alpha: created'));
  assert.ok(res.lines.includes('agent agents-quick: created'));
});

test('CW-101: an item is logged as done only after its write succeeded', async () => {
  const plat = fakePlatform();
  const failing = async (url, init) => (init.method === 'POST' && new URL(url).pathname === '/v1/agents'
    ? { ok: false, status: 400, statusText: 'Bad Request', text: async () => '{"error":{"message":"bad"}}' }
    : plat.fetchImpl(url, init));
  const lines = [];
  const client = createPlatformClient({ apiKey: 'k', apiUrl: 'http://x', fetchImpl: failing, sleep: async () => {} });
  await assert.rejects(main({
    client, io: fakeIo(REPO), env: { ANTHROPIC_API_KEY: 'k' }, settings: { ...settings, mode: 'live' }, log: (l) => lines.push(l),
  }));
  assert.ok(lines.includes('skill alpha: created'), lines.join('\n'));
  assert.ok(!lines.some((l) => /^agent .*: created$/.test(l)), lines.join('\n'));
});

test('CK-2: a second run sends only GET requests and logs every item as unchanged', async () => {
  const plat = fakePlatform();
  seedFirstRun(plat);
  await run(plat, REPO, 'live');
  plat.state.calls.length = 0;
  const second = await run(plat, REPO, 'live');
  assert.equal(second.code, 0);
  assert.deepEqual(writes(plat), []);
  for (const line of FULL_UNCHANGED) assert.ok(second.lines.includes(line), `${line}\n${second.lines.join('\n')}`);
  for (const kind of ['repo', 'web']) {
    const want = sync.desiredEnvironments(settings)[kind];
    assert.ok(second.lines.includes(`environment ${want.name} (${kind}): unchanged`));
  }
});

test('CK-3: a changed skill file gives one version and one update of each agent that uses it; then nothing', async () => {
  const plat = fakePlatform();
  await run(plat, REPO, 'live');
  const changed = { ...REPO, 'preset/skills/beta/SKILL.md': REPO['preset/skills/beta/SKILL.md'] + ' more' };
  plat.state.calls.length = 0;
  const second = await run(plat, changed, 'live');
  const betaId = plat.state.skills.find((s) => s.display_name === 'beta').id;
  const demoId = plat.state.agents.find((a) => a.name === 'agents-demo').id;
  assert.deepEqual(writes(plat), [`POST /v1/skills/${betaId}/versions`, `POST /v1/agents/${demoId}`]);
  assert.ok(second.lines.includes(`skill beta: new version (${betaId})`));
  assert.ok(second.lines.includes('agent agents-demo: updated'));
  assert.ok(second.lines.includes('agent agents-quick: unchanged'));
  plat.state.calls.length = 0;
  const third = await run(plat, changed, 'live');
  assert.deepEqual(writes(plat), []);
  assert.ok(third.lines.includes(`skill beta: unchanged (${betaId})`));
});

test('CK-3: a changed prompt updates only that agent', async () => {
  const plat = fakePlatform();
  await run(plat, REPO, 'live');
  plat.state.calls.length = 0;
  const changed = { ...REPO, 'cloud/agents/quick.md': REPO['cloud/agents/quick.md'].replace('Quick.', 'Quicker.') };
  const res = await run(plat, changed, 'live');
  assert.ok(res.lines.includes('agent agents-quick: updated'));
  assert.ok(res.lines.includes('agent agents-demo: unchanged'));
  assert.equal(writes(plat).length, 1);
});

test('CK-4: two custom skills with one display name stop the sync before any write, naming both ids', async () => {
  const plat = fakePlatform();
  plat.state.skills.push(seededSkill('alpha', 'skill_dup_1'), seededSkill('alpha', 'skill_dup_2'));
  const res = await run(plat, REPO, 'live').catch((err) => ({ code: 1, error: err }));
  if (res.error) {
    assert.match(res.error.message, /alpha/);
    assert.match(res.error.message, /skill_dup_1/);
    assert.match(res.error.message, /skill_dup_2/);
  } else {
    assert.equal(res.code, 1);
    assert.match(res.lines.join('\n'), /skill_dup_1[\s\S]*skill_dup_2|skill_dup_2[\s\S]*skill_dup_1/);
  }
  assert.deepEqual(writes(plat), []);
});

test('CK-5: the log lists each custom skill and an environment drift names its field', async () => {
  const plat = fakePlatform();
  seedFirstRun(plat);
  const want = sync.desiredEnvironments(settings).repo;
  plat.state.environments.push({
    id: 'env_x', name: want.name,
    config: { ...want.config, networking: { ...want.config.networking, allowed_hosts: [...want.config.networking.allowed_hosts, 'evil.example'] } },
  });
  const res = await run(plat, REPO, 'live');
  assert.ok(res.lines.includes('custom skill: alpha (skill_seed_a)'), res.lines.join('\n'));
  assert.ok(res.lines.includes('custom skill: beta (skill_seed_b)'));
  const warning = res.lines.find((l) => l.startsWith('::warning::'));
  assert.ok(warning && warning.includes(want.name) && warning.includes('config.networking.allowed_hosts'), res.lines.join('\n'));
  assert.equal(plat.state.environments.length, 2); // drift is left as it is, the web environment is created
});

test('CK-8: an environment whose hosts the platform reordered is unchanged', async () => {
  const want = sync.desiredEnvironments(settings).repo;
  const plat = fakePlatform();
  plat.state.environments.push({
    id: 'env_x', name: want.name,
    config: { ...want.config, networking: { ...want.config.networking, allowed_hosts: [...want.config.networking.allowed_hosts].reverse() } },
  });
  const res = await run(plat, REPO, 'live');
  assert.ok(res.lines.includes(`environment ${want.name} (repo): unchanged`), res.lines.join('\n'));
});

test('CW-101: an environment that exists but differs is warned about and left alone', async () => {
  const plat = fakePlatform();
  plat.state.environments.push({ id: 'env_x', name: settings.platform.repoEnvironment, config: { type: 'cloud', networking: { type: 'unrestricted' } } });
  const res = await run(plat, REPO, 'live');
  assert.ok(res.lines.some((l) => l.startsWith('::warning::') && l.includes(settings.platform.repoEnvironment)));
  assert.equal(plat.state.environments.length, 2);
  assert.equal(plat.state.environments[0].config.networking.type, 'unrestricted');
});

test('CK-6: a read-only run on an empty platform sends only GET and says what it would create', async () => {
  const plat = fakePlatform();
  const res = await run(plat, REPO, 'live', { SYNC_READ_ONLY: 'true' });
  assert.equal(res.code, 0);
  assert.deepEqual(writes(plat), []);
  assert.ok(plat.state.calls.length >= 3);
  assert.ok(res.lines.includes('skill alpha: would create'), res.lines.join('\n'));
  assert.ok(res.lines.includes('agent agents-demo: would create'));
  assert.ok(res.lines.some((l) => /^environment .*: would create$/.test(l)));
  assert.equal(res.lines[res.lines.length - 1], 'read-only: nothing written');
});

test('CK-6: a read-only run on the first-run seed says it would upload a version', async () => {
  const plat = fakePlatform();
  seedFirstRun(plat);
  const res = await run(plat, REPO, 'live', { SYNC_READ_ONLY: 'true' });
  assert.deepEqual(writes(plat), []);
  assert.ok(res.lines.includes('skill alpha: would upload a new version to skill_seed_a'), res.lines.join('\n'));
  assert.ok(res.lines.includes('read-only: nothing written'));
});

test('CK-6: after a sync, a read-only run reports would update only for a changed agent', async () => {
  const plat = fakePlatform();
  await run(plat, REPO, 'live');
  plat.state.calls.length = 0;
  const changed = { ...REPO, 'cloud/agents/quick.md': REPO['cloud/agents/quick.md'].replace('Quick.', 'Quicker.') };
  const res = await run(plat, changed, 'live', { SYNC_READ_ONLY: 'true' });
  assert.deepEqual(writes(plat), []);
  assert.ok(res.lines.includes('agent agents-quick: would update'));
  assert.ok(res.lines.includes('agent agents-demo: unchanged'));
});

test('CK-6: only the string true turns read-only on', async () => {
  for (const value of ['', 'false', undefined]) {
    const plat = fakePlatform();
    const res = await run(plat, REPO, 'live', { SYNC_READ_ONLY: value });
    assert.ok(writes(plat).length > 0, `value ${value}`);
    assert.ok(!res.lines.includes('read-only: nothing written'));
  }
});

test('HR-1: the sync sends display_name on a create, and no title field anywhere', async () => {
  const plat2 = fakePlatform();
  await run(plat2, REPO, 'live');
  const created = plat2.state.forms.filter((f) => f.path === '/v1/skills');
  assert.equal(created.length, 2);
  for (const f of created) assert.deepEqual(f.keys.sort(), ['display_name', 'files[]']);
  for (const r of plat2.state.requests) assert.ok(!new RegExp(OLD_TITLE_FIELD + '|[?&]after=').test(r.url), r.url);
  assert.ok(plat2.state.requests.some((r) => r.method === 'GET' && r.url.includes('/v1/skills') && r.url.includes('source=custom')));
});

test('HR-1: the client sends display_name on a create and only files on a version upload', async () => {
  const seen = [];
  const fetchImpl = async (url, init) => {
    seen.push({ url, init });
    return { ok: true, status: 200, statusText: '', text: async () => JSON.stringify({ id: 'skill_1', data: [], next_page: null }) };
  };
  const client = createPlatformClient({ apiKey: 'k', apiUrl: 'http://x/', fetchImpl, sleep: async () => {} });
  const files = [['alpha/SKILL.md', 'body'], ['alpha/references/r.md', 'ref']];
  assert.equal(SKILL_NAME_FIELD, 'display_name');
  await client.createSkill(files, 'alpha');
  await client.createSkillVersion('skill_1', files);
  await client.listSkills();
  await client.listEvents('sess_1');
  assert.equal(seen[0].url, 'http://x/v1/skills');
  assert.equal(seen[1].url, 'http://x/v1/skills/skill_1/versions');
  assert.equal(new URL(seen[2].url).searchParams.get('source'), 'custom');
  assert.ok(!/[?&]after=/.test(seen[3].url));
  for (const { init } of seen.slice(0, 2)) {
    assert.equal(init.method, 'POST');
    assert.ok(init.body instanceof FormData);
    assert.equal(init.headers['content-type'], undefined);
    assert.equal(init.headers['x-api-key'], 'k');
    assert.deepEqual(init.body.getAll('files[]').map((f) => f.name), ['alpha/SKILL.md', 'alpha/references/r.md']);
    assert.equal(await init.body.getAll('files[]')[0].text(), 'body');
    assert.equal(init.body.has(OLD_TITLE_FIELD), false);
  }
  assert.equal(seen[0].init.body.get('display_name'), 'alpha');
  assert.equal(seen[1].init.body.has('display_name'), false);
});
