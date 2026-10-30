---
description: Recipe for a version of the teach skill tailored to this repository or workspace.
---

# teach (recipe)

Generate `.agents/skills/teach/`: a version of the teaching skill fitted to this workspace's topic, its existing learning state and how the user likes to be taught.

## Generate

1. **Inspect the workspace.**
   - The topic and mission: `MISSION.md` if it exists, otherwise the README or what the user says.
   - Existing state: `TERMS.md`, `RESOURCES.md`, `learning-records/`, `lessons/`, `reference/`, `assets/` (especially a shared stylesheet) and `NOTES.md`. An older workspace may keep its teaching glossary in `GLOSSARY.md`; if that file is a teaching glossary rather than a domain model, offer to rename it to `TERMS.md`.
   - Whether the topic leans on knowledge or on skills, and which feedback loops fit it (quizzes, in-browser tasks, real-world step lists).
   - How lessons get opened on this machine (`open`, `xdg-open`, `start`).
2. **Write `SKILL.md`** with frontmatter `name: teach` and a one-line `description` for the human. Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Sections:
   - **Teaching Workspace:** the workspace files and folders, using the paths that already exist here, each format file linked with a "read when".
   - **Philosophy:** knowledge, skills and wisdom; fluency vs. storage strength and desirable difficulty.
   - **Lessons** and **Assets:** short, beautiful, self-contained HTML built from shared components, tied to the mission, in the zone of proximal development, with citations, a primary source and a reminder to ask follow-up questions.
   - **The Mission**, **Zone of Proximal Development**, **Knowledge**, **Skills** (tight feedback loops, quiz answer hygiene), **Acquiring Wisdom** (communities, respecting an opt-out), **Reference Documents** and **NOTES.md**.
3. **Put the formats in supporting files** under `references/`: `mission-format.md`, `terms-format.md`, `resources-format.md` and `learning-record-format.md`, adapted to this topic's examples.
4. **Copy both adapters** from the global skill: `agents/claude.yaml` (`disable-model-invocation: true`, `argument-hint`) and `agents/openai.yaml` (`allow_implicit_invocation: false`). The skill stays user-invoked.
5. **Keep it small.** `SKILL.md` stays under about 150 lines, with no placeholders.
6. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
