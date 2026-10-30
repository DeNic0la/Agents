---
description: Recipe for a version of the observability-and-instrumentation skill tailored to this repository.
---

# observability-and-instrumentation (recipe)

Generate `.agents/skills/observability-and-instrumentation/`: a version of the observability and instrumentation skill that uses this repository's logging, metrics, tracing and alerting tools.

## Generate

1. **Inspect the project.**
   - What runs in production: services, endpoints, workers, scheduled jobs, external integrations. Which entry points start a run (HTTP, scheduler, queue consumer, CLI).
   - The logging library, its configuration (structured output, levels, redaction), and how request or correlation IDs are created and propagated today.
   - The metrics system (OpenTelemetry metrics, Prometheus client, StatsD, a vendor SDK) and existing naming and label conventions.
   - The tracing setup: OpenTelemetry or a vendor agent, auto-instrumentation, sampling, and how context crosses queues and HTTP calls.
   - Alerting and dashboard tooling, where alert rules are defined, and where runbooks live.
   - Whether `.agents/observability-checklist.md` exists. The tailored skill should point to it.
2. **If nothing runs in production** (a library, static tooling), write a short `SKILL.md` that says observability doesn't apply here and why, and stop there.
3. **Otherwise, write `SKILL.md`** with frontmatter `name: observability-and-instrumentation` and a `description` that says what it does and when to use it. Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Sections:
   - **Overview** and **When to Use:** code you can't observe is code you can't operate; instrument alongside the feature, applied to what this repo runs in production.
   - **The process**, with the repo's real tools:
     - define "working" first: 2–4 questions on-call will ask, and every signal maps to one
     - pick the signal: metrics say *that* something is wrong, traces say *where*, logs say *why*
     - structured logging: stable event names, levels, a correlation ID from the boundary, an entry-point field when several entry points share a log, no secrets or PII
     - metrics: RED for endpoints and dependencies, USE for resources, bounded labels, histograms and percentiles
     - tracing: how this repo starts tracing, where manual spans belong, context propagation and sampling
     - alerting: symptoms not causes, actionable, a runbook link, a justified threshold and duration, page or ticket only
     - verify the telemetry itself: trigger the paths and look at the real output in the repo's tools
   - **Common Rationalizations**, **Red Flags** and a **Verification** checklist, kept to the items that apply here.
   - A closing pointer to `.agents/observability-checklist.md` if it exists.
4. **Put details in supporting files** under `references/`, each with a "read when" line in `SKILL.md`. Write only the ones for signals this repo uses, with examples in its own language and libraries:
   - structured logging: the logger setup, correlation ID middleware, entry-point fields and level definitions
   - metrics: declaring a histogram and counter, naming, and allowed labels
   - tracing: SDK setup, adding a manual span, propagating context across the repo's async boundaries
   - runbooks: the template and location this repo uses
5. **Keep it small.** `SKILL.md` stays under about 200 lines, with no placeholders.
6. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
