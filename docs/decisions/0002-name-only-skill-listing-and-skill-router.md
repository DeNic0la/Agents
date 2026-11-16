# 0002 Name-only skill listing and a skill router

- **Status:** accepted, implemented (2026-11-16)

## Context

Every skill an agent may start on its own puts its name and description into every session. The preset's 65 such skills took about 21,500 characters; Claude Code allows 1% of the context window and, when that's exceeded, drops descriptions of the least-used skills, regardless of what the current task needs.

## Decision

- In Claude Code, `skillOverrides` lists every agent-invoked preset skill by name only, except `skill-router` and `dependency-vetting` (which must trigger mid-task, before anything gets installed). Name-only skills stay invocable.
- `skill-router`, an agent-invoked global skill, lists the 11 areas; the agent reads the matching area router's skill table and loads the skills that fit.
- The global instructions tell agents to use it at the start of each task and whenever the goal, focus or lifecycle state changes. The instruction matters more than the router's description: a new skill with no usage history is the first whose description Claude Code drops.
- `agents check` reports the listing size for Codex/Copilot and for Claude Code after the overrides.

## Rejected

- **Raise the listing budget** (`skillListingBudgetFraction`): every session would pay for all descriptions.
- **Make the 11 area routers agent-invoked:** more churn in adapters and rules for the same effect.
- **Change the listing per session** by rewriting overrides: settings are shared by concurrent sessions and linked into this repo.

## Consequences

- The preset's share of Claude Code's listing dropped to about 1,600 characters.
- Codex and Copilot have no name-only mode; they still list every description. Codex's `skills.max_context_tokens` is the lever there.
- A new agent-invoked skill must be added to `skillOverrides` in every environment's settings, or it's listed with its description.
