# Design doc template

Size it to the problem: drop any section that would be empty or obvious.

```markdown
# <System or component>: design

**Status:** Draft | In review | Accepted
**Date:** <date> | **Authors:** <names>

## Context
Why this system is needed now, and what is out of scope.

## Requirements
- Functional: ...
- Non-functional: scale, latency, availability, consistency, cost
- Constraints: team, timeline, stack, compliance

## Assumptions
Every number or fact the design depends on that nobody has confirmed.

## Load estimate
Peak requests per second, read/write ratio, storage per year, bandwidth.

## High-level design
Diagram (ASCII or Mermaid), then one line per component: its responsibility and the data it owns.

## Data flow
The main flows, step by step, including the async ones.

## Deep dive
Data model, API style per interaction, caching, queues and events, error handling.

## Scale and reliability
Scaling per component, single points of failure, failover, backpressure, degraded behavior, monitoring and alerts.

## Trade-offs
| Decision | Chosen | Alternative | Why |
|---|---|---|---|

Link the ADRs for decisions that are hard to reverse.

## What to revisit
The load or requirement change at which each part stops working.

## Open questions
```
