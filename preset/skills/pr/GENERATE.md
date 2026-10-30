---
description: Recipe for a version of the pr skill tailored to this repository.
---

# pr (recipe)

Generate `.agents/skills/pr/`: a version of the PR-body skill that fits this repository's review habits and evidence.

## Generate

1. **Inspect the project.**
   - An existing pull request template (`.github/pull_request_template.md`, `.gitlab/merge_request_templates/`). If there is one, the generated skill fills that template and adds the Summary, Evidence and Merge danger content inside its sections instead of replacing it.
   - Recent merged PR bodies, to see what reviewers here expect.
   - Where the domain glossary lives (`GLOSSARY.md` or equivalent).
   - What evidence the project can produce: the test command, whether UI changes can be screenshotted, demo or preview environments.
   - What blast radius means here: public APIs and their consumers, database migrations, deploy targets.
2. **Write `SKILL.md`** with frontmatter `name: pr` and a `description` that leads with when to use it (opening a PR or writing a PR body). Use spec fields only and no runtime controls; see the portable-skills concept. Keep `license` and the `metadata` credits. Leave out the "Repo version first" notice. Keep the template, the evidence ranking and the door/blast-radius definitions; fill in this repo's evidence commands and typical blast radii.
3. **Copy `references/summary-views.md`, `CREDITS.md` and `NOTICE`** from the global skill. Keep only the views that fit this codebase, and keep the attribution unchanged.
4. **Keep it small.** `SKILL.md` stays under about 60 lines, with no placeholders.
5. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
