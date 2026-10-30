# Design it twice

Use this when exploring alternative interfaces for a chosen deepening candidate. Based on "Design It Twice" (Ousterhout): your first idea is unlikely to be the best. Uses the skill's vocabulary: **module**, **interface**, **seam**, **adapter**, **leverage**.

## 1. Frame the problem space

Before dispatching anyone, write the user a short explanation of the problem space:

- the constraints any new interface must satisfy
- the dependencies it relies on, and their category (see `deepening.md`)
- a rough code sketch that makes the constraints concrete; it's an illustration, not a proposal

Show it to the user, then go straight on to step 2. The user reads while the designs are produced.

## 2. Produce radically different designs

Dispatch three or more subagents in parallel, each with a fresh context. Each must produce a **radically different** interface. Without subagents, draft the designs yourself one at a time, finishing each before starting the next, and say that they weren't independent.

Give each a technical brief, separate from the user-facing explanation: the file paths and key line ranges, the coupling details, the dependency category, and what sits behind the seam. Include the skill's vocabulary and the project's `GLOSSARY.md` terms, so every design names things the same way. Give each a different constraint:

- "Minimize the interface: one to three entry points. Maximize leverage per entry point."
- "Maximize flexibility: support many use cases and extension."
- "Optimize for the most common caller: make the default case trivial."
- If cross-seam dependencies apply: "Design around ports and adapters."

Each design returns:

1. The interface: types, methods, parameters, plus invariants, ordering and error modes.
2. A usage example showing how callers use it.
3. What the implementation hides behind the seam.
4. The dependency strategy and adapters (see `deepening.md`).
5. Trade-offs: where leverage is high, where it's thin.

## 3. Present and compare

Present the designs one after another so the user can take each in, then compare them in prose on **depth** (leverage at the interface), **locality** (where change concentrates) and **seam placement**.

Then give your own recommendation: which design is strongest and why. If parts of different designs combine well, propose a hybrid. Be opinionated: the user wants a strong read, not a menu. Reject any design that puts several unrelated responsibilities behind one interface, and say why.
