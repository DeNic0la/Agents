---
description: Recipe for a version of the testing-strategy skill tailored to this repository.
---

# testing-strategy (recipe)

Generate `.agents/skills/testing-strategy/`: a version of the test planning skill that knows this repository's test levels, tools and suite budget.

## Generate

1. **Inspect the project.**
   - The test levels it has (unit, component, integration, contract, end-to-end, load) with their frameworks, folders and run commands.
   - The component types it contains (APIs, pipelines, frontend, infrastructure, libraries), so the component table lists only those.
   - How long each suite takes locally and in CI, and any known flaky or quarantined tests.
   - Coverage tooling and any thresholds CI enforces.
   - `.agents/testing-patterns.md`, if it exists.
2. **Write `SKILL.md`** with frontmatter `name: testing-strategy` and a `description` that leads with when to use it (deciding how to test something before writing tests). Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Keep the pyramid, cover/skip rules, process and output; replace the component table with this repo's components and tools, and state its coverage thresholds and suite time budget.
3. **Keep it small.** `SKILL.md` stays under about 100 lines, with no placeholders.
4. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
