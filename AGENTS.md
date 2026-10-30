# Agents repo

This repo is my personal agent preset for Claude Code, Codex and GitHub Copilot. See [README.md](README.md) for usage and [REQUIREMENTS.md](REQUIREMENTS.md) for what it must do.

- Before adding to `preset/`, check which layer the content belongs to (README, "The mental model"): workflows are skills, roles are personas (`agents/`), entry points are commands, shared checklists are references. Project-specific files (DoD, testing patterns, ...) are kept only as recipes in `references/`, never as example content.
- Everything under `preset/` is instructions for AI agents. It must follow the concepts in [preset/concepts/INDEX.md](preset/concepts/INDEX.md); read the index before adding or changing anything there.
- Content under `preset/` must stay tool-neutral. Tool-specific files go in `tools/<tool>/`.
- Skills follow [portable-skills](preset/concepts/portable-skills/CONCEPT.md): spec fields only, no runtime controls, user-invoked skills marked in both adapters, and every skill has both a global `SKILL.md` (with the "Repo version first" notice) and a `GENERATE.md` recipe. Run `bin/agents check` before committing.
- Subagents in `preset/agents/` should only use frontmatter all three tools understand: `name`, `description`, and optionally `tools` and `model`. Codex agents are generated from them.
- When a change affects behavior, update REQUIREMENTS.md and README.md as well.
- Where each item is installed is defined in two places, `global_mappings` in `lib/common.sh` and `Get-Mappings` in `install.ps1`. Keep them in sync.
- `install.sh` and `bin/agents` must run on Linux and WSL, and `bin/agents` also in Git Bash. `install.ps1` must run in Windows PowerShell 5.1 and PowerShell 7.
