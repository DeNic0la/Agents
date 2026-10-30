---
name: implement
description: Build a piece of work from a spec, tracker tickets or triaged issues, test-first, then QA, review and fix it on its own branch.
license: MIT
---

# Implement

> **Repo version first:** if this repository has `.agents/skills/implement/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

Implement the work the user gives you: a spec, tickets or issues from the tracker, or the decisions settled in this conversation. Build it test-first in small commits, then QA it, review it and fix what the review finds. The issue stays open until the work merges.

**Which skill:** use this one for work described in the issue tracker, a spec file or the conversation. For a task planned by `plan-task` in `.specs/tasks/todo/`, use the `implement-task` skill instead. For a whole spec with many tickets on one integration branch, use the `implement-spec` skill.

The issue tracker and triage label vocabulary are in `.agents/issue-tracker.md`. If that file doesn't exist, generate it first with the issue-tracker recipe: `.agents/references/issue-tracker.md` in the project, else `~/.agents/references/issue-tracker.md`.

## 1. Pin the work

- **Tickets or issues you're given:** read each one in full (body and comments) as the tracker guide describes. When a ticket names a parent, read only the parent's sections the ticket points to or the work needs.
- **"The next ticket" of a parent spec:** take the first **frontier** ticket: an open child of that parent with no open blockers and the `ready-for-agent` label, lowest number first. A ticket with no code left (every criterion is already on the default branch, or only a human step such as a release remains) is not frontier: name it and what it waits on, then take the next one. With no frontier ticket, say so and stop. Name the ticket you picked before you start.
- **No spec or issue:** the decisions settled in this conversation are the spec. Write them to a file in the OS temp directory, so QA and review can check against them.
- **A pull request:** check out its head branch and push your commits back to it. If the push is refused (a fork that doesn't allow maintainer edits), stop and tell the user.

When two criteria can't both hold (for example, a data shape the ticket names against "no test changes"), ask the user which wins before writing code, and post the answer on the issue. A conflict resolved in silence comes back as a review finding.

Record the starting commit with `git rev-parse HEAD`. On the default branch, create a branch named by the repo's convention.

## 2. Build in slices

- Use the `tdd` skill at **pre-agreed seams**: the seams the spec or issue names, the seams of code you refactor, and the seam of a review finding you fix.
- A **slice** is one finished behavior or one fixed finding; it can take several test cycles. Use focused checks during the cycles. Before committing a slice, complete the repository's full required gate. Reuse checks already green on the same files, dependencies, configuration and environment; run only what's missing or invalidated.
- Chain the checks and the commit on their exit statuses (`&&`), so a red check stops the commit. Run checks bare, never through an output filter, and wait for background checks to finish.
- Commit each slice to the branch, referencing each issue it implements (`#<n>`, or the file path on a local tracker). Small commits, not one per ticket.

**Refactors** (the work itself, or a review fix that only restructures) keep behavior the same:

- Code with no tests: pin its current behavior first with characterization tests (the `tdd` skill), committed on their own as `test:`.
- Commit the structural change as `refactor:`, leaving test files alone except for a mechanical rename or move. A test that has to change means behavior changed.
- Tests that the design agreed are superseded by tests at a deepened interface are deleted in their own commit, not a `refactor:` one, once the new tests are green.
- When a step goes red, revert it and take a smaller step.

## 3. QA in a fresh context

This context wrote the code and shares its blind spots. Dispatch one subagent that uses the `qa` skill, with the starting commit as the fixed point and the spec path or issue as the request. Give it no implementation summary and no expected verdict. Include a running preview's start command, URL, worktree, process ownership and temporary config paths when you have them. Tell it to report back without changing repository files or filing issues. Without subagents, use `qa` yourself and say the run wasn't independent.

Fix each fail test-first with `tdd`, commit the fix like the work, and QA again, passing the prior report, its tested commit, the fix diff and the earlier fails with their steps. Repeat until no fail is left. Name each blocked scenario and what it needs in your final message.

## 4. Review and fix

Use the `code-review` skill on the changes since the starting commit, with the spec or issue as the spec. Its verdict line doesn't end this skill: go on in the same turn. A single reader's output is input to the review, not a finding to fix.

Fix every verified finding at every severity on this branch, committed like the work. Two kinds go to the user as a question instead: a fix that would reverse something the spec asked for, and a cause outside this repo (an agent, service or library working as designed). A finding you judge not worth fixing also goes to the user. Read [references/finding-questions.md](references/finding-questions.md) before asking one. Post each answer and its reason on the issue: later sessions read the issue, not this chat.

Then run the follow-up verification below.

## Follow-up verification

A fix that changes behavior (a bug or a spec gap) goes test-first through `tdd`. When the review asks for both kinds, fix the structural findings first as `refactor:` commits, then the behavior fixes on top. Once fixes are committed:

1. Run follow-up QA on the affected behavior. A test-only fix needs the affected tests and the follow-up review, not new browser QA of unchanged runtime code.
2. Use `code-review` on the fix commits only (since the commit before the first fix), passing the prior reports and their checked commits. Every later round uses the previous reviewed commit as its fixed point, not the branch base.
3. Fix what it reports the same way.

## 5. Finish

Leave each issue you implemented open: a closed issue unblocks the tickets waiting on it, so it closes only when its commits merge into the default branch. The `ship-pr` skill closes it. A pull request stays open for a human to merge.

The work is **ready to ship** only when every review axis completed, every verified P0 and P1 finding is fixed, and every other verified finding is fixed or has a disposition the user explicitly accepted. An unanswered question blocks readiness.

Your final message quotes the verdict line of each review and names every finding code with how it ended: the commit that fixed it, or the question that asks it.

## Supporting files

- [references/finding-questions.md](references/finding-questions.md): read before asking the user about a review finding.
