---
description: Recipe for a version of the retro skill tailored to this repository.
---

# retro (recipe)

Generate `.agents/skills/retro/`: a version of the session retrospective that knows this repository's steering files, checks, review setup and where session logs live.

## Generate

1. **Inspect the project.**
   - The steering files: `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.agents/` (concepts, references, skills), and their size.
   - The guardrails: lint, typecheck and test commands, pre-commit hooks, CI jobs, and which of them actually run.
   - How review works here: a reviewer agent, a coding-standards file, PR review rules.
   - Where session transcripts or logs for the tools in use are kept on this machine, if the user wants them read.
   - Custom tooling (CLIs, MCP servers) agents use here and any known token-heavy calls.
2. **Write `SKILL.md`** with frontmatter `name: retro` and a one-line `description` for the human (it's user-invoked). Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Sections:
   - **Steps:** use the `writing-for-agents` skill; read the session's primary sources (default: the current session); look for candidates in each category; present them in order of severity.
   - **Categories**, each with a "use when": navigation, automated checks (naming this repo's guardrails), coding standards (mechanical violations get a check in this repo's linter, hook or CI), the global and repo `AGENTS.md`, tool economy, no-ops, information access.
   - **Reference:** implementation versus review, and which file in this repo each kind of improvement belongs in.
3. **Copy both adapters** from the global skill so it stays user-invoked: `agents/claude.yaml` (`disable-model-invocation: true`, `argument-hint`) and `agents/openai.yaml` (`policy: allow_implicit_invocation: false`).
4. **Keep it small.** `SKILL.md` stays under about 100 lines, with no placeholders.
5. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
