---
name: tdd
description: Use when building a feature or fixing a bug test-first, when the user mentions "red-green-refactor" or TDD, wants integration tests, or another skill asks for tests at agreed seams or characterization tests before a refactor. Runs the red-green loop and a mutation check so the tests catch real breaks.
license: MIT
---

# Test-Driven Development

> **Repo version first:** if this repository has `.agents/skills/tdd/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

## Overview

TDD is the red-green loop. This skill makes that loop produce tests worth keeping: what a good test is, where tests go, the anti-patterns, and the rules of the loop. Every section applies on every cycle.

Read the project's `GLOSSARY.md` (if it exists) so test names and new identifiers match the domain language, and respect ADRs in the area you're touching. Follow `.agents/testing-patterns.md` when the project has one.

For a bug whose cause isn't known yet, use the `systematic-debugging` skill first: it finds the cause and brings the repro back here as the failing test.

## What a Good Test Is

Tests verify behavior through public interfaces, not implementation details. Code can change entirely; tests shouldn't. A good test reads like a specification ("user can checkout with valid cart") and survives refactors because it doesn't care about internal structure.

Before writing a test, name the **break** it catches: the production change that turns it red. If you can't name one, the test observes no behavior yet; find the behavior first.

- [references/tests.md](references/tests.md): read before writing the first test, for good and bad examples.
- [references/mocking.md](references/mocking.md): read before adding any mock or test double.
- [references/characterization.md](references/characterization.md): read before any behavior-preserving change, or when code has no tests.

## Seams: Where Tests Go

A **seam** is where a module's interface lives: tests cross it the way callers do and observe behavior without reaching inside. Tests live at seams, never against internals.

**Test only at agreed seams.** Before writing any test, write down the seams under test and confirm them with the user. Seams named in the spec or issue are already confirmed, and so are the seams of code you refactor and of a review finding you fix. Agreeing seams up front puts testing effort on critical paths and complex logic instead of every edge case. The seams bound the code too: when the change needs code behind a seam not on the list, confirm that seam before writing the code.

Ask: "What's the public interface, and which seams should we test?"

When the shape of the interface is itself in question (how deep the module is, where the seam belongs), use the `codebase-design` skill for the vocabulary. It's a reference to consult, not a session to run.

## Anti-Patterns

- **Implementation-coupled:** mocks internal collaborators, tests private methods, or verifies through a side channel (querying the database instead of using the interface). The tell: it breaks on a refactor that keeps behavior.
- **Tautological:** the assertion recomputes the expected value the way the code does, so it can never disagree with the code. Expected values come from an independent source: a known literal, a worked example, the spec.
- **Change detector:** goes red only on a deliberate decision (a constant's value, a message's exact wording) and stays green through real bugs. Assert the behavior that depends on the decision: "a failing call is tried 5 times, then gives up", not `expect(MAX_RETRIES).toBe(5)`.
- **Horizontal slicing:** all tests first, then all code. Bulk tests verify imagined behavior. Work in **vertical slices**: one test, one implementation, repeat, each responding to what the last cycle taught you.

## Rules of the Loop

- **Red before green.** Write the test and run it. It's red when the assertion fails for the break you named. An error, a typo, a failed import, a build failure or a panic isn't red yet: fix it and run again. When the test calls a name that doesn't exist yet, add a stub that compiles and returns the zero value, then run until the assertion fails.
  - A test that passes at once pins behavior that already exists. Rewrite it to name a break that isn't there yet, unless the spec asks for this case over existing behavior: then it's a characterization test, and it counts once you break the code it covers and watch it go red.
  - If this run wrote the code before the test, the test counts only once you break that code and watch it go red.
  - Then write only enough code to pass: every branch you add is one the failing case runs. A behavior the case doesn't reach waits for its own red test, even when the natural implementation would cover it.
- **Green is the affected seam.** During a cycle, run the new test and the tests for the affected seam, plus lint on changed files and the narrowest type check. Before a completed behavior is committed or handed off, run the repository's full required gate. Reuse a passing check only while its files, dependencies, configuration and environment are unchanged. Report every failure by name, including ones you didn't cause.
- **One slice at a time.** One seam, one case, one minimal implementation per cycle. In a table-driven test, add one case per cycle and watch that case go red.
- **Mutate before you finish.** Break every file this run changed in small, realistic ways, one at a time, and check that a test goes red for each. Read [references/mutation.md](references/mutation.md) before you start: what counts, survivors, and how to run `scripts/mutate.sh`.
- **Refactoring is not part of the loop.** It comes after the slice is green, usually on what review found (the `code-review` skill), with the tests unchanged apart from a mechanical rename or move. The seam's existing tests are its characterization tests. Larger restructuring belongs to the `refactor` skill.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll write the tests after, it's faster" | Tests written after pass by construction and miss the breaks that matter. |
| "It failed with an import error, that's red" | Red is the assertion failing for the named break. Fix the error and run again. |
| "I'll cover the other cases in this edit too" | Each behavior waits for its own red case. |
| "Mutation testing is overkill for this" | A mutation that stays green is behavior no test protects. |

## Red Flags

- A test that passed on its first run was counted as a cycle.
- Tests mock the project's own classes.
- Several new cases went in before any of them was seen red.
- A test file changed during a refactor beyond a rename or move.

## Verification

- [ ] Every test names its break and was seen red for that break.
- [ ] Tests sit only at agreed seams.
- [ ] Every mutation is red or a listed survivor.
- [ ] The full required gate passed before commit or handoff.
