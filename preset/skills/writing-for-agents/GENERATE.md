---
description: Recipe for a version of the writing-for-agents skill tailored to this repository.
---

# writing-for-agents (recipe)

Generate `.agents/skills/writing-for-agents/`: a version of the agent-document writing reference grounded in this repository's own instruction files, skills and pointers.

## Generate

1. **Inspect the project.**
   - Every document an agent reads here: `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.agents/` (concepts, references, skills), `.claude/` (skills, agents, commands, rules), and docs those point to.
   - The always-loaded pointers: lines in `AGENTS.md`/`CLAUDE.md` and skill descriptions. Note which are weakly worded, duplicated or stale.
   - The project's shared vocabulary: terms in a glossary, README or domain docs that could serve as leading words.
   - Which concepts the project follows (`.agents/concepts/`).
2. **Write `SKILL.md`** with frontmatter `name: writing-for-agents` and a `description` that leads with when to use it (creating or editing any document an agent reads here, or one being ignored or growing long). Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Sections, each illustrated with this repo's files where one fits:
   - **Context pointers:** what the material is plus one trigger per branch; front-load the leading word.
   - **The two loads:** context load versus cognitive load.
   - **Information hierarchy:** in-file step, in-file reference, disclosed reference; progressive disclosure, co-location and sprawl.
   - **Steps and completion criteria:** clarity and demand.
   - **When to split:** by sequence and by invocation.
   - **Leading words** and **negation**: prompt the positive.
   - **Pruning:** single source of truth, environment as source of truth, relevance, sediment, no-ops.
3. **Put details in supporting files** under `references/`, each with a "read when" line in `SKILL.md`:
   - skill mechanics: the invocation choice, splitting by invocation and router skills, with the adapter rules from the portable-skills concept linked rather than restated
   - optionally, an audit of this repo's always-loaded pointers with suggested rewrites
4. **Keep it small.** `SKILL.md` stays under about 200 lines, with no placeholders.
5. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
