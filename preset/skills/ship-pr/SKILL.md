---
name: ship-pr
description: Commit, push, open a pull request, repair CI within bounded attempts, then squash merge and verify post-merge workflows.
license: MIT
compatibility: Requires git and an authenticated gh CLI (GitHub).
---

# Ship PR

> **Repo version first:** if this repository has `.agents/skills/ship-pr/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

Commit every change, push, open a pull request, and merge it once CI is green. Never commit onto the default branch. Arguments, if any, hint at what the change is about. They aren't the message.

The issue tracker and triage label vocabulary are in `.agents/issue-tracker.md`. If that file doesn't exist, generate it first with the issue-tracker recipe: `.agents/references/issue-tracker.md` in the project, else `~/.agents/references/issue-tracker.md`.

Keep a **shipping record** outside the worktree: the original and repair PRs, branches, checked commits, run IDs and attempts, logs, QA and review reports, and the recovery counters. Keep it across restarts and follow-up PRs.

Start from the session's working directory. When this session's work sits in another worktree (`git worktree list`), run every step there with `git -C <path>` and leave the working directory's changes alone.

## Process

1. **Read everything.** Run `git status --short --branch`, `git diff HEAD --stat`, `git log --oneline origin/HEAD..HEAD` (the branch commits), `git log --oneline -10`, and `gh api 'repos/{owner}/{repo}/actions/permissions' --jq .enabled` (whether GitHub Actions is enabled). Read the full diff (`git diff HEAD`), every untracked file `git status` lists and, when there are branch commits, their diff (`git diff origin/HEAD...HEAD`) before writing anything. Read each issue the branch commits reference (`#N`) as `.agents/issue-tracker.md` describes: its comments hold the triage brief.
2. **Scan for secrets.** Look for credentials, tokens, private keys and any value that doesn't belong in this repository. If you find one, stop, commit nothing, and report what you found.
3. **Leave the default branch.** If the current branch is the default branch, create and switch to `type/kebab-description`, where `type` is the Conventional Commit type you're about to use and the description comes from the change. Branch commits move with it; then run `git branch -f <default> origin/<default>` so the default branch matches its remote and the merge can fast-forward it.
4. **Stage** with explicit paths rather than `git add -A`. An untracked directory that holds a local tool's state (an index, cache or database, such as `.codegraph/`) belongs in the root `.gitignore`, even when it ships its own `.gitignore`: add its path there and stage that line with the rest.
5. **Write the message** as a Conventional Commit, `type(scope): description`, matching the subject style already in `git log`.
6. **Commit and push.** Run `git push -u origin HEAD` with a 10-minute timeout: a pre-push hook can run the whole test suite. Use the normal, unchanged hooks. If they must run in a scratch copy, install that copy's dependencies first.
7. **Open the PR** with `gh pr create`, or update the existing PR for this branch after a repair. The squash merge makes the title the one commit on the default branch, so title and body cover the whole branch: your commit's subject when it's the branch's only commit, otherwise one Conventional Commit subject spanning every commit. Use the repository's pull request template if it has one; otherwise write the body with the `pr` skill.
8. **CI gate.** Inspect the PR checks and commit statuses at the exact head, external CI included, and use `gh pr checks --watch` until they settle. It exits non-zero on failure, so allow that and read the result. Actions disabled means only that GitHub Actions is off; external checks may still apply. If no checks appear, wait 20 seconds and query again. Report "no CI" only when the repository configuration and required-check settings show that none applies. A missing expected check or unreadable configuration is blocked, not green.
9. **Merge on green.** Run `gh pr merge <PR URL> --squash --match-head-commit <checked-head>`, then confirm `gh pr view <PR URL> --json state,mergedAt` reports `MERGED`. Merge only with every required check green on that exact head, and keep branch protections in place. When a check fails, read [references/ci-recovery.md](references/ci-recovery.md) and follow it, then return to the CI gate for the repaired head. A recovery that stops leaves the PR unmerged, with its evidence and the remaining blocker.
10. **Close the issues.** Close each still-open issue the branch commits reference (`#N`, or a local issue path) with the comment `Merged in <PR URL>.`, as `.agents/issue-tracker.md` describes. The merge is what finishes it, and a closed issue unblocks the issues waiting on it.
11. **Verify post-merge workflows.** Resolve the merge SHA and find the CI and deployment workflows it triggers from the repository configuration, chained workflows included. Inspect their runs for that exact commit with `gh` and wait for them to settle. If an expected run hasn't registered, wait 20 seconds and query again; a run that's still missing is blocked, not success. Record intentionally skipped workflows, or the absence of any post-merge workflow, separately. A failed run follows [references/ci-recovery.md](references/ci-recovery.md), including its post-merge procedure. A pending approval or an unavailable external service stays blocked; never bypass it.
12. **Report** every original and repair PR URL and merge SHA, the issues closed, CI outcomes and remaining coverage gaps, the recovery counters, retained branches, the shipping record path, and the `.gitignore` line from step 4 if you added one. Keep a successful original merge apart from blocked post-merge verification.

Keep the branch and worktree after the merge; local cleanup is the caller's job. When an orchestrating agent runs this skill, tell it right away about a failed or blocked default-branch run, so it can hold further merges.

To commit without pushing or opening a PR, use the `commit` skill instead.
