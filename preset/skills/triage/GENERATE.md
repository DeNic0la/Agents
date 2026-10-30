---
description: Recipe for a version of the triage skill tailored to this repository.
---

# triage (recipe)

Generate `.agents/skills/triage/`: a version of the triage workflow that knows this repository's tracker, labels, contributors and how to reproduce its bugs.

## Generate

1. **Inspect the project.**
   - The issue tracker guide (`.agents/issue-tracker.md`): read, comment, label, close; whether external PRs are triaged and who counts as external. If it's missing, generate it first with the issue-tracker recipe.
   - The real label for each triage role (`bug`, `enhancement`, `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). Ask the user about any role without a label, and record the mapping in the tracker guide.
   - Issue templates (`.github/ISSUE_TEMPLATE/` or similar) and the fields they collect.
   - How to reproduce a bug here: the run and test commands, a local preview, seed data.
   - The glossary, ADRs and `.out-of-scope/` records.
2. **Write `SKILL.md`** with frontmatter `name: triage`, `license: MIT` and a one-line `description` for the human (it's user-invoked). Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Keep the AI disclaimer line, the roles and transitions, the attention buckets, the five triage steps, the quick override and resuming, with this repo's labels, commands and reproduction steps filled in.
3. **Copy `references/agent-brief.md` and `references/needs-info.md`** from the global skill. Add an example brief drawn from this repo if one exists.
4. **Copy both adapters** from the global skill so it stays user-invoked: `agents/claude.yaml` and `agents/openai.yaml`.
5. **Keep it small.** `SKILL.md` stays under about 120 lines, with no placeholders.
6. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
