---
description: Recipe for a version of the research skill tailored to this repository.
---

# research (recipe)

Generate `.agents/skills/research/`: a version of the research skill that saves notes where this repository keeps them and knows its trusted sources.

## Generate

1. **Inspect the project.**
   - Where research notes already live (`docs/research/`, `notes/`, `.specs/research/`, a wiki folder) and their file naming and frontmatter. Use what exists; ask the user before creating a new folder.
   - The project's primary sources: the frameworks, libraries and APIs it depends on (from the manifests), with the versions in use and their official docs.
   - Internal sources that count as primary here: ADRs, `GLOSSARY.md`, design docs, the issue tracker guide in `.agents/issue-tracker.md`.
   - Whether notes are committed or kept local.
2. **Write `SKILL.md`** with frontmatter `name: research` and a `description` that leads with when to use it (a question to research, docs or API facts to gather). Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Keep the global process: background subagent, primary sources, cited file with facts, inferences and recommendations kept apart, read it back before finishing. Name this repo's notes folder and its main primary sources with their versions.
3. **Keep it small.** `SKILL.md` stays under about 40 lines, with no placeholders.
4. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
