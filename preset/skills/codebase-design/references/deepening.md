# Deepening

How to deepen a cluster of shallow modules safely, given its dependencies. Uses the vocabulary in the skill: **module**, **interface**, **seam**, **adapter**.

## Dependency categories

Classify a candidate's dependencies before deepening it. The category decides how the deepened module is tested across its seam.

1. **In-process.** Pure computation, in-memory state, no I/O. Always deepenable: merge the modules and test through the new interface directly. No adapter needed.
2. **Local-substitutable.** Dependencies with local test stand-ins (PGLite for Postgres, an in-memory filesystem). Deepenable if the stand-in exists. Tests run the deepened module with the stand-in. The seam is internal; no port at the module's external interface.
3. **Remote but owned (ports and adapters).** Your own services across a network (microservices, internal APIs). Define a **port** (an interface) at the seam. The deep module owns the logic, and the transport is injected as an **adapter**: an in-memory one for tests, an HTTP, gRPC or queue one in production. Recommendation shape: "Define a port at the seam, with an HTTP adapter for production and an in-memory adapter for tests, so the logic sits in one deep module even though it's deployed across a network."
4. **True external (mock).** Third-party services you don't control (Stripe, Twilio). The deepened module takes the dependency as an injected port; tests provide a mock adapter.

## Seam discipline

- **One adapter means a hypothetical seam, two adapters mean a real one.** Don't introduce a port unless at least two adapters are justified (usually production and test). A single-adapter seam is just indirection.
- **Internal seams vs external seams.** A deep module can have internal seams, private to its implementation and used by its own tests, besides the external seam at its interface. Don't expose internal seams through the interface just because tests use them.

## Testing: replace, don't layer

- Write new tests at the deepened module's interface. The interface is the test surface.
- Tests assert observable outcomes through the interface, not internal state. They survive internal refactors because they describe behavior. A test that must change when the implementation changes is testing past the interface.
- Old unit tests on the shallow modules become waste once the interface tests exist. Delete them in their own commit (not a `refactor:` one), after the new tests are green.
