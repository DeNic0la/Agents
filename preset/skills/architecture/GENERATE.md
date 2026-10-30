---
description: Recipe for a version of the architecture skill tailored to this repository.
---

# architecture (recipe)

Generate `.agents/skills/architecture/`: a version of the decision and design-review skill that uses this repository's ADR location, format and constraints.

## Generate

1. **Inspect the project.**
   - Where decisions are recorded (`docs/adr/`, `docs/decisions/`, RFCs) and their naming, numbering, status values and sections. Use what exists. If the repo has a tailored `domain-modeling` skill, use the same location and format it uses, so both skills write one ADR series.
   - Single or multi-context: whether `GLOSSARY-MAP.md` exists and which contexts have their own ADR folder.
   - The current stack and the hard constraints a decision must respect: hosting, compliance, approved technologies, budget.
   - Who signs off on architecture decisions here, if the repo says (CODEOWNERS, a contributing guide).
   - Whether `.agents/issue-tracker.md` exists.
2. **Write `SKILL.md`** with frontmatter `name: architecture` and a `description` that leads with when to use it (choosing between technologies, recording a decision with trade-offs, reviewing a design). Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Keep both modes and the three-part ADR gate. Name this repo's ADR location and its constraints in the Decide mode, and its conventions in the Evaluate checks.
3. **Write `references/tech-choice-adr.md`** in this repo's ADR format, with the option comparison added.
4. **Keep it small.** `SKILL.md` stays under about 100 lines, with no placeholders.
5. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
