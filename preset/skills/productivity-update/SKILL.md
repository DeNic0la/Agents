---
name: productivity-update
description: Use when syncing TASKS.md with assignments from the project tracker or GitHub, triaging stale or overdue tasks, filling memory gaps for unknown people, terms or projects, or (comprehensive mode) scanning chat, email, calendar and documents for todos that were never captured.
---

# Productivity Update

Keep the task list and memory current. Formats: `TASKS.md` in the `task-management` skill, working memory and `memory/` in the `memory-management` skill.

Two modes:

- **Default:** sync tasks from connected trackers, triage stale items, fill memory gaps.
- **Comprehensive** (`--comprehensive`, or "a deep scan"): everything in default, plus a scan of chat, email, calendar and documents for missed todos and new memories.

Never add, complete or change a task or memory without the user's confirmation.

## Default mode

### 1. Load the current state

Read `TASKS.md`, the working memory (`AGENTS.md`, or `CLAUDE.md` if that's where it lives) and `memory/`. If they don't exist, suggest the `productivity-start` skill first and stop.

### 2. Sync tasks from external sources

Use whichever sources are available:

- the project tracker, if one is connected
- GitHub issues, when in a repository with the `gh` CLI: `gh issue list --assignee=@me`

If none is available, skip to step 3. Otherwise fetch the open and in-progress tasks assigned to the user and compare them with `TASKS.md`:

| External task | In TASKS.md? | Action |
|---|---|---|
| found, not in TASKS.md | no | offer to add |
| found, already in TASKS.md | yes (fuzzy title match) | skip |
| in TASKS.md, not found externally | no | flag as possibly stale |
| completed externally | in Active | offer to mark done |

Show the differences and let the user decide.

### 3. Triage stale items

In Active, flag tasks with a past due date, tasks active for 30+ days, and tasks with no context (no person, no project). For each: done, reschedule, or move to Someday?

### 4. Decode tasks for memory gaps

For each task, try to decode every entity (people, projects, acronyms, tools, links) through the tiered lookup in the `memory-management` skill:

```
Task: "Send PSR to Todd re: Phoenix blockers"
- PSR → Pipeline Status Report (in glossary)
- Todd → Todd Martinez (in people/)
- Phoenix → not in memory
```

### 5. Fill the gaps

Ask about the unknown terms, grouped, each with the task it came from ("Phoenix", from "Send PSR to Todd re: Phoenix blockers": what is Phoenix?). Add the answers to the right memory files.

### 6. Capture enrichment

Tasks often hold more than memory does. Propose updates for:

- **links** in tasks: add to the project or person file
- **status changes** ("launch done"): update the project, demote it from working memory
- **relationships** ("Todd's sign-off on Maya's proposal"): cross-reference the people
- **deadlines**: add to the project file

### 7. Report

```
Update complete:
- Tasks: +3 from the tracker, 1 completed, 2 triaged
- Memory: 2 gaps filled, 1 project enriched
- All tasks decoded
```

## Comprehensive mode

Everything in default mode, then:

### Scan activity

Read whichever sources are connected: recent chat messages and active channels, sent email, recently touched documents, recent and upcoming calendar events. Say which sources weren't available.

### Flag missed todos

Compare the activity with `TASKS.md` and list action items that aren't tracked, each with its source and date:

```
Possible missing tasks:
1. Chat (Jan 18): "I'll send the updated mockups by Friday" → add?
2. Meeting "Phoenix Standup" (Jan 17): recurring meeting, but no Phoenix tasks active → anything needed?
3. Email (Jan 16): "I'll review the API spec this week" → add?
```

Let the user pick which to add.

### Suggest new memories

List new people and projects not in memory, with how often and where they appeared, plus cleanup candidates ("Horizon: no mentions in 30 days, mark completed?"). Offer high-confidence items to add directly; ask about the rest.

## Notes

- Keep external links when adding tasks from a tracker.
- Safe to run often: it only changes things when there's something new.
- Comprehensive mode is always interactive.
