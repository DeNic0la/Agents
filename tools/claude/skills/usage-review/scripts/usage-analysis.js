#!/usr/bin/env node
// Where did Claude Code usage go? Reads this machine's session transcripts and prints a report.
// Usage: node usage-analysis.js [--days N] [--dir <projects dir>] [--json <file>]
// Costs are API-equivalent USD. Per-model prices come from Claude Code's own per-session
// "cost-state" records, using the standard token weights below. Nothing leaves the machine.
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');

const argv = process.argv.slice(2);
const arg = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt; };
const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const root = arg('--dir', path.join(configDir, 'projects'));
const days = Number(arg('--days', 0));
const outJson = arg('--json', null);
const since = days > 0 ? new Date(Date.now() - days * 86400e3).toISOString() : '';
if (!fs.existsSync(root)) { console.error(`No transcripts at ${root}`); process.exit(1); }

const W = { in: 1, out: 5, cr: 0.1, cw5: 1.25, cw1: 2 }; // token weights relative to the input price
const WEB = 0.01;                                         // USD per web search request
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = n => String(n).padStart(2, '0');
const dayOf = t => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const homeKey = os.homedir().replace(/[^A-Za-z0-9]/g, '-').toLowerCase();
const short = p => { let s = p; if (s.toLowerCase().startsWith(homeKey)) s = s.slice(homeKey.length).replace(/^-+/, ''); return (s || '(home)').slice(-34); };
const usd = x => (x == null ? '   n/a' : '$' + x.toFixed(2).padStart(6));
const k = x => (x >= 1e6 ? (x / 1e6).toFixed(1) + 'M' : x >= 1e3 ? (x / 1e3).toFixed(0) + 'k' : String(x));
const pct = (a, b) => (b ? Math.round((100 * a) / b) + '%' : '-');
const sum = (list, f) => list.reduce((s, r) => s + f(r), 0);

// ---- collect --------------------------------------------------------------
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.jsonl') && e.name !== 'journal.jsonl') files.push(p);
  }
})(root);

const calls = new Map(), sessions = {}, toolUses = new Map();
const session = key => sessions[key] || (sessions[key] = { key, project: '', title: '', costState: null });

for (const f of files) {
  const rel = path.relative(root, f).split(path.sep);
  const project = rel[0];
  let actor = 'main', sessionId, agentId = null, wfId = null, meta = null;
  if (rel.length === 2) sessionId = rel[1].replace(/\.jsonl$/, '');
  else {
    sessionId = rel[1];
    const i = rel.indexOf('subagents');
    if (i < 0) continue;
    if (rel[i + 1] === 'workflows') { actor = 'workflow'; wfId = rel[i + 2]; } else actor = 'subagent';
    agentId = path.basename(f, '.jsonl');
    try { meta = JSON.parse(fs.readFileSync(f.replace(/\.jsonl$/, '.meta.json'), 'utf8')); } catch {}
  }
  const sKey = project + '/' + sessionId;
  const S = session(sKey); S.project = project;
  let text; try { text = fs.readFileSync(f, 'utf8'); } catch { continue; }
  for (const line of text.split('\n')) {
    if (!line) continue;
    let o; try { o = JSON.parse(line); } catch { continue; }
    if (actor === 'main' && o.type === 'cost-state') { S.costState = o; continue; }
    if (actor === 'main' && o.type === 'ai-title') { S.title = o.title || o.aiTitle || o.text || S.title; continue; }
    if (o.type !== 'assistant' || !o.message) continue;
    const who = actor === 'main' && o.isSidechain ? 'subagent' : actor;
    if (Array.isArray(o.message.content)) for (const c of o.message.content)
      if (c && c.type === 'tool_use' && !toolUses.has(c.id)) toolUses.set(c.id, { ts: o.timestamp, name: c.name, input: c.input || {} });
    const u = o.message.usage; if (!u) continue;
    const cw1 = (u.cache_creation && u.cache_creation.ephemeral_1h_input_tokens) || 0;
    const rec = {
      ts: o.timestamp, model: o.message.model || 'unknown', actor: who, sKey, project, agentId, wfId, file: f,
      agentType: meta && meta.agentType, effort: o.effort || 'n/a', speed: u.speed || 'standard',
      in: u.input_tokens || 0, out: u.output_tokens || 0,
      think: (u.output_tokens_details && u.output_tokens_details.thinking_tokens) || 0,
      cr: u.cache_read_input_tokens || 0, cw5: Math.max(0, (u.cache_creation_input_tokens || 0) - cw1), cw1,
      web: (u.server_tool_use && u.server_tool_use.web_search_requests) || 0,
    };
    rec.ctx = rec.in + rec.cr + rec.cw5 + rec.cw1;
    const key = (o.message.id || o.uuid) + ':' + (o.requestId || '');
    const prev = calls.get(key);
    if (!prev || rec.out > prev.out) calls.set(key, rec); // streamed messages repeat; keep the final one
  }
}

