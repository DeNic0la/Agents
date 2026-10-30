---
description: Recipe for a version of the improve-tests skill tailored to this repository.
---

# improve-tests (recipe)

Generate `.agents/skills/improve-tests/`: a version of the test-suite trimming workflow that knows this repository's suites, runners, profilers and keep list.

## Generate

1. **Inspect the project.**
   - Every suite and the command CI runs for it (package scripts, `Makefile`, `.github/workflows/` or other CI config): unit, integration, browser, e2e; backend and frontend.
   - The runners and their versions, and the timing and profiling commands that work with them (confirm flags against `--help`).
   - Profilers, coverage and mutation tools already set up.
   - The test levels in use and how tests are tagged by level.
   - Areas that belong on the keep list: money, auth, permissions, public contracts, regression tests tied to incidents.
   - Known slow setup: factories, fixtures, database cleanup strategy, browser login.
2. **Write `SKILL.md`** with frontmatter `name: improve-tests`, `license: MIT` and a one-line `description` for the human (it's user-invoked). Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Keep the global principles, guardrails and eight steps. Name this repo's suites and CI commands in step 1, and add its keep-list areas to guardrail 3.
3. **Write `references/speed-levers.md`** with only the rows for this repo's runners and the levers that apply to its stack. Copy `references/red-flags.md`, translating the examples into this repo's test framework.
4. **Copy both adapters** unchanged: `agents/claude.yaml` and `agents/openai.yaml`. They keep it user-invoked.
5. **Keep it small.** `SKILL.md` stays under about 150 lines, with no placeholders.
6. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
