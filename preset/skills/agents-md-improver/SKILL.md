---
name: agents-md-improver
description: Use when asked to check, audit, fix or update a project's agent instruction files (AGENTS.md, CLAUDE.md, copilot-instructions.md and nested or local variants), when they seem stale or wrong, or at the end of a session to add what it taught about the codebase (commands, gotchas, quirks). Scores each file against the codebase and proposes targeted diffs.
license: Apache-2.0
---

# AGENTS.md Improver

> **Repo version first:** if this repository has `.agents/skills/agents-md-improver/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

## Overview

Keep a project's agent instruction files accurate and lean. They load into every session, so a stale command or a wrong path misleads every agent, and every extra line costs every turn. This skill checks them against the real codebase and proposes small, specific edits. It never edits a file before the user approves the diff.

Two modes:

- **Audit** (default): find every instruction file, score it, report, then propose fixes.
- **Revise**: the user wants this session's learnings captured ("update AGENTS.md with what we learned", "revise the instructions"). Skip the scoring; go straight to proposing additions.

## When to Use

- The user asks to audit, check, improve or fix `AGENTS.md`, `CLAUDE.md` or `copilot-instructions.md`.
- Documented commands fail, paths are wrong, or agents keep missing a project quirk.
- A session ends with project knowledge the instruction files lack.

Not this skill:

- How to write or structure an agent document in general: the `writing-for-agents` skill.
- Setting up a project's context from scratch, or what context a task or subagent should get: the `context-engineering` skill.
- A review of the whole agent environment after a session (checks, coding standards, tooling, information access): the `retro` skill.
- A user's personal working preference ("always use pnpm"): the `task-observer` skill.
- The reasoning behind one solved problem: the `compound` skill.

## Find the files

Search the repository (skip `node_modules`, build output and vendored code):

| File | Scope |
|---|---|
| `AGENTS.md` at the root | the project, shared through git; read by most agents |
| `CLAUDE.md` at the root | the same for tools that read it; often only `@AGENTS.md` |
| `.github/copilot-instructions.md`, `.github/instructions/*.instructions.md` | the same for Copilot |
| nested `AGENTS.md` / `CLAUDE.md` | one package or folder |
| `CLAUDE.local.md` and other git-ignored local files | one person, not shared |
| the user's global instructions (e.g. `~/.codex/AGENTS.md`, `~/.claude/CLAUDE.md`, `~/.copilot/copilot-instructions.md`) | every project; audit only when asked |

Work out which file is canonical and which are aliases. A `CLAUDE.md` that only imports `@AGENTS.md` is an alias: edit `AGENTS.md`, never duplicate content into the alias. Leave managed blocks (sections an installer or generator writes) alone.

## Audit mode

1. **Read each file completely**, then check it against the codebase: run or inspect the documented commands, confirm the referenced paths exist, compare the architecture description with the actual tree.
2. **Score it.** Use the rubric in [references/quality-criteria.md](references/quality-criteria.md) (read it now): commands, architecture, non-obvious patterns, conciseness, currency, actionability. Grade A (90-100) to F (below 30).
3. **Report before changing anything:** files found, average score, then per file the score table, the issues and the recommended additions or cuts.
4. **Propose targeted diffs** (step "Propose and apply" below).

## Revise mode

1. **Reflect on the session.** What context was missing that would have helped? Commands used or discovered, code patterns followed, testing approaches that worked, environment or configuration quirks, warnings and gotchas hit.
2. **Filter.** Keep only what is project-specific, durable and not obvious from the code. Drop one-off fixes, generic advice and anything already in the files.
3. **Place each item.** Team-shared knowledge goes in the canonical project file (or the nested file for its package). Personal, machine-specific notes go in a git-ignored local file.
4. **Propose and apply** (below).

## Propose and apply

For each change, show the file, the section, the diff, and one line on why it helps future sessions. Format and what to add or leave out: [references/update-guidelines.md](references/update-guidelines.md) (read it before drafting). Templates for a missing file or section: [references/templates.md](references/templates.md) (read only when creating a file or a whole section).

- One line per concept. Copy-paste-ready commands.
- Prefer a pointer to an existing doc over copying its content in. Long material belongs in a doc the file points to, with a line saying when to read it (the progressive-disclosure concept, `~/.agents/concepts/progressive-disclosure/CONCEPT.md`).
- Cuts count as improvements: stale lines, duplicates across files, rules that don't change agent behavior.
- Apply only the changes the user approves. Keep the file's existing structure and voice.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll fix it directly, the report is overhead" | The user decides what loads into every session. Report and diff first. |
| "More context is better" | Every line costs every turn. A line that doesn't change behavior is noise. |
| "The command is probably still right" | Check it. A wrong command in the instructions is worse than none. |
| "I'll copy it into CLAUDE.md too, to be safe" | Duplicates drift. Edit the canonical file; aliases import it. |

## Red Flags

- An instruction file edited before the user saw the diff.
- Generic advice ("write tests", "use clear names") added.
- The same content in `AGENTS.md` and `CLAUDE.md`.
- A file growing past about 200 lines without pointers to disclosed docs.

## Verification

- [ ] Every instruction file in scope was found and read, and its canonical file identified.
- [ ] Each documented command and path in the touched sections was checked against the codebase.
- [ ] In audit mode, the report came before any edit.
- [ ] Every applied change was approved and is project-specific, current and concise.
