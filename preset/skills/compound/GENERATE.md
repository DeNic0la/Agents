---
description: Recipe for a version of the compound skill tailored to this repository.
---

# compound (recipe)

Generate `.agents/skills/compound/`: a version of the learning-capture skill that uses this repository's knowledge store, vocabulary and verification commands.

## Generate

1. **Inspect the project.**
   - Where learnings live: an existing `docs/solutions/`, or an equivalent such as `docs/learnings/`, a wiki folder or ADRs. Use what exists. Ask the user before introducing `docs/solutions/` next to an existing store.
   - The existing category folders and frontmatter values (`component`, `tags`, `root_cause`), so the generated version suggests those values.
   - The components and areas of the codebase, to seed the `component` vocabulary.
   - Whether the repo treats generated docs as committed knowledge. If it's a fork or an upstream that doesn't want them, say so and don't generate the skill.
   - Where the instruction file points agents today (`AGENTS.md`, `CLAUDE.md`), for the discoverability check.
2. **Write `SKILL.md`** with frontmatter `name: compound` and a `description` that leads with when to use it (after a verified fix whose reasoning isn't recoverable from the code). Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Keep the global process: gate and counterfactual, related-doc search, classify and draft, overlap resolution, grounding, discoverability, short report. Use the repo's store path throughout.
3. **Write `references/doc-format.md`** with this repo's categories, component values and tag conventions in place of the generic suggestions. Keep the closed lists for `problem_type`, `severity` and `resolution_type` unless the repo already uses different ones.
4. **Copy `scripts/check-doc.sh`** and `references/standing-instruction.md` from the global skill. Change the enums in the script only if step 3 changed them.
5. **Keep it small.** `SKILL.md` stays under about 120 lines, with no placeholders.
6. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
