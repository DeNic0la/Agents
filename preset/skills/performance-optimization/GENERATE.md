---
description: Recipe for a version of the performance-optimization skill tailored to this repository.
---

# performance-optimization (recipe)

Generate `.agents/skills/performance-optimization/`: a version of the performance optimization skill that measures with this repository's real tools, against its real budgets, in the layers it actually has.

## Generate

1. **Inspect the project.**
   - The stack by layer: frontend framework and bundler, backend language and framework, database, and the ORM or query layer between them.
   - Existing performance budgets or SLOs: bundle size limits, Lighthouse or Core Web Vitals targets, latency targets in specs, CI config or monitoring.
   - Profiling and benchmarking tools already in use: Lighthouse CI, bundle analyzers, `web-vitals`, APM or tracing, benchmark suites, load-test scripts, query logging, `EXPLAIN` access.
   - How to take a reproducible measurement here: the exact commands, the environment, the data set, and how noisy repeated runs are.
   - Known hot paths: endpoints, queries, pages or jobs that are slow today or have been optimized before, and any existing ledger of past attempts (a `PERF.md`, PR descriptions).
   - Caching layers and connection pooling in place, and how they are configured.
   - Whether `.agents/performance-checklist.md` exists. The tailored skill should point to it.
2. **Write `SKILL.md`** with frontmatter `name: performance-optimization` and a `description` that says what it does and when to use it. Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Sections:
   - **Overview** and **When to Use:** measure before optimizing; optimize only what measurements prove matters, applied to this repo's layers.
   - **The workflow**, with the repo's real tools and budgets:
     - measure: the baseline commands for each layer this repo has, synthetic and field where both exist
     - identify: the symptom-to-cause tables for this repo's layers, and its known hot paths
     - fix: the anti-patterns that can occur in this stack, one bottleneck at a time
     - verify: re-measure the same way, beat run-to-run variance, keep or revert strictly, and log every attempt where this repo keeps its ledger
     - guard: the repo's budgets and SLOs, and how CI or monitoring enforces them
   - **Common Rationalizations**, **Red Flags** and a **Verification** checklist, kept to the items that apply here.
   - A closing pointer to `.agents/performance-checklist.md` if it exists.
3. **Put details in supporting files** under `references/`, each with a "read when" line in `SKILL.md`. Write optimization patterns only for the layers this repo has, with examples in its own language, framework and ORM:
   - database and backend: N+1 fixes in the repo's ORM, pagination, reading query plans, indexes, connection pool sizing, caching with keys and invalidation
   - frontend: images, re-renders in the repo's UI framework, code splitting with its bundler
   - measuring: where to start from the symptom, with the repo's commands
4. **Keep it small.** `SKILL.md` stays under about 200 lines, with no placeholders.
5. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
