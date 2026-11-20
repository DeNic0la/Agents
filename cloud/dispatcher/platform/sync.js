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
const DIGEST_LENGTH = 12; // hex characters of a skill digest kept in agent metadata

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

// The skills an agent uses, as `name=digest12` pairs sorted by name and joined with commas. The
// platform keeps no content hash of a skill we can read, so each agent records the digest of
// every skill it was built with. One pair is about 13 characters plus the name; a metadata
// value may hold 512 (https://platform.claude.com/docs/en/api/beta/agents/create).
function formatSkillsMeta(skillDigests, names) {
  return [...names].sort().map((n) => `${n}=${skillDigests[n]}`).join(',');
}

function parseSkillsMeta(value) {
  const out = {};
  for (const pair of String(value || '').split(',')) {
    const i = pair.indexOf('=');
    if (i > 0) out[pair.slice(0, i)] = pair.slice(i + 1);
  }
  return out;
}

// personaTexts: { name: file text }; skillIds: { name: skill id }; skillDigests: { name: digest12 }
function desiredAgent(def, settings, personaTexts, skillIds, skillDigests = {}) {
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
  const metadata = { role: def.role, source: `cloud/agents/${def.role}.md` };
  if (def.skills.length) {
    for (const s of def.skills) if (!skillDigests[s]) throw new Error(`${def.role}: skill ${s} has no digest`);
    metadata.skills = formatSkillsMeta(skillDigests, def.skills);
  }
  // the digest covers everything that is sent and the skills recorded, so any change shows
  metadata.digest = sha256(JSON.stringify({ ...body, skillsMeta: metadata.skills }));
  return { ...body, metadata };
}

// A read returns the model as an object { id, speed, ... }; a create takes the id string.
const modelId = (m) => (m && typeof m === 'object' ? m.id : m);

function agentChanged(existing, desired) {
  const have = existing && existing.metadata && existing.metadata.digest;
  if (have) return have !== desired.metadata.digest;
  if (modelId(existing && existing.model) !== modelId(desired.model)) return true;
  return ['name', 'system', 'skills'].some((k) => JSON.stringify(existing && existing[k]) !== JSON.stringify(desired[k]));
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

const isPrimitive = (v) => v === null || typeof v !== 'object';

// The first path where `have` doesn't cover `want`, or null. A subset match: the platform may
// add fields to what we created. A list of primitives (allowed hosts) is a set: the same
// members in any order, none extra and none missing, so an extra host is drift and a reordered
// list is not. Other lists compare by position.
function firstDifference(have, want, path = '') {
  if (Array.isArray(want)) {
    if (!Array.isArray(have)) return path;
    if (want.every(isPrimitive)) {
      const same = have.length === want.length && have.every(isPrimitive) && want.every((w) => have.includes(w))
        && have.every((h) => want.includes(h));
      return same ? null : path;
    }
    if (have.length !== want.length) return path;
    for (let i = 0; i < want.length; i += 1) {
      const d = firstDifference(have[i], want[i], `${path}[${i}]`);
      if (d !== null) return d;
    }
    return null;
  }
  if (want && typeof want === 'object') {
    if (!have || typeof have !== 'object') return path;
    for (const k of Object.keys(want)) {
      const d = firstDifference(have[k], want[k], path ? `${path}.${k}` : k);
      if (d !== null) return d;
    }
    return null;
  }
  return have === want ? null : path;
}

const covers = (have, want) => firstDifference(have, want) === null;

// Everything the sync will do, as data, so a read-only run is the plan without its writes.
// presetSkills: { name: { digest } } of the skills the definitions use; environments, skills and
// agents are the platform's lists. Throws on a duplicate display name, before any write.
function planSync({ settings, definitions, personaTexts, presetSkills, environments, skills, agents }) {
  const live = (list) => (list || []).filter((x) => !x.archived_at);
  const envPlan = Object.entries(desiredEnvironments(settings)).map(([kind, want]) => {
    const have = live(environments).find((e) => e.name === want.name);
    if (!have) return { kind, want, action: 'create' };
    const path = firstDifference(have, want);
    return path === null ? { kind, want, action: 'unchanged' } : { kind, want, action: 'differs', path };
  });

  const ours = live(agents).filter((a) => String(a.name || '').startsWith(AGENT_PREFIX));
  const recorded = ours.map((a) => parseSkillsMeta(a.metadata && a.metadata.skills));
  const skillPlan = Object.entries(presetSkills).map(([name, { digest }]) => {
    const found = (skills || []).filter((s) => s.display_name === name);
    if (found.length > 1) {
      throw new Error(`skill ${name}: ${found.length} custom skills have this display name (${found.map((s) => s.id).join(', ')}); delete or rename all but one, then run again`);
    }
    if (!found.length) return { name, digest, action: 'create' };
    const id = found[0].id;
    return { name, digest, id, action: recorded.some((r) => r[name] === digest) ? 'unchanged' : 'new-version' };
  });

  const bySkill = Object.fromEntries(skillPlan.map((s) => [s.name, s]));
  const skillDigests = Object.fromEntries(skillPlan.map((s) => [s.name, s.digest]));
  const agentPlan = definitions.map((def) => {
    const have = ours.find((a) => a.name === AGENT_PREFIX + def.role);
    if (!have) return { def, action: 'create' };
    if (def.skills.some((s) => bySkill[s].action === 'create')) return { def, id: have.id, version: have.version, action: 'update' };
    const ids = Object.fromEntries(def.skills.map((s) => [s, bySkill[s].id]));
    const want = desiredAgent(def, settings, personaTexts, ids, skillDigests);
    return { def, id: have.id, version: have.version, action: agentChanged(have, want) ? 'update' : 'unchanged' };
  });
  return { environments: envPlan, skills: skillPlan, agents: agentPlan };
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
  parseDefinition, desiredAgent, agentChanged, desiredEnvironments, covers, firstDifference, skillDigest,
  formatSkillsMeta, parseSkillsMeta, planSync, AGENT_PREFIX, DIGEST_LENGTH,
};
