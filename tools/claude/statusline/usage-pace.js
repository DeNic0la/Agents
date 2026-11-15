#!/usr/bin/env node
// Claude Code status line for the usage-budget concept:
//   model · context · 5-hour usage · weekly usage and pace line · what to do about it
// The advice says whether to use more or less from now on, how much per day, and the factor
// against your rate so far, e.g. "▲ use more ~19%/day (3.1×)" or "▼ ease off ~8%/day (0.6×)".
// It records every change in weekly usage to <config dir>/usage-history.jsonl and, once a full
// week is recorded, spreads the remaining budget over the weekdays you actually use Claude.
// The last reading goes to <config dir>/usage-pace.json for hooks and skills.
// USAGE_PACE_RESERVE: percent of the weekly limit to keep for the last day (default 10).
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');

const DAY = 86400, WEEK = 7 * DAY;
const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const historyFile = path.join(configDir, 'usage-history.jsonl');
const clamp = (x, lo, hi) => (Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : lo);
const reserve = clamp(Number(process.env.USAGE_PACE_RESERVE || 10), 0, 50);
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

// For each local weekday, the share of finished weeks in which usage rose on that day (at least
// 0.15, so no day is assumed off for good). Null until a whole week has been recorded.
function weekdayWeights(hist, now) {
  const done = new Set(hist.filter(h => h.resets_at <= now && h.t >= h.resets_at - WEEK).map(h => h.resets_at));
  if (!done.size) return null;
  const active = new Set();
  for (let i = 1; i < hist.length; i++) {
    const a = hist[i - 1], b = hist[i];
    if (b.resets_at === a.resets_at && done.has(b.resets_at) && b.used > a.used) active.add(b.resets_at + ':' + new Date(b.t * 1000).getDay());
  }
  const w = [0, 0, 0, 0, 0, 0, 0];
  for (const key of active) w[Number(key.split(':')[1])]++;
  return w.map(c => Math.max(0.15, c / done.size));
}

// Days between two times, each day weighted by how likely you are to use Claude on it.
function activeDays(from, to, weights) {
  let total = 0;
  for (let t = from; t < to;) {
    const d = new Date(t * 1000);
    const end = Math.min(to, new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime() / 1000);
    total += ((end - t) / DAY) * (weights ? weights[d.getDay()] : 1);
    t = end;
  }
  return total;
}

// ---- advice -------------------------------------------------------------------------------
function advice(used, pace, resets, now, weights) {
  const left = 100 - reserve - used;
  if (left <= 0) return paint(31, `▼ stop: only the ${reserve}% reserve is left`);
  const unit = weights ? '%/workday' : '%/day';
  const perDay = left / Math.max(0.25, activeDays(now, resets, weights));
  const elapsed = activeDays(resets - WEEK, now, weights);
  // Too early in the window for a rate: compare with one day's share of the week instead.
  const dayShare = (100 - reserve) / Math.max(1, activeDays(resets - WEEK, resets, weights));
  if (elapsed < 1 || used < 1) return used <= Math.max(pace, dayShare) ? paint(32, `▲ ~${num(perDay)}${unit} free`) : paint(33, `▼ ease off ~${num(perDay)}${unit}`);
  const x = perDay / (used / elapsed); // the daily budget against your daily rate so far
  const change = x >= 2 ? `${num(x)}×` : x >= 1 ? `+${Math.round((x - 1) * 100)}%` : `−${Math.round((1 - x) * 100)}%`;
  if (x >= 1.15) return paint(32, `▲ use more ~${num(perDay)}${unit} (${change})`);
  if (x <= 0.87) return paint(x < 0.6 ? 31 : 33, `▼ ease off ~${num(perDay)}${unit} (${change})`);
  return `● on pace ~${num(perDay)}${unit}`;
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
    const pace = Math.round(clamp(1 - (resets - now) / WEEK, 0, 1) * (100 - reserve));
    const hist = record(readHistory(), { t: Math.round(now), used, resets_at: Math.round(resets) });
    const label = `week ${used}%/pace ${pace}%`;
    parts.push((used > pace + 10 ? paint(31, label) : used > pace ? paint(33, label) : label) + ' ' + advice(used, pace, resets, now, weekdayWeights(hist, now)));
    if (resets - now < 1.5 * DAY) parts.push(`resets ${clock(resets)}`);
    const state = { updated_at: Math.round(now), reserve, seven_day: { used, resets_at: Math.round(resets) } };
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
