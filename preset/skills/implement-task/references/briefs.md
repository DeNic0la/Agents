# Dispatch briefs

Send these as written, with the bracketed values filled in. Pass paths, never pasted content: the agent reads its own files, so a pasted copy only costs context and drifts from the file.

## Step

To the step's agent, at its tier:

```
Implement step `<step name>`.

Task file: <task path>
Sub-task file: <its path from the Parallelization Overview>

Read the sub-task file first: it is your step. Then read the task file's description, acceptance criteria (including the test strategy) and architecture overview.
Implement only this step, following its expected output, success criteria and subtasks. Your phase is a checkpoint, not the finish line: don't pull later work forward.
Leave the project building, linting and testing green.

Report: the files created or modified, whether the success criteria are met, a short self-critique, and any issues.
```

## Review

To one `code-reviewer`, at the phase's reviewer tier. Exactly these inputs and nothing resembling a threshold, a verdict, your own rubric, the sub-task paths or the criteria text:

```
Review this phase with your full process and return your YAML result.

Task file: <task path>
Phase: <identifier exactly as in the Phase Overview, e.g. Phase 2>
Artifacts: <every path the phase's agents reported, including from earlier fix iterations>
```

## Fix

To each step you decided to re-dispatch (see `fixing.md`), in parallel where the steps are independent:

```
Fix step `<step name>`: Phase <N> review, iteration <K> of <MAX>.

Task file: <task path>
Sub-task file: <its path>

The phase failed its review. Issues attributed to this step (and phase-wide):
<the reviewer's issues for this step, verbatim>

Full review report, for context: <report path>

Fix every Critical, High and Medium issue above. Don't add functionality beyond the step's expected output, don't modify files owned by steps that weren't re-dispatched, and keep any changes the user made. Re-run build, lint and tests.

Report: the files changed, each issue's status (fixed, partly fixed, skipped with reason), and any new concerns.
```

## Definition of done

To a `developer`:

```
Verify every Definition of Done item in the task file.

Task file: <task path>

Find `## Acceptance Criteria` → `**Definition of Done:**` and check each item by running the relevant tests, builds and checks. Mark each passing item [X]. Every item must hold now; nothing is "not yet due".

Report each item as PASS, FAIL (with the reason) or BLOCKED (by what), with evidence, and the pass rate.
```

For each failing item, dispatch a `developer` with the item, its failure details and the task file path, asking it to fix the item, confirm it passes and check for regressions. Then verify again.
