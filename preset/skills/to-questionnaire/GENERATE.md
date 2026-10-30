---
description: Recipe for a version of the to-questionnaire skill tailored to this repository.
---

# to-questionnaire (recipe)

Generate `.agents/skills/to-questionnaire/`: a version of the questionnaire skill that knows who this project usually asks, and where questionnaires belong.

## Generate

1. **Inspect the project.**
   - The usual recipients of open questions: stakeholders, owning teams, domain experts named in the README, CODEOWNERS or docs.
   - Where shared documents live (`docs/`, a decisions or RFC folder), and whether questionnaires should be committed or kept out of the repo.
   - The domain glossary (`GLOSSARY.md`) whose terms the questions should use.
2. **Write `SKILL.md`** with frontmatter `name: to-questionnaire` and a one-line `description` for the human. Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Keep:
   - **Grill the send, not the subject:** ask only who it goes to and what the user needs back, one exchange each, each step with its "done when".
   - **Write the questionnaire** to this repo's location and naming, most-important-first, grouped by theme, in the glossary's terms.
   - **Document structure** and the questionnaire template: purpose, from/to/use, context, how to answer, themed questions with answer stubs and an optional "why this matters", and a closing catch-all.
3. **Copy both adapters** from the global skill: `agents/claude.yaml` (`disable-model-invocation: true`, `argument-hint`) and `agents/openai.yaml` (`allow_implicit_invocation: false`). The skill stays user-invoked.
4. **Keep it small.** `SKILL.md` stays under about 80 lines, with no placeholders other than the template's.
5. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
