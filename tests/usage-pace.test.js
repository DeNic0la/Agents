// Tests for the usage status line (tools/claude/statusline) and the usage hook (tools/claude/hooks).
// Run: node --test "tests/*.test.js"
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const pace = require(path.join(root, 'tools/claude/statusline/weekly-pace.js'));
const { DAY, WEEK, parseWeekdays, windowUsage, weekdayWeights, paceLine, advise } = pace;
const statusline = path.join(root, 'tools/claude/statusline/usage-pace.js');
const hook = path.join(root, 'tools/claude/hooks/usage-guard.js');

// Local times, so the tests don't depend on the time zone. June 2026 has no DST change.
const at = (d, h = 0, m = 0) => new Date(2026, 5, d, h, m).getTime() / 1000;
const MON = 1; // 1 June 2026
const prior = parseWeekdays();

test('dates: 1 June 2026 is a Monday', () => {
  assert.equal(new Date(at(MON) * 1000).getDay(), 1);
  assert.equal(new Date(at(6) * 1000).getDay(), 6);
});

test('parseWeekdays: default, invalid and custom', () => {
  assert.deepEqual(parseWeekdays(), [0.2, 1, 1, 1, 1, 1, 0.2]);
  assert.deepEqual(parseWeekdays(''), [0.2, 1, 1, 1, 1, 1, 0.2]);
  for (const bad of ['1,1,1', '1,1,1,1,1,1,-1', '0,0,0,0,0,0,0', 'a,b,c,d,e,f,g', '1,1,1,1,1,1,1,1'])
    assert.deepEqual(parseWeekdays(bad), [0.2, 1, 1, 1, 1, 1, 0.2], bad);
  assert.deepEqual(parseWeekdays('1, 1, 0.5, 1, 1, 0, 0.3'), [0.3, 1, 1, 0.5, 1, 1, 0]);
});

test('weekdayWeights: no history gives the prior', () => {
  assert.deepEqual(weekdayWeights([], at(MON), prior), { weights: prior, weeks: 0 });
});

test('weekdayWeights: the real history (two Sunday readings) is skipped as not covered', () => {
  const resetsAt = 1795179600;
  const hist = [{ t: 1794766628, used: 6, resets_at: resetsAt }, { t: 1794766650, used: 7, resets_at: resetsAt }];
  for (const now of [1794766650, resetsAt + DAY]) {
    const r = weekdayWeights(hist, now, prior);
    assert.equal(r.weeks, 0);
    assert.equal(r.weights[0], 0.2);
    assert.deepEqual(r.weights, prior);
  }
});

test('weekdayWeights: a covered weekday-heavy week learns weekdays and floors the weekend', () => {
  const resetsAt = at(MON + 7);
  const hist = [{ t: at(MON, 0, 30), used: 0, resets_at: resetsAt }];
  let used = 0;
  for (let d = MON; d < MON + 5; d++) {
    hist.push({ t: at(d, 9), used, resets_at: resetsAt });
    used += 15;
    hist.push({ t: at(d, 18), used, resets_at: resetsAt + 40 }); // jitter in resets_at
  }
  hist.push({ t: at(MON + 6, 23, 30), used, resets_at: resetsAt });
  const r = weekdayWeights(hist, resetsAt + 3600, prior);
  assert.equal(r.weeks, 1);
  for (let wd = 1; wd <= 5; wd++) assert.ok(r.weights[wd] >= 0.9, `weekday ${wd}: ${r.weights[wd]}`);
  assert.equal(r.weights[6], 0.15);
  assert.equal(r.weights[0], 0.15);
});

test('weekdayWeights: an unfinished window is not learned from', () => {
  const resetsAt = at(MON + 7);
  const hist = [{ t: at(MON, 1), used: 0, resets_at: resetsAt }, { t: at(MON + 6, 23), used: 40, resets_at: resetsAt }];
  assert.equal(weekdayWeights(hist, resetsAt - 60, prior).weeks, 0);
});

test('windowUsage: a rise over the weekend gap lands mostly on weekdays', () => {
  const resetsAt = at(4 + 7); // window from Thursday 4 June 00:00
  const amounts = windowUsage([{ t: at(5, 18), used: 10 }, { t: at(8, 9), used: 40 }], resetsAt, prior);
  const timeOnly = (30 * 24) / 63;
  assert.ok(amounts[6] < timeOnly, `Saturday ${amounts[6]} should be below ${timeOnly}`);
  assert.ok(Math.abs(amounts.reduce((s, x) => s + x, 0) - 40) < 1e-9);
});

test('paceLine: weighted over a window from Monday 00:00', () => {
  const resetsAt = at(MON + 7);
  assert.equal(paceLine(at(MON), resetsAt, prior, 10), 0);
  assert.equal(paceLine(resetsAt, resetsAt, prior, 10), 90);
  assert.equal(paceLine(at(6), resetsAt, prior, 10), 83);
  assert.equal(paceLine(at(6), resetsAt, [1, 1, 1, 1, 1, 1, 1], 10), 64); // linear
});

