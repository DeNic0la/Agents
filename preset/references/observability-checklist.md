---
description: Recipe for this project's observability checklist. When adding or changing code that runs in production, follow `.agents/observability-checklist.md`. If that file doesn't exist, generate it with this recipe before starting other work.
---

# Observability checklist (recipe)

A project-specific checklist for instrumenting production code, generated into `.agents/observability-checklist.md`. It names the project's own logging, metrics, tracing and alerting tools.

## Generate

1. **Inspect the project.**
   - Does anything run in production: a service, worker or scheduled job?
   - The logging library, metrics system and tracing setup (e.g. OpenTelemetry).
   - Where alerts, dashboards and runbooks live.
2. **If nothing runs in production** (a library, static tooling), write a short file saying observability doesn't apply and why, and stop there.
3. **Otherwise, write `.agents/observability-checklist.md`** as checklists naming the project's actual tools:
   - **On-call questions first:**
     - 2–4 questions on-call will ask, written down before instrumenting
     - every signal maps to one of them
     - metrics say *that* something is wrong, traces say *where*, logs say *why*
   - **Structured logging:**
     - structured output with stable event names
     - a correlation ID created or accepted at the boundary, and propagated across calls and async hops
     - an entry-point field when several entry points write the same stream
     - level definitions: `error` means an invariant broke, `warn` degraded but handled, `info` a business event, `debug` off in production
     - no secrets or PII, and only allowlisted fields
     - external calls logged with metadata only
     - real output spot-checked
   - **Metrics:**
     - RED (rate, errors, duration) for every endpoint and dependency
     - USE (utilization, saturation, errors) for every resource
     - latency as histograms with percentiles, never averages
     - labels only from small fixed sets: no IDs, emails, raw URLs or error text
     - status codes grouped by class
     - queue depth and processing time for every queue
   - **Tracing:**
     - initialized at startup
     - auto-instrumentation for HTTP, RPC and DB clients
     - W3C trace context propagated in and out, including across async boundaries
     - manual spans only around meaningful units of work
     - no secrets in span attributes
     - a sampling policy that keeps errors
   - **Alerting:**
     - symptom-based and actionable
     - a runbook link on every alert: what it means, the first query, escalation
     - thresholds based on an SLO or historical data
     - two severities: page and ticket
     - each alert test-fired once
     - no alerts that get ignored
   - **Dashboards:** service health and dependency health, answering the on-call questions, with a sensible default time range.
   - **Verify the telemetry:**
     - force an error and find it by its correlation ID
     - send test traffic and check the metric series
     - follow one trace end to end
     - diagnose an induced failure from telemetry alone
   - **Pre-launch gate:** logs flowing, RED metrics visible, at least one test-fired alert with a runbook, requests traceable across services, and on-call knows where the runbooks are.
4. **Fit it to the project.** Drop sections for signals the project doesn't use, with one line on why. Leave no placeholders.
5. **Get approval.** Show the file to the user, apply their changes, and commit it.

## Afterwards

Update the file when the project's telemetry stack changes. If this recipe changes later, suggest the additions to the user instead of regenerating the file silently.
