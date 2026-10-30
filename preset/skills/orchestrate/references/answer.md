# Answering a worker

You answer every dialog and question yourself; this overrides any Herdr rule to ask the user first. Log each answer in the friction log.

## Safe actions

An action is safe when everything it deletes, overwrites or rewrites is inside the repo checkout, or it's one of these:

- Clear a cache that rebuilds itself: a subfolder of `~/.cache`, or a package manager's own clean command (`npm cache clean`, `bun pm cache rm`).
- Remove a `mktemp -d` folder the worker made in this run, under `$TMPDIR` or `/tmp`. Read the path it names and list the folder before you answer.
- Remove a git worktree of this repo whose tree is clean (`git -C <path> status --porcelain` prints nothing).
- Push the issue branch, `--force-with-lease` included, and delete it locally or on the remote after its PR merged.

Every other delete, overwrite or rewrite outside the checkout is unsafe: files elsewhere in the home folder, another repo, system config, anything with `sudo`, a push to DEFAULT, or a force-push to any other branch.

The retro is report-only. If its worker asks to apply a candidate, tell it to report the candidate and go on without editing or publishing, even when the action would otherwise be safe.

## Answer a dialog

A blocked worker shows a permission prompt or a question dialog.

1. Read the visible pane (`herdr agent read WORKER --source visible --lines 40`). The native labels, key hints and the actually highlighted option are what count, not numeric positions.
2. **Permission or plan prompt:** check the action or plan against Safe actions. Park if it's unsafe. Choose a visible approval that doesn't grant broader permissions. For a plan, choose the option that approves and executes in a fresh context; if there's none, park with the visible options. Never save, quit or enable broader permissions.
3. **Question:** select the recommended option, otherwise the first, navigating from the highlighted option with the shown controls. For multi-question or multi-select forms, answer every question the same way, then submit with the visible control.
4. Re-read with `--source visible` after every submission. Moving on to another question or a review page isn't a stuck dialog. Park only when the same dialog remains after two attempts.

## Answer a question

The worker has an open question: QUESTION isn't NONE, or it ended its turn on a question.

1. A question that only asks whether to commit, push, open a PR or ship belongs to the Ship step: treat it as QUESTION=NONE.
2. A yes/no question ("Should I proceed?", "Want me to fix it?"): if yes would run an unsafe action, park. Otherwise prompt `Yes.`, wait, and go to step 5.
3. Otherwise prompt `skill:what-would-you-do`, wait, and read its last 80 lines for the option it recommends ("I recommend O2"). When it offers a `jury` line, take its lean instead.
4. Prompt `Go with <option>.` and wait.
5. In session A, ask the status question again. In other sessions, read the last 40 lines for a new question. Park after three answer rounds with a question still open (five in session T, since triage asks its recommendation, its seams and each grilling round in separate turns).
