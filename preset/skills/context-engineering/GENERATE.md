---
description: Recipe for a version of the context-engineering skill tailored to this repository.
---

# context-engineering (recipe)

Generate `.agents/skills/context-engineering/`: a version of the context engineering skill that points at this repository's real rules files, docs, modules and commands.

## Generate

1. **Inspect the project.**
   - The rules files it has: `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md` or others, and what each covers.
   - Where specs, plans and architecture docs live, and how they are split into sections.
   - The module map: top-level directories, what each owns, its key files and the pattern it follows.
   - Build, test, lint and type-check commands, and how to run a single test.
   - Where task status and decisions are recorded between sessions (plan files, issues, changelog).
   - MCP servers configured for the project, e.g. in `.mcp.json`, `.codex/config.toml` or `.vscode/mcp.json`.
   - Files that must be treated as untrusted data: fixtures, generated files, vendored or external docs.
2. **Write `SKILL.md`** with frontmatter `name: context-engineering` and a `description` that says what it does and when to use it. Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Sections:
   - **Overview** and **When to Use:** feed the agent the right context at the right time, in this repo.
   - **The context hierarchy** mapped to this repo's real files:
     - rules files: which ones exist and what they hold
     - specs and architecture: where they live and which section to load for which area
     - source files: where to find an example of each common pattern, and the trust level of fixtures, generated and external files
     - error output: the exact commands that produce it, narrowed to a single test where possible
     - session boundaries: where to persist status, decisions and verification results before starting fresh
   - **Context packing:** a real project map of the modules found above, one short section each, plus a selective-include example using real paths.
   - **Context budget:** what to cut first, what to protect and when to compress, naming this repo's noisy outputs (long logs, generated files, large fixtures).
   - **Confusion management:** surface conflicts between docs and code, and missing requirements, with options; name where decisions get recorded here.
   - **MCP integrations:** only the servers this repo actually configures.
   - **Anti-Patterns**, **Common Rationalizations**, **Red Flags** and a **Verification** checklist, kept to the items that apply here.
3. **Put details in supporting files** under `references/`, each with a "read when" line in `SKILL.md`. Write only the ones that apply:
   - the full project map, if it is too long for `SKILL.md`
   - a rules-file checklist, if the repo's rules file is missing or thin
   - confusion and planning templates, using a real conflict from this repo's docs and code where one exists
4. **Keep it small.** `SKILL.md` stays under about 200 lines, with no placeholders.
5. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
