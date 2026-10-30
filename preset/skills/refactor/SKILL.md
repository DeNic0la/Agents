---
name: refactor
description: Refactor code at method, file or project scope without changing behavior; assesses first and stops when the code is already clean.
license: MIT
---

# Refactor

> **Repo version first:** if this repository has `.agents/skills/refactor/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

## Overview

Improve code structure without changing behavior, at **method**, **file** or **project** scope. Start by assessing whether refactoring is warranted at all: if the code is already clean, say so and stop. Edits are gated on test coverage and an approved plan, and land as small `refactor:` commits.

**What belongs elsewhere:**

- A quick clarity pass on code that already works (flatten nesting, rename, remove noise) without a plan or commits: the `code-simplification` skill.
- Module boundaries, coupling between packages, shallow modules that need deepening: an architecture problem. Say so and point the user to the `improve-codebase-architecture` skill.
- Where files live: the `improve-file-structure` skill.
- A test suite that is slow or full of low-value tests: the `improve-tests` skill.

## Philosophy

These calibrate what "good enough" means:

- **Measure the end state, not the effort.** Writing 50 lines that delete 200 is a win.
- **Simple over easy.** Simple means one concept, not intertwined. Easy means familiar.
- **Separate, don't combine.** Remove dependencies rather than add abstractions.
- **Data over abstractions.** 100 functions on one data structure beat 10 functions on 10 custom types.
- **Less total code.** If "better organized" means more lines, it's more entropy.
- **When in doubt, leave it alone.** The default verdict is Clean.

Read a reference only when the assessment turns on it:

- [references/simplicity-vs-easy.md](references/simplicity-vs-easy.md): when choosing between a familiar approach and a simpler one.
- [references/data-over-abstractions.md](references/data-over-abstractions.md): when custom types could be plain data.
- [references/design-is-taking-apart.md](references/design-is-taking-apart.md): when a coupled system needs decomposing.
- [references/expensive-to-add-later.md](references/expensive-to-add-later.md): when deciding whether something missing is worth adding now.

## Process

### 1. Determine scope

| Trigger | Scope |
|---|---|
| a method, function or symbol name | **method** |
| a file path, "this file" | **file** |
| "this project", or no target | **project** |

"The changes on this branch since `<ref>`" is file scope over each file in `git diff --name-only <ref>...HEAD`, judged on the changed code. If still ambiguous, ask with the three scopes as options.

### 2. Assess (mandatory)

Read the target and judge it against [references/assessment.md](references/assessment.md) (read it now). At project scope, rank candidates first with [references/hotspots.md](references/hotspots.md), and read the ranked areas through subagents, one per area, each returning findings rather than file contents. A project under about 1,000 source lines you can read directly.

**Planned and settled work.** Before listing any finding, read each issue the target's commits reference, with its comments. The issue tracker and triage label vocabulary are in `.agents/issue-tracker.md`. If that file doesn't exist, generate it first with the issue-tracker recipe: `.agents/references/issue-tracker.md` in the project, else `~/.agents/references/issue-tracker.md`. Drop a finding a comment already settled, and name that comment. A finding that removes an indirection (a parameter, a hook, a seam) can take out what the next planned change needs: also read the open children of those issues' parent, drop a finding a planned issue needs, and name that issue.

Give the verdict:

| Rating | Meaning | Action |
|---|---|---|
| **Clean** | No meaningful improvement | Say the code looks good and **stop**, unless the user gives a specific reason to continue. |
| **Minor** | Small improvements (naming, minor duplication) | List them, recommend applying or leaving them with the deciding reason, then ask. |
| **Significant** | Clear smells or structural issues | List findings by priority. Continue. |
| **Critical** | Major structural problems blocking maintenance | List findings urgently. Continue. |

- **Idempotent:** on code this skill already refactored, the verdict is Clean.
- **User override:** a specific reason to refactor Clean code scopes the work strictly to that request.
- **Architecture signal:** if the real problem is module boundaries, say so and point to `improve-codebase-architecture`; refactoring inside a badly bounded module won't fix it.

### 3. Plan

Method scope skips to step 4, but the test gate still applies. Draft the plan without changing any file; if the request is too ambiguous to plan safely, ask.

- File scope with 1-3 changes: a bullet list.
- File scope with 4+ changes, or project scope: the structured plan in [references/plan-template.md](references/plan-template.md).

The target state has **less or equal** total code. A plan that adds net lines without removing complexity needs rethinking. Proceed only after the user explicitly approves the plan.

### 4. Verify test coverage

Before changing code, find the tests that cover the target (test files named after the module, grep for the function in test directories) and note which behaviors they cover. Judge coverage over the code you will change, not the repository's percentage. If tests are missing or sparse, **stop and tell the user**: ask whether to write characterization tests first (the `tdd` skill, committed on their own as `test:`) or proceed without them. Business logic (money, validation, state transitions) makes this gate critical.

### 5. Refactor

Ground rules:

1. **Behavior is preserved.** Structure changes, behavior doesn't.
2. **Small steps,** verified one at a time. One concern at a time; no feature work mixed in.
3. **Bias toward deletion.** Ask what each change makes obsolete.
4. **Tests are frozen.** Don't edit test files to make them pass; only mechanical renames and moves are allowed. A test that has to change means behavior changed.
5. **Start from a clean, committed baseline,** so a revert is free.
6. **Commit each step as `refactor:`.** Never mix structural and behavioral change in one commit.
7. **Revert, don't debug forward.** When a step goes red, undo it and take a smaller one.

The moves, and where deletion goes wrong, are in [references/moves.md](references/moves.md); read it before the first edit. When one move repeats across more than a handful of sites, read [references/mechanical-sweeps.md](references/mechanical-sweeps.md) before editing by hand.

### 6. Verify

1. **No test changed.** Diff against the baseline commit: `git diff --name-only <baseline>..HEAD`, plus `git diff --name-only` for uncommitted work. Only characterization tests from step 4 may appear. An existing test modified beyond a rename or move: stop and say so.
2. **Run all tests** covering the refactored code and read the output; an exit isn't a pass. If any fail, fix the refactoring, not the tests.
3. **Re-assess** against step 2. The verdict is Clean or Minor. Note remaining Minor items, but don't start another round.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "It's ugly, so it needs refactoring" | The default verdict is Clean. Ugly and stable is often fine. |
| "I'll adjust this test, the new structure is better" | A changed test means a changed contract. That isn't a refactor. |
| "One big commit is easier to review" | Small `refactor:` commits make every step revertable. |
| "The plan adds lines but it's cleaner" | More code is more entropy. Rethink the plan. |

## Red Flags

- Edits before the assessment, the plan approval or the coverage check.
- Test files in the diff beyond renames, moves and new characterization tests.
- A commit mixing a refactor with a behavior change.
- Debugging a red step forward instead of reverting it.

## Verification

- [ ] The assessment verdict is stated, with findings or the reason it's Clean.
- [ ] The plan was approved before any edit (file and project scope).
- [ ] No existing test changed beyond a rename or move.
- [ ] Tests covering the changed code pass, with output read.
