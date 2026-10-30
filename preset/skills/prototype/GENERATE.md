---
description: Recipe for a version of the prototype skill tailored to this repository.
---

# prototype (recipe)

Generate `.agents/skills/prototype/`: a version of the prototyping skill that knows where this repository's prototypes go and how they run.

## Generate

1. **Inspect the project.**
   - Whether it has a UI at all (web, terminal, desktop), and its framework, router and component or styling library.
   - The routing convention, so a throwaway route or `?variant=` switch fits it, and where shared UI components live (for the switcher).
   - The task runner (package scripts, `Makefile`, `justfile`) and how to add a one-command start.
   - How the production build is told apart (`NODE_ENV` or an equivalent), to hide the switcher.
   - Where the domain logic lives, so a logic prototype sits next to the module it's for.
   - The branch naming convention and remote, for the `prototype/<name>` branch, and the issue tracker guide (`.agents/issue-tracker.md`).
2. **Write `SKILL.md`** with frontmatter `name: prototype`, `license: MIT` and a `description` that leads with when to use it (checking a state model or logic, or exploring what a UI should look like). Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Keep the two branches and the six rules. Name this repo's run command and prototype locations in rules 1 and 2.
3. **Copy the supporting files:** `references/logic.md` unchanged, and `references/ui.md` with the switcher example in this repo's framework and router. Drop `references/ui.md` and the UI branch if the repo has no UI.
4. **Keep it small.** `SKILL.md` stays under about 80 lines, with no placeholders.
5. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
