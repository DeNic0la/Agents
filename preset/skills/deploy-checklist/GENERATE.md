---
description: Recipe for a version of the deploy-checklist skill tailored to this repository.
---

# deploy-checklist (recipe)

Generate `.agents/skills/deploy-checklist/`: a version of the deploy checklist that matches how this repository is actually built, released and rolled back.

## Generate

1. **Inspect the project.**
   - Whether anything here is deployed at all. A library is released, not deployed: if so, tailor the checklist to publishing a release (version bump, changelog, tag, package publish), or tell the user the skill doesn't fit and stop.
   - The pipeline: CI config, deploy jobs, environments (staging, production), canary or blue-green support, who may deploy.
   - Migrations: the tool, where migrations live, how they run in deploys, and whether rollback migrations exist.
   - Feature flags: the system and how flags are defined.
   - Monitoring: where error rates, latency and dashboards live, and existing baselines or SLOs.
   - Runbooks, release notes and changelog conventions.
   - `.agents/observability-checklist.md` and `.agents/definition-of-done.md`, if they exist.
2. **Write `SKILL.md`** with frontmatter `name: deploy-checklist` and a `description` that leads with when to use it (before a deploy or release). Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Keep the process; name this repo's commands for checking CI status and listing the release's changes, and its monitoring for the rollback baselines.
3. **Write `references/deploy-checklist.md`** with this repo's environments, deploy steps, rollback command and conditional sections for only the change types it has.
4. **Keep it small.** `SKILL.md` stays under about 80 lines, with no placeholders.
5. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
