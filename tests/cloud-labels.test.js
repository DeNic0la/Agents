// Tests for cloud/labels.json, cloud/sync-labels.js and cloud/ruleset-main.json.
// Run: node --test "tests/*.test.js"
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');

const root = path.join(__dirname, '..');
const { planLabelSync } = require(path.join(root, 'cloud/sync-labels.js'));
const labels = JSON.parse(fs.readFileSync(path.join(root, 'cloud/labels.json'), 'utf8'));

// Backticked names in the first column of the table whose header starts with `header`.
function tableNames(markdown, header) {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((l) => l.startsWith(header));
  assert.ok(start >= 0, `table "${header}" not found`);
  const names = [];
  for (let i = start + 2; i < lines.length && lines[i].startsWith('|'); i++) {
    const firstCell = lines[i].split('|')[1];
    for (const m of firstCell.matchAll(/`([^`]+)`/g)) names.push(m[1]);
  }
  return names;
}

test('CW-2: labels.json has exactly the labels of the workflow doc', () => {
  const doc = fs.readFileSync(path.join(root, 'docs/development-workflow.md'), 'utf8');
  const fromDoc = [...tableNames(doc, '| State label |'), ...tableNames(doc, '| Label |')];
  const fromJson = labels.map((l) => l.name);
  assert.equal(new Set(fromDoc).size, fromDoc.length, 'duplicate in doc');
  assert.equal(new Set(fromJson).size, fromJson.length, 'duplicate in labels.json');
  assert.equal(fromJson.length, 20);
  assert.deepEqual([...fromJson].sort(), [...fromDoc].sort());
});

test('labels have a 6-digit hex color and a description of 1-100 characters', () => {
  for (const l of labels) {
    assert.match(l.color, /^[0-9a-fA-F]{6}$/, l.name);
    assert.ok(l.description.length >= 1 && l.description.length <= 100, `${l.name} description length`);
  }
});

test('planLabelSync creates missing labels', () => {
  const wanted = [{ name: 'a', color: '000000', description: 'A' }];
  const plan = planLabelSync(wanted, []);
  assert.deepEqual(plan, { create: wanted, update: [], extra: [] });
});

test('planLabelSync updates a changed color or description', () => {
  const wanted = [
    { name: 'a', color: '000000', description: 'A' },
    { name: 'b', color: '111111', description: 'B' },
    { name: 'c', color: '222222', description: 'C' },
  ];
  const existing = [
    { name: 'a', color: 'ffffff', description: 'A' },
    { name: 'b', color: '111111', description: 'other' },
    { name: 'c', color: '222222', description: 'C' },
  ];
  const plan = planLabelSync(wanted, existing);
  assert.deepEqual(plan.create, []);
  assert.deepEqual(plan.update.map((l) => l.name), ['a', 'b']);
});

test('planLabelSync matches names case-insensitively and treats null description as empty', () => {
  const wanted = [{ name: 'Ready', color: 'ABCDEF', description: 'x' }];
  const same = planLabelSync(wanted, [{ name: 'ready', color: 'abcdef', description: 'x' }]);
  assert.deepEqual(same, { create: [], update: [], extra: [] });
  const changed = planLabelSync(wanted, [{ name: 'ready', color: 'abcdef', description: null }]);
  assert.equal(changed.create.length, 0);
  assert.equal(changed.update.length, 1);
  assert.equal(changed.update[0].currentName, 'ready');
});

test('planLabelSync lists extra labels and never plans a deletion', () => {
  const wanted = [{ name: 'a', color: '000000', description: 'A' }];
  const existing = [{ name: 'a', color: '000000', description: 'A' }, { name: 'bug', color: 'd73a4a', description: '' }];
  const plan = planLabelSync(wanted, existing);
  assert.deepEqual(plan.extra, ['bug']);
  assert.deepEqual(Object.keys(plan).sort(), ['create', 'extra', 'update']);
});

test('ruleset: no bypass actors, requires ci and merge-gate', () => {
  const rs = JSON.parse(fs.readFileSync(path.join(root, 'cloud/ruleset-main.json'), 'utf8'));
  assert.deepEqual(rs.bypass_actors, []);
  assert.equal(rs.enforcement, 'active');
  assert.deepEqual(rs.conditions.ref_name.include, ['~DEFAULT_BRANCH']);
  const checks = rs.rules.find((r) => r.type === 'required_status_checks').parameters.required_status_checks;
  assert.deepEqual(checks.map((c) => c.context).sort(), ['ci', 'merge-gate']);
  for (const type of ['deletion', 'non_fast_forward', 'pull_request']) {
    assert.ok(rs.rules.some((r) => r.type === type), type);
  }
});
