# The mutation check

Read before the "mutate before you finish" rule of the tdd skill.

## What to mutate

Break every file this run changed in small, realistic ways, one at a time: a wrong constant or argument, the wrong branch, a missing side effect, an empty return, a missing check for empty, zero, null or bad input. Run the tests for that seam, then undo the change.

- Each mutation must turn at least one test red, with an assertion failing for that break. A mutation that only panics or fails to compile proves nothing: pick another.
- Change the logic and leave every import and variable in use (`false && cond` in place of a deleted `cond`, `x += 0` in place of `x = x`). A compiler that rejects unused names, or a vet step that rejects self-assignment, reports the mutation `broken`.
- A mutation that stays green marks behavior no test protects. Add the test that turns it red. If no input reaches the mutated code, or the mutation changes no observable result (an equivalent mutation), delete that code: the red rule admits no branch a failing case doesn't run.
- An equivalent mutation of code that has to stay (a `==` no input tells apart from `>=`, a value the output never shows) is a **survivor**: write down the input you tried and why none can tell them apart, and list it by name in your output.
- Rewriting the code so the mutation no longer applies is a behavior change: it needs its own red case, and the rewritten code is mutated again.

The check is done when every mutation is red or a listed survivor.

## Running `scripts/mutate.sh`

It needs a POSIX shell, Perl and standard Unix tools (`awk`, `cat`, `cp`, `date`, `head`, `mktemp`, `rm`).

```sh
sh <this skill's directory>/scripts/mutate.sh [-b BUILD] [-t SECONDS] TEST MUTATION...
```

Call it through `sh`, because an installed copy can lose its execute bit.

**Mutation files.** Each MUTATION is a file: the target path on line 1, then the exact text to find, a line holding only `====`, then the replacement. Only the first match is replaced. Write them into a `mktemp -d` directory, one heredoc per file.

**Baseline.** It first runs BUILD and TEST on the unchanged code and exits 2 when either fails, since every mutation would then read red. Fix TEST until it passes there. TEST runs through `sh`, so quote a `|` in a `-run A|B` pattern.

**Results**, one line per mutation:

- `test-failed`: TEST failed. Its output goes to stderr with the mutation name. Inspect it before counting the mutation red: find the assertion and confirm it failed for the intended break. A runtime error or failed import isn't red. Missing diagnostics mean rerunning with a test command that shows them.
- `GREEN`: TEST passed; no test protects that behavior.
- `timeout`: TEST ran past the limit and was killed with every process it started. Count a timeout on a mutation that removes a loop or recursion guard as red: never ending is the break it names.
- `broken`: the `-b` build step failed. Proves nothing.
- `missing`: the text to find wasn't in the file.

Exit 0 means every TEST failed, not that each failed for the right reason. Exit 1 means some mutation had another outcome.

**Time limits.** Without `-t`, each mutation's TEST gets five times the unchanged run plus a minute. An explicit `-t SECONDS` also bounds the baseline; `-t 0` disables timeouts.

**Long batches.** A batch runs BUILD and TEST once per mutation, so dozens can outlast your shell's time limit: run a large batch in the background and read its output when it exits. Leave the working tree alone until then: the script rewrites each target in place and restores it from a copy, so an edit made meanwhile is lost or skews results.

**Failures.** A failed backup stops before that mutation. A failed restore exits 2 and keeps the backup at the path printed on stderr: recover it before continuing.
