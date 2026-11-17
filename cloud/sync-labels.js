// Makes the repository's labels match cloud/labels.json. Creates and updates, never deletes.
// Usage: GITHUB_TOKEN=... GITHUB_REPOSITORY=owner/name node cloud/sync-labels.js [--dry-run]
'use strict';
const fs = require('fs');
const path = require('path');
const { createClient } = require('./dispatcher/github/client.js');

const norm = (s) => String(s).toLowerCase();
const same = (a, b) => norm(a.color || '') === norm(b.color || '') && (a.description || '') === (b.description || '');

function planLabelSync(wanted, existing) {
  const byName = new Map(existing.map((l) => [norm(l.name), l]));
  const wantedNames = new Set(wanted.map((l) => norm(l.name)));
  const create = [];
  const update = [];
  for (const w of wanted) {
    const found = byName.get(norm(w.name));
    if (!found) create.push(w);
    else if (!same(w, found)) update.push({ ...w, currentName: found.name });
  }
  const extra = existing.filter((l) => !wantedNames.has(norm(l.name))).map((l) => l.name);
  return { create, update, extra };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const { GITHUB_TOKEN: token, GITHUB_REPOSITORY: repository, GITHUB_API_URL: apiUrl } = process.env;
  if (!token || !repository) throw new Error('GITHUB_TOKEN and GITHUB_REPOSITORY are required');
  const wanted = JSON.parse(fs.readFileSync(path.join(__dirname, 'labels.json'), 'utf8'));
  const client = createClient({ token, repository, ...(apiUrl ? { apiUrl } : {}) });
  const existing = await client.paginate(`/repos/${repository}/labels`);
  const plan = planLabelSync(wanted, existing);

  for (const l of plan.create) {
    console.log(`${dryRun ? 'would create' : 'create'}: ${l.name}`);
    if (!dryRun) {
      await client.request('POST', `/repos/${repository}/labels`, { name: l.name, color: l.color, description: l.description });
    }
  }
  for (const l of plan.update) {
    console.log(`${dryRun ? 'would update' : 'update'}: ${l.name}`);
    if (!dryRun) {
      await client.request('PATCH', `/repos/${repository}/labels/${encodeURIComponent(l.currentName)}`, {
        new_name: l.name, color: l.color, description: l.description,
      });
    }
  }
  if (plan.extra.length) {
    console.log('not in cloud/labels.json (left alone):');
    for (const n of plan.extra) console.log(`  ${n}`);
  }
  if (!plan.create.length && !plan.update.length) console.log('labels already match');
}

module.exports = { planLabelSync };

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