test('advise: a Saturday is a light day; stop at the reserve', () => {
  const resetsAt = at(MON + 7), now = at(6, 12);
  const a = advise({ used: 40, pace: paceLine(now, resetsAt, prior, 10), now, resetsAt, weights: prior, reserve: 10 });
  assert.equal(a.light, true);
  assert.ok(Math.abs(a.today - 0.2 * a.perDay) < 1e-9);
  assert.ok(['more', 'ease', 'on'].includes(a.kind));
  assert.equal(advise({ used: 90, pace: 50, now, resetsAt, weights: prior, reserve: 10 }).kind, 'stop');
  const weekday = advise({ used: 10, pace: 20, now: at(3, 12), resetsAt, weights: prior, reserve: 10 });
  assert.equal(weekday.light, false);
  assert.equal(weekday.kind, 'more');
});

// ---- the scripts, as child processes -----------------------------------------------------
function tempConfig() { return fs.mkdtempSync(path.join(os.tmpdir(), 'usage-pace-test-')); }
function run(script, input, env) {
  const clean = { ...process.env };
  for (const k of ['USAGE_PACE_WEEKDAYS', 'USAGE_PACE_COMPACT', 'USAGE_PACE_RESERVE']) delete clean[k];
  return execFileSync(process.execPath, [script], { input: JSON.stringify(input), env: { ...clean, ...env }, encoding: 'utf8' });
}

test('usage-pace.js: full and compact output, and usage-pace.json', () => {
  const dir = tempConfig(), now = Date.now() / 1000;
  const input = { model: { display_name: 'Opus' }, rate_limits: {
    seven_day: { used_percentage: 20, resets_at: Math.round(now + 3 * DAY) },
    five_hour: { used_percentage: 10, resets_at: Math.round(now + 3600) } } };
  const full = run(statusline, input, { CLAUDE_CONFIG_DIR: dir });
  assert.match(full, /week 20%\/pace \d+%/);
  assert.match(full, /resets /);
  assert.match(full, /%\/workday/);
  const state = JSON.parse(fs.readFileSync(path.join(dir, 'usage-pace.json'), 'utf8'));
  assert.equal(state.seven_day.weights.length, 7);
  assert.equal(typeof state.seven_day.pace, 'number');
  assert.equal(state.seven_day.learned_weeks, 0);
  const compact = run(statusline, input, { CLAUDE_CONFIG_DIR: dir, USAGE_PACE_COMPACT: '1' });
  assert.match(compact, /wk 20\/\d+%/);
  assert.match(compact, /%\/wd/);
  assert.match(compact, /→/);
  assert.doesNotMatch(compact, /week|resets/);
  const flat = run(statusline, input, { CLAUDE_CONFIG_DIR: dir, USAGE_PACE_WEEKDAYS: '1,1,1,1,1,1,1' });
  assert.match(flat, /%\/day/);
});

test('usage-guard.js: asks against the weighted pace, not the linear one', () => {
  const dir = tempConfig(), now = Date.now() / 1000, resetsAt = Math.round(now + 3.5 * DAY);
  const d = new Date(now * 1000).getDay(), weights = [0, 0, 0, 0, 0, 0, 0].fill(0.15);
  for (const back of [1, 2, 3]) weights[(d - back + 7) % 7] = 1; // heavy on days already past
  const weighted = paceLine(now, resetsAt, weights, 10);
  const linear = Math.round((1 - (resetsAt - now) / WEEK) * 90);
  assert.ok(weighted > linear + 10, `weighted ${weighted} vs linear ${linear}`);
  const ask = used => {
    fs.writeFileSync(path.join(dir, 'usage-pace.json'), JSON.stringify({ updated_at: Math.round(now), reserve: 10,
      seven_day: { used, resets_at: resetsAt, pace: weighted, weights, learned_weeks: 3 } }));
    const out = run(hook, { hook_event_name: 'PreToolUse', tool_name: 'Workflow', tool_input: {} }, { CLAUDE_CONFIG_DIR: dir });
    return out ? JSON.parse(out).hookSpecificOutput : null;
  };
  assert.equal(ask(linear + 5), null);           // above linear, below weighted: no ask
  const h = ask(weighted + 3);                   // above weighted: asks, with the weighted number
  assert.equal(h.permissionDecision, 'ask');
  const shown = Number(h.permissionDecisionReason.match(/pace line \((\d+)%/)[1]);
  assert.ok(Math.abs(shown - weighted) <= 1, `shown ${shown} vs weighted ${weighted}`);
});

test('usage-guard.js: without weights in the file it uses the USAGE_PACE_WEEKDAYS prior', () => {
  const dir = tempConfig(), now = Date.now() / 1000, resetsAt = Math.round(now + 3.5 * DAY);
  const d = new Date(now * 1000).getDay(), weights = [0, 0, 0, 0, 0, 0, 0].fill(0.15);
  for (const back of [1, 2, 3]) weights[(d - back + 7) % 7] = 1;
  const mondayFirst = [...weights.slice(1), weights[0]].join(',');
  const weighted = paceLine(now, resetsAt, weights, 10);
  fs.writeFileSync(path.join(dir, 'usage-pace.json'), JSON.stringify({ updated_at: Math.round(now), reserve: 10,
    seven_day: { used: weighted + 3, resets_at: resetsAt, weights: 'broken' } }));
  const out = run(hook, { hook_event_name: 'PreToolUse', tool_name: 'Workflow', tool_input: {} },
    { CLAUDE_CONFIG_DIR: dir, USAGE_PACE_WEEKDAYS: mondayFirst });
  const shown = Number(JSON.parse(out).hookSpecificOutput.permissionDecisionReason.match(/pace line \((\d+)%/)[1]);
  assert.ok(Math.abs(shown - weighted) <= 1, `shown ${shown} vs weighted ${weighted}`);
});
