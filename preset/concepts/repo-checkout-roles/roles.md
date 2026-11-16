# Known checkout roles

Patterns seen in more than one project. Each gives the signals and the typical checkout level. Match, then propose with evidence; never write without a yes.

## Integration

Brings in changes from an upstream vendor's core into the project's own code.

- Signals: merges from an upstream or vendor branch, conflict resolution, a long-lived integration branch, few feature commits of its own.
- Typical level: instructions on the upstream remote and branch, how to merge and resolve conflicts, what to keep from the project side. A specifics file for a tailored skill only when its recipe says this role needs one.

## Reference

Read-only. Answers questions and tracks the version in production.

- Signals: only questions and no edits, no commits, the checkout stays on one release or production branch, the owner updates it to the latest production version before asking.
- Typical level: instructions to update itself from the remote before answering, answer from the production version and never change files. `settings/claude.json` with `permissions.deny` rules for the write and edit tools.

## Development

Everyday feature work.

- Signals: feature branches, commits, pushes, edits in many files, tests run.
- Typical level: usually none. The project level is enough; add a level only for what differs from the other clones, such as a local build setup.
