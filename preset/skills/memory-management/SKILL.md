---
name: memory-management
description: Use when the user's request contains workplace shorthand to decode (nicknames, acronyms, project codenames, internal terms), when they say "remember this", "X means Y" or ask "who is X" / "what does X mean", or when people, projects or terms need adding, promoting or demoting. Two-tier memory - a short working memory plus a memory/ folder.
---

# Memory Management

Memory lets the agent understand the user's workplace language the way a colleague would:

```
User: "ask todd to do the PSR for oracle"
  → "Ask Todd Martinez (Finance lead) to prepare the Pipeline Status Report
     for the Oracle Systems deal ($2.3M, closing Q2)"
```

Without memory, that request is meaningless. This skill is about the user's workplace (people, projects, internal terms). A codebase's domain language goes in `GLOSSARY.md` through the `domain-modeling` skill; a working preference goes through the `task-observer` skill.

## Two tiers

```
AGENTS.md         ← working memory: hot cache, loaded every session
memory/
  glossary.md     ← full decoder ring: every term, nickname, codename
  people/         ← one profile per person
  projects/       ← one file per project
  context/        ← company, teams, tools, processes
```

**Working memory** is the instruction file the agent loads at the start of every session in the working directory: `AGENTS.md`, with a `CLAUDE.md` that contains only `@AGENTS.md` for tools that read `CLAUDE.md`. If the directory already keeps its memory in `CLAUDE.md`, keep using that. It holds the top ~30 people, the ~30 most common terms, the 5-15 active projects and the user's preferences, enough for about 90% of daily decoding, in about 50-100 lines.

**`memory/`** holds everything, in as much detail as execution needs, and can grow without limit.

The file formats, with examples: [references/formats.md](references/formats.md). Read it before creating or restructuring any memory file.

## Decode before acting

Always decode shorthand before acting on a request:

1. **Working memory:** check first; it covers most cases.
2. **`memory/glossary.md`:** if the term isn't in working memory.
3. **`memory/people/`, `memory/projects/`, `memory/context/`:** when execution needs detail (drafting an email to Todd: working memory says who he is; his profile says he prefers chat and is direct).
4. **Ask:** "What does X mean? I'll remember it."

## Add to memory

When the user says "remember this" or "X means Y":

- **Terms** (acronyms, shorthand): add to `memory/glossary.md`; if used often, also to working memory.
- **People:** create or update `memory/people/<name>.md`; add to working memory if they're a frequent contact. Always capture nicknames and alternate names.
- **Projects:** create or update `memory/projects/<name>.md`; add to working memory while active. Always capture codenames ("Phoenix", "the migration").
- **Preferences:** add to the Preferences section of working memory.

Never store passwords, tokens or other secrets.

## Recall

For "who is X" or "what does X mean": check working memory, then `memory/`. If it's not there: "I don't know what X means yet. Can you tell me?"

## What goes where

| Type | Working memory | `memory/` |
|---|---|---|
| Person | top ~30 frequent contacts | `glossary.md` + `people/<name>.md` |
| Acronym or term | ~30 most common | `glossary.md` (all of them) |
| Project | active ones only | `glossary.md` + `projects/<name>.md` |
| Nickname | with the person, if in the top 30 | `glossary.md` (all of them) |
| Company context | quick reference only | `context/company.md` |
| Preferences | all of them | none |
| Stale or historical | remove | keep |

**Promote** to working memory when a term or person comes up often or is part of active work. **Demote** to `memory/` only when a project ends, a person is no longer a frequent contact, or a term is rarely used. This keeps working memory short and current.

## Conventions

- Tables for lookups; **bold** names in working memory so they scan.
- Filenames lowercase with hyphens: `todd-martinez.md`, `project-phoenix.md`.
- To bootstrap memory from the user's task list and connected sources, use the `productivity-start` skill; to refresh it, the `productivity-update` skill.
