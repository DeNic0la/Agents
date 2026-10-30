---
description: Recipe for a version of the incident-response skill tailored to this repository.
---

# incident-response (recipe)

Generate `.agents/skills/incident-response/`: a version of the incident workflow that uses this project's severity levels, tools, runbooks and rollback paths.

## Generate

1. **Inspect the project.**
   - Whether anything here runs in production. If not (a library, internal tooling), tell the user the skill doesn't fit and stop.
   - Existing incident docs: severity definitions, on-call rotation, escalation contacts, status page, postmortem folder and format. Use what exists.
   - Runbooks, and the fastest mitigation paths: the rollback command, feature flag system, failover or scaling controls.
   - Monitoring: dashboards, alerting, log search, and where deploy history is visible.
   - `.agents/observability-checklist.md` and whether `.agents/issue-tracker.md` exists.
2. **Write `SKILL.md`** with frontmatter `name: incident-response` and a `description` that leads with when to use it (production down or degraded, alerts, status updates, postmortems). Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Keep the four phases and the rule to ask before any production change. Use this project's severity table, name its mitigation commands and runbooks, and say where postmortems are saved.
3. **Write `references/status-update.md` and `references/postmortem.md`** in this project's existing formats, or copy the global templates if it has none.
4. **Keep it small.** `SKILL.md` stays under about 120 lines, with no placeholders.
5. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
