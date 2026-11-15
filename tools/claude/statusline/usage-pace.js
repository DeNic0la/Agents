#!/usr/bin/env node
// Claude Code status line for the usage-budget concept: model, context size, 5-hour usage,
// and weekly usage against a pace line that keeps a reserve for the last day.
// Saves the last plan-usage reading to <config dir>/usage-pace.json for hooks and skills.
// USAGE_PACE_RESERVE: percent of the weekly limit to keep for the last day (default 10).
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');

const WEEK = 7 * 24 * 3600;
const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const clamp = (x, lo, hi) => (Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : lo);
const reserve = clamp(Number(process.env.USAGE_PACE_RESERVE || 10), 0, 50);
const paint = (code, s) => `\x1b[${code}m${s}\x1b[0m`;
const k = n => (n >= 1000 ? Math.round(n / 1000) + 'k' : String(n));

// resets_at is documented as Unix seconds; accept milliseconds or an ISO string too.
function seconds(t) {
  if (typeof t === 'string') t = /^\d+$/.test(t) ? Number(t) : Date.parse(t) / 1000;
  if (!Number.isFinite(t)) return null;
  return t > 1e12 ? t / 1000 : t;
}

// Context of the last main-thread call, from the tail of the transcript.
function contextTokens(file) {
  try {
    const fd = fs.openSync(file, 'r');
    const size = fs.fstatSync(fd).size, len = Math.min(size, 512 * 1024);
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, size - len);
    fs.closeSync(fd);
    const lines = buf.toString('utf8').split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      if (!lines[i].includes('"usage"')) continue;
      let o; try { o = JSON.parse(lines[i]); } catch { continue; }
      const u = o.type === 'assistant' && !o.isSidechain && o.message && o.message.usage;
      if (u) return (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
    }
  } catch {}
  return null;
}

function render(input) {
  const now = Date.now() / 1000, parts = [];
  const model = input.model && (input.model.display_name || input.model.id);
  if (model) parts.push(model);

  const ctx = input.transcript_path ? contextTokens(input.transcript_path) : null;
  if (ctx != null) parts.push(ctx > 350000 ? paint(31, `ctx ${k(ctx)}`) : ctx > 200000 ? paint(33, `ctx ${k(ctx)}`) : `ctx ${k(ctx)}`);

  const rl = input.rate_limits || {};
  const five = rl.five_hour && Number.isFinite(rl.five_hour.used_percentage) ? rl.five_hour : null;
  const week = rl.seven_day && Number.isFinite(rl.seven_day.used_percentage) ? rl.seven_day : null;
  if (five) {
    const u = Math.round(five.used_percentage);
    parts.push(u >= 90 ? paint(31, `5h ${u}%`) : u >= 70 ? paint(33, `5h ${u}%`) : `5h ${u}%`);
  }
  const resets = week && seconds(week.resets_at);
  if (week && resets) {
    const used = Math.round(week.used_percentage);
    const pace = Math.round(clamp(1 - (resets - now) / WEEK, 0, 1) * (100 - reserve));
    const left = Math.max(0, resets - now);
    const text = `week ${used}% / pace ${pace}%` + (left < 2 * 86400 ? ` (resets in ${Math.round(left / 3600)}h)` : '');
    parts.push(used > pace + 10 ? paint(31, text) : used > pace ? paint(33, text) : paint(32, text));
    const state = { updated_at: Math.round(now), reserve, seven_day: { used, resets_at: resets } };
    if (five) state.five_hour = { used: Math.round(five.used_percentage), resets_at: seconds(five.resets_at) };
    try { fs.writeFileSync(path.join(configDir, 'usage-pace.json'), JSON.stringify(state)); } catch {}
  }
  return parts.join(' · ');
}

let data = '';
process.stdin.on('data', c => (data += c));
process.stdin.on('end', () => {
  let input = {};
  try { input = JSON.parse(data || '{}'); } catch {}
  let line = '';
  try { line = render(input); } catch {}
  process.stdout.write(line);
});
