# Feedback loops

A tight pass/fail signal for the bug, one that goes red on *this* bug, is most of the work. Bisection, hypothesis testing and instrumentation all consume it. Without one, reading code won't save you. Spend disproportionate effort here.

## Ways to build one, roughly in this order

1. **Failing test** at whatever seam reaches the bug: unit, integration, end-to-end.
2. **HTTP script** (curl or similar) against a running dev server.
3. **CLI invocation** with a fixture input, diffing stdout against a known-good snapshot.
4. **Headless browser script** (Playwright, Puppeteer) that drives the UI and asserts on DOM, console or network.
5. **Replay a captured trace.** Save a real request, payload or event log to disk and replay it through the code path in isolation.
6. **Throwaway harness.** A minimal subset of the system (one service, mocked dependencies) that reaches the bug with one function call.
7. **Property or fuzz loop.** For "sometimes wrong output", run 1000 random inputs and look for the failure.
8. **Bisection harness.** If the bug appeared between two known states (commit, dataset, version), automate "set up state X, check" so `git bisect run` can drive it.
9. **Differential loop.** Run the same input through the old and new version (or two configs) and diff the outputs.
10. **Human in the loop.** Last resort, when a person must click. Copy `scripts/hitl-loop.template.sh`, edit its steps, and ask the user to run it in their own terminal and paste back the `--- Captured ---` block. It reads from a TTY, so don't run it yourself. `capture` echoes what the user types, so capture observations only and leave signing in to a `step`.

## Tighten it

Treat the loop as a product. Once you have one:

- **Faster:** cache setup, skip unrelated init, narrow the test scope.
- **Sharper:** assert on the specific symptom, not "didn't crash".
- **Deterministic:** pin time, seed random generators, isolate the filesystem, freeze the network.

A 30-second flaky loop is barely better than none. A 2-second deterministic one is what you want.

## Non-deterministic bugs

The goal is a higher reproduction rate, not a clean repro. Loop the trigger 100 times, parallelise, add stress, narrow timing windows, inject sleeps. A bug that fails 50% of the time is debuggable; 1% is not. Keep raising the rate.

## Done when

You can name one command you have already run at least once (show it and its redacted output) that is:

- [ ] **Red-capable:** it drives the actual bug path and asserts the user's exact symptom, so it goes red on this bug and green once fixed.
- [ ] **Deterministic:** same verdict every run (for flaky bugs: a pinned, high reproduction rate).
- [ ] **Fast:** seconds, not minutes.
- [ ] **Agent-runnable:** it runs unattended; a human only through the HITL script.

## When you can't build one

Stop and say so. List what you tried. Ask the user for access to an environment that reproduces it, a redacted captured artifact (HAR file, log dump, core dump, screen recording with timestamps), or permission to add temporary production instrumentation. Don't start hypothesising without a loop.

## Minimise

Once it's red, cut inputs, callers, config, data and steps one at a time, re-running the loop after each cut. Keep only what the failure needs. You're done when removing any remaining element turns the loop green. A minimal repro leaves fewer suspects and becomes the clean regression test.
