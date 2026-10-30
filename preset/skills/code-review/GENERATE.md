---
description: Recipe for a version of the code-review skill tailored to this repository.
---

# code-review (recipe)

Generate `.agents/skills/code-review/`: a version of the review workflow that knows this repository's checks, standards, spec locations and risk areas.

## Generate

1. **Inspect the project.**
   - The real check commands: build, lint, type check, tests (package scripts, `Makefile`, CI config). Note which are slow and which CI runs.
   - Where standards live: `AGENTS.md`, `CONTRIBUTING.md`, coding-standards files, `.agents/definition-of-done.md`, `.agents/testing-patterns.md`, linter configs (what the linters already enforce is out of scope for the review).
   - Where specs live: the issue tracker (`.agents/issue-tracker.md`), `docs/`, `specs/`, `.specs/tasks/`; and how commits reference issues.
   - The domain glossary and ADRs.
   - Risk areas worth a closer look on every review: money, auth and permissions, migrations, public APIs, hot paths, code with a bug history (`git log` on fix commits).
   - The default branch name.
2. **Write `SKILL.md`** with frontmatter `name: code-review` and a `description` that leads with when to use it (before merging; when another skill asks to review the changes since a fixed point against a spec). Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Keep the global process: pin the diff, find the spec, find the standards, run the checks, review per axis, verify P0-P2 findings, report. Keep the axis codes (`SP`, `CO`, `SE`, `PE`, `ST`), the P0-P3 severities and the exact verdict line, since other skills parse them. Name this repo's commands, spec locations and standards files in place of the generic lists.
3. **Write `references/axes.md`** from the global one, adding this repo's risk areas and documented rules under the matching axis. Copy `references/output-template.md` unchanged.
4. **Copy `agents/claude.yaml`** from the global skill (the `argument-hint`).
5. **Keep it small.** `SKILL.md` stays under about 120 lines, with no placeholders.
6. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
