---
name: implement-spec
description: Build a whole spec and its tickets through parallel worktrees on one integration branch, ready for a single pull request.
license: MIT
---

# Implement spec

> **Repo version first:** if this repository has `.agents/skills/implement-spec/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

Implement a spec and all its tickets on one **integration branch**, ready for a single pull request. You coordinate: workers build tickets in their own git worktrees, and you integrate, verify and report. Use subagents and git worktrees; no terminal multiplexer is needed. Keep communication sparse: pass pointers to the spec, tickets, commits and evidence, not their contents.

**Which skill:** for one ticket at a time, use the `implement` skill. To work a whole issue queue unattended in parallel lanes, use the `orchestrate` skill. For a `.specs/` task planned by `plan-task`, use `implement-task`.

The issue tracker and triage label vocabulary are in `.agents/issue-tracker.md`. If that file doesn't exist, generate it first with the issue-tracker recipe: `.agents/references/issue-tracker.md` in the project, else `~/.agents/references/issue-tracker.md`.

## 1. Pin the spec and the task graph

Read the spec, every child ticket and their blocking relationships as the tracker guide describes. If the spec has no implementation tickets, tell the user to break it up with the `to-tickets` skill first, and stop.

Build a **task graph** with ticket states `pending`, `running`, `integrated` and `blocked`. Keep it, with worker assignments, branch names, commit SHAs and evidence paths, in the OS temp directory, outside the repository.

- A closed ticket counts as integrated only after you verify its implementation is on the integration branch.
- Surface contradictory criteria before any implementation.
- An open blocker outside this spec stays blocked until its work is merged into the default branch. A dependency cycle needs a user decision.

The **frontier** is the pending tickets whose prerequisites are all on the integration branch. A ticket becomes integrated in this run once step 3 verifies its merge, which makes its dependents eligible even though its tracker issue stays open. An empty frontier with unfinished tickets and no running worker is blocked, not done: report the blocking edges and stop.

## 2. Prepare the integration branch

Find the default branch and record its current commit as `BASE`, the fixed point for the final QA and review. Create a branch from it, named by the repo's convention, in a dedicated worktree. Preserve the user's existing work and branches. If the user supplied an existing integration branch, inspect it, record its merge-base with the default branch as `BASE`, and reconcile the graph against its actual commits before assigning work.

Create each worker's worktree on its own new branch from the current integration tip. Verify that starting commit before dispatch; if it's wrong, keep the worktree and correct the assignment instead of resetting work. Respect the number of subagents you can run at once. Without subagents, work one ticket at a time with the same worktree and verification steps.

## 3. Build and integrate the frontier

Before dispatching parallel workers, read `.agents/references/parallel-resources.md` (or `~/.agents/references/parallel-resources.md`) and record resource ownership with the task graph. Dispatch frontier tickets only where their edits and mutable resources can proceed independently. Give each worker its ticket, the relevant spec sections, its worktree, its starting SHA, its resource assignment and this contract:

- Work only in the assigned worktree. Use the `tdd` skill at the agreed test seams. For a refactor without tests, first pin current behavior with characterization tests in a separate commit.
- Use focused checks during the test cycles. Before committing a finished behavior, complete the repository's full required gate. Reuse passing checks only when their files, dependencies, configuration and environment are unchanged.
- Commit the work with the ticket reference. Report the commit SHA, which acceptance criteria are covered, check results, evidence paths and any open question. Leave tracker issues open; the coordinator integrates the branch.

You own a **single merge slot**. When a worker finishes, hold the slot while it brings the latest integration tip into its branch. Resolve conflicts in that worktree with the `resolving-merge-conflicts` skill, then rerun the checks the merge invalidated, including the full gate on the combined code. A failed check or an open question keeps the ticket out of the integration branch.

Wait until the worker and its subagents have stopped writing. In the integration worktree, merge the verified worker commit with `git merge --ff-only`. If the integration tip moved, sync and verify the worker again before retrying; never force the branch forward. Verify the reported commit is now an ancestor of the integration tip, record its evidence, mark the ticket integrated and release the slot. Recompute the frontier and dispatch the newly eligible tickets. A merge into this branch doesn't close a tracker issue.

After the first successful merge, open a draft PR only if the tracker closes work through PRs or the user asked for one. Target the default branch, reference the spec and every ticket it will finish, and write the body with the `pr` skill. Keep one PR for the integration branch.

## 4. Verify the whole spec

Once every ticket is integrated, run the full required gate on the final integration commit, reusing unchanged valid results. Where providers and consumers evolve independently, first find the spec's authoritative contract and its owner, and check real serialized responses and consumer fixtures against that same artifact, including errors, nulls, mocks and feature-flag paths. A matching mock or a separately declared type alone doesn't verify the boundary. Then, in order:

1. **QA** in a fresh subagent with the `qa` skill, against `BASE` and the whole spec, cross-ticket behavior included. Pass the preview details, and tell it to report without editing the repository or the tracker. Without subagents, run it yourself and state the independence gap. Fix each fail through `tdd`, commit, and repeat QA with the prior report, tested SHA and fix diff. Keep evidence in the OS temp directory.
2. **Review** with the `code-review` skill against `BASE`, with the whole spec and the ticket references. Wait for its overall verdict; one reader's output is not the review.
3. **Resolve** every verified finding at every severity, following the follow-up verification section of the `implement` skill. A fix that contradicts the spec or needs an external change goes to the user; a finding is settled only by a fix or an explicit user decision.

**Ready** means the whole spec is integrated, the required checks pass, QA has no fails or blocked scenarios, every review axis completed, and every verified finding is fixed or settled by the user. If a check can't run or work stays blocked, keep the PR in draft and report the exact gap. Update the PR evidence with the final commit and verdicts before marking it ready.

## 5. Hand off and clean up

Leave the integration branch, its worktree and any PR in place for shipping. Keep the spec and ticket issues open until the work merges. When it's ready, tell the user to ship it with the `ship-pr` skill; this skill doesn't merge.

Before removing a worker worktree, keep its reports and session references, confirm the worker and its subagents have exited, verify a clean tree, and verify all its commits are reachable from the integration branch. Remove only worktrees this run created that meet those conditions. Keep dirty, unmerged or failed worktrees and name them in the hand-off; never force removal. The same applies when a run stops early.

Report the integration branch and commit, the PR URL if any, integrated and blocked tickets, QA and review verdicts, kept evidence and remaining worktrees. Before the user clears the session, suggest a retrospective with the `retro` skill.

## Supporting files

- `.agents/references/parallel-resources.md` (or `~/.agents/references/parallel-resources.md`): read before dispatching workers in parallel.

Adapted from Matt Pocock's [implement-spec at v1.3.1](https://github.com/mattpocock/skills/blob/v1.3.1/skills/engineering/implement-spec/SKILL.md).
