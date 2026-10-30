# Continue and refine

## `--continue`

Resume an interrupted run.

1. If the task file is still in `todo/`, move it to `in-progress/`.
2. A step is complete when its Parallelization Overview row carries `[DONE]`. A phase is complete when its heading carries `[REVIEWED]` or `[REVIEWED-SKIPPED]`; treat `[REVIEWED-SKIPPED]` as finished, or you'd re-run a review the user suppressed.
3. The resume phase is the first phase marked neither. Dispatch its steps not marked `[DONE]`, in dependency order, then review it as normal.
4. If all its steps are done but it was never reviewed, review it now (or, with `--skip-reviews`, mark it `[REVIEWED-SKIPPED]` and move on).

## `--refine`

The user changed project files themselves and wants the affected phases re-verified, keeping their changes.

1. **Find the changed files.** Compare `git diff --cached --name-only` and `git diff --name-only`:
   - both staged and unstaged changes: use the unstaged ones (`git diff --name-only`), the newest work;
   - only one kind: use `git diff HEAD --name-only`;
   - none: say "No project changes detected. Edit files first, then run --refine." and stop.
2. **Map files to steps.** This is the one time you may read sub-task files, and only their `#### Expected Output` and `#### Subtasks` sections, which record each step's files. Build `changed file → step → phase`. If nothing maps, list the changed files and suggest verifying manually or running without `--refine`.
3. **Re-verify** from the earliest affected phase through the last, since later phases build on it. Review each phase as normal; on a failure, follow `fixing.md`, passing the user's diff to every fix agent so they build on the user's changes instead of overwriting them.
