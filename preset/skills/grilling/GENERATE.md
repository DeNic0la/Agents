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
   - The design tree, rounds and the frontier: at most four questions per round, the ones that remove the most other questions first, none that another question in the same round would answer or reshape. Numbered, each with a recommended answer worded so "yes" accepts it.
   - The smallest option (do nothing, reuse, defer) in every choice question, recommended unless there's a concrete case where it fails.
   - Ask through a structured question tool when one is available, else the chat format block. Only real answers count: a default, timeout or cancellation leaves the decision open.
   - Facts are the agent's job (subagent lookups, naming where to look in this repo, never blocking the rest of the round; disputed premises settled with direct evidence); decisions are the user's.
   - Only questions whose answer changes what gets built or what the user sees.
   - Done when the frontier is empty and the user confirms shared understanding; nothing is acted on before that.
3. **No supporting files** unless a recurring branch list for this repo's typical plans clearly helps; if so, put it in `references/` with a "read when" line.
4. **Keep it small.** `SKILL.md` stays under about 70 lines, with no placeholders.
5. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
