// Tests for cloud/dispatcher/decide/merge-class.js.
// Run: node --test "tests/cloud-*.test.js"
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { lowestMergeClass, rank, higher } = require(path.join(__dirname, '..', 'cloud/dispatcher/decide/merge-class.js'));
const settings = { typoSizeLines: 10, bigChange: { lines: 400, files: 15 } };

const f = (p, extra = {}) => ({ path: p, status: 'modified', additions: 1, deletions: 0, ...extra });
const cls = (files) => lowestMergeClass({ files }, settings).mergeClass;
const lines = (p, n) => f(p, { additions: n });

test('rank and higher', () => {
  assert.ok(rank('merge:self') < rank('merge:agent') && rank('merge:agent') < rank('merge:human'));
  assert.equal(higher('merge:agent', 'merge:self'), 'merge:agent');
  assert.equal(higher('merge:self', 'merge:human'), 'merge:human');
});

test('empty change is merge:agent', () => {
  assert.deepEqual(lowestMergeClass({ files: [] }, settings), { mergeClass: 'merge:agent', reasons: ['no changed files'] });
});

test('human paths', () => {
  for (const p of [
    'install.sh', 'install.ps1', 'bin/agents', 'lib/common.sh', 'tools/claude/x.json', '.github/workflows/ci.yml',
    'cloud/settings.json', 'preset/AGENTS.md', 'preset/concepts/a/CONCEPT.md', 'AGENTS.md', 'CLAUDE.md',
    'docs/development-workflow.md', 'docs/specs/cloud-development-workflow.md',
    'docs/specs/cloud-development-workflow-build.md', 'docs/decisions/0008-cloud-development-on-github-issues.md',
    'docs/vision.md', 'docs/model.md', 'preset/hooks/x.json', 'tools/claude/hooks/a.js',
  ]) assert.equal(cls([f(p)]), 'merge:human', p);
});

test('executables', () => {
  for (const p of ['scripts/a.sh', 'x/a.ps1', 'a.psm1', 'a.bat', 'a.cmd']) assert.equal(cls([f(p)]), 'merge:human', p);
  assert.equal(cls([f('preset/skills/x/run', { executable: true })]), 'merge:human');
  assert.equal(cls([f('preset/skills/x/run', { executable: false })]), 'merge:agent');
});

test('dependency manifests and lockfiles', () => {
  for (const p of ['package.json', 'pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', 'pyproject.toml', 'uv.lock',
    'requirements.txt', 'requirements-dev.txt', 'go.mod', 'go.sum', 'Cargo.toml', 'Cargo.lock', 'sub/package.json']) {
    assert.equal(cls([f(p)]), 'merge:human', p);
  }
});

test('size boundaries', () => {
  assert.equal(cls([lines('preset/skills/x/SKILL.md', 10)]), 'merge:self');
  assert.equal(cls([lines('preset/skills/x/SKILL.md', 11)]), 'merge:agent');
  assert.equal(cls([lines('preset/a.txt', 400)]), 'merge:agent');
  assert.equal(cls([lines('preset/a.txt', 401)]), 'merge:human');
  const many = (n) => Array.from({ length: n }, (_, i) => f(`preset/skills/s${i}/a.txt`, { additions: 0, deletions: 0 }));
  assert.equal(cls(many(15)), 'merge:agent');
  assert.equal(cls(many(16)), 'merge:human');
  assert.equal(cls([f('preset/a.txt', { additions: 200, deletions: 201 })]), 'merge:human');
});

test('self: README and docs', () => {
  assert.equal(cls([lines('README.md', 300)]), 'merge:self');
  assert.equal(cls([lines('docs/README.md', 50), lines('docs/img/a.png', 20)]), 'merge:self');
  assert.equal(cls([f('sub/README.md', { additions: 50 })]), 'merge:agent');
});

test('self: .out-of-scope, and mixing (a) with (b)', () => {
  assert.equal(cls([lines('.out-of-scope/x.md', 50)]), 'merge:self');
  assert.equal(cls([lines('.out-of-scope/x.md', 50), lines('README.md', 50)]), 'merge:self');
});

test('docs/specs and docs/decisions are merge:agent', () => {
  assert.equal(cls([f('docs/specs/other.md')]), 'merge:agent');
  assert.equal(cls([f('docs/decisions/0001-x.md')]), 'merge:agent');
});

test('typo rule', () => {
  assert.equal(cls([lines('preset/skills/x/SKILL.md', 5)]), 'merge:self');
  assert.equal(cls([lines('preset/concepts/x/CONCEPT.md', 5)]), 'merge:human');
  assert.equal(cls([lines('preset/skills/x/SKILL.md', 5), lines('preset/skills/x/helper.js', 1)]), 'merge:agent');
  assert.equal(cls([lines('docs/specs/other.md', 5)]), 'merge:agent');
  assert.equal(cls([lines('docs/decisions/0001-x.md', 5)]), 'merge:agent');
});

test('mixed self and agent files are merge:agent', () => {
  assert.equal(cls([lines('README.md', 30), lines('docs/specs/other.md', 5)]), 'merge:agent');
  assert.equal(cls([lines('README.md', 30), lines('preset/skills/x/SKILL.md', 5)]), 'merge:agent');
  assert.equal(cls([lines('docs/a.md', 30), lines('preset/skills/x/SKILL.md', 5)]), 'merge:agent');
});

test('a rename counts with both paths', () => {
  const r = { path: 'tools/a.md', previousPath: 'docs/a.md', status: 'renamed', additions: 0, deletions: 0 };
  assert.equal(cls([r]), 'merge:human');
  assert.equal(cls([{ ...r, path: 'docs/b.md', previousPath: 'tools/a.md' }]), 'merge:human');
  assert.equal(cls([{ ...r, path: 'docs/b.md', previousPath: 'docs/a.md' }]), 'merge:self');
});

test('reasons name each rule that raised the class', () => {
  const r = lowestMergeClass({ files: [f('.github/workflows/ci.yml'), lines('preset/a.txt', 450)] }, settings);
  assert.equal(r.mergeClass, 'merge:human');
  assert.deepEqual(r.reasons, ['touches .github/ (the gates)', 'more than 400 changed lines']);
  const g = lowestMergeClass({ files: Array.from({ length: 16 }, (_, i) => f(`a${i}.txt`)) }, settings);
  assert.deepEqual(g.reasons, ['more than 15 changed files']);
  assert.deepEqual(lowestMergeClass({ files: [f('README.md')] }, settings).reasons, []);
});

// CW-95: the settings file, the agent definitions, the dispatcher and the repository
// protection change only through a merge:human pull request, however they are changed.
test('CW-95: every file of the workflow itself is merge:human, also when renamed away or deleted', () => {
  const fs = require('fs');
  const root = path.join(__dirname, '..');
  const walk = (dir) => fs.readdirSync(path.join(root, dir), { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]));
  const pinned = [...walk('cloud'), ...walk('.github')];
  for (const p of ['cloud/settings.json', 'cloud/ruleset-main.json', 'cloud/ruleset-owner-merge.json', 'cloud/agents/implement.md', 'cloud/dispatcher/cli.js']) {
    assert.ok(pinned.includes(p), `${p} exists`);
  }
  for (const p of pinned) {
    assert.equal(cls([f(p)]), 'merge:human', p);
    assert.equal(cls([f(p, { status: 'removed', additions: 0, deletions: 1 })]), 'merge:human', `${p} deleted`);
    assert.equal(cls([f('docs/moved.md', { status: 'renamed', previousPath: p })]), 'merge:human', `${p} renamed away`);
  }
});
