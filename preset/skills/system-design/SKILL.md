---
name: system-design
description: Use when designing a new system, service or major component from requirements, or reshaping an existing one for scale or reliability - "design a system for", "how should we architect", "what's the right architecture for". Produces a system design doc with load estimates, explicit assumptions and trade-offs.
---

# System Design

> **Repo version first:** if this repository has `.agents/skills/system-design/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

## Overview

Design a system from its requirements down to storage, data flow and failure handling, with every assumption written down and every trade-off made explicit. The output is a design doc a team can build from and argue with.

## When to Use

- A new system, service or major component, before any code
- An existing system must handle more load, more data or stricter availability
- "How should we architect this?", "what's the right architecture for X?"

**Not for:**
- One API or module interface: use `api-and-interface-design`.
- Choosing between two technologies, or reviewing a proposal: use `architecture`, which records the result as an ADR.
- A feature whose shape is still open: use `brainstorming`.
- A backend design you want to delegate: dispatch the `backend-architect` subagent with the requirements.

## Process

1. **Requirements.**
   - Functional: what the system does, for whom.
   - Non-functional: scale (users, requests per second, data volume and growth), latency, availability, consistency, cost.
   - Constraints: team size and skills, timeline, existing stack, compliance.

   Ask when a number that changes the design is unknown. Don't assume web scale; write down every assumption you make.
2. **Estimate load.** Rough peak requests per second, read/write ratio, storage per year, bandwidth. Orders of magnitude are enough; they decide whether one database and one process will do.
3. **High-level design.** Components and their responsibilities, the data flow between them, the API contracts at a sketch level, and storage choices. Draw it (ASCII or Mermaid). Start with the simplest design that meets the requirements: one deployable, one database, until a requirement justifies more.
4. **Deep dive** where the risk is:
   - Data model and data ownership
   - API style (REST, GraphQL, gRPC, events) per interaction, detailed with `api-and-interface-design`
   - Caching, with its invalidation
   - Queues and events: delivery guarantees, ordering, retries, dead letters
   - Error handling, timeouts and retries (idempotent operations only)
5. **Scale and reliability.** Horizontal or vertical scaling per component, single points of failure, failover and redundancy, backpressure, and what users see when a dependency is down. Monitoring and alerting per the `observability-and-instrumentation` skill.
6. **Trade-offs.** For each significant choice, at least one alternative and why yours wins: complexity, cost, team familiarity, time to market, maintainability. Choices that are hard to reverse become ADRs with the `architecture` skill.
7. **What to revisit.** Name the load or requirement change at which each part of the design stops working.
8. **Write the doc** using [references/design-doc.md](references/design-doc.md). Save it where the repo keeps design docs; if there's no such place, `docs/specs/YYYY-MM-DD-<topic>-design.md`. Ask the user to review it before anything is built.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "We'll need microservices eventually" | Then split when a requirement says so. Premature splitting costs every feature. |
| "Scale numbers don't matter yet" | They decide the design. A rough estimate beats none. |
| "The trade-offs are obvious" | Not to the next reader. Write the alternative and why it lost. |
| "Failure handling is an implementation detail" | What users see when a dependency fails is a design decision. |

## Red Flags

- No numbers anywhere in the design.
- Components with no stated owner of their data.
- A trade-off section with only pros.
- A distributed design for a load one process handles.

## Verification

- [ ] Functional and non-functional requirements are written, with assumptions marked.
- [ ] A load estimate supports the scaling choices.
- [ ] Each significant choice names an alternative and why it lost.
- [ ] Failure behavior is stated for each external dependency.
- [ ] The doc names what to revisit as the system grows.