// ---- prices from Claude Code's cost records --------------------------------
const obs = {};
for (const S of Object.values(sessions)) {
  const mu = S.costState && S.costState.modelUsage; if (!mu) continue;
  for (const [m, x] of Object.entries(mu)) {
    const c5 = x.cacheCreationEphemeral5mInputTokens || 0, c1 = x.cacheCreationEphemeral1hInputTokens || 0;
    const unsplit = Math.max(0, (x.cacheCreationInputTokens || 0) - c5 - c1);
    const w = (x.inputTokens || 0) * W.in + (x.outputTokens || 0) * W.out + (x.cacheReadInputTokens || 0) * W.cr + (c5 + unsplit) * W.cw5 + c1 * W.cw1;
    const cost = (x.costUSD || 0) - (x.webSearchRequests || 0) * WEB;
    if (w < 1e4 || cost <= 0) continue;
    const P = obs[m] || (obs[m] = { cost: 0, w: 0, n: 0 });
    P.cost += cost; P.w += w; P.n++;
  }
}
const price = {};
for (const [m, P] of Object.entries(obs)) price[m] = P.cost / P.w;

const all = [...calls.values()].filter(r => r.ts >= since).sort((a, b) => (a.ts < b.ts ? -1 : 1));
if (!all.length) { console.log('No API calls in this period.'); process.exit(0); }
for (const r of all) {
  const p = price[r.model];
  r.cost = p == null ? null : p * (r.in * W.in + r.out * W.out + r.cr * W.cr + r.cw5 * W.cw5 + r.cw1 * W.cw1) + r.web * WEB;
  r.parts = p == null ? null : { input: p * r.in, output: p * r.out * W.out, cacheRead: p * r.cr * W.cr, cacheWrite5m: p * r.cw5 * W.cw5, cacheWrite1h: p * r.cw1 * W.cw1 };
}
const priced = all.filter(r => r.cost != null), unpriced = all.filter(r => r.cost == null);
const TOTAL = sum(priced, r => r.cost);

// A cache rebuild writes most of a large context again, after the stream's first call.
const byFile = {};
for (const r of all) (byFile[r.file] = byFile[r.file] || []).push(r);
for (const list of Object.values(byFile)) list.forEach((r, i) => {
  r.first = i === 0;
  r.gapMin = i ? (new Date(r.ts) - new Date(list[i - 1].ts)) / 60000 : null;
  r.modelSwitch = i > 0 && list[i - 1].model !== r.model;
  r.rebuild = r.ctx > 20000 && r.cw5 + r.cw1 > 0.5 * r.ctx;
});

function group(list, keyFn) {
  const m = {};
  for (const r of list) {
    const key = keyFn(r); if (key == null) continue;
    const g = m[key] || (m[key] = { key, cost: 0, calls: 0, out: 0, think: 0, ctxMax: 0, sessions: new Set(), agents: new Set() });
    g.cost += r.cost || 0; g.calls++; g.out += r.out; g.think += r.think; g.ctxMax = Math.max(g.ctxMax, r.ctx);
    g.sessions.add(r.sKey); if (r.agentId) g.agents.add(r.agentId);
  }
  return Object.values(m).sort((a, b) => b.cost - a.cost);
}
const actorCost = a => sum(priced.filter(r => r.actor === a), r => r.cost);
const out = [], P = s => out.push(s);

