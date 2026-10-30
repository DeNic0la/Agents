# Concepts

Rules I declare for AI agents (Claude Code, Codex, GitHub Copilot): how their instructions are written and organized, and how they work in a project. They apply to everything in this repo, and to any new agent instructions: AGENTS.md and CLAUDE.md files, skills, subagents, commands, hooks and prompts.

Each concept is a folder with `CONCEPT.md` as its entry point. Open a concept only when it applies to the task.

| Concept | Applies when |
|---|---|
| [progressive-disclosure](progressive-disclosure/CONCEPT.md) | writing or restructuring any Markdown file meant for an AI agent |
| [findings](findings/CONCEPT.md) | always, in a project with a `.findings/` folder: something off the current goal comes up, or you're asked to work through findings |
| [portable-skills](portable-skills/CONCEPT.md) | writing a skill or command, deciding who may invoke a skill, or adding tool-specific or runtime settings (allowed-tools, context, ...) to one |

## Adding a concept

1. Create `<name>/CONCEPT.md` with `name` and `description` frontmatter. Put supporting files next to it.
2. Add one row to the table above.
