'use strict';
// Pure part of the agent sync (CW-101): definitions in, request bodies and change decisions out.
// No I/O here, so it is testable without a platform; cloud/dispatcher/sync-agents.js does the I/O.
const crypto = require('crypto');

const TIERS = ['fast', 'standard', 'deep'];
const ENVIRONMENTS = ['repo', 'web'];
const AGENT_PREFIX = 'agents-';
const AGENT_TOOLSET = 'agent_toolset_20260401';
const SKILL_TYPE = 'custom';
const SKILL_VERSION = 'latest';
const WEB_NETWORKING = { type: 'unrestricted' }; // unconfirmed: networking of the web environment
const DIGEST_LENGTH = 12; // hex characters of a skill digest kept in its title

const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');

function parseValue(raw) {
  const v = raw.trim();
  if (v.startsWith('[') && v.endsWith(']')) {
    return v.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean);
  }
  return v;
}

// fileName is the file name with or without .md; the role must match it.
function parseDefinition(text, fileName) {
  const name = String(fileName).replace(/\.md$/, '');
  const m = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)([\s\S]*)$/.exec(String(text));
  if (!m) throw new Error(`${name}: no frontmatter`);
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const clean = line.replace(/(^|\s)#.*$/, '').trim();
    if (!clean) continue;
    const i = clean.indexOf(':');
    if (i < 1) throw new Error(`${name}: bad frontmatter line "${clean}"`);
    meta[clean.slice(0, i).trim()] = parseValue(clean.slice(i + 1));
  }
  if (meta.role !== name) throw new Error(`${name}: role "${meta.role}" differs from the file name`);
  if (!TIERS.includes(meta.tier)) throw new Error(`${name}: tier must be one of ${TIERS.join(', ')}`);
  if (!ENVIRONMENTS.includes(meta.environment)) throw new Error(`${name}: environment must be one of ${ENVIRONMENTS.join(', ')}`);
  const list = (key) => {
    const v = meta[key] === undefined ? [] : meta[key];
    if (!Array.isArray(v)) throw new Error(`${name}: ${key} must be a list like [a, b]`);
    return v;
  };
  return {
    role: meta.role, tier: meta.tier, environment: meta.environment,
    skills: list('skills'), personas: list('personas'), body: m[2].trim(),
  };
}

// personaTexts: { name: file text }; skillIds: { name: skill id }
function desiredAgent(def, settings, personaTexts, skillIds) {
  const model = settings.models && settings.models[def.tier];
  if (!model) throw new Error(`${def.role}: no model for tier ${def.tier} in settings`);
  let system = def.body;
  for (const p of def.personas) {
    const raw = personaTexts[p];
    if (raw === undefined) throw new Error(`${def.role}: persona ${p} not found`);
    const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/, '').trim();
    system += `\n\n## Persona: ${p}\n\n${body}`;
  }
  const skills = def.skills.map((s) => {
    if (!skillIds[s]) throw new Error(`${def.role}: skill ${s} has no id`);
    return { type: SKILL_TYPE, skill_id: skillIds[s], version: SKILL_VERSION };
  });
  const body = {
    name: AGENT_PREFIX + def.role, model, system, tools: [{ type: AGENT_TOOLSET }], skills,
  };
  // the digest covers everything that is sent, so any change of the definition shows
  const digest = sha256(JSON.stringify(body));
  return { ...body, metadata: { role: def.role, source: `cloud/agents/${def.role}.md`, digest } };
}

function agentChanged(existing, desired) {
  const have = existing && existing.metadata && existing.metadata.digest;
  if (have) return have !== desired.metadata.digest;
  return ['name', 'model', 'system', 'skills'].some((k) => JSON.stringify(existing && existing[k]) !== JSON.stringify(desired[k]));
}

function desiredEnvironments(settings) {
  const p = settings.platform;
  const env = (name, networking) => ({ name, config: { type: 'cloud', networking } });
  return {
    repo: env(p.repoEnvironment, {
      type: 'limited', allowed_hosts: settings.allowedHosts, allow_package_managers: true, allow_mcp_servers: false,
    }),
    web: env(p.webEnvironment, WEB_NETWORKING),
  };
}

// A subset match: the platform may add fields to what we created, but a list (allowed
// hosts) must match exactly, or an extra host would pass as unchanged.
function covers(have, want) {
  if (Array.isArray(want)) {
    return Array.isArray(have) && have.length === want.length && want.every((w, i) => covers(have[i], w));
  }
  if (want && typeof want === 'object') {
    if (!have || typeof have !== 'object') return false;
    return Object.keys(want).every((k) => covers(have[k], want[k]));
  }
  return have === want;
}

// files: [[path, content]] in any order
function skillDigest(files) {
  const h = crypto.createHash('sha256');
  for (const [p, c] of [...files].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))) {
    h.update(`${p}\0${c}\0`);
  }
  return h.digest('hex');
}

module.exports = {
  parseDefinition, desiredAgent, agentChanged, desiredEnvironments, covers, skillDigest, AGENT_PREFIX, DIGEST_LENGTH,
};
