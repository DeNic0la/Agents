---
name: productivity-start
description: Use when setting up the personal productivity system (TASKS.md, working memory and the dashboard) for the first time, bootstrapping working memory from an existing task list, or decoding the shorthand (nicknames, acronyms, project codenames) the user writes in their todos.
---

# Productivity Start

Set up the task list and the two-tier memory in the working directory, add the dashboard, and on a first run learn the user's workplace shorthand from their own tasks.

The file formats are defined in the `task-management` skill (`TASKS.md`) and the `memory-management` skill (working memory and `memory/`). Follow them.

**Working memory** is the instruction file the agent loads at the start of every session in this directory: `AGENTS.md`, with a `CLAUDE.md` that contains only `@AGENTS.md` for tools that read `CLAUDE.md`. If the directory already keeps its memory in `CLAUDE.md`, keep using that.

## 1. Check what exists

In the working directory:

- `TASKS.md`: the task list
- `AGENTS.md` (or `CLAUDE.md`): working memory
- `memory/`: deep memory
- `dashboard.html`: the visual board

## 2. Create what's missing

- No `TASKS.md`: create it from the template in the `task-management` skill.
- No `dashboard.html`: copy `assets/dashboard.html` from this skill's folder into the working directory.
- No working memory and no `memory/`: this is a first run. Finish steps 3 and 4, then bootstrap memory (step 5).

## 3. Point to the dashboard

Don't try to open a browser from a shell: the agent may run somewhere the user's browser can't be reached. Tell the user: "The dashboard is at `dashboard.html`. Open it in Chrome or Edge (it needs the File System Access API), then choose `TASKS.md` and this folder."

The dashboard is a single local file. It reads and writes only the files the user picks, and loads nothing remote except the Inter font from Google Fonts.

## 4. Orient the user

If everything already existed: "Your tasks and memory are loaded. Ask me to update them (the `productivity-update` skill), or for a comprehensive update that also scans your chat, email, calendar and documents." Stop here.

## 5. Bootstrap memory (first run only)

The best source of workplace language is the user's real task list: real tasks carry real shorthand.

Ask: "Where do you keep your todos? A local file (`TASKS.md`, `todo.txt`), an app (a project tracker, a notes app), or a notes file. I'll use your tasks to learn your shorthand." Read it from the file, or from the tracker if one is connected; otherwise ask the user to paste it.

For each task, look for nicknames, acronyms and abbreviations, project names or codenames, and internal jargon. Ask about each new term, a few at a time, and never about one you've already decoded:

```
Task: "Send PSR to Todd re: Phoenix blockers"

A few terms I want to get right:
1. PSR: what does it stand for?
2. Todd: who is Todd (full name, role)?
3. Phoenix: a project codename? What is it about?
```

## 6. Offer a comprehensive scan (optional)

"Do you want me to scan your messages, email, documents and calendar too? It takes longer but builds much richer context about people, projects and terms. Or we stick with what we have and add context later."

If yes, read whichever of these sources are connected: recent chat messages and channels, sent email and recipients, recently touched documents and collaborators, meetings and attendees. Skip any that aren't and say so. Group what you find:

- **Ready to add** (high confidence): offer to add directly.
- **Needs clarification**: ask the user.
- **Low frequency or unclear**: note for later.

## 7. Write the memory files

From everything gathered, write the working memory (about 50-80 lines) and the `memory/` files in the formats from the `memory-management` skill: `memory/glossary.md`, `memory/people/<name>.md`, `memory/projects/<name>.md`, `memory/context/company.md`. Create the `CLAUDE.md` alias if it's missing.

## 8. Report

```
Productivity system ready:
- Tasks: TASKS.md (X items)
- Memory: X people, X terms, X projects
- Dashboard: dashboard.html, open it in Chrome or Edge

Ask me for an update to keep it current, or a comprehensive update for a deep scan.
```

## Notes

- If everything is already set up, this only points to the dashboard.
- Nicknames matter most: always capture how people are actually referred to.
- If a source isn't available, skip it and name the gap.
- Memory grows through normal conversation after the bootstrap.
- Never record passwords, tokens or other secrets in memory.
