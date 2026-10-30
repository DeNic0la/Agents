---
description: Recipe for a version of the systematic-debugging skill tailored to this repository.
---

# systematic-debugging (recipe)

Generate `.agents/skills/systematic-debugging/`: a version of the root-cause-first debugging skill that uses this repository's real commands, logs, components and known failure modes.

## Generate

1. **Inspect the project.**
   - The commands to run one test, one test file and the full suite, and how to get verbose output.
   - Where logs, traces and error output go locally and in CI; which debug flags or env vars exist.
   - The component boundaries data crosses (for example CLI → service → database, CI → build → deploy) and how to log at each.
   - Recurring failure modes in the history: flaky tests, environment differences, test pollution. Read recent fix commits and issues.
   - `.agents/testing-patterns.md` and `.agents/definition-of-done.md`, if they exist.
2. **Write `SKILL.md`** with frontmatter `name: systematic-debugging` and a `description` that leads with when to use it (any bug, test failure or unexpected behavior, before proposing fixes). Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Sections:
   - **Overview** and **The Iron Law:** no fixes without root cause investigation first.
   - **When to Use**, including the "especially when" and "don't skip when" lists.
   - **The Four Phases**, as instructions, with this repo's real commands:
     - Root cause investigation: read errors, reproduce (name the command), check recent changes, instrument each component boundary of this system, trace data flow.
     - Pattern analysis: find working examples in this codebase and compare.
     - Hypothesis and testing: one hypothesis, smallest change, verify.
     - Implementation: failing test first per `.agents/testing-patterns.md`, single fix, verify against `.agents/definition-of-done.md`; after three failed fixes, question the architecture with the user.
   - **Red Flags**, **Common Rationalizations** and a **Quick Reference** table.
3. **Put details in supporting files** under `references/`, each with a "read when" line in `SKILL.md`. Write only the ones that help, adapted to this repo:
   - root-cause tracing, with the polluter search using this repo's test runner
   - defense in depth, using this repo's layers
   - condition-based waiting, using the test framework's own wait or poll helper when it has one
   - known failure modes of this repo and how they were diagnosed
4. **Keep it small.** `SKILL.md` stays under about 250 lines, with no placeholders.
5. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
