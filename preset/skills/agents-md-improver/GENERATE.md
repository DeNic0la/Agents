---
description: Recipe for a version of the agents-md-improver skill tailored to this repository.
---

# agents-md-improver (recipe)

Generate `.agents/skills/agents-md-improver/`: a version of the instruction-file audit that knows this repository's instruction layout, its real commands and its size budget.

## Generate

1. **Inspect the project.**
   - Every agent instruction file: root and nested `AGENTS.md` and `CLAUDE.md`, `.github/copilot-instructions.md`, `.github/instructions/`, local git-ignored files. Which one is canonical, which are aliases (`@AGENTS.md`), and which sections are managed by an installer or generator.
   - The commands an agent needs (build, test, lint, run) and where they're defined (`package.json`, `Makefile`, build files, CI), so the audit can check documented commands against them.
   - The docs that instruction files point to, or should: `docs/`, `CODING_STANDARDS.md`, `.agents/` references and concepts.
   - Any rules the repo already has for instruction files: a line budget, concepts in `.agents/concepts/`, a validation command such as `agents check`.
2. **Write `SKILL.md`** with frontmatter `name: agents-md-improver` and a `description` that leads with when to use it (auditing or updating this repo's instruction files, or capturing a session's learnings in them). Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Keep the global structure: the two modes (audit and revise), finding the files, the report before any edit, approved diffs only, and the pointers to `writing-for-agents`, `context-engineering`, `retro`, `task-observer` and `compound`. Replace the generic file table with this repo's actual files, which one is canonical, and where each kind of knowledge belongs here.
3. **Copy `references/`** from the global skill. In `quality-criteria.md`, name this repo's real commands and paths to check; in `templates.md`, keep only the templates that fit this repo's layout.
4. **Keep it small.** `SKILL.md` stays under about 120 lines, with no placeholders.
5. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
