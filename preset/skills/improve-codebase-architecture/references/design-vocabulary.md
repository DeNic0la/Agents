# Design vocabulary

The shared language for judging and deepening modules, in the tradition of John Ousterhout's _A Philosophy of Software Design_. Use these terms exactly; don't drift into "component," "service," "API," or "boundary."

## Terms

**Module**: any unit with an inside and an outside: a function, class, file, package or service. What matters is what callers must know (its interface) versus what it hides (its implementation).

**Interface**: everything a caller has to know to use a module correctly: signatures, types, but also ordering rules, side effects, error behavior and invariants. An interface is a cost every caller pays.

**Depth**: how much functionality a module hides relative to how much interface it exposes. A **deep** module has a small interface over a lot of behavior (a file system's `open/read/write/close`). A **shallow** module's interface is nearly as complex as its implementation (a wrapper that renames its arguments and forwards them).

**Seam**: a place where behavior can be swapped without editing the code on either side: an interface that callers depend on and that more than one implementation can sit behind. A seam is where tests and alternate implementations plug in.

**Adapter**: an implementation that sits behind a seam and translates to something concrete: a database, an HTTP client, a fake for tests.

**Leverage**: how much a caller gets per unit of interface learned. Deep modules give high leverage: learn a little, get a lot. Leverage also grows with the number of callers that reuse a module instead of re-solving its problem.

**Locality**: how much of a concept lives in one place. High locality means that to understand or change one behavior, you read and edit one module. Low locality means bouncing between many small modules, and bugs hiding in how they're wired together.

## Principles

**The deletion test.** For a module you suspect is shallow, imagine deleting it and inlining it into its callers. If complexity *concentrates* (callers would each have to re-solve something the module hid), the module is earning its keep, or would if it were deeper. If complexity just *moves* (the same code lands in the caller, no worse), the module is shallow: a candidate for merging into something deeper.

**The interface is the test surface.** Test a module through its interface, the same one callers use. A module that can only be tested by reaching around its interface (mocking its internals, exporting private helpers) has an interface that doesn't match its job. Deepening fixes this: tests at a deep interface survive refactors of everything behind it.

**One adapter = hypothetical seam, two = real.** A seam with a single implementation is speculation: it costs an interface and buys nothing yet. Introduce a seam when there are two adapters (often a production one and a test fake that the tests genuinely need). Until then, keep the code direct.

## Design it twice

When exploring the interface of a deepened module, don't settle on the first shape. Dispatch two or three subagents in parallel, each with a fresh context and the same brief (the module's responsibilities, its callers, the constraints), and each told to propose a *different* interface: for example, one minimal, one optimized for the most common caller, one shaped around the domain terms in `GLOSSARY.md`. Without subagents, draft the alternatives yourself, one at a time, before comparing.

Then compare them side by side on depth (interface size versus hidden behavior), leverage for the real callers, locality, and how the tests would look at each interface. Present the comparison to the user and pick together; a hybrid of two proposals is often the winner.
