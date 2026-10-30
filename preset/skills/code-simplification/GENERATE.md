---
description: Recipe for a version of the code-simplification skill tailored to this repository.
---

# code-simplification (recipe)

Generate `.agents/skills/code-simplification/`: a version of the code-simplification skill that knows this repository's languages, conventions, commands and recurring complexity.

## Generate

1. **Inspect the project.**
   - Languages and frameworks actually in use.
   - The commands for tests, the build, lint and formatting.
   - Its conventions: `AGENTS.md`/`CLAUDE.md`, linter and formatter config, and how existing code orders imports, declares functions, names things, handles errors and annotates types.
   - The complexity that actually shows up here, such as deep nesting in handlers, long components, boolean flag parameters, duplicated queries or one-strategy abstractions.
   - Hot paths where a "simpler" version could be measurably slower.
2. **Write `SKILL.md`** with frontmatter `name: code-simplification` and a `description` that says what it does and when to use it. Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Sections:
   - **Overview** and **When to Use:** reduce complexity while preserving exact behavior, judged by whether a new team member would understand the result faster. Include when NOT to use it: code that is already clean, code not yet understood, performance-critical paths, and modules about to be rewritten.
   - **The five principles,** each tailored:
     - preserve behavior exactly: same outputs, errors, side effects and ordering, with existing tests passing unmodified
     - follow project conventions: name this repo's conventions files and the style points from step 1
     - prefer clarity over cleverness: examples in the repo's main language
     - maintain balance: don't inline named concepts, merge unrelated logic, strip abstractions that serve testability, or optimize for line count
     - scope to what changed
   - **The four-step process:**
     1. understand before touching (Chesterton's Fence): responsibility, callers, edge cases, tests, history via git blame
     2. identify opportunities: the structural, naming and redundancy pattern tables, plus the repo-specific patterns found in step 1
     3. apply changes incrementally: one change, run the tests, commit or revert; keep refactoring separate from feature work; automate changes that touch more than 500 lines with this repo's tooling (codemods, AST transforms)
     4. verify the result as a whole
   - **Common Rationalizations** and **Red Flags,** kept to the items that apply here.
   - **Verification:** a checklist with the repo's real commands: tests pass without modification (show the output), the build succeeds with no new warnings, lint and formatting are clean, the diff contains only scoped, incremental simplifications, conventions and error handling are intact, no dead code is left behind, and the result has been reviewed.
3. **Put language guidance in supporting files** under `references/`, each with a "read when" line in `SKILL.md`. Write it only for the languages and frameworks this repo actually uses, with before/after examples in the repo's own style, such as redundant async wrappers, verbose conditional assignment, manual collection building, redundant boolean returns, nested conditionals turned into early returns, and verbose conditional rendering.
4. **Keep it small.** `SKILL.md` stays under about 200 lines, with no placeholders.
5. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
