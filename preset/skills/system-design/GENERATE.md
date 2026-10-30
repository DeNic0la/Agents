---
description: Recipe for a version of the system-design skill tailored to this repository.
---

# system-design (recipe)

Generate `.agents/skills/system-design/`: a version of the system design skill that starts from this repository's existing architecture, stack and design doc conventions.

## Generate

1. **Inspect the project.**
   - The current architecture: deployables, databases, queues, caches, external services, and how they connect. Existing architecture docs and diagrams.
   - The stack and platform constraints: languages, cloud or hosting, infrastructure as code, what the team already runs in production.
   - Where design docs and ADRs live, and their format. Use those locations instead of `docs/specs/` and `docs/adr/` when they exist.
   - Known non-functional requirements: SLOs, traffic numbers, data volumes, compliance rules.
   - `GLOSSARY.md` and the bounded contexts, if the project has them.
2. **Write `SKILL.md`** with frontmatter `name: system-design` and a `description` that leads with when to use it (designing a system or major component from requirements). Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Keep the process (requirements, load estimate, high-level design, deep dive, scale and reliability, trade-offs, what to revisit, write the doc); state this repo's existing components and constraints as the starting point, and its design doc location.
3. **Write `references/design-doc.md`** in the shape of this repo's existing design docs, or copy the global template if there are none.
4. **Keep it small.** `SKILL.md` stays under about 100 lines, with no placeholders.
5. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
