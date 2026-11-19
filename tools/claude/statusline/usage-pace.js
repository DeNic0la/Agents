#!/usr/bin/env node
// Claude Code status line for the usage-budget concept:
//   model · context · 5-hour usage · weekly usage and pace line · what to do about it · reset time
// The pace line expects usage on weekdays: each day counts by its weight (see weekly-pace.js),
// so it climbs fast Monday to Friday and slowly at the weekend. The advice says whether to use
// more or less from now on, how much per workday, and the factor against your rate so far, e.g.
// "▲ use more ~19%/workday (3.1×)"; on a light day (weight below 0.5) it adds what today's share is.
// It records every change in weekly usage to <config dir>/usage-history.jsonl and learns the
// weekday weights from the amounts used in finished weeks that the history covers end to end.
// The last reading, the pace and the weights go to <config dir>/usage-pace.json for hooks and skills.
// USAGE_PACE_RESERVE: percent of the weekly limit to keep for the last day (default 10).
// USAGE_PACE_WEEKDAYS: the prior weekday weights, Monday first (default 1,1,1,1,1,0.2,0.2).
// USAGE_PACE_COMPACT=1: shorter labels, e.g. "wk 23/30% ▲~19%/wd (today 4%) · →Fri 14:00".
// Prompt line: when oh-my-posh and its theme are there, its "claude" line goes above the usage line.
// USAGE_PACE_OMP_CONFIG: the theme (default ~/toolbox/oh-my-posh/default.omp.json, the DeNic0la/toolbox
// theme); "off" leaves the line out. USAGE_PACE_OMP_BIN: the oh-my-posh program (default "oh-my-posh").
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const { spawnSync } = require('child_process');
const { DAY, WEEK, parseWeekdays, weekdayWeights, paceLine, advise } = require('./weekly-pace.js');

const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const historyFile = path.join(configDir, 'usage-history.jsonl');
const clamp = (x, lo, hi) => (Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : lo);
const reserve = clamp(Number(process.env.USAGE_PACE_RESERVE || 10), 0, 50);
const prior = parseWeekdays(process.env.USAGE_PACE_WEEKDAYS);
const compact = process.env.USAGE_PACE_COMPACT === '1';
const paint = (code, s) => `\x1b[${code}m${s}\x1b[0m`;
const k = n => (n >= 1000 ? Math.round(n / 1000) + 'k' : String(n));
const num = x => (x >= 10 ? String(Math.round(x)) : String(Math.round(x * 10) / 10));
const clock = t => new Date(t * 1000).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' });

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

// ---- usage history ------------------------------------------------------------------------
function readHistory() {
  try { return fs.readFileSync(historyFile, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)); } catch { return []; }
}
// Appends a reading when weekly usage or the window changed; keeps the last 8 weeks.
function record(hist, entry) {
  const last = hist[hist.length - 1];
  if (last && last.used === entry.used && last.resets_at === entry.resets_at) return hist;
  hist.push(entry);
  try {
    const keep = hist.filter(h => h.t >= entry.t - 8 * WEEK);
    if (keep.length < hist.length) { fs.writeFileSync(historyFile, keep.map(h => JSON.stringify(h)).join('\n') + '\n'); return keep; }
    fs.appendFileSync(historyFile, JSON.stringify(entry) + '\n');
  } catch {}
  return hist;
}

