---
description: Recipe for a version of the grill-with-docs skill tailored to this repository.
---

# grill-with-docs (recipe)

Generate `.agents/skills/grill-with-docs/`: the entry point that runs the grilling and domain-modeling skills together, pointed at this repository's glossary and decision records.

## Generate

1. **Inspect the project.**
   - Where the glossary lives (`GLOSSARY.md`, `GLOSSARY-MAP.md`, or none yet) and where ADRs live (`docs/adr/` or similar).
   - Whether repo versions of `grilling` and `domain-modeling` exist in `.agents/skills/`.
2. **Write `SKILL.md`** with frontmatter `name: grill-with-docs` and a one-line `description` for the human (it's user-invoked). Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Body: one or two sentences telling the agent to use the `grilling` and `domain-modeling` skills together on what the user named, updating this repo's glossary and ADR locations inline.
3. **Copy both adapters** from the global skill unchanged: `agents/claude.yaml` (`disable-model-invocation`, `argument-hint`) and `agents/openai.yaml` (`allow_implicit_invocation: false`). They keep it user-invoked.
4. **Keep it small.** A few lines, no supporting files.
5. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
