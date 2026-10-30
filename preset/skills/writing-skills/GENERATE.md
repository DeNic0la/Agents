---
description: Recipe for a version of the writing-skills skill tailored to this repository.
---

# writing-skills (recipe)

Generate `.agents/skills/writing-skills/`: a version of the test-driven skill-writing skill that knows where this repository keeps its skills and instruction files, how it validates them, and how to run test agents here.

## Generate

1. **Inspect the project.**
   - Where this repo's skills and agent instructions live: `.agents/skills/`, `.claude/skills/`, `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, subagents.
   - How they're validated: `agents check` when the repo is this preset, any lint or CI job for Markdown or frontmatter.
   - Which concepts the project follows (`.agents/concepts/`), especially portable-skills and progressive-disclosure.
   - How test agents can run here: subagents in the tools the team uses, API access, any existing eval or scenario files.
   - Skills or instructions that agents in this repo have been seen to skip or misapply. Ask the user.
2. **Write `SKILL.md`** with frontmatter `name: writing-skills` and a `description` that leads with when to use it (proving a skill or instruction file changes agent behavior before it ships, or when agents ignore or rationalize around one). Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Sections:
   - **Overview** and the **TDD mapping**: baseline (RED), minimal skill (GREEN), close loopholes (REFACTOR).
   - **When to create a skill** and **skill types** (technique, pattern, reference).
   - **Directory structure** and **file organization** as this repo lays them out, with its validation command.
   - **The Iron Law:** no skill or edit without a failing test first.
   - **Testing by skill type**, **Match the Form to the Failure**, and **micro-testing wording** against a no-guidance control.
   - **Common Rationalizations**, **Anti-Patterns** and a per-skill **creation checklist** ending in this repo's validation and commit steps.
3. **Put details in supporting files** under `references/`, each with a "read when" line in `SKILL.md`. Write only the ones that help:
   - discovery: description and naming guidance, consistent with the portable-skills concept
   - bulletproofing against rationalization
   - pressure scenarios for this repo's instruction files, and a worked example from a skill in this repo
4. **Keep it small.** `SKILL.md` stays under about 300 lines, with no placeholders.
5. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
