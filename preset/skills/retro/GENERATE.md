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
   - Which agent tools this repo is used with, so the generated skill names the right `--host` for `scripts/session-evidence.mjs`, and where their transcripts are kept on this machine.
   - Custom tooling (CLIs, MCP servers) agents use here and any known token-heavy calls.
2. **Write `SKILL.md`** with frontmatter `name: retro` and a one-line `description` for the human (it's user-invoked). Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Sections:
   - **Steps:** use the `writing-for-agents` skill; read the session's primary sources with the evidence script (default: the current session) and a fresh reader for what the context lacks; look for candidates in each category; filter to grounded candidates a future agent would repeat; present them in order of severity, or say why none survived.
   - **Categories**, each with a "use when": navigation, automated checks (naming this repo's guardrails), coding standards (mechanical violations get a check in this repo's linter, hook or CI), the global and repo `AGENTS.md`, tool economy, drift (stale or contradicting steering files), duplication and no-ops, information access.
   - **Reference:** implementation versus review, and which file in this repo each kind of improvement belongs in.
3. **Copy the supporting files** from the global skill: `scripts/session-evidence.mjs` unchanged (LF line endings), `references/session-sources.md` (keep only the hosts this repo uses) and `references/outside-the-repo.md`. Link each from `SKILL.md` with a "read when" line.
4. **Copy both adapters** from the global skill so it stays user-invoked: `agents/claude.yaml` (`disable-model-invocation: true`, `argument-hint`) and `agents/openai.yaml` (`policy: allow_implicit_invocation: false`).
5. **Keep it small.** `SKILL.md` stays under about 100 lines, with no placeholders.
6. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
