'use strict';
// Sync of cloud/agents/*.md to Managed Agents agents named agents-<role> (CW-101): run on every
// merge to main, so a session always uses the definitions of the commit on main.
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

// A subset match: the platform may add fields to what we created.
function covers(have, want) {
  if (want && typeof want === 'object') {
    if (!have || typeof have !== 'object') return false;
    return Object.keys(want).every((k) => covers(have[k], want[k]));
  }
  return have === want;
}

async function ensureEnvironments(client, settings, log) {
  const existing = await client.listEnvironments();
  for (const [kind, want] of Object.entries(sync.desiredEnvironments(settings))) {
    const have = existing.find((e) => e.name === want.name);
    if (!have) {
      await client.createEnvironment(want);
      log(`environment ${want.name} (${kind}): created`);
    } else if (!covers(have, want)) {
      log(`::warning::environment ${want.name} (${kind}) differs from the settings; left as it is`);
    } else {
      log(`environment ${want.name} (${kind}): unchanged`);
    }
  }
}

async function ensureSkill(client, name, existingSkills, io, log) {
  const root = `preset/skills/${name}`;
  const files = io.listTree(root).map((p) => [p.slice('preset/skills/'.length), io.readText(p)]);
  if (!files.length) throw new Error(`skill ${name}: no files under ${root}`);
  const digest = sync.skillDigest(files).slice(0, sync.DIGEST_LENGTH);
  const title = `${sync.AGENT_PREFIX}${name} ${digest}`;
  const have = existingSkills.find((s) => (s.display_title || '').startsWith(`${sync.AGENT_PREFIX}${name} `));
  if (have && have.display_title === title) return have.id;
  const res = have ? await client.createSkillVersion(have.id, files, title) : await client.createSkill(files, title);
  log(`skill ${name}: ${have ? 'new version' : 'created'}`);
  return (have && have.id) || res.id;
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

  await ensureEnvironments(client, settings, log);

  const existingSkills = await client.listSkills();
  const skillIds = {};
  for (const name of new Set(defs.flatMap((d) => d.skills))) {
    skillIds[name] = await ensureSkill(client, name, existingSkills, io, log);
  }

  const agents = await client.listAgents();
  for (const def of defs) {
    const want = sync.desiredAgent(def, settings, personaTexts, skillIds);
    const have = agents.find((a) => a.name === want.name);
    if (!have) {
      await client.createAgent(want);
      log(`agent ${want.name}: created`);
    } else if (sync.agentChanged(have, want)) {
      await client.updateAgent(have.id, have.version, want);
      log(`agent ${want.name}: updated`);
    } else {
      log(`agent ${want.name}: unchanged`);
    }
  }
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
