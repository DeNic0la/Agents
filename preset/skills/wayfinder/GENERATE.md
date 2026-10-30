---
description: Recipe for a version of the wayfinder skill tailored to this repository.
---

# wayfinder (recipe)

Generate `.agents/skills/wayfinder/`: a version of the wayfinding skill wired to this repository's tracker, labels and domain.

## Generate

1. **Inspect the project.**
   - `.agents/issue-tracker.md`, especially "Wayfinding operations". If it's missing, generate it first from the issue-tracker recipe (`.agents/references/issue-tracker.md`, else `~/.agents/references/issue-tracker.md`).
   - Whether the `wayfinder:` labels exist, and how this tracker expresses parent and child issues, native blocking and the frontier query.
   - The domain glossary and ADRs, and which skills are installed (`grilling`, `domain-modeling`, `research`, `prototype`, `to-spec`) for the ticket types.
   - Existing maps (issues labelled `wayfinder:map`) to stay consistent with.
2. **Write `SKILL.md`** with frontmatter `name: wayfinder` and a one-line `description` for the human. Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Sections:
   - **Plan, don't do**, **Asking questions** (the `grilling` format; decisions recorded only after the user answers) and **Refer by name.**
   - **The tracker:** the map is an index, tickets are children; this repo's exact commands for the map, children, blocking and the frontier, taken from `.agents/issue-tracker.md`.
   - **Ticket Types:** research (AFK subagent using the `research` skill), prototype (HITL throwaway artifact, the `prototype` skill without its fold-in step), grilling (HITL, the `grilling` and `domain-modeling` skills), task (does rather than decides).
   - **Invocation:** chart the map (destination, smallest version, breadth-first frontier, map, create-then-wire tickets, fire research subagents, stop) and work through the map (load, choose and claim, resolve by label, challenge the answer, record and commit, prune, graduate fog, hand off to `to-spec`). Never resolve more than one ticket per session, except research.
3. **Put details in `references/map-format.md`** with a "read when" line: the map body (including Added so far) and ticket templates, claiming, blocking and the frontier, fog of war, and out of scope.
4. **Copy both adapters** from the global skill: `agents/claude.yaml` (`disable-model-invocation: true`, `argument-hint`) and `agents/openai.yaml` (`allow_implicit_invocation: false`). The skill stays user-invoked.
5. **Keep it small.** `SKILL.md` stays under about 100 lines, with no placeholders.
6. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
