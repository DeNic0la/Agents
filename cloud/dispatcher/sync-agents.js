'use strict';
// Sync of cloud/agents/*.md to Managed Agents agents named agents-<role> (CW-101): run on every
// merge to main, so a session always uses the definitions of the commit on main.
// The sync reads the platform first, plans as a pure function (platform/sync.js planSync), and
// then applies the plan, logging each write once it succeeded. With SYNC_READ_ONLY=true (the
// manual run's read_only input) it stops after logging the plan and sends only GET requests.
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

const environmentLabel = (e) => `environment ${e.want.name} (${e.kind})`;
const agentLabel = (a) => `agent ${sync.AGENT_PREFIX}${a.def.role}`;

// Logs what needs no write (unchanged items, drift warnings) and, in a read-only run,
// what a live run would write. A live run logs each write in applyPlan, once it succeeded.
function logPlan(plan, readOnly, log) {
  const would = (line) => readOnly && log(line);
  for (const e of plan.environments) {
    if (e.action === 'create') would(`${environmentLabel(e)}: would create`);
    else if (e.action === 'unchanged') log(`${environmentLabel(e)}: unchanged`);
    else log(`::warning::${environmentLabel(e)} differs from the settings at ${e.path}; left as it is, and no session starts in it until it matches`);
  }
  for (const s of plan.skills) {
    if (s.action === 'create') would(`skill ${s.name}: would create`);
    else if (s.action === 'new-version') would(`skill ${s.name}: would upload a new version to ${s.id}`);
    else log(`skill ${s.name}: unchanged (${s.id})`);
  }
  for (const a of plan.agents) {
    if (a.action === 'unchanged') log(`${agentLabel(a)}: unchanged`);
    else would(`${agentLabel(a)}: would ${a.action}`);
  }
}

// Environments, then skills (collecting their ids), then agents; each write is logged after it succeeded.
async function applyPlan({ client, plan, presetSkills, settings, personaTexts, log }) {
  for (const e of plan.environments) {
    if (e.action !== 'create') continue;
    await client.createEnvironment(e.want);
    log(`${environmentLabel(e)}: created`);
  }
  const skillIds = {};
  const skillDigests = {};
  for (const s of plan.skills) {
    skillDigests[s.name] = s.digest;
    if (s.action === 'create') {
      skillIds[s.name] = (await client.createSkill(presetSkills[s.name].files, s.name)).id;
      log(`skill ${s.name}: created`);
      continue;
    }
    skillIds[s.name] = s.id;
    if (s.action === 'new-version') {
      await client.createSkillVersion(s.id, presetSkills[s.name].files);
      log(`skill ${s.name}: new version (${s.id})`);
    }
  }
  for (const a of plan.agents) {
    if (a.action === 'unchanged') continue;
    const want = sync.desiredAgent(a.def, settings, personaTexts, skillIds, skillDigests);
    if (a.action === 'create') await client.createAgent(want);
    else await client.updateAgent(a.id, a.version, want);
    log(`${agentLabel(a)}: ${a.action === 'create' ? 'created' : 'updated'}`);
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
  await applyPlan({ client, plan, presetSkills, settings, personaTexts, log });
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
