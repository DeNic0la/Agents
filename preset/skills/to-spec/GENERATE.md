---
description: Recipe for a version of the to-spec skill tailored to this repository.
---

# to-spec (recipe)

Generate `.agents/skills/to-spec/`: a version of the spec skill that publishes to this repository's tracker, in its vocabulary, with its test seams.

## Generate

1. **Inspect the project.**
   - `.agents/issue-tracker.md`. If it's missing, generate it first from the issue-tracker recipe (`.agents/references/issue-tracker.md`, else `~/.agents/references/issue-tracker.md`).
   - The domain glossary (`GLOSSARY.md` or `GLOSSARY-MAP.md`) and ADRs (`docs/adr/` or wherever decisions live).
   - The test layout and its highest seams: end-to-end, integration or API-level suites, and existing tests to cite as prior art.
   - Existing spec or issue templates, which the spec template should match where they overlap.
2. **Write `SKILL.md`** with frontmatter `name: to-spec` and a one-line `description` for the human. Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Content:
   - Synthesize, don't interview; use the glossary's terms and respect ADRs.
   - Sketch the test seams, preferring this repo's existing highest seams, and confirm them with the user.
   - Write the spec and publish it as `.agents/issue-tracker.md` describes, with the `ready-for-agent` label.
3. **Put the spec template in `references/spec-template.md`** with a "read when" line: problem statement, solution, an extensive list of user stories, implementation decisions (no file paths or code, except decision-rich prototype snippets), testing decisions with this repo's prior art, out of scope, further notes.
4. **Copy both adapters** from the global skill: `agents/claude.yaml` (`disable-model-invocation: true`) and `agents/openai.yaml` (`allow_implicit_invocation: false`). The skill stays user-invoked.
5. **Keep it small.** `SKILL.md` stays under about 40 lines, with no placeholders.
6. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
