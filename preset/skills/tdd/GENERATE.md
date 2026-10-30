---
description: Recipe for a version of the tdd skill tailored to this repository.
---

# tdd (recipe)

Generate `.agents/skills/tdd/`: a version of the test-first loop that uses this repository's test runner, seams, conventions and gate.

## Generate

1. **Inspect the project.**
   - The test runner and the commands to run one test, one file, the tests of one module, and the full required gate (package scripts, `Makefile`, CI config).
   - Lint and type-check commands, and how to scope them to changed files.
   - Where tests live and how they are named; `.agents/testing-patterns.md` if it exists.
   - The usual seams: the public interfaces tests already cross (HTTP handlers, service APIs, CLI entry points), and the system boundaries that are mocked today (external APIs, time, the network).
   - The test database or fakes the project uses instead of mocks.
   - The glossary and ADRs.
   - Whether the build rejects unused names (Go, some linters), which shapes how mutations are written.
2. **Write `SKILL.md`** with frontmatter `name: tdd` and a `description` that leads with when to use it (building or fixing test-first; tests at agreed seams; characterization tests before a refactor). Keep `license: MIT`. Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Keep the global content: what a good test is, seams, anti-patterns and the rules of the loop. Name this repo's commands in "green is the affected seam" and its usual seams under "Seams".
3. **Copy the supporting files** from the global skill: `scripts/mutate.sh` unchanged, `CREDITS.md` and `NOTICE` unchanged, and `references/`. Rewrite the examples in `references/tests.md` and `references/mocking.md` in this repo's language and test framework. In `references/mutation.md`, add a worked `mutate.sh` call with this repo's test command.
4. **Keep it small.** `SKILL.md` stays under about 120 lines, with no placeholders.
5. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
