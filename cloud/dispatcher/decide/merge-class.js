// The lowest merge class the changed paths and the size allow (docs/development-workflow.md, Merging).
// Paths and size only: whether a small fix changes no meaning is the implement agent's call.
'use strict';

const CLASSES = ['merge:self', 'merge:agent', 'merge:human'];
const rank = (mergeClass) => CLASSES.indexOf(mergeClass);
const higher = (a, b) => (rank(b) > rank(a) ? b : a);

const HUMAN_FILES = new Set([
  'install.sh', 'install.ps1', 'preset/AGENTS.md', 'AGENTS.md', 'CLAUDE.md',
  'docs/development-workflow.md', 'docs/specs/cloud-development-workflow.md',
  'docs/specs/cloud-development-workflow-build.md',
  'docs/decisions/0008-cloud-development-on-github-issues.md',
  'docs/vision.md', 'docs/model.md',
]);
const HUMAN_DIRS = ['bin/', 'lib/', 'tools/', '.github/', 'cloud/', 'preset/concepts/'];
const EXECUTABLE_EXT = /\.(sh|ps1|psm1|bat|cmd)$/i;
const MANIFEST = /^(package\.json|pnpm-lock\.yaml|package-lock\.json|yarn\.lock|pyproject\.toml|uv\.lock|requirements[^/]*\.txt|go\.mod|go\.sum|Cargo\.toml|Cargo\.lock)$/;

const norm = (p) => String(p || '').replace(/\\/g, '/').replace(/^\.\//, '');

// Why a single path is merge:human, or null.
function humanReason(p) {
  if (p.startsWith('.github/')) return 'touches .github/ (the gates)';
  if (p.startsWith('cloud/')) return 'touches cloud/ (the rules of the workflow)';
  if (p.startsWith('preset/concepts/')) return 'touches preset/concepts/ (governs the agents)';
  if (HUMAN_FILES.has(p) || HUMAN_DIRS.some((d) => p.startsWith(d))) {
    return `touches ${p} (governs the owner's machines or the workflow)`;
  }
  const segments = p.split('/');
  if (segments.slice(0, -1).includes('hooks')) return 'touches a hook';
  if (EXECUTABLE_EXT.test(p)) return `${p} is an executable`;
  if (MANIFEST.test(segments[segments.length - 1])) return `${p} is a dependency manifest or lockfile`;
  return null;
}

const isDocsFile = (p) =>
  (p === 'README.md' || p.startsWith('docs/')) && !p.startsWith('docs/specs/') && !p.startsWith('docs/decisions/');
const isOutOfScope = (p) => p.startsWith('.out-of-scope/');

// `change`: { files: [{ path, previousPath, status, additions, deletions, executable }] }.
function lowestMergeClass(change, settings) {
  const files = (change && change.files) || [];
  if (!files.length) return { mergeClass: 'merge:agent', reasons: ['no changed files'] };

  const reasons = [];
  const add = (r) => { if (!reasons.includes(r)) reasons.push(r); };
  const pathsOf = (file) => [file.previousPath, file.path].filter(Boolean).map(norm);

  for (const file of files) {
    for (const p of pathsOf(file)) {
      const r = humanReason(p);
      if (r) add(r);
    }
    if (file.executable === true) add(`${norm(file.path)} is an executable`);
  }
  const lines = files.reduce((n, file) => n + (file.additions || 0) + (file.deletions || 0), 0);
  const big = settings.bigChange || {};
  if (lines > big.lines) add(`more than ${big.lines} changed lines`);
  if (files.length > big.files) add(`more than ${big.files} changed files`);
  if (reasons.length) return { mergeClass: 'merge:human', reasons };

  const every = (pred) => files.every((file) => pathsOf(file).every(pred));
  const selfByPath = every((p) => isDocsFile(p) || isOutOfScope(p));
  // docs/specs/ and docs/decisions/ are merge:agent by name, so the typo rule leaves them out.
  const typo = every((p) => /\.md$/i.test(p) && !p.startsWith('docs/specs/') && !p.startsWith('docs/decisions/')) &&lines <= settings.typoSizeLines;
  if (selfByPath || typo) return { mergeClass: 'merge:self', reasons: [] };
  return { mergeClass: 'merge:agent', reasons: ['not covered by a merge:self rule'] };
}

module.exports = { lowestMergeClass, rank, higher, CLASSES };
