---
name: task-observer
description: Use when the user corrects how the agent works or states a lasting preference (tools, style, conventions, language, "always…", "never…"), when they ask to save a preference, or when they ask what the agent has learned about how they like to work. Records the preference as a rule in the instruction files so later sessions follow it.
license: MIT
---

# Task Observer

Turn the user's corrections into rules that every later session loads. Each rule lives in a `## Working preferences` section of an instruction file the agent reads at the start of a session.

## Modes

- **Observe** (default): the user just corrected you or stated a preference. Offer to record it.
- **Learn** (`learn <preference>`): save the given preference; with no text, save the last correction the user made.
- **Preferences** (`preferences`): show the saved preferences and suggest ones to merge or remove.

## What counts

A lasting preference holds beyond the current task: "always use pnpm", "don't comment obvious code", "tests go next to the file", "answer in Romanian", "never touch the generated folder". A one-off instruction for the task at hand is not one. If unsure, ask whether it should apply from now on.

Route what isn't a personal or team preference elsewhere:

- A fact about the project (a command, a gotcha, a quirk): the `agents-md-improver` skill.
- A lesson about how a specific skill works: patch that skill (the `skill-review` skill).
- Workplace shorthand (people, acronyms, project names): the `memory-management` skill.

## Where it goes

| Preference | File |
|---|---|
| About this project, shared with the team | the project's `AGENTS.md`. If the project has no `AGENTS.md` but another instruction file the agents load (`CLAUDE.md`, `.github/copilot-instructions.md`), use that. If `CLAUDE.md` only imports `@AGENTS.md`, write to `AGENTS.md`. |
| Personal, for every project | the user's global instructions (`~/.codex/AGENTS.md`, `~/.claude/CLAUDE.md`, `~/.copilot/copilot-instructions.md`, whichever the tools in use read) |
| Personal, this project only | a git-ignored local instruction file, if the tool in use reads one; otherwise the global instructions |

If the global file is a link into a preset repository (as with this preset, where all three point at the preset's `AGENTS.md`), edit the file it points to and tell the user, so they can commit it. Keep the rule tool-neutral there.

## Record a preference

1. Write it as one short, specific, imperative line: `- Use pnpm, never npm or yarn.`
2. Show the line and the proposed file, and ask the user to confirm both. Say why you chose that file (team-shared or personal).
3. After they agree, add it under `## Working preferences`, creating the section at the end of the file if needed. If a rule on the same topic exists, replace it instead of adding a contradicting one.
4. Never record secrets, credentials or personal data.

## Show and tidy

1. Read the `## Working preferences` sections in the project and global files and show them, grouped by file.
2. Suggest rules to merge (overlapping), remove (outdated, contradicted by the code, or no longer wanted) or move (personal rules in the shared file, or the reverse).
3. Apply only what the user approves. Keep each section short; merge similar rules.

## Red Flags

- A preference saved without the user confirming the wording and the file.
- A one-off instruction recorded as a lasting rule.
- Two rules on the same topic that contradict each other.
- A personal preference written into the team's shared file.
