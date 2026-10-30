# Judged iteration

How an orchestrating skill uses a `judge` or `code-reviewer` agent's score to decide whether work passes, gets retried or is accepted. The orchestrator owns the decision; the evaluator only scores.

## Threshold blindness

Never tell the evaluator the threshold, a floor, an expected verdict or any pass line, in any form. An evaluator that knows the target scores toward it. Pass only the artifact, its context and the criteria.

## Reading the result

Evaluators return a short structured header and write their full report to a file. Read the header only: the score (out of 5.0), the issues (each with a priority: Critical, High, Medium, Low) and the report path. Don't read the full report yourself; pass its path to whoever fixes the work.

Reject the result and re-run the evaluator with the same inputs when:

- the score is missing;
- the weighted score is exactly 5.0 (a lazy or hallucinated evaluation; a single criterion at 5 is fine);
- it returned a long report inline instead of writing it to a file;
- it states a PASS/FAIL verdict or mentions a threshold;
- it penalizes criteria that aren't due at this checkpoint.

Never repair an evaluator's report yourself.

## Deciding

With `THRESHOLD` (the target) and `FLOOR` (3.0, or the skill's own floor):

| Score | Decision |
|---|---|
| `>= THRESHOLD` | PASS |
| `< FLOOR` | FAIL, unconditionally: retry with feedback |
| between | discretion band (below) |

**Discretion band.** Both failure modes are real: burning retries on nitpicks so the work never finishes, and accepting work too poor to count as done (worse). Inside the band:

- Any Critical or High issue, or an issue that breaks a requirement of this unit, removes discretion: retry.
- Work that doesn't build, lint or test green is never in the band.
- If only Low and Medium nitpicks remain, decide deliberately, before retrying, whether another attempt is worth its cost. Allow at most **one** nitpick-driven retry (it counts against the retry budget). If that retry again leaves only nitpicks, mark the unit **ACCEPTED**, carry the outstanding issues forward and report them at the end.
- Be critical, not lenient. Stopping below target is an intentional decision grounded in the absence of real issues.

**`--strict`** disables the discretion band: pass only at `>= THRESHOLD`, otherwise retry until the budget runs out.

## Retrying

Each retry passes the evaluator's issues for that unit verbatim and the full report's path, and asks for those issues to be fixed, not for a rewrite. Re-evaluate against the **same** criteria (never regenerate them mid-unit). Choose the retry's model tier per the escalation rules in `model-tiers.md`.

When the retry budget runs out, the skill says whether to stop and ask the user (when later work builds on this unit) or to proceed with a warning (when it doesn't).

## Reporting

Per unit, report the final score, the number of retries, the status (PASS, ACCEPTED, FAILED, or PROCEEDED after max retries) and any tier changes with their reason.