// ---- rendering ----------------------------------------------------------------------------
function adviceText(a, weights) {
  const flat = weights.every(w => w === 1);
  const unit = compact ? (flat ? '%/d' : '%/wd') : (flat ? '%/day' : '%/workday');
  const amount = `~${num(a.perDay)}${unit}`;
  const light = !a.light ? '' : compact ? ` (today ${num(a.today)}%)` : `, light day: ~${num(a.today)}% today`;
  if (a.kind === 'stop') return paint(31, compact ? '▼stop' : `▼ stop: only the ${reserve}% reserve is left`);
  if (compact) {
    const arrow = a.kind === 'more' || a.kind === 'free' ? '▲' : a.kind === 'ease' ? '▼' : '●';
    const code = arrow === '▲' ? 32 : arrow === '▼' ? (a.factor < 0.6 ? 31 : 33) : 0;
    return (code ? paint(code, arrow + amount) : arrow + amount) + light;
  }
  const change = a.factor == null ? '' : a.factor >= 2 ? ` (${num(a.factor)}×)`
    : a.factor >= 1 ? ` (+${Math.round((a.factor - 1) * 100)}%)` : ` (−${Math.round((1 - a.factor) * 100)}%)`;
  if (a.kind === 'free') return paint(32, `▲ ${amount} free`) + light;
  if (a.kind === 'more') return paint(32, `▲ use more ${amount}${change}`) + light;
  if (a.kind === 'ease') return paint(a.factor < 0.6 ? 31 : 33, `▼ ease off ${amount}${change}`) + light;
  return `● on pace ${amount}` + light;
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
    const u = Math.round(five.used_percentage), r5 = seconds(five.resets_at);
    const text = `5h ${u}%` + (u >= 70 && r5 ? ` →${new Date(r5 * 1000).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}` : '');
    parts.push(u >= 90 ? paint(31, text) : u >= 70 ? paint(33, text) : text);
  }
  const resets = week && seconds(week.resets_at);
  if (week && resets) {
    const used = Math.round(week.used_percentage);
    const hist = record(readHistory(), { t: Math.round(now), used, resets_at: Math.round(resets) });
    const { weights, weeks } = weekdayWeights(hist, now, prior);
    const pace = paceLine(now, resets, weights, reserve);
    const label = compact ? `wk ${used}/${pace}%` : `week ${used}%/pace ${pace}%`;
    const a = advise({ used, pace, now, resetsAt: resets, weights, reserve });
    parts.push((used > pace + 10 ? paint(31, label) : used > pace ? paint(33, label) : label) + ' ' + adviceText(a, weights));
    parts.push(compact ? `→${clock(resets)}` : `resets ${clock(resets)}`);
    const state = { updated_at: Math.round(now), reserve,
      seven_day: { used, resets_at: Math.round(resets), pace, weights: weights.map(w => Math.round(w * 1000) / 1000), learned_weeks: weeks } };
    if (five) state.five_hour = { used: Math.round(five.used_percentage), resets_at: seconds(five.resets_at) };
    try { fs.writeFileSync(path.join(configDir, 'usage-pace.json'), JSON.stringify(state)); } catch {}
  }
  return parts.join(' · ');
}

// oh-my-posh writes OSC sequences for the window title and shell integration; a status line keeps only
// the text and its colours.
function cleanPrompt(out) {
  return String(out || '').replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '').split(/\r?\n/)
    .map(l => l.replace(/\s+$/, '')).filter(l => l.replace(/\x1b\[[0-9;]*m/g, '').trim()).join('\n');
}

function promptLine(raw, env = process.env) {
  const config = env.USAGE_PACE_OMP_CONFIG || path.join(os.homedir(), 'toolbox', 'oh-my-posh', 'default.omp.json');
  if (config === 'off' || !fs.existsSync(config)) return '';
  const r = spawnSync(env.USAGE_PACE_OMP_BIN || 'oh-my-posh', ['claude', '--config', config],
    { input: raw, encoding: 'utf8', timeout: 2000, windowsHide: true });
  return r.status === 0 ? cleanPrompt(r.stdout) : '';
}

if (require.main === module) {
  let data = '';
  process.stdin.on('data', c => (data += c));
  process.stdin.on('end', () => {
    let input = {};
    try { input = JSON.parse(data || '{}'); } catch {}
    let line = '', prompt = '';
    try { line = render(input); } catch {}
    try { prompt = promptLine(data || '{}'); } catch {}
    process.stdout.write([prompt, line].filter(Boolean).join('\n'));
  });
}

module.exports = { cleanPrompt };
