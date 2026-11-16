// Reads and checks cloud/settings.json. The amounts live only in that file.
'use strict';

const CAP_PATHS = [
  ['monthlyUsd'],
  ['perIssueUsd', 'direct'],
  ['perIssueUsd', 'lean'],
  ['perIssueUsd', 'full'],
  ['perRunUsd', 'triage'],
  ['perRunUsd', 'scout'],
];

const dig = (obj, path) => path.reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj);
const isAmount = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0;

// CW-80: the caps that aren't set to a positive amount.
const unsetCaps = (settings) => CAP_PATHS.filter((p) => !isAmount(dig(settings.caps, p))).map((p) => `caps.${p.join('.')}`);

// Problems that make the file unusable. Unset caps are not among them: the dispatcher
// still runs and repairs labels, it only starts no session (CW-80).
function settingsProblems(settings) {
  const problems = [];
  if (!settings || typeof settings !== 'object') return ['settings must be a JSON object'];
  for (const key of ['owner', 'agentLogin']) {
    if (typeof settings[key] !== 'string' || !settings[key].trim()) problems.push(`"${key}" must be a GitHub login`);
  }
  if (!['dry-run', 'live'].includes(settings.mode)) problems.push('"mode" must be "dry-run" or "live"');
  if (!Number.isInteger(settings.parallelImplementations) || settings.parallelImplementations < 1) {
    problems.push('"parallelImplementations" must be a whole number of at least 1');
  }
  if (!Number.isInteger(settings.reviewRounds) || settings.reviewRounds < 1) problems.push('"reviewRounds" must be a whole number of at least 1');
  if (typeof settings.warningLevel !== 'number' || settings.warningLevel <= 0 || settings.warningLevel >= 1) {
    problems.push('"warningLevel" must be a share between 0 and 1');
  }
  return problems;
}

module.exports = { unsetCaps, settingsProblems, CAP_PATHS };
