---
description: Recipe for a version of the improve-codebase-architecture skill tailored to this repository.
---

# improve-codebase-architecture (recipe)

Generate `.agents/skills/improve-codebase-architecture/`: a version of the architecture review that knows this repository's structure, hot spots, domain language and recorded decisions.

## Generate

1. **Inspect the project.**
   - The top-level structure: packages, layers, services, and how a request or job flows through them.
   - Its size: under about 20 files with low coupling, say in the skill that the default verdict is Healthy.
   - Recent hot spots from `git log` (files and areas that change most), as the default scope, and which commits to leave out of the count (bots, bulk reformats).
   - Whether a symbol-aware search (an LSP, a code graph tool) is available for counting callers.
   - The domain glossary (`GLOSSARY.md`, `GLOSSARY-MAP.md`) and where ADRs live.
   - The test setup: where tests live, how they reach modules (through interfaces or through mocks of internals), and the real test commands.
   - Known pain points mentioned in docs, TODOs or issues, and earlier runs of this skill whose changes were implemented (for the idempotency rule).
2. **Write `SKILL.md`** with frontmatter `name: improve-codebase-architecture` and a one-line `description` for the human (it's user-invoked). Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Sections:
   - **Overview:** surface deepening opportunities for testability and AI-navigability, using the `codebase-design` vocabulary and this repo's glossary and ADR locations; architecture vs refactoring.
   - **Guardrails:** the four from the global skill.
   - **Process:** explore (scope from the user's direction or this repo's hot spots; the structure map; the friction questions; the deletion test), the mandatory assessment with its Healthy / Localized / Systemic verdict, the temp-dir HTML report, grill and design (the `grilling`, `codebase-design` and `domain-modeling` skills), the plan, and the hand-off to `implement` (or `to-spec` and `to-tickets` first).
3. **Copy both adapters** from the global skill unchanged: `agents/claude.yaml` (`disable-model-invocation`, `argument-hint`) and `agents/openai.yaml` (`allow_implicit_invocation: false`). They keep it user-invoked.
4. **Put details in supporting files** under `references/`, each with a "read when" line in `SKILL.md`:
   - `report.md`: copied from the global skill.
   - `plan.md`: the plan template, with this repo's test commands and migration conventions filled in.
5. **Keep it small.** `SKILL.md` stays under about 120 lines, with no placeholders.
6. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
