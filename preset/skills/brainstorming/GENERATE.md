---
description: Recipe for a version of the brainstorming skill tailored to this repository.
---

# brainstorming (recipe)

Generate `.agents/skills/brainstorming/`: a version of the request-to-design skill grounded in this repository's product, users, stack and the place where it keeps design docs.

## Generate

1. **Inspect the project.**
   - What the project does and who uses it, from the README, docs and code.
   - The stack and the established choices a new feature should build on (frameworks, UI kit, storage, deployment).
   - Where specs, design docs, RFCs or ADRs live, and their naming. Use that location instead of `docs/specs/` when one exists.
   - Whether the project has UI where visual mockups help, and which design system or components a mockup should imitate.
   - Which related skills are installed (`interview-me`, `idea-refine`, `planning-and-task-breakdown`) to hand off to.
2. **Write `SKILL.md`** with frontmatter `name: brainstorming` and a `description` that leads with when to use it and stays distinct from `interview-me` and `idea-refine`. Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Sections:
   - **First: what do you actually know:** do clear tasks directly; otherwise start the conversation. The order before implementing: approaches, design doc, approval, then `planning-and-task-breakdown`.
   - **Look before you ask,** naming the parts of this repo to read first.
   - **Your first message** and **The conversation:** one question per message, open questions first, how it gets made (with this repo's defaults), ground to cover, recon, approaches in a message of their own, show-don't-tell, spikes.
   - **Play it back** in chunks, **Size the work,** and the **hard gate:** nothing gets built until the design doc is approved.
   - **Red flags** table.
3. **Put details in supporting files** under `references/`, each with a "read when" line in `SKILL.md`. Write only the ones that help, adapted to this repo:
   - the written design: what it covers, this repo's design-doc location, the builder check
   - the builder-check brief for a fresh subagent
   - the visual companion: temp-file HTML mockups, styled after this project's UI when it has one
4. **Keep it small.** `SKILL.md` stays under about 250 lines, with no placeholders.
5. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
