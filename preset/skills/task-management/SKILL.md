---
name: task-management
description: Use when the user asks about their personal todos or commitments ("what's on my plate", "remind me to", "done with X", "what am I waiting on"), or when a meeting or conversation produces action items for them. Keeps a plain TASKS.md in the working directory.
---

# Task Management

The user's personal tasks live in `TASKS.md` in the current working directory, a plain file that both the user and the agent edit. If it exists, read and write it; if not, create it from the template below.

This is a personal todo list. A development task to specify and implement goes through the `add-task` skill (`.specs/tasks/`); work tracked in the project's issue tracker stays there.

## Template

A new `TASKS.md` gets exactly this, with no example tasks:

```markdown
# Tasks

## Active

## Waiting On

## Someday

## Done
```

## Task format

- Open: `- [ ] **Task title** - context, for whom, due date`
- Sub-bullets for details.
- Done: `- [x] ~~Task title~~ (date)`
- **Bold** the title so the list scans quickly.
- "for <person>" when it's a commitment to someone; "due <date>" for deadlines; "since <date>" for waiting items.
- Keep the Done section for about a week, then clear old items.

## How to respond

- **"What's on my plate" / "my tasks":** read the file, summarize Active and Waiting On, and point out anything overdue or urgent.
- **"Add a task" / "remind me to":** add it to Active in the task format, with whatever context was given (for whom, due date).
- **"Done with X" / "finished X":** find it, change `[ ]` to `[x]`, strike the title through, add the completion date, and move it to Done.
- **"What am I waiting on":** read Waiting On and say how long each item has been waiting.

Decode names and terms in tasks with the `memory-management` skill when it's set up.

## Extracting tasks

When summarizing a meeting or conversation, offer to add the tasks it produced: commitments the user made ("I'll send that over"), action items assigned to them, and follow-ups. Ask before adding; never add without confirmation.

## Dashboard

A visual board (`dashboard.html`) reads and writes the same `TASKS.md`: drag-and-drop, auto-save, and it picks up edits made to the file outside it. If the working directory has no `dashboard.html` the first time tasks come up, mention that the `productivity-start` skill sets it up together with memory.
