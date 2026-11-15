---
name: ship
description: Pick the skill for checking a change, getting it merged and released, and running it.
license: MIT
metadata:
  router: "true"
---

# Ship

A router: it names the skills for one area of work and when to reach for each. It does none of the work itself.

1. Take what the user wants from the argument, else from the conversation. If it's still unclear, ask one question.
2. Pick the one skill below that fits, using **Choosing**, and say why in one line.
3. Hand over:
   - Invoked by `agent`: use that skill now, on what the user asked.
   - Invoked by `user`: only the user can start it. Tell them its name and what to pass it, then stop.
   - Not available in this setup: say so, and name the closest skill that is.

If nothing here fits, name the router that does: `think`, `design`, `planning`, `build`, `improve`, `agent-setup`, `data`, `product`, `support`, `productivity`.

## Choosing

- Does it work for its user: `qa`. Is the code right: `code-review`. Then apply what either found: `fix-findings`.
- Vulnerable dependencies, leaked secrets, image or IaC issues: `security-scan`.
- Just commit: `commit`. Just the PR description: `pr`. All the way to a verified merge: `ship-pr`. A merge or rebase stopped on conflicts: `resolving-merge-conflicts`.
- A release coming up: `deploy-checklist`. Production is broken: `incident-response`. Telling the team what happened: `standup`.

## Skills

| Skill | Use it to | Invoked by |
|---|---|---|
| qa | run the changed program the way its user would and check each requested behavior | agent |
| code-review | review the changes since a fixed point against an optional spec, ending on a coded verdict | agent |
| fix-findings | apply the findings of the most recent review, audit or check in this session | user |
| security-scan | scan for vulnerable dependencies, leaked secrets and image or IaC issues, then triage and propose fixes | user |
| commit | commit every change on the current branch with a Conventional Commit message, after a secrets scan | user |
| pr | write a fast-to-review PR body: summary diagram, before/after evidence, merge danger | agent |
| ship-pr | commit, push, open a PR, repair CI within a fixed budget, squash merge and verify post-merge workflows | user |
| resolving-merge-conflicts | resolve a stopped merge or rebase from the intent of both sides, then run checks and finish | agent |
| deploy-checklist | build and check a pre-deploy checklist with rollback triggers for one release | agent |
| incident-response | triage an incident, post status updates, mitigate, and write a blameless postmortem | agent |
| standup | turn recent commits, PRs, tickets or notes into a yesterday / today / blockers update | agent |
