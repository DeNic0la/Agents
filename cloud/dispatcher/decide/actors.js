// Who did something: the owner, the agent identity (the GitHub App's bot), the
// dispatcher (github-actions[bot]) or anyone else. Logins compare case-insensitively,
// like GitHub's.
'use strict';

const DEFAULT_DISPATCHER = 'github-actions[bot]';

function actorKind(login, settings) {
  if (!login) return 'unknown';
  const l = String(login).toLowerCase();
  if (l === String(settings.owner || '').toLowerCase()) return 'owner';
  if (l === String(settings.agentLogin || '').toLowerCase()) return 'agent';
  if (l === String(settings.dispatcherLogin || DEFAULT_DISPATCHER).toLowerCase()) return 'dispatcher';
  return 'external';
}

// The owner and the dispatcher set state and origin; agents report and the dispatcher acts.
const isTrusted = (kind) => kind === 'owner' || kind === 'dispatcher';

module.exports = { actorKind, isTrusted, DEFAULT_DISPATCHER };
