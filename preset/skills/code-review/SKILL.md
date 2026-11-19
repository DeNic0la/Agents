---
name: code-review
description: Use when a change needs a review before it merges - a branch, a pull request, work in progress, "review since that commit", "review this before I merge", "is this code safe?" - or when another skill asks to review the changes since a fixed point against a spec. Reviews the diff for spec fit, correctness, security, performance and standards, and ends on a coded verdict.
---

# Code Review

> **Repo version first:** if this repository has `.agents/skills/code-review/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

## Overview

Review the diff between `HEAD` and a fixed point, optionally against the spec it implements. Every finding gets a code, a severity and a quoted line, and the report ends on one verdict line, so the caller (the user, the `implement` skill, the `fix-findings` skill) can act on findings by code.

This skill is the process. Who reads the code is a persona: hand the reading to a fresh subagent with the `change-reviewer` persona when this session wrote the change, since an author grades their own work too kindly. Without subagents, review it yourself and say so in the report. The `code-reviewer` persona scores spec-driven phases for the `implement-task` skill and is not used here.

## When to Use

- Before merging a branch or pull request, or at the end of a piece of work.
- When another skill hands you a fixed point and a spec ("review the changes since `<commit>` against `<spec>`").
- After the `qa` skill passed: QA shows the change does what was asked, the review looks at how the code is written and how it fails.

Not for: rewriting the change (report, don't fix), style the linters already enforce, or judging code the diff didn't touch.

## Inputs

- **Fixed point** (optional): a commit, branch, tag, `HEAD~n` or pull request. Without one: the default branch when `HEAD` is on another branch; `HEAD` when the default branch has uncommitted work; otherwise ask. Name the fixed point you chose in one line.
- **Spec** (optional): a path, an issue reference, or text.
- **Prior report** (follow-up only): the last report and the commit it reviewed.

## Process

1. **Pin the diff.** Resolve `git merge-base <fixed-point> HEAD` and confirm it resolves. Make a scratch directory outside the repository (`DIR=$(mktemp -d)`). Write `git diff <merge-base> > "$DIR/diff.patch"` (this includes uncommitted changes to tracked files), then append each untracked file (`git ls-files --others --exclude-standard`, each as `git diff --no-index /dev/null <file>`). Note the commits with `git log --oneline <fixed-point>..HEAD`. Read the diff from the file, in ranges when it's long: a diff printed to the terminal can be cut short. An empty diff or a bad ref stops here.
2. **Find the spec**, first match wins:
   1. the spec the caller passed;
   2. issues referenced in the commit messages, read from the issue tracker. The issue tracker and triage label vocabulary are in `.agents/issue-tracker.md`. If that file doesn't exist, generate it first with the issue-tracker recipe: `.agents/references/issue-tracker.md` in the project, else `~/.agents/references/issue-tracker.md`;
   3. a spec file matching the branch or feature (`docs/`, `specs/`, `.specs/tasks/`);
   4. the request settled in this conversation, written to `$DIR/spec.md`;
   5. ask the user. If there is none, the Spec axis reports "no spec available".
3. **Find the standards:** `AGENTS.md`/`CLAUDE.md`, `CONTRIBUTING.md`, any coding-standards file, `.agents/definition-of-done.md` and `.agents/testing-patterns.md` when present, the domain-driven-design concept (`.agents/concepts/domain-driven-design/CONCEPT.md`, or under `~/.agents/`), `GLOSSARY.md` and ADRs in the touched area. A documented project rule beats any generic one.
4. **Run the checks** the project has: build, lint, type check, tests. A red check is a finding (P0 when the change caused it). Reuse a result only when the code, dependencies and configuration it ran on are unchanged.
5. **Review each axis** separately, reading the code around each hunk (callers, tests, configuration). Read [references/axes.md](references/axes.md) now for what each axis checks and the severity scale. The axes and their code prefixes:
   - `SP` Spec: missing, partial or wrong requirements, and unrequested behavior.
   - `CO` Correctness: logic, edge cases, error handling, concurrency, tests for the changed behavior.
   - `SE` Security: untrusted input, authorization, secrets, unsafe dependencies.
   - `PE` Performance: queries, unbounded work, leaks, hot paths.
   - `ST` Standards: the project's documented rules, maintainability, operations.
6. **Verify every P0-P2 finding** before reporting it: reopen the quoted line, or run the trigger in a scratch copy, and check that no caller, guard or framework default already handles it. When a subagent did the reading, you do this check. A finding that doesn't survive goes on the axis's "Dropped" line with the reason; one you can't settle stays, labelled `unverified`.
7. **Report** in the format in [references/output-template.md](references/output-template.md) (read it now). Number findings per axis (`SP1`, `CO1`, `CO2`, ...). Don't merge or rerank findings across axes: each axis can fail on its own. Delete `$DIR`. Change no code and post no comments unless asked.

**Follow-up review:** use the last reviewed commit as the fixed point and read the prior report. Review the fix diff and the behavior it can reach; earlier findings keep their codes and dispositions, new ones get the next free number.

## Finding Rules

- **Quote the line.** Every finding cites `file:line` (the file's own line number, from the `+` side of the hunk) and quotes it. A missing thing quotes where it should be; a race quotes both sides.
- **Lead with the effect** a user or caller sees, then give one fix. When the fix depends on something you can't see, state the assumption.
- **Skip:** code the diff didn't change (unless it makes an old bug newly reachable), problems already handled elsewhere, what a linter or type checker enforces, "consider adding X" with no concrete failure, and choices the code or spec marks as intentional.
- **Zero findings is a valid report.** Say so in one line.

## The Verdict

The last line of the report, always in this form:

`Verdict: <Not ready | Ready with fixes | Ready> - <codes with severity, e.g. SP1 P1, CO2 P0, ST1 P3, or "no findings">`

- Any verified P0: **Not ready**.
- Otherwise any verified P1, or an axis that couldn't be completed (a check that couldn't run, a missing spec the caller said exists): **Ready with fixes**.
- Otherwise: **Ready**. P2 and P3 findings stay listed and open until fixed or declined.

The verdict is a rule over severities, not a judgment of the worst finding.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The tests pass, so it's correct" | Tests check what their author expected. The spec axis checks what was asked. |
| "I wrote it, I'll review it myself" | Use a fresh subagent. Without one, say the review isn't independent. |
| "This finding is obvious, no need to quote the line" | An unquoted finding can't be checked and doesn't move the verdict. |
| "One P0 makes the rest irrelevant" | Report every axis. The caller fixes them all. |

## Red Flags

- Findings without `file:line` and a quoted line.
- Findings on code the diff didn't touch.
- No spec looked for, or the Spec axis silently skipped.
- The report has no verdict line, or the verdict doesn't follow the severity rule.
- The review edited code.

## Verification

- [ ] The fixed point, commit list and spec source are named in the report.
- [ ] The project's checks ran, or the report says which couldn't.
- [ ] Every finding has a code, a severity and a quoted line; every P0-P2 was verified or labelled.
- [ ] The report ends on the verdict line.
