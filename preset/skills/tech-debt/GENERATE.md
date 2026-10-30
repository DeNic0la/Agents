---
description: Recipe for a version of the tech-debt skill tailored to this repository.
---

# tech-debt (recipe)

Generate `.agents/skills/tech-debt/`: a version of the tech debt audit that uses this repository's tools, markers and known problem areas.

## Generate

1. **Inspect the project.**
   - The languages and package managers, with their outdated and audit commands (`npm outdated`, `mvn versions:display-dependency-updates`, `pip list --outdated`, ...).
   - Complexity or quality tools already configured (linters, Sonar, code climate), and how to run them locally.
   - Marker conventions: which of `TODO`, `FIXME`, `HACK` are used, and whether they carry issue references.
   - How skipped or quarantined tests are marked here.
   - Known debt: existing debt labels or issues in the tracker, ADRs that accept a shortcut, `docs/solutions/` entries.
   - Whether `.agents/issue-tracker.md` exists.
2. **Write `SKILL.md`** with frontmatter `name: tech-debt` and a `description` that leads with when to use it (tech debt audits, refactoring priorities). Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Keep the categories, the scoring formula and the phased plan; replace the generic evidence commands with this repo's, and list its known debt areas as starting points.
3. **Keep it small.** `SKILL.md` stays under about 100 lines, with no placeholders.
4. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
