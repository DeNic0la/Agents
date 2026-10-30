---
name: improve-codebase-architecture
description: Assess a codebase's architecture, stop if it's healthy, otherwise present deepening opportunities as a visual HTML report, then design the one you pick and plan it for the `implement` skill.
---

# Improve Codebase Architecture

> **Repo version first:** if this repository has `.agents/skills/improve-codebase-architecture/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

Surface architectural friction and propose **deepening opportunities**: refactors that turn shallow modules into deep ones. The aim is testability and AI-navigability. The skill starts with an assessment: if the architecture is healthy, it says so and stops. It ends with a plan that the `implement` skill builds. It changes no code.

This skill is _informed_ by the project's domain model and built on a shared design vocabulary:

- Use the `codebase-design` skill first. Use its terms exactly (**module**, **interface**, **depth**, **seam**, **adapter**, **leverage**, **locality**, **information leakage**), and don't drift into "component," "service," "API," or "boundary." Its red flags name structural defects, its deepening reference holds the dependency categories and seam discipline, and its design-it-twice reference holds the parallel interface design.
- The domain language in `GLOSSARY.md` gives names to good seams; ADRs in `docs/adr/` record decisions this skill should not re-litigate.

**Architecture vs refactoring:** this skill handles structure: module boundaries, interfaces, testability. A code-level problem inside a well-bounded module (complexity, duplication, naming, dead code) is refactoring: point the user to the `refactor` skill. Cleaning up a new module's internals after an architectural change is also a separate refactoring pass.

## Guardrails

1. **Deep is not big.** A deep module hides complexity behind a small interface; it doesn't own every concern it touches. If describing it needs "and" more than once, it's a god object: split it. A deep module can delegate inside to focused collaborators.
2. **Separate, don't combine.** Deepening consolidates *one concept* scattered across files. It doesn't merge unrelated concepts that happen to be called together. Before proposing a merge, ask: "Same concern, or just co-located?"
3. **Architecture has a ceiling.** Small projects (under about 20 files) with low coupling rarely need structural work. The default verdict is **Healthy**: don't invent work.
4. **Every new element must pay for itself.** An interface, argument, class or port is something someone has to learn. Propose it only if it removes more complexity than it adds.

## Process

### 1. Explore

**Scope before you scan: YAGNI.** Deepening pays off by making future changes easier, so weight the parts that keep changing:

- If the user named a direction (a module, a subsystem, a pain point), take it and skip the rest of this list.
- Otherwise find the hot spots: count changes per file over the last year (`git log --since="12 months ago" --name-only --pretty=format:`), leaving out bot commits and bulk reformat or move commits. Rank the most-changed files by complexity and look there first.
- If changes are scattered with no clear hot spot, widen the net to the whole codebase.

Read the glossary and the ADRs that cover the scoped area.

**Map the structure.** Have a subagent with a fresh context produce a structural inventory of the scoped area and return only the map (without subagents, build it yourself and say so): modules or packages with rough size, which imports which, circular dependencies, and per module its exported symbols and callers (from a symbol-aware search where available; mark grep-based counts `grep-only`). Record the scope with the map. It's the baseline that keeps later sessions from redoing the analysis.

**Explore for friction.** Read the scoped hot spots yourself, guided by the map: the verdict, the candidates and the design briefs rest on code you've seen. Use fresh read-only subagents only for sweeps outside the hot spots. Don't follow rigid heuristics; note where you feel friction, and name it with a `codebase-design` red flag where one fits:

- Where does understanding one concept require bouncing between many small modules?
- Where are modules **shallow**, with an interface nearly as complex as the implementation?
- Where is one design decision encoded in two or more modules (**information leakage**), especially back-door leakage that shows in no interface? It's the most expensive defect to leave in place.
- Where have pure functions been extracted just for testability, while the real bugs hide in how they're called (no **locality**)?
- Where do tightly coupled modules leak across their seams?
- Which parts are untested, or hard to test through their current interface?

Apply the **deletion test** to anything you suspect is shallow. Visit every module in the map, and record what you skip and why. Skip what's shallow by design: thin adapters, data classes with no logic, configuration loaders, one-line wrappers.

### 2. Assess

This step is mandatory. Judge the scoped area on **coupling** (fan-out, cycles, shared mutable state), **cohesion**, **testability** (structural, not code-level) and **navigability**. Every finding must name the symptom a reader actually meets: **change amplification** (a simple change touches many places), **cognitive load** (too much to hold in your head) or **unknown unknowns** (you can't tell what you need to know; the worst). A finding with none of these is a preference: drop it.

| Verdict | Meaning | Action |
|---|---|---|
| **Healthy** | Sound architecture, minor friction only | Say so, name the friction, point to the `refactor` skill for code-level cleanup, and **stop**. |
| **Localized** | One or two areas have structural problems | Present only those, at most two this session. |
| **Systemic** | Widespread structural problems | Present ranked candidates; recommend two or three this session. |

- **Idempotency:** if this skill ran recently and its changes were implemented, that area is Healthy. If it's still a problem for the same reasons, diagnose what went wrong instead of proposing another round.
- **ADR conflicts:** surface a candidate that contradicts an ADR only when the friction is real enough to reopen it, and say which ADR and why.
- **User override:** if the user gives a specific reason to proceed on Healthy code, scope strictly to it.

### 3. Present candidates as an HTML report

Write a self-contained HTML report to the OS temp directory, open it, and give the user its absolute path. Read [references/report.md](references/report.md) for the file location, the card fields and the visuals. Name every candidate in the `GLOSSARY.md` vocabulary ("the Order intake module", not "the FooBarHandler"). Split or reject a candidate whose single-responsibility sentence needs "and" more than once; if a simple, complete description is hard to write at all, that difficulty is the diagnosis.

Do NOT propose interfaces yet. After the file is written, ask the user: "Which of these would you like to explore?"

### 4. Grill and design

Once the user picks a candidate, use the `grilling` skill to walk the decision tree with them: constraints, dependencies, the shape of the deepened module, what sits behind the seam, what tests survive, and the "what stays out" boundary from the report.

For the interface itself, follow the design-it-twice reference of `codebase-design`: radically different interfaces from parallel fresh-context subagents, each brief carrying the files (paths and key line ranges), the coupling, the dependency category and the "what stays out" boundary. Reject any design that is a god object, and say why. Then recommend one. Be opinionated.

Side effects happen inline as decisions crystallize; use the `domain-modeling` skill to keep the domain model current:

- **Naming a deepened module after a concept not in `GLOSSARY.md`?** Add the term. Create the file lazily if it doesn't exist.
- **Sharpening a fuzzy term?** Update `GLOSSARY.md` right there.
- **User rejects the candidate with a load-bearing reason?** Offer an ADR: _"Want me to record this as an ADR so future architecture reviews don't re-suggest it?"_ Skip ephemeral reasons ("not worth it right now") and self-evident ones.

### 5. Write the plan

Once the user picks an interface (or accepts your recommendation), write the plan with the template in [references/plan.md](references/plan.md).

### 6. Hand off

Stay in this session, since the build needs the grilling as it happened, and tell the user the next step:

- **The change takes more than one session:** the `to-spec` skill, then `to-tickets`, then `implement` per ticket. The plan is the spec's input.
- **It fits in this session:** the `implement` skill with the plan as the spec. It writes tests at the new interface first through `tdd`, then checks the change with `qa` and `code-review`.

To tackle another candidate later, the user runs this skill again on that cluster in a fresh session.

## Supporting files

- [references/report.md](references/report.md): read when writing the HTML report in step 3.
- [references/plan.md](references/plan.md): read when writing the plan in step 5.
