---
name: build
description: Pick the skill for building a change, from one fix to a whole spec.
license: MIT
metadata:
  router: "true"
---

# Build

A router: it names the skills for one area of work and when to reach for each. It does none of the work itself.

1. Take what the user wants from the argument, else from the conversation. If it's still unclear, ask one question.
2. Pick the one skill below that fits, using **Choosing**, and say why in one line.
3. Hand over:
   - Invoked by `agent`: use that skill now, on what the user asked.
   - Invoked by `user`: only the user can start it. Tell them its name and what to pass it, then stop.
   - Not available in this setup: say so, and name the closest skill that is.

If nothing here fits, name the router that does: `think`, `design`, `planning`, `improve`, `ship`, `agent-setup`, `data`, `product`, `support`, `productivity`.

## Choosing

- A spec, tracker tickets or issues, one at a time: `implement`. A whole spec in parallel worktrees: `implement-spec`. The issue queue, unattended: `orchestrate`.
- A planned `.specs/` task: `implement-task`. A task that needs each step checked before the next: `do-in-steps`.
- One feature or fix, test-first: `tdd` (the build skills above use it too).
- Framework or library code: `source-driven-development`. A new package or tool: `dependency-vetting` before installing it. Docs for a named reader: `documentation`. A file in the wrong format: `file-conversion`.

## Skills

| Skill | Use it to | Invoked by |
|---|---|---|
| implement | build a spec, tracker tickets or issues test-first, then QA, review and fix it on a branch | user |
| implement-spec | build a whole spec through parallel worktrees on one integration branch, ready for one PR | user |
| orchestrate | work through the issue queue unattended in parallel Herdr lanes and git worktrees | user |
| implement-task | implement a planned task one agent per step, with one code review per phase and a definition-of-done check | user |
| do-in-steps | run a task as dependent steps, each checked by an independent judge before the next | user |
| tdd | build or fix test-first at agreed seams, finishing with a mutation check | agent |
| source-driven-development | ground framework code in the official docs and cite them | agent |
| dependency-vetting | verify a package or tool is authentic and current before installing, adding or recommending it | agent |
| documentation | write or update READMEs, API references, runbooks and guides for a named reader, checked against the code | agent |
| file-conversion | convert a local file between image, audio, video, document and data formats with installed tools only, and verify the result | agent |
