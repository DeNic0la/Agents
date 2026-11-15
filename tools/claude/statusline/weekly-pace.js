// Weekly pace for the usage-budget concept: weekday weights, the pace line and the advice.
// Pure functions, no I/O; statusline/usage-pace.js and hooks/usage-guard.js use them.
// Weights are indexed like Date#getDay() (0 = Sunday); 1 is a full workday.
'use strict';

const DAY = 86400, WEEK = 7 * DAY;
const DEFAULT_WEEKDAYS = '1,1,1,1,1,0.2,0.2'; // Monday first
const FLOOR = 0.15;   // no day is assumed off for good
const PRIOR_WEEKS = 2; // the prior counts as this many learned weeks
const clamp = (x, lo, hi) => (Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : lo);
const sum = a => a.reduce((s, x) => s + x, 0);

// USAGE_PACE_WEEKDAYS: 7 comma-separated weights, Monday first. Invalid input gives the default.
// Returns them Sunday first.
function parseWeekdays(text) {
  const parse = s => {
    const w = String(s).split(',').map(x => Number(x.trim()));
    return w.length === 7 && w.every(x => Number.isFinite(x) && x >= 0) && sum(w) > 0 ? w : null;
  };
  const w = (text != null && text !== '' && parse(text)) || parse(DEFAULT_WEEKDAYS);
  return [w[6], ...w.slice(0, 6)];
}

// Calls visit(weekday, seconds) for each local-day slice of [from, to).
function eachDay(from, to, visit) {
  for (let t = from; t < to;) {
    const d = new Date(t * 1000);
    const end = Math.min(to, new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime() / 1000);
    visit(d.getDay(), end - t);
    t = end;
  }
}

// Days between two times, each day weighted.
function activeDays(from, to, weights) {
  let total = 0;
  eachDay(from, to, (wd, s) => { total += (s / DAY) * weights[wd]; });
  return total;
}

// Amount used per weekday in one window. Readings exist only while Claude Code runs on this
// machine, so a rise is spread over the time since the previous reading in proportion to
// time × the prior weight of each day: weekday use on another machine that shows up here at
// the next reading, possibly on a weekend, still lands mostly on weekdays.
function windowUsage(readings, resetsAt, prior) {
  const start = resetsAt - WEEK, amounts = [0, 0, 0, 0, 0, 0, 0];
  let prev = { t: start, used: 0 };
  for (const r of [...readings].sort((a, b) => a.t - b.t)) {
    const t = clamp(r.t, start, resetsAt), rise = r.used - prev.used;
    if (rise > 0 && t > prev.t) {
      const parts = [0, 0, 0, 0, 0, 0, 0];
      eachDay(prev.t, t, (wd, s) => { parts[wd] += s * Math.max(FLOOR, prior[wd]); });
      const total = sum(parts);
      parts.forEach((p, wd) => { amounts[wd] += (rise * p) / total; });
    }
    if (t >= prev.t) prev = { t, used: Math.max(prev.used, r.used) };
  }
  return amounts;
}

// Weekday weights learned from finished windows that the history covers from start to end,
// blended with the prior. Returns { weights, weeks } with weeks = windows learned from.
function weekdayWeights(hist, now, prior) {
  const windows = new Map();
  for (const h of hist || []) {
    if (!h || !Number.isFinite(h.t) || !Number.isFinite(h.used) || !Number.isFinite(h.resets_at)) continue;
    const key = Math.round(h.resets_at / 3600) * 3600; // absorbs jitter in resets_at
    if (!windows.has(key)) windows.set(key, []);
    windows.get(key).push(h);
  }
  const learned = [0, 0, 0, 0, 0, 0, 0], scale = sum(prior);
  let weeks = 0;
  for (const [resetsAt, readings] of windows) {
    if (resetsAt > now) continue;
    const ts = readings.map(r => r.t), start = resetsAt - WEEK;
    if (Math.min(...ts) - start > DAY || resetsAt - Math.max(...ts) > DAY) continue; // not covered
    const amounts = windowUsage(readings, resetsAt, prior), total = sum(amounts);
    if (!(total > 0)) continue;
    amounts.forEach((a, wd) => { learned[wd] += (a / total) * scale; });
    weeks++;
  }
  const blended = prior.map((p, wd) => (PRIOR_WEEKS * p + learned[wd]) / (PRIOR_WEEKS + weeks));
  const top = Math.max(...blended);
  return { weights: blended.map(b => Math.max(FLOOR, top > 0 ? b / top : 1)), weeks };
}

// The pace line in percent: the weighted share of the window that has passed × (100 − reserve).
function paceLine(now, resetsAt, weights, reserve) {
  const start = resetsAt - WEEK;
  const total = activeDays(start, resetsAt, weights);
  const share = total > 0 ? activeDays(start, clamp(now, start, resetsAt), weights) / total : 0;
  return Math.round(clamp(share, 0, 1) * (100 - reserve));
}

// What to do from now on. kind: stop | free | ease | more | on. perDay is the amount per full
// workday that uses the rest of the budget except the reserve; factor compares it with the
// rate so far; today is perDay scaled by today's weight; light marks a day weighted below 0.5.
function advise({ used, pace, now, resetsAt, weights, reserve }) {
  const start = resetsAt - WEEK, w = weights[new Date(now * 1000).getDay()];
  const day = perDay => ({ perDay, today: perDay * w, light: w < 0.5 });
  const left = 100 - reserve - used;
  if (left <= 0) return { kind: 'stop', ...day(0) };
  const perDay = left / Math.max(0.25, activeDays(now, resetsAt, weights));
  const elapsed = activeDays(start, now, weights);
  // Too early in the window for a rate: compare with one day's share of the week instead.
  const dayShare = (100 - reserve) / Math.max(1, activeDays(start, resetsAt, weights));
  if (elapsed < 1 || used < 1) return { kind: used <= Math.max(pace, dayShare) ? 'free' : 'ease', ...day(perDay) };
  const factor = perDay / (used / elapsed); // the daily budget against the daily rate so far
  const kind = factor >= 1.15 ? 'more' : factor <= 0.87 ? 'ease' : 'on';
  return { kind, factor, ...day(perDay) };
}

module.exports = { DAY, WEEK, DEFAULT_WEEKDAYS, FLOOR, PRIOR_WEEKS, parseWeekdays, eachDay, activeDays, windowUsage, weekdayWeights, paceLine, advise };
