# Step briefs

## Implementer

```
Step <N> of <total>: <step name>

<task>
<the step's description>
</task>

<previous_steps>
<the accumulated summaries; omit on step 1>
</previous_steps>

<input>
<what this step receives: files, context, dependencies>
</input>

<output>
<the expected deliverable>
</output>

Before acting, think it through: what earlier steps established and must not be undone; what this step must achieve and where its boundaries are; the changes needed, in what order, and what could go wrong; whether there's a simpler way.

Constraints:
- Do only this step, building on (never undoing) earlier steps, following the project's existing patterns.
- Don't run mutating git commands (commit, stash, checkout, reset, revert, push) unless the task requires one; read-only ones are fine.

Before you finish, check your work and fix any gap: does it build on the earlier steps' output, stay consistent with their patterns and interfaces, meet every requirement, stay in scope, and give the next steps what they need?

End with a "Context for next steps" section: the files changed (full paths), 3-5 key changes, decisions that affect later steps, and warnings.
```

## Meta-judge

To the `meta-judge`:

```
Write the evaluation specification for this step.

User's task: <the original task>
Step <N>/<total>: <step name>
<the step's description>
Input: <what it receives>
Expected output: <what it should produce>
Previous steps: <summary, or "none">
Artifact type: <code | documentation | configuration | ...>

Return only the specification YAML.
```

## Judge

To the `judge`, never with a threshold:

```
Evaluate step <N>/<total>: <step name> against the evaluation specification below.

Original task: <the overall task>
Step requirements: <the step's description>; input: <...>; expected output: <...>
Previous steps: <summary, or "none">

<the Pre-existing Changes section, when it applies>

Evaluation specification:
<the meta-judge's YAML, exactly as returned>

Implementation output:
<the files the implementer changed>
<its "Context for next steps" section>

Report name: <task-name>-step-<N>-<YYYY-MM-DD>
```

## Pre-existing changes

Tell the judge which changes existed before this step's implementer started, so it doesn't credit or blame the step for them. Include a section for:

- each earlier step of this run (steps 1 to N-1, from their summaries);
- earlier tasks completed in this session;
- the user's own changes made before the task started (from the conversation or `git status` and `git diff --stat`).

Omit the section for step 1 when nothing came before. On a retry within a step, don't list the step's own earlier attempt.

```
## Pre-existing changes (context only)

These changes were made before this step's implementer started. They are not part of this step's output. Evaluate the step's own changes; check these only where the step's requirements depend on them.

### Step 1: <description>
<what was done; files created or modified>

### User changes before this task
<what was done; files created or modified>
```

Keep it high level: no code, no diffs.

## Retry

To the implementer, at the tier the escalation rules give:

```
Retry: step <N>/<total>. Your previous attempt didn't pass review.

<original_requirements>
<the step's description>
</original_requirements>

<judge_feedback>
Score: <score>/5.0
Issues:
<the judge's issues>
Full report: <report path>
</judge_feedback>

<previous_attempt>
<the files changed in that attempt>
</previous_attempt>

Work through each issue: find its root cause, plan the fix, implement every fix, and confirm each one is resolved. Fix the specific issues; don't rewrite everything. End with an updated "Context for next steps" section.
```
