---
description: Recipe for a version of the grilling skill tailored to this repository.
---

# grilling (recipe)

Generate `.agents/skills/grilling/`: a version of the stress-test interview grounded in this repository's domain, decision records and the facts an agent can look up here.

## Generate

1. **Inspect the project.**
   - The domain and its language: `GLOSSARY.md` or `GLOSSARY-MAP.md`, the README, docs.
   - Where decisions are recorded (`docs/adr/` or similar), so settled decisions aren't re-asked.
   - Where facts live that a subagent should look up rather than ask: code, config, schemas, docs, dashboards the agent can read.
   - The kinds of plans that typically get grilled here (features, migrations, architecture changes) and the branches they usually have.
2. **Write `SKILL.md`** with frontmatter `name: grilling` and a `description` that leads with when to use it (stress-testing an existing plan, decision or idea) and stays distinct from `interview-me`. Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Content:
   - The design tree, rounds and the frontier: ask every question whose prerequisites are settled, numbered, each with a recommended answer worded so "yes" accepts it.
   - The round format block.
   - Facts are the agent's job (subagent lookups, naming where to look in this repo, never blocking the rest of the round); decisions are the user's.
   - Done when the frontier is empty and the user confirms shared understanding; nothing is acted on before that.
3. **No supporting files** unless a recurring branch list for this repo's typical plans clearly helps; if so, put it in `references/` with a "read when" line.
4. **Keep it small.** `SKILL.md` stays under about 60 lines, with no placeholders.
5. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