// ---- report ---------------------------------------------------------------
const csSessions = Object.values(sessions).filter(s => s.costState);
P(`COVERAGE: ${new Set(all.map(r => r.sKey)).size} sessions, ${all.length} API calls (${unpriced.length} unpriced), ${dayOf(all[0].ts)} to ${dayOf(all[all.length - 1].ts)}, local time${days ? `, last ${days} days` : ''}`);
P(`TOTAL: ${usd(TOTAL).trim()} API-equivalent. Claude Code's own records: ${usd(sum(csSessions, s => s.costState.totalCostUSD || 0)).trim()} over the ${csSessions.length} sessions that have one (all history).`);
P('PRICES ($ per 1M input-equivalent tokens; output x5, cache read x0.1, cache write 5m x1.25, 1h x2): ' + Object.entries(price).map(([m, p]) => `${m} ${(p * 1e6).toFixed(3)}`).join(' | '));
if (unpriced.length) P(`  unpriced (no cost record yet): ${[...new Set(unpriced.map(r => r.model))].join(', ')}`);

const agentCalls = [...toolUses.values()].filter(t => (t.name === 'Agent' || t.name === 'Task') && t.ts >= since);
const inherited = agentCalls.filter(t => !t.input.model).length;
const big = priced.filter(r => r.ctx > 2e5), rb = priced.filter(r => r.rebuild);
const rbCost = sum(rb, r => r.parts.cacheWrite5m + r.parts.cacheWrite1h);
const topTier = sum(priced.filter(r => /opus|fable/.test(r.model)), r => r.cost);
const sessionsByCost = group(priced, r => r.sKey);
P('');
P('SIGNALS:');
P(`  top-tier models (Opus, Fable): ${pct(topTier, TOTAL)} of cost`);
P(`  subagents ${pct(actorCost('subagent'), TOTAL)} and workflow agents ${pct(actorCost('workflow'), TOTAL)} of cost; ${inherited} of ${agentCalls.length} Agent calls passed no model (they ran on the definition's model, CLAUDE_CODE_SUBAGENT_MODEL, or the session's)`);
P(`  calls above 200k context: ${big.length} of ${priced.length}, ${pct(sum(big, r => r.cost), TOTAL)} of cost`);
P(`  cache rebuilds: ${rb.length} calls, ${pct(rbCost, TOTAL)} of cost (after a model switch: ${rb.filter(r => r.modelSwitch).length}, after a break over 60 min: ${rb.filter(r => !r.first && r.gapMin >= 60).length})`);
if (sessionsByCost[0]) P(`  largest session: ${pct(sessionsByCost[0].cost, TOTAL)} of cost`);
P('');
P('BY ACTOR x MODEL:');
for (const g of group(priced, r => r.actor + ' / ' + r.model)) P(`  ${g.key.padEnd(32)} ${usd(g.cost)} ${pct(g.cost, TOTAL).padStart(4)}  calls ${g.calls}`);
const parts = { input: 0, output: 0, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0 };
for (const r of priced) for (const x in parts) parts[x] += r.parts[x];
P('BY TOKEN TYPE: ' + Object.entries(parts).map(([x, v]) => `${x} ${pct(v, TOTAL)}`).join(' | ') + ` | thinking is ${pct(sum(priced, r => r.think), sum(priced, r => r.out))} of output tokens`);
P('');
P('BY DAY:');
for (const g of group(priced, r => dayOf(r.ts)).sort((a, b) => (a.key < b.key ? -1 : 1))) {
  const d = priced.filter(r => dayOf(r.ts) === g.key);
  const split = ['main', 'subagent', 'workflow'].map(a => usd(sum(d.filter(r => r.actor === a), r => r.cost)).trim());
  P(`  ${g.key} ${DOW[new Date(g.key + 'T12:00').getDay()]} ${usd(g.cost)}  main ${split[0]} sub ${split[1]} wf ${split[2]}  sessions ${g.sessions.size}`);
}
const blocks = []; let cur = null;
for (const r of priced) {
  const t = new Date(r.ts);
  if (!cur || t - cur.start >= 5 * 3600e3) { const s = new Date(t); s.setMinutes(0, 0, 0); cur = { start: s, cost: 0 }; blocks.push(cur); }
  cur.cost += r.cost;
}
P('TOP 5-HOUR BLOCKS: ' + blocks.slice().sort((a, b) => b.cost - a.cost).slice(0, 5).map(b => `${dayOf(b.start)} ${pad(b.start.getHours())}:00 ${usd(b.cost).trim()}`).join(' | '));
P('');
P('TOP SESSIONS:');
for (const g of sessionsByCost.slice(0, 10)) {
  const d = priced.filter(r => r.sKey === g.key), S = sessions[g.key];
  const split = ['main', 'subagent', 'workflow'].map(a => pct(sum(d.filter(r => r.actor === a), r => r.cost), g.cost));
  const hrs = ((new Date(d[d.length - 1].ts) - new Date(d[0].ts)) / 3600e3).toFixed(1);
  P(`  ${usd(g.cost)} ${pct(g.cost, TOTAL).padStart(4)} ${dayOf(d[0].ts)} ${hrs.padStart(5)}h ${short(S.project).padEnd(34)} main/sub/wf ${split.join('/')} maxctx ${k(g.ctxMax)}  "${(S.title || '').slice(0, 50)}"`);
}
P('');
P('AGENTS by type and model:');
for (const g of group(priced.filter(r => r.actor !== 'main'), r => `${r.actor}: ${r.agentType || '?'} / ${r.model}`).slice(0, 10))
  P(`  ${g.key.padEnd(50)} agents ${String(g.agents.size).padStart(3)} ${usd(g.cost)}  avg ${usd(g.cost / Math.max(1, g.agents.size)).trim()}`);
