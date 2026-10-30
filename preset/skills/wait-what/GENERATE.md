---
description: Recipe for a version of the wait-what skill tailored to this repository.
---

# wait-what (recipe)

Generate `.agents/skills/wait-what/`: the "re-pitch that" entry point, pointed at this repository's own vocabulary.

## Generate

1. **Inspect the project.**
   - Where the domain language lives: `GLOSSARY.md`, `GLOSSARY-MAP.md`, or another glossary or terminology doc.
   - If there is none, the README and docs sections that define the project's terms.
2. **Write `SKILL.md`** with frontmatter `name: wait-what` and a one-line `description` for the human (it's user-invoked). Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Body, in the user's voice: the last message did not land; re-pitch it with a little context, in ASD-STE100 Simplified Technical English, using the terms from this repo's glossary (naming its real path).
3. **Copy both adapters** from the global skill unchanged: `agents/claude.yaml` (`disable-model-invocation: true`) and `agents/openai.yaml` (`allow_implicit_invocation: false`). They keep it user-invoked.
4. **Keep it small.** A few lines, no supporting files.
5. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
