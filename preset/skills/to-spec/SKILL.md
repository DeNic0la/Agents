---
name: to-spec
description: "Turn the current conversation into a spec and publish it to the project issue tracker: no interview, just synthesis of what you've already discussed."
license: MIT
---

# To spec

> **Repo version first:** if this repository has `.agents/skills/to-spec/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

This skill takes the current conversation context and codebase understanding and produces a spec. Synthesize what you already know instead of re-grilling the idea: the only things you ask the user are the seam check in step 2 and any step 4 finding that needs a decision.

The issue tracker and triage label vocabulary are in `.agents/issue-tracker.md`. If that file doesn't exist, generate it first with the issue-tracker recipe: `.agents/references/issue-tracker.md` in the project, else `~/.agents/references/issue-tracker.md`.

If the user passes an issue or map reference, fetch it from the tracker. For a `wayfinder` map, the decisions live in one of two places. When the map names a written destination (a spec or ADRs a ticket already assembled), read that destination: it's the decision record, and you fetch a linked ticket only where the destination is silent. Otherwise fetch every ticket its **Decisions so far** section links: those tickets hold the decisions the spec collapses into a plan.

## Process

1. Explore the repo to understand the current state of the codebase, if you haven't already. Use the project's domain glossary vocabulary throughout the spec, and respect any ADRs in the area you're touching.

2. Sketch out the seams at which you're going to test the feature. Existing seams should be preferred to new ones. Use the highest seam possible. If new seams are needed, propose them at the highest point you can. The fewer seams across the codebase, the better - the ideal number is one.

   Check with the user that these seams match their expectations.

3. Write the spec using the template in [references/spec-template.md](references/spec-template.md) (read it when you start writing). Don't publish it yet.

4. Check the draft in a fresh context. This context wrote the spec, so it shares the spec's blind spots. Give one subagent the draft, repo access and this brief: "Report: (a) places where the spec contradicts itself, or a user story conflicts with an implementation decision or Out of Scope; (b) implementation decisions the current codebase can't support as written, citing the file; (c) user stories that no implementation or testing decision covers; (d) when the spec came from a decision record (a map's destination or tickets), decisions that contradict it or settle what it never settled. Quote the spec line for each finding. Under 300 words." Without subagents, do the same check yourself after rereading only the draft and the code it names.

   Fix the findings that have one clear fix. A finding that needs a decision goes to the user before you publish.

5. Publish the spec to the project issue tracker as `.agents/issue-tracker.md` describes. Apply the `ready-for-agent` triage label - no need for additional triage.

   When the spec came from a `wayfinder` map, start its body with a `## Parent` section linking the map. After publishing, comment the spec's link on the map and close the map: the spec is its destination.
