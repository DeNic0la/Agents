---
name: improve-tests
description: Cut a test suite to the tests that catch real bugs and its run time to the minimum, proving every cut keeps the checks that matter.
license: MIT
---

# Improve Tests

> **Repo version first:** if this repository has `.agents/skills/improve-tests/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

## Overview

Measure a test suite, find the tests that cost time and catch nothing and the setup that wastes time, and cut both. The goal is the shortest run that still catches the bugs this project actually makes. Start from a measured baseline and an assessment: if the suite is already lean, say so and stop.

Test files are the target, so editing and deleting them is expected. Production code changes only where a test needs a seam (step 7), and only as the approved plan names it. If cheap tests are impossible because module boundaries are wrong across several modules, that's architecture work: say so and point to the `improve-codebase-architecture` skill. For writing new tests test-first, use the `tdd` skill.

## Principles

Findings cite these by name.

- **Name the break.** A test earns its place by the break it catches: a realistic change to production code that turns it red. A test with no nameable break costs time and catches nothing. Spend tests where the project goes wrong: complicated conditionals, money, security, code with a bug history.
- **Our data, not their library.** Where our code hands work to a library (PDF, email, image, HTTP client, ORM, router), our claim is the data we hand it. Build that data in a plain function and assert on it in a fast test. Keep one smoke test per adapter that the real library accepts our data.
- **Cheapest level.** Every claim sits at the cheapest level that still keeps its failure mode. A high-level test (request, system, browser, e2e) keeps only what nothing lower can catch: wiring, configuration, one happy path per critical flow.
- **Observable behavior.** A test asserts outputs and state at a public boundary, so it survives a refactor. Mock only what others observe (an email sent, a third-party API, a queue); use the real thing or a fast fake for what only this app touches.
- **Evidence over coverage.** Line coverage shows a line ran, not that anything checked it. Rank evidence that a claim stays covered: a mutation run, then a read of the other test's assertion, then line coverage. A test that never failed can still be the only guard of a rare break.

## Guardrails

1. **The default verdict is Lean.** A few slow tests isn't a problem. Don't invent cuts.
2. **Never remove the only guard of a claim we own.** Every deletion names where its claim stays covered, or why the claim isn't ours.
3. **Keep list,** unless the user says otherwise: regression tests tied to a bug or incident (a test that names an incident ID guards against that incident recurring), contract tests at a service boundary, tests of error text or formats consumers rely on, property and invariant tests, tests on money, auth and permissions.
4. **Speed never buys a weaker claim.** Stubbing the database in a test whose claim is the query is a deletion, and needs a deletion's evidence.
5. **No new dependencies without asking.** Propose a profiler or mutation tool the project lacks; if the user agrees, vet it with the `dependency-vetting` skill first.

## Process

1. **Baseline.** Find every suite from the manifests and CI config; the CI command is the one that counts. Check the tree is clean and the suite green; if it's red or flaky, stop and say so. Run each suite with per-test and per-file timing (commands in [references/speed-levers.md](references/speed-levers.md); read it now), on a quiet machine with nothing else running, including your own subagents. Record per suite: command, wall time, test and file counts, share of time in boot, import and setup, and the 20 slowest files and tests. Scope to the user's path if given, else the whole suite, slowest files first.
2. **Map the claims.** Send independent subagents, one per area of the test tree, in parallel. Each reads its area's tests in full, edits nothing, runs step 3 on its area, and returns one row per test file: level, production code exercised, claims (one line each), real libraries driven, doubles, time, and per claim its break, move and evidence. Brief them with step 3's moves and the path to [references/red-flags.md](references/red-flags.md). Without subagents, do the areas yourself and state the independence gap. Done when every file in scope has a row or a reason it was skipped.
3. **Diagnose.** For each claim, name the break, then take the first move that applies: **Delete** (no nameable break, or checked elsewhere at the same or cheaper level), **Demote** (real claim above its cheapest level), **Merge** (near-duplicates into one parameterized test), **Rewrite** (real claim, fragile or over-mocked test), **Fix flake**, **Keep**. The red-flags reference names each defect and its move. For claims marked covered in another area, read the other test's assertion yourself. If the project has a mutation tool set up, run it on the modules whose tests you'd delete and record mutants that lose their only killer. Then read the timing profile against the speed levers: a lever is a finding only when the profile shows the time it recovers.
4. **Assess.** Each finding carries its payoff: seconds saved, or the maintenance cost removed. A finding with neither is a preference; drop it.

   | Verdict | Meaning | Action |
   |---|---|---|
   | **Lean** | Tests catch real breaks at sensible levels | Show the baseline and **stop**. |
   | **Localized** | A few files or one lever hold most of the waste | Present only those. |
   | **Systemic** | Waste across the suite | Rank candidates; recommend the top 3-5 batches. |

   On a suite this skill already trimmed, the verdict is Lean. A specific cut the user names on a Lean suite is scoped strictly to that cut.
5. **Present batches** the user accepts or rejects whole (one lever, or one flag across one area), ranked by seconds saved, then maintenance removed. Per batch: the change, the flag or lever, the estimated saving, where each removed claim stays covered, and the risk. Let the user pick several (a multi-select question where the host has one, else a numbered list in chat).
6. **Plan** the accepted batches without editing files: files to edit or delete, replacement tests a demotion writes first, any production seam, and the verify command. Order: levers that change no test; demotions and rewrites, replacements first; deletions; tiers and CI splits last. Get explicit approval before step 7.
7. **Apply,** per batch: write replacement tests first and see them pass (extract a data builder where a seam is missing, so the library call becomes a thin adapter); apply the edits and deletions; run the full suite, in random order where the runner supports it; time it against the baseline and revert a lever that saves nothing measurable; commit the batch on its own. When a batch goes red, revert it and retry smaller.
8. **Verify and report.** Run each suite with the baseline command back to back with the base commit under the same load. Compare coverage in the changed areas when it was recorded: a line that lost its only test is library behavior or trivial (say which), or its test comes back. Report per suite (wall time, test and file counts, before and after), per batch (change, measured saving, where removed claims live now), and what stayed and why. Re-assess the changed areas: the verdict is Lean. Don't start a second round of the same cuts.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Coverage didn't drop, so the deletion is safe" | Coverage shows a line ran, not that anything checked it. |
| "This test never failed, delete it" | It may be the only guard of a rare break. Name where its claim stays covered. |
| "Stubbing this makes it 10x faster" | If it removes what the test proves, it's a deletion. |
| "The timings are close enough" | Numbers under different load don't compare. Measure back to back. |

## Red Flags

- Cuts made on a red or flaky suite.
- A deletion with no named cover.
- A keep-list test removed without the user's say-so.
- Production code changed outside a planned seam.

## Verification

- [ ] A baseline row from a real run exists for every suite.
- [ ] Every deletion names its cover or why the claim isn't ours.
- [ ] Each batch is its own commit with a measured saving.
- [ ] Before and after timings were taken under the same load.
