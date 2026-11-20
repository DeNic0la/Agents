'use strict';
// Sync of cloud/agents/*.md to Managed Agents agents named agents-<role> (CW-101): run on every
// merge to main, so a session always uses the definitions of the commit on main.
// The sync reads the platform first, plans as a pure function (platform/sync.js planSync), and
// then applies the plan. With SYNC_READ_ONLY=true (the manual run's read_only input) it stops
// after logging the plan and sends only GET requests.
const fs = require('fs');
const path = require('path');
const { createPlatformClient } = require('./platform/client.js');
const sync = require('./platform/sync.js');

const ROOT = path.join(__dirname, '..', '..');

const realIo = {
  readText: (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'),
  listDir: (rel) => fs.readdirSync(path.join(ROOT, rel)).sort(),
  // all files below rel, as repo-relative paths with forward slashes
  listTree(rel) {
    const out = [];
    const walk = (r) => {
      for (const e of fs.readdirSync(path.join(ROOT, r), { withFileTypes: true })) {
        const child = `${r}/${e.name}`;
        if (e.isDirectory()) walk(child); else out.push(child);
      }
    };
    walk(rel);
    return out.sort();
  },
};

function readPresetSkill(name, io) {
  const root = `preset/skills/${name}`;
  const files = io.listTree(root).map((p) => [p.slice('preset/skills/'.length), io.readText(p)]);
  if (!files.length) throw new Error(`skill ${name}: no files under ${root}`);
  return { files, digest: sync.skillDigest(files).slice(0, sync.DIGEST_LENGTH) };
}

// Logs the plan in the verbs of its mode; `would ...` when nothing is written.
function logPlan(plan, readOnly, log) {
  const verb = (done, would) => (readOnly ? would : done);
  for (const e of plan.environments) {
    const label = `environment ${e.want.name} (${e.kind})`;
    if (e.action === 'create') log(`${label}: ${verb('created', 'would create')}`);
    else if (e.action === 'unchanged') log(`${label}: unchanged`);
    else log(`::warning::${label} differs from the settings at ${e.path}; left as it is, and no session starts in it until it matches`);
  }
  for (const s of plan.skills) {
    if (s.action === 'create') log(`skill ${s.name}: ${verb('created', 'would create')}`);
    else if (s.action === 'new-version') log(`skill ${s.name}: ${readOnly ? `would upload a new version to ${s.id}` : `new version (${s.id})`}`);
    else log(`skill ${s.name}: unchanged (${s.id})`);
  }
  for (const a of plan.agents) {
    const label = `agent ${sync.AGENT_PREFIX}${a.def.role}`;
    if (a.action === 'create') log(`${label}: ${verb('created', 'would create')}`);
    else if (a.action === 'update') log(`${label}: ${verb('updated', 'would update')}`);
    else log(`${label}: unchanged`);
  }
}

// Environments, then skills (collecting their ids), then agents.
async function applyPlan({ client, plan, presetSkills, settings, personaTexts }) {
  for (const e of plan.environments) if (e.action === 'create') await client.createEnvironment(e.want);
  const skillIds = {};
  const skillDigests = {};
  for (const s of plan.skills) {
    skillDigests[s.name] = s.digest;
    if (s.action === 'create') skillIds[s.name] = (await client.createSkill(presetSkills[s.name].files, s.name)).id;
    else {
      skillIds[s.name] = s.id;
      if (s.action === 'new-version') await client.createSkillVersion(s.id, presetSkills[s.name].files);
    }
  }
  for (const a of plan.agents) {
    if (a.action === 'unchanged') continue;
    const want = sync.desiredAgent(a.def, settings, personaTexts, skillIds, skillDigests);
    if (a.action === 'create') await client.createAgent(want);
    else await client.updateAgent(a.id, a.version, want);
  }
}

// io: { readText(rel), listDir(rel), listTree(rel) } relative to the repo root
async function main({ client, io = realIo, env = process.env, settings, log = console.log } = {}) {
  settings = settings || JSON.parse(io.readText('cloud/settings.json'));
  if (!env.ANTHROPIC_API_KEY) {
    const msg = 'agent sync skipped because ANTHROPIC_API_KEY is not set';
    if (settings.mode === 'live') {
      log(`::error::${msg}`);
      return 1;
    }
    log(`::notice::${msg}`);
    return 0;
  }
  client = client || createPlatformClient({
    apiKey: env.ANTHROPIC_API_KEY, apiUrl: settings.platform.apiUrl, fetchImpl: fetch,
  });

  const defs = io.listDir('cloud/agents').filter((f) => f.endsWith('.md') && f !== 'README.md')
    .map((f) => sync.parseDefinition(io.readText(`cloud/agents/${f}`), f));
  const personaTexts = {};
  for (const p of new Set(defs.flatMap((d) => d.personas))) personaTexts[p] = io.readText(`preset/agents/${p}.md`);

  const presetSkills = {};
  for (const name of new Set(defs.flatMap((x) => x.skills))) presetSkills[name] = readPresetSkill(name, io);

  // read everything first; nothing is written before the plan is made
  const [environments, skills, agents] = await Promise.all([client.listEnvironments(), client.listSkills(), client.listAgents()]);
  for (const s of skills) log(`custom skill: ${s.display_name} (${s.id})`);
  const plan = sync.planSync({ settings, definitions: defs, personaTexts, presetSkills, environments, skills, agents });

  const readOnly = env.SYNC_READ_ONLY === 'true';
  logPlan(plan, readOnly, log);
  if (readOnly) {
    log('read-only: nothing written');
    return 0;
  }
  await applyPlan({ client, plan, presetSkills, settings, personaTexts });
  return 0;
}

if (require.main === module) {
  main().then((code) => { process.exitCode = code; }, (err) => {
    // the client scrubs the key from its errors
    console.error(`::error::${err.message}`);
    process.exitCode = 1;
  });
}

module.exports = { main };
