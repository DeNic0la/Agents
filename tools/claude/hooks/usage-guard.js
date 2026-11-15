#!/usr/bin/env node
// Claude Code hook for the usage-budget concept. Register it for PreToolUse (matcher
// Agent|Task|Workflow) and PreModelSwitch. It only ever asks; on any error it stays silent.
// - A workflow, or a subagent on a top-tier model, while weekly usage is ahead of pace: ask.
// - A model switch on a context above USAGE_SWITCH_ASK_TOKENS (default 100000): ask, because
//   the new model starts with an empty cache and writes the whole context again.
// The weekly reading comes from <config dir>/usage-pace.json, saved by statusline/usage-pace.js;
// the pace line is weighted by its weekday weights (statusline/weekly-pace.js).
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');

const WEEK = 7 * 24 * 3600;
const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const reserve = Math.min(50, Math.max(0, Number(process.env.USAGE_PACE_RESERVE || 10) || 0));
const switchAsk = Number(process.env.USAGE_SWITCH_ASK_TOKENS || 100000);
const TOP_TIER = /opus|fable/i;

function weekly(now) {
  try {
    const s = JSON.parse(fs.readFileSync(path.join(configDir, 'usage-pace.json'), 'utf8'));
    const w = s.seven_day;
    if (!w || now - s.updated_at > 6 * 3600 || w.resets_at < now) return null; // stale
    return { used: w.used, pace: pace(w, now), resetsAt: w.resets_at };
  } catch { return null; }
}

// The same weighted pace line as the status line; the linear one if that fails.
function pace(w, now) {
  try {
    const { paceLine, parseWeekdays } = require('../statusline/weekly-pace.js');
    const ok = Array.isArray(w.weights) && w.weights.length === 7 && w.weights.every(x => Number.isFinite(x) && x >= 0) && w.weights.some(x => x > 0);
    const p = paceLine(now, w.resets_at, ok ? w.weights : parseWeekdays(process.env.USAGE_PACE_WEEKDAYS), reserve);
    if (Number.isFinite(p)) return p;
  } catch {}
  return Math.round(Math.min(1, Math.max(0, 1 - (w.resets_at - now) / WEEK)) * (100 - reserve));
}

// The model a subagent will run on: the call's, else its definition's, else the env default.
function subagentModel(input) {
  const ti = input.tool_input || {};
  if (ti.model) return ti.model;
  const type = ti.subagent_type;
  if (type && /^[\w.-]+$/.test(type)) {
    for (const dir of [input.cwd && path.join(input.cwd, '.claude', 'agents'), path.join(configDir, 'agents')]) {
      if (!dir) continue;
      try {
        const m = fs.readFileSync(path.join(dir, type + '.md'), 'utf8').match(/^model:\s*["']?([^"'\s]+)/m);
        if (m && m[1] !== 'inherit') return m[1];
        if (m) break;
      } catch {}
    }
  }
  return process.env.CLAUDE_CODE_SUBAGENT_MODEL || 'the session model';
}

function decide(input, now) {
  const event = input.hook_event_name;
  if (event === 'PreModelSwitch') {
    const ctx = Number(input.context_tokens || 0);
    if (!(ctx >= switchAsk)) return null;
    const cost = Number(input.estimated_cache_write_usd);
    const why = `Switching models on a ${Math.round(ctx / 1000)}k-token context writes all of it to the new model's cache` +
      (cost > 0 ? ` (about $${cost.toFixed(2)} API-equivalent)` : '') + '. Cheaper: hand off or /clear first, then switch.';
    // `ask` only works for an interactive /model; elsewhere just warn.
    return input.source === 'command' ? { ask: why + ' Switch anyway?' } : { warn: why };
  }
  if (event !== 'PreToolUse') return null;
  const w = weekly(now);
  if (!w || w.used <= w.pace) return null;
  const when = new Date(w.resetsAt * 1000).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  const status = `Weekly usage is ${w.used}%, ahead of the pace line (${w.pace}%, resets ${when}).`;
  if (input.tool_name === 'Workflow') return { ask: `${status} Launch this workflow anyway? Cheaper: fewer agents, fast or standard tiers, batched verification.` };
  if (input.tool_name === 'Agent' || input.tool_name === 'Task') {
    const model = subagentModel(input);
    if (model === 'the session model' || TOP_TIER.test(model)) return { ask: `${status} This subagent runs on ${model}. Run it anyway, or retry with a sonnet or haiku model?` };
  }
  return null;
}

let data = '';
process.stdin.on('data', c => (data += c));
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data || '{}');
    const d = decide(input, Date.now() / 1000);
    if (d && d.ask) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: input.hook_event_name, permissionDecision: 'ask', permissionDecisionReason: d.ask } }));
    else if (d && d.warn) process.stdout.write(JSON.stringify({ systemMessage: d.warn }));
  } catch {}
  process.exit(0);
});
