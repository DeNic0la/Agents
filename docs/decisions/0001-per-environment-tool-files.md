# 0001 Per-environment tool files

- **Status:** accepted, implemented (2026-11-16)

## Context

`~/.claude/settings.json` is a link into this repo. The work laptop needs work-only permission rules and settings; the private machine doesn't. With one shared file, every edit on one machine changed the other, and `agents update` hit merge conflicts in a live, linked settings file.

## Decision

Tool files can differ per environment. `tools/environments/<env>/<tool>/` mirrors `tools/<tool>/`; a machine names its environment in `~/.agents/local/environment` (one plain word); the installers link the environment's file in place of the default one. Replace-only: an environment can only replace files that exist by default. An invalid name or a missing folder prints a warning and falls back to the defaults.

## Rejected

- **Merge settings at install time:** settings would no longer be a live link, so edits made by the tool wouldn't flow back to the repo.
- **Keep work settings outside the repo:** they'd be unversioned and lost with the machine.

## Consequences

- Each environment's files are committed like everything else, so they must stay free of secrets, local folder names and absolute paths.
- A key added to the default file doesn't reach an environment; both files need it (as with `skillOverrides`).
