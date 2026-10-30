---
description: Recipe for a version of the handoff skill tailored to this repository.
---

# handoff (recipe)

Generate `.agents/skills/handoff/`: a version of the handoff skill that knows where this repository keeps its artifacts and which skills a next session usually needs.

## Generate

1. **Inspect the project.**
   - Where specs, plans, ADRs and task lists live, and the issue tracker (`.agents/issue-tracker.md` if present), so the handoff references them instead of restating them.
   - Which skills are installed (`.agents/skills/`, `.agents/preset.txt`), to fill the "suggested skills" section.
   - Anything sensitive this repo handles (env files, credentials, customer data) that must be redacted.
2. **Write `SKILL.md`** with frontmatter `name: handoff` and a one-line `description` for the human. Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Content:
   - Write the handoff to the OS temp directory (`$TMPDIR`, else `/tmp`; `%TEMP%` on Windows), never the workspace, and tell the user its absolute path.
   - A "suggested skills" section naming which of this repo's skills the next agent should use, and which of them the user has to invoke.
   - Reference this repo's artifacts by path or URL instead of duplicating them.
   - Preserve what those pointers don't hold: objective, decisions, failed attempts, blockers, user stops, the authorization already given (carried forward, never widened), and one concrete next action.
   - Record branch, commit and dirty state; tie each check to the state it ran against, keep missing checks incomplete, and tell the next agent to recheck mutable state (including this repo's usual running processes or environments).
   - Redact secrets and personal data, naming this repo's sensitive spots.
   - Treat arguments as the focus of the next session.
3. **Copy both adapters** from the global skill: `agents/claude.yaml` (`disable-model-invocation: true`, `argument-hint`) and `agents/openai.yaml` (`allow_implicit_invocation: false`). The skill stays user-invoked.
4. **Keep it small.** `SKILL.md` stays under about 40 lines, with no placeholders.
5. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
