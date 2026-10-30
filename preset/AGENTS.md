# Personal instructions

These instructions apply to every project on every machine this preset is installed on, for Claude Code, Codex and GitHub Copilot alike.

## Concepts

`~/.agents/concepts/INDEX.md` lists the concepts I've declared: rules for how instructions for AI agents are written and organized. Whenever you create or edit agent instructions anywhere (AGENTS.md, CLAUDE.md, copilot-instructions.md, skills, subagents, commands, hooks, prompts), read the index first and follow every concept that applies. A project may also carry its own copies under `.agents/concepts/`.

## Skills

If a repository has its own version of a skill in `.agents/skills/<name>/`, always use it instead of the global skill with the same name. It's tailored to that repository.

## References

`~/.agents/references/` holds lookup material: cheat sheets, API notes, links, snippets. List the folder and open only the files relevant to the task.

## Findings

In a repository with a `.findings/` folder, stay on the current goal. Anything off it, such as a tangent, an unrelated bug or an edit you're tempted to make, goes in `.findings/generic.md` as a short entry, and then you move on. Never read `.findings/` unless asked. The details are in `~/.agents/concepts/findings/CONCEPT.md`.
