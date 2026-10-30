---
name: progressive-disclosure
description: Agent Markdown files are small entry points in their own folder; supporting files load only when needed, keeping token usage minimal.
---

# Progressive disclosure

Applies to every Markdown file written for an AI agent, in any tool: `SKILL.md`, `CONCEPT.md`, `AGENTS.md`, `CLAUDE.md`, `copilot-instructions.md`, subagents, commands and references.

## Rules

1. **One folder per unit.** An entry point such as `SKILL.md` or `CONCEPT.md` lives in its own folder, together with everything that supports it.
2. **The entry point stays small.** It says what the unit is, when it applies, the core rules, and which supporting files exist. Aim for under 100 lines.
3. **Details go in supporting files.** Examples, templates, edge cases, API notes and long explanations each get a file next to the entry point.
4. **Every supporting file is linked with a "read when".** One line per file, saying when to open it. A file that isn't linked is never found. A link without a "when" gets loaded too eagerly.
5. **Never inline supporting files.** No `@file` imports and no copied content in the entry point. The agent opens a file only when the task needs it. One exception: a tool-specific alias may import the shared entry point, such as a `CLAUDE.md` that contains only `@AGENTS.md`.
6. **Links go one level deep.** Supporting files don't send the agent on to further files. Everything is reachable directly from the entry point.
7. **Indexes are one line per item.** An index such as `concepts/INDEX.md` gives each item a name and when it applies, nothing more.

For formats that must be a single file, such as subagents and commands, rule 1 can't apply. Keep the file short and point to a skill or reference for the details.

## Supporting files

- [layout.md](layout.md): read when creating a new skill, concept or other agent folder, or restructuring an oversized one.
