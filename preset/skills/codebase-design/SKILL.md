---
name: codebase-design
description: Use when designing or improving a module's interface, deepening a chosen module, deciding where a seam goes, making code more testable or easier for agents to navigate, or when another skill needs the deep-module vocabulary. Gives the shared terms and principles for deep modules.
license: MIT
metadata:
  credits-skill: software-design
  credits-author: Luke Ramsden
  credits-url: "https://github.com/lukeramsden/software-design-agent-skill/tree/main/skills/software-design"
---

# Codebase Design

> **Repo version first:** if this repository has `.agents/skills/codebase-design/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

Design **deep modules**: a lot of behavior behind a small interface, placed at a clean seam, testable through that interface. Use this language and these principles wherever code is designed or restructured. The aim is leverage for callers, locality for maintainers and testability for everyone.

To survey a whole codebase for deepening opportunities, use the `improve-codebase-architecture` skill. For the shape of a public API or a contract between services, use the `api-and-interface-design` skill.

## Glossary

Use these terms exactly. Don't substitute "component", "service", "API" or "boundary": consistent language is the point.

- **Module:** anything with an interface and an implementation. Scale-agnostic: a function, class, package or a slice across tiers. _Avoid:_ unit, component, service.
- **Interface:** everything a caller must know to use the module correctly: the type signature, and also invariants, ordering constraints, error modes, required configuration and performance characteristics. _Avoid:_ API, signature (both mean only the type-level surface).
- **Implementation:** the code inside a module. Distinct from **adapter**: a small adapter can have a large implementation (a Postgres repository), a large adapter a small one (an in-memory fake). Say "adapter" when the seam is the topic, "implementation" otherwise.
- **Depth:** leverage at the interface: how much behavior a caller or test can exercise per unit of interface it has to learn. **Deep:** a lot of behavior behind a small interface. **Shallow:** the interface is nearly as complex as the implementation.
- **Seam** (Michael Feathers): a place where behavior can change without editing in that place; the location where a module's interface lives. Where the seam goes is its own decision, separate from what goes behind it. _Avoid:_ boundary (overloaded with DDD's bounded context).
- **Adapter:** a concrete thing that satisfies an interface at a seam. It names a role (which slot it fills), not substance.
- **Leverage:** what callers get from depth: more capability per unit of interface learned. One implementation pays back across N call sites and M tests.
- **Locality:** what maintainers get from depth: change, bugs, knowledge and verification concentrate in one place. Fix once, fixed everywhere.
- **Information leakage:** one design decision encoded in two or more modules, such as a file format that both the reader and the writer know. Changing the decision means changing every module that knows it. **Back-door leakage** is the worst kind: the shared knowledge appears in no interface. The opposite of locality.

How they relate: a module has exactly one interface; depth is measured against that interface; a seam is where the interface lives; an adapter sits at a seam and satisfies the interface; depth produces leverage for callers and locality for maintainers.

## Principles

- **Depth is a property of the interface, not the implementation.** A deep module can be built from small, swappable parts inside; they just aren't part of its interface. A module can have **internal seams** (private, used by its own tests) besides the **external seam** at its interface.
- **The deletion test.** Imagine deleting the module. If complexity vanishes, it was a pass-through. If complexity reappears across its callers, it was earning its keep.
- **The interface is the test surface.** Callers and tests cross the same seam. If you want to test past the interface, the module is probably the wrong shape.
- **One adapter means a hypothetical seam, two adapters mean a real one.** Don't add a seam unless something actually varies across it.
- **Repair a leak in one of two ways.** Merge the modules that share the knowledge, or extract the knowledge into a new module. Extract only if the new module gets a small interface; otherwise the leak just moves and callers have one more module to learn.

When designing an interface, ask: can I have fewer methods? Simpler parameters? Hide more inside?

## Designing for testability

1. **Accept dependencies, don't create them.** `processOrder(order, paymentGateway)` is testable; a `processOrder(order)` that builds its own `StripeGateway` isn't.
2. **Return results, don't produce side effects.** `calculateDiscount(cart): Discount` is testable; `applyDiscount(cart): void` that mutates `cart.total` is harder.
3. **Keep the surface small.** Fewer methods mean fewer tests; fewer parameters mean simpler setup.

## Rejected framings

- **Depth as the ratio of implementation lines to interface lines** (Ousterhout): it rewards padding the implementation. Depth here is leverage.
- **"Interface" as a language's `interface` keyword or a class's public methods:** too narrow. The interface is every fact a caller must know.
- **"Boundary":** overloaded with DDD's bounded context. Say seam or interface.

## Supporting files

- [references/red-flags.md](references/red-flags.md): read when naming what's wrong with a module, or writing up a deepening candidate.
- [references/deepening.md](references/deepening.md): read when deepening a cluster of modules: dependency categories, seam discipline, and replacing tests instead of layering them.
- [references/design-it-twice.md](references/design-it-twice.md): read when exploring alternative interfaces for a module, together with `deepening.md`.
