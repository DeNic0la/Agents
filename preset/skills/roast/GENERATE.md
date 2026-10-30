---
description: Recipe for a version of the roast skill tailored to this repository.
---

# roast (recipe)

Generate `.agents/skills/roast/`: a version of the five-seat panel and verdict grounded in this repository's architecture, failure history and decision records.

## Generate

1. **Inspect the project.**
   - The architecture and runtime: services, data stores, deployment, and who operates them.
   - Failure history the Breaker should know about: postmortems, incident docs, recurring bug areas.
   - Decision records the Investigator must check: `docs/adr/` or similar, and `.out-of-scope/`.
   - Where evidence lives: code, dependency manifests, dashboards, logs or metrics the agent can read.
   - The constraints that recur in briefs here: team size, compatibility promises, compliance, platforms.
   - The kinds of experiments that are cheap here: test commands, benchmark harnesses, preview environments.
2. **Write `SKILL.md`** with frontmatter `name: roast` and a `description` that leads with when to use it (pressure-testing a technical idea before building it) and stays distinct from `grilling`. Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Keep the global version's process: brief, five independent seats in parallel, judge with veto gates, cheapest spike, stop at the verdict.
3. **Write the references** next to it, adapted from the global ones:
   - `references/brief.md`: add sections for this repo's recurring constraints.
   - `references/seats.md`: name this repo's real failure modes for the Breaker, and where the evidence and decision records are for the Investigator. Keep the Analyst limited to the brief.
   - `references/verdict.md`: change the weights only if the user asks. List the spike types that are cheap here, with the actual commands.
4. **Copy the adapters** `agents/claude.yaml` and `agents/openai.yaml` from the global skill, so it stays user-invoked.
5. **Keep it small.** `SKILL.md` stays under about 100 lines, with no placeholders.
6. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