const byParam = {};
for (const t of agentCalls) { const key = `${t.input.subagent_type || 'default'} / model=${t.input.model || 'none'}`; byParam[key] = (byParam[key] || 0) + 1; }
P(`AGENT CALLS: ` + (Object.entries(byParam).sort((a, b) => b[1] - a[1]).map(([x, n]) => `${x} x${n}`).join(' | ') || 'none'));
const ctxB = [[0, 5e4, '<50k'], [5e4, 1e5, '50-100k'], [1e5, 2e5, '100-200k'], [2e5, 5e5, '200-500k'], [5e5, Infinity, '>500k']];
P('CONTEXT PER CALL: ' + ctxB.map(([a, b, l]) => { const d = priced.filter(r => r.ctx >= a && r.ctx < b); return `${l} ${d.length} calls ${pct(sum(d, r => r.cost), TOTAL)}`; }).join(' | '));
const mainCtx = priced.filter(r => r.actor === 'main').map(r => r.ctx).sort((a, b) => a - b);
if (mainCtx.length) P(`  main-thread context: median ${k(mainCtx[Math.floor(mainCtx.length / 2)])}, p90 ${k(mainCtx[Math.floor(mainCtx.length * 0.9)])}, max ${k(mainCtx[mainCtx.length - 1])}`);
P('MAIN-THREAD EFFORT: ' + group(priced.filter(r => r.actor === 'main'), r => r.effort).map(g => `${g.key} ${pct(g.cost, TOTAL)} (thinking ${pct(g.think, g.out)} of output)`).join(' | '));
const fast = priced.filter(r => r.speed !== 'standard');
if (fast.length) P(`FAST MODE: ${fast.length} calls ${usd(sum(fast, r => r.cost)).trim()} (billed to usage credits, not plan limits)`);
const sk = {}; for (const t of toolUses.values()) if (t.name === 'Skill' && t.ts >= since) { const n = t.input.skill || t.input.name || '?'; sk[n] = (sk[n] || 0) + 1; }
P('SKILLS INVOKED: ' + (Object.entries(sk).sort((a, b) => b[1] - a[1]).map(([x, n]) => `${x} ${n}`).join(', ') || 'none'));

console.log(out.join('\n'));
if (outJson) fs.writeFileSync(outJson, JSON.stringify({ price, total: TOTAL, calls: priced.map(({ file, parts, ...r }) => r) }, null, 1));
