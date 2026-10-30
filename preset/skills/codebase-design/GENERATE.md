---
description: Recipe for a version of the codebase-design skill tailored to this repository.
---

# codebase-design (recipe)

Generate `.agents/skills/codebase-design/`: the deep-module vocabulary, illustrated with this repository's own modules, dependencies and test setup.

## Generate

1. **Inspect the project.**
   - Its main modules and how they depend on each other: one or two that are deep (small interface, a lot hidden) and one or two that are shallow or leak a decision into another module.
   - Its external dependencies, sorted into the four dependency categories of `references/deepening.md`: which have local stand-ins (an in-memory database, a fake filesystem), which are owned services across a network, which are third-party.
   - Its test setup: where tests live, whether they go through module interfaces or mock internals, and existing fakes or adapters.
   - The domain glossary (`GLOSSARY.md`) and ADRs that constrain module boundaries.
2. **Write `SKILL.md`** with frontmatter `name: codebase-design`, `license: MIT`, the `metadata` credits from the global skill, and a `description` that leads with when to use it (designing or deepening a module, placing a seam, making code testable). Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Keep the glossary, the principles and the rejected framings word for word. Replace the generic testability examples with examples from this repo, in its language.
3. **Write the references.** Copy `references/red-flags.md` and `references/design-it-twice.md`. Write `references/deepening.md` with this repo's dependencies listed under each category and its real stand-ins and adapters named.
4. **Copy `CREDITS.md` and `NOTICE`** unchanged: the MIT attribution must travel with the skill.
5. **Keep it small.** `SKILL.md` stays under about 120 lines, with no placeholders.
6. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
