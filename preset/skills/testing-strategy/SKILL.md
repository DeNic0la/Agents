---
name: testing-strategy
description: Use when deciding how something should be tested before writing the tests - "how should we test this?", "what tests do we need?", a test plan for a feature or system, test coverage gaps, or test architecture. Produces a test plan with the right test type per area.
---

# Testing Strategy

> **Repo version first:** if this repository has `.agents/skills/testing-strategy/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

## Overview

Decide what to test, at which level and how much, before anyone writes a test. The plan balances confidence against speed and upkeep, and names the gaps in what exists today.

## When to Use

- A new feature, service or system needs a test plan
- "How should we test this?", "what tests do we need?"
- The suite is slow, flaky or misses regressions and needs rethinking
- Reviewing coverage of an existing area

**Not for:** writing the tests. Follow `.agents/testing-patterns.md` for how tests are written here (if it doesn't exist, generate it with the testing-patterns recipe: `.agents/references/testing-patterns.md`, else `~/.agents/references/testing-patterns.md`), or hand the plan to the `test-automator` subagent.

## The Testing Pyramid

```
        /  E2E  \          few, slow, high confidence
       / Integration \     some, medium speed
      /    Unit Tests  \   many, fast, focused
```

Push each check to the lowest level that can catch the bug. Use a higher level only for what lower ones can't see: wiring, real infrastructure, user flows.

## By Component Type

| Component | Tests |
|---|---|
| API endpoints | Unit tests for business logic, integration tests for the HTTP layer, contract tests for consumers |
| Data pipelines | Input validation, transformation correctness, idempotency, re-runs on partial failure |
| Frontend | Component tests, interaction tests, accessibility; visual regression where layout matters |
| Infrastructure | Smoke tests after deploy, load tests, failure injection where resilience is a requirement |
| Libraries | Unit tests on the public interface, property tests for parsers and pure logic |

## What to Cover, What to Skip

**Cover:** business-critical paths, error handling, edge cases and boundaries, security boundaries (auth, input validation), data integrity, and every bug that already happened once.

**Skip:** trivial getters and setters, framework code, generated code, one-off scripts.

## Process

1. **Understand what's being tested.** Read the spec or code, and list the behaviors and the risks: what breaks, who notices, how bad.
2. **Map what exists.** Find the current tests for the area, their levels, and how long the suite takes. Note flaky or skipped tests.
3. **Assign a level to each behavior** using the pyramid and the component table. One behavior, one level, unless a higher level checks something the lower one can't.
4. **Set coverage targets** by risk, not one number for everything: critical paths covered at integration level, logic at unit level.
5. **Write example cases** for the riskiest areas: name, level, setup, assertion.
6. **List the gaps** between the plan and what exists, ordered by risk.

## Output

A test plan with: the behaviors and risks, the test type for each area, coverage targets, example test cases, the gaps in existing coverage, and the suite time budget if speed is a concern.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "E2E tests catch everything" | They're slow and flaky and don't say where it broke. Use them for a few key flows. |
| "100% coverage everywhere" | Coverage of getters adds upkeep, not confidence. Target by risk. |
| "Mock everything for speed" | Mocks of business logic test the mock. Mock only at boundaries. |
| "We'll add tests after it works" | Then the plan bends to the code. Plan first. |

## Verification

- [ ] Every risk named in step 1 maps to at least one planned test.
- [ ] Each planned test has a level and a reason for that level.
- [ ] The gaps in existing coverage are listed by risk.
