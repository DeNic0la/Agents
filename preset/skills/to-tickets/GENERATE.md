---
description: Recipe for a version of the to-tickets skill tailored to this repository.
---

# to-tickets (recipe)

Generate `.agents/skills/to-tickets/`: a version of the ticket breakdown that knows this repository's layers, tracker and conventions for large changes.

## Generate

1. **Inspect the project.**
   - The issue tracker guide (`.agents/issue-tracker.md`): creating issues, parent and child links, native blocking or the `Blocked by:` convention, labels. If it's missing, generate it first with the issue-tracker recipe.
   - The layers a vertical slice crosses here (for example schema, API, UI, tests), so the slice rules name them.
   - How wide refactors were done before (`git log` for renames or migrations across many files), and whether the repo uses feature flags or integration branches.
   - Existing tickets, to match their title style and size.
   - The glossary and ADRs that ticket text must respect.
2. **Write `SKILL.md`** with frontmatter `name: to-tickets`, `license: MIT` and a one-line `description` for the human (it's user-invoked). Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Keep the global steps (gather context, explore, draft vertical slices with blocking edges and the expand-contract exception, quiz the user, publish), with this repo's layers and tracker operations filled in.
3. **Write `references/ticket-template.md`** from the global one, in the exact shape this tracker uses.
4. **Copy both adapters** from the global skill so it stays user-invoked: `agents/claude.yaml` and `agents/openai.yaml`.
5. **Keep it small.** `SKILL.md` stays under about 120 lines, with no placeholders.
6. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
