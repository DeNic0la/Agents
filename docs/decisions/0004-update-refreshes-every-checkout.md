# 0004 `agents update` refreshes every checkout

- **Status:** accepted, implemented (2026-11-16)

## Context

`agents update` refreshed the machine and only the checkout it was run in. Other checkouts stayed on old copies until someone ran `agents sync` in each. New preset items never reached a checkout unless someone noticed them.

## Decision

`setup`, `add`, `remove` and `sync` keep a machine-local list of the checkouts that use the preset. `update` refreshes every listed checkout in a child process, lists each once as its git top level, skips a missing folder or a checkout without a manifest without dropping it, keeps going when one fails and exits with an error at the end, and names the items its pull committed to the preset that a checkout doesn't use, with the `agents add` command for them. It adds nothing by itself.

## Rejected

- **Scan the disk for checkouts:** slow and arbitrary.
- **Add new items automatically:** some items are deliberately not used in some repositories.

## Consequences

- Windows and WSL have separate homes, so each keeps its own list.
- The list is machine-local state in `~/.agents/local/` (renamed from `projects` to `checkouts` to free `projects/` for the project-level store; `agents` moves the old file on first use, see [the spec](../specs/tailoring-levels.md)).
