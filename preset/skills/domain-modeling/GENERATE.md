---
description: Recipe for a version of the domain-modeling skill tailored to this repository.
---

# domain-modeling (recipe)

Generate `.agents/skills/domain-modeling/`: a version of the domain-modeling discipline that knows this repository's bounded contexts, glossary and decision records.

## Generate

1. **Inspect the project.**
   - Whether `GLOSSARY.md` or `GLOSSARY-MAP.md` exists, and the terms it already defines.
   - The contexts in the code: top-level modules or services with their own language. Decide single vs multi-context.
   - Where decisions are recorded today (`docs/adr/`, `docs/decisions/`, RFCs) and their naming and numbering. Use that location instead of `docs/adr/` when one exists.
   - Terms the code uses inconsistently (two names for one thing, one name for two things): candidates for the first challenges.
2. **Write `SKILL.md`** with frontmatter `name: domain-modeling` and a `description` that leads with when to use it (changing the domain language, not just reading it). Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Sections:
   - **Overview:** the active discipline of building and sharpening the domain model; merely reading the glossary isn't this skill.
   - **File structure:** this repo's actual glossary and ADR locations (single or multi-context), created lazily.
   - **During the session:** challenge against the glossary, sharpen fuzzy language, discuss concrete scenarios from this domain, cross-reference with code, update the glossary inline (glossary only, no implementation details), offer ADRs sparingly (hard to reverse, surprising without context, a real trade-off).
3. **Put details in supporting files** under `references/`, each with a "read when" line in `SKILL.md`:
   - the glossary format, with this repo's context names in the examples
   - the ADR format, with this repo's location and numbering
4. **Keep it small.** `SKILL.md` stays under about 120 lines, with no placeholders.
5. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
