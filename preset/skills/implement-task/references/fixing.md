# Fixing a failed phase

The most important judgement in this workflow. There is no rule table here, and don't build one: situations vary too much, and a table stops you thinking exactly where thinking matters.

> Match the capability of the agent that fixes the phase, and of the reviewer that re-checks it, to the **blast radius** of the findings, not to the tiers that built the phase.

## Reason first, in writing

Before dispatching anything, work through:

1. **Scope.** Which steps do the findings touch (`issues[].step`, `blast_radius.affected_steps`)? Which steps are sound?
2. **Depth.** A local defect inside a step, or a phase that came out structurally wrong (`requires_phase_rework`)?
3. **Coupling.** Does fixing the affected steps force rewriting the others? Then the unit of repair is the phase.
4. **Severity.** Critical or High findings that break a criterion this phase owns, or Low and Medium nitpicks?
5. **Ceiling.** Did the implementing model run out of capability? A model that already failed on the same finding will fail again at the same tier.

Then decide:

- **Fix tier:** higher or lower than the tier that built the step, and possibly different per step.
- **Fix scope:** which steps to re-dispatch. Never re-dispatch a sound step; that's how good work gets destroyed.
- **Re-review tier:** at least the phase's reviewer tier. If you escalated the fix because the phase was structurally wrong, escalate the review too: the tier that let the defect through is no check.

Record the reasoning and the decision for the final report.

## Two anchor cases

A phase of three steps, all built at `fast`, reviewer `standard`, fails review.

- **The whole phase failed.** High findings in all three steps, `requires_phase_rework: true`, the phase's shared abstraction is wrong. Blast radius is the phase, depth structural, coupling total, and `fast` hit its ceiling. Re-dispatch all three steps at `standard` (or `deep` if the abstraction is hard) and re-review at `deep`.
- **One step failed.** One High finding, `affected_steps: [02b-token-service]`, no rework needed, the other steps clean: a missed edge case, not a design failure. Re-dispatch only `02b-token-service`, still at `fast`, with its issues; leave the others untouched; re-review at `standard`.

Everything else (mixed tiers, failures only in tests, a second failure, two coupled steps out of five) is derived the same way: scope, depth, coupling, severity, ceiling.

## Then

Re-dispatch with the fix brief, wait for every re-dispatched step, and re-review the same phase with the union of all reported paths. Repeat until the phase passes or `MAX_ITERATIONS` is reached; then log "Phase N did not pass after M iterations (final score X)" and continue with the next phase.
