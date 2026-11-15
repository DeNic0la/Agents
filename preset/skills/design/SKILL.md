---
name: design
description: Pick the skill for shaping the domain, the architecture or an interface.
license: MIT
metadata:
  router: "true"
---

# Design

A router: it names the skills for one area of work and when to reach for each. It does none of the work itself.

1. Take what the user wants from the argument, else from the conversation. If it's still unclear, ask one question.
2. Pick the one skill below that fits, using **Choosing**, and say why in one line.
3. Hand over:
   - Invoked by `agent`: use that skill now, on what the user asked.
   - Invoked by `user`: only the user can start it. Tell them its name and what to pass it, then stop.
   - Not available in this setup: say so, and name the closest skill that is.

If nothing here fits, name the router that does: `think`, `planning`, `build`, `improve`, `ship`, `agent-setup`, `data`, `product`, `support`, `productivity`.

## Choosing

- Terms and domain decisions: `domain-modeling`. A plan to grill while the glossary and ADRs stay current: `grill-with-docs`.
- A new system or major component: `system-design`. Choosing a technology or reviewing a design proposal: `architecture`.
- A module's depth and seams: `codebase-design`. A public API or contract other code depends on: `api-and-interface-design`. Tables, keys, indexes or a schema migration: `schema-design`.
- An existing codebase that has become hard to change: `improve-codebase-architecture`.

## Skills

| Skill | Use it to | Invoked by |
|---|---|---|
| domain-modeling | sharpen the project's language (`GLOSSARY.md`) and record decisions (ADRs) | agent |
| grill-with-docs | grill a plan while keeping the glossary and ADRs current | user |
| system-design | design a system or major component from requirements, with load estimates and trade-offs | agent |
| architecture | compare technology options or review a design proposal, and record the decision as an ADR | agent |
| codebase-design | design deep modules with a shared vocabulary for interfaces, seams and depth | agent |
| api-and-interface-design | design APIs and module interfaces | agent |
| schema-design | design or review database schemas (keys, types, constraints, indexes, partitioning) and deliver them as a migration | agent |
| improve-codebase-architecture | assess the architecture, stop if healthy, else design a deepening from an HTML report and plan it for `implement` | user |
