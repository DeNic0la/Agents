---
description: Recipe for a version of the diagnosing-sessions skill tailored to this repository.
---

# diagnosing-sessions (recipe)

Generate `.agents/skills/diagnosing-sessions/`: a version of the session diagnosis that knows which harnesses this project's agents run in, where their transcripts live, which skills and instructions shape them, and where issues about each one go.

## Generate

1. **Inspect the project.**
   - Which harnesses its agents run in (Claude Code, Codex, Copilot, others), and where each keeps session transcripts on this machine. Confirm the locations on disk and note the record shapes for human messages, tool calls and results, usage and timestamps.
   - The skills and instructions in play: `.agents/skills/`, `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, project plugins and MCP servers, hooks.
   - Where issues go for each source: `.agents/issue-tracker.md` for the project's own instructions (generate it with the issue-tracker recipe if it's missing), the agent preset's repository, and any third-party plugin repositories.
   - Redaction defaults: which repositories are public, and terms the user names as proprietary. Ask; don't guess.
   - The test runners and plan or spec locations, for the quality-evidence and plan-adherence dimensions.
2. **Write `SKILL.md`** with frontmatter `name: diagnosing-sessions` and a one-line `description` for the human (it's user-invoked). Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Sections:
   - **Overview and core principle:** report with evidence, never diagnose the instructions; every finding cites `path:line`.
   - **When to use**, handing environment changes to `retro`.
   - **Workflow:** intake, locate, triage with the seven analyst dimensions, report, issues, export, similar sessions, each with its condition.
   - **Quick reference**, **Hard rules**, **Red flags**, **Verification**.
3. **Copy the supporting files** from the global skill and adapt them, each with a "read when" line in `SKILL.md`:
   - `references/session-discovery.md`: this project's harnesses, transcript locations and record meanings instead of the generic list.
   - `references/issues.md`: this project's targets per source.
   - `references/redaction.md`: the agreed public repositories and proprietary terms as defaults.
   - `references/context-safety.md`, `analyst-brief.md`, `dimensions.md`, `similar-session.md` and the `assets/` templates, adjusted only where this repo differs (its runners, plan locations, workspace path).
4. **Copy both adapters** from the global skill so it stays user-invoked: `agents/claude.yaml` (`disable-model-invocation: true`, `argument-hint`) and `agents/openai.yaml` (`policy: allow_implicit_invocation: false`).
5. **Keep it small.** `SKILL.md` stays under about 120 lines, with no placeholders outside the templates.
6. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
