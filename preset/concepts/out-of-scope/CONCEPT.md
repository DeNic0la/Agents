---
name: out-of-scope
description: When triaging an issue or PR, or when a maintainer rejects an enhancement - check `.out-of-scope/` for a prior rejection of the same concept and surface it, and record each new rejection there so the reasoning survives and the request isn't re-litigated.
---

# Out of scope

Applies to every agent, in any tool, that triages issues or pull requests or handles a decision to reject a feature request.

The `.out-of-scope/` folder in a repo holds lasting records of rejected feature requests. It has two jobs:

1. **Institutional memory:** why a feature was rejected, so the reasoning isn't lost when the issue is closed.
2. **Deduplication:** when a new request matches a prior rejection, the earlier decision is surfaced instead of argued again.

There is one Markdown file per **concept**, not per issue, such as `.out-of-scope/dark-mode.md`. Every request for the same thing is listed in that one file.

## Rules

1. **Check before triaging.** When you evaluate a new issue or enhancement PR, read every file in `.out-of-scope/` (if the folder exists) first.
2. **Match by concept, not keyword.** "Night theme" matches `dark-mode.md`.
3. **Surface a match, don't decide it.** Tell the maintainer, for example: "This is similar to `.out-of-scope/dark-mode.md`. We rejected this before because <reason>. Do you still feel the same way?" Then follow their answer:
   - **Confirm:** add the new issue to that file's "Prior requests" list, then close it.
   - **Reconsider:** delete or update the file, and the issue goes through normal triage.
   - **Disagree:** they're related but distinct, so normal triage continues.
4. **Write only for rejected enhancements.** Record an enhancement issue or PR here only when the maintainer rejects it as `wontfix`. Never record bugs. Never record something closed because it's **already implemented**: that's a built feature, and recording it would poison later checks with false rejections. Point to where the feature lives in the closing comment instead.
5. **Recording a rejection:**
   1. Check whether a file for the concept already exists.
   2. If it does, append the issue to its "Prior requests" list.
   3. If not, create one with the concept name, the decision, the reason and the first prior request.
   4. Comment on the issue with the decision and mention the `.out-of-scope/` file.
   5. Close it with the `wontfix` label.
6. **Reasons are substantive and durable.** Say why, not just "we don't want this". "We're too busy right now" is a deferral, not a rejection, and doesn't belong here.
7. **Changing your mind means deleting the file.** When the maintainer reverses a rejection, delete the file. Old issues stay closed as historical records. The issue that triggered the change goes through normal triage.

The decision is always the maintainer's. Never reject a request or create an out-of-scope file on your own judgment.

## Supporting files

- [file-format.md](file-format.md): read when creating or updating a file in `.out-of-scope/`.
