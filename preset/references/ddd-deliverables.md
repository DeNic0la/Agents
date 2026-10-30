---
description: Checklist of the artifacts a Domain-Driven Design effort should produce (strategic, tactical, evented); read when adopting DDD in a project, designing service boundaries, or checking a domain model for gaps.
---

# DDD deliverables

What a Domain-Driven Design effort should leave behind, so its adoption stays practical and checkable. Produce only what the project needs: the strategic set always, the tactical set for each core subdomain, the evented set only when the design uses events. Write each one where the project keeps such things; the glossary and ADRs follow the `domain-modeling` skill.

## Strategic

- [ ] Subdomain map: each subdomain classified as core, supporting or generic.
- [ ] Bounded context map: each context's owner and how contexts integrate (shared kernel, customer/supplier, anti-corruption layer, ...).
- [ ] Ubiquitous language glossary (`GLOSSARY.md`, or one per context with a `GLOSSARY-MAP.md`).
- [ ] One or two ADRs for the boundary decisions that are hardest to reverse.

## Tactical

- [ ] Aggregates, each with the invariants it protects.
- [ ] Value objects.
- [ ] Domain events.
- [ ] Repository contracts and transaction boundaries (one aggregate per transaction unless an ADR says otherwise).

## Evented (only when the design uses events)

- [ ] Why commands and queries are separated (CQRS), or why they aren't.
- [ ] Event schema versioning policy.
- [ ] Saga compensation matrix: each step, its failure, and the compensating action.
- [ ] Projection rebuild strategy.
