---
description: Recipe for a version of the qa skill tailored to this repository.
---

# qa (recipe)

Generate `.agents/skills/qa/`: a version of the QA workflow that knows how this repository's program is built, started, seeded and driven.

## Generate

1. **Inspect the project.**
   - What the user meets: a CLI, a terminal UI, a web app, an HTTP API, a library. A repo can have several.
   - The real build and start commands (README, package scripts, `Makefile`, CI), and how to run against scratch state: a data or config directory flag, a test database, seed scripts, a test account.
   - What QA must never touch: production services, real accounts, shared databases.
   - For a web app: the dev server command and port, any existing Playwright or Cypress setup, and the critical user flows.
   - For a terminal program: the environment variables and config paths it reads, so a run can point them at `$DIR`.
   - The request sources: the issue tracker (`.agents/issue-tracker.md`) and spec folders.
2. **Write `SKILL.md`** with frontmatter `name: qa` and a `description` that leads with when to use it (after implementing a change and before code review; a QA pass or smoke test). Keep `license` and `compatibility`. Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Keep the global process: pin the change and request, write scenarios, launch, run, clean up and report with the same three verdicts. Name this repo's commands and scratch-state setup in step 3.
3. **Copy the supporting files** from the global skill: `scripts/tui.sh` unchanged, `references/scenarios.md`, and whichever of `references/terminal.md` and `references/browser.md` apply. Add this repo's launch command and seeded state to the driver reference; drop the one that doesn't apply.
4. **Copy `agents/claude.yaml`** (the `argument-hint`).
5. **Keep it small.** `SKILL.md` stays under about 120 lines, with no placeholders.
6. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
