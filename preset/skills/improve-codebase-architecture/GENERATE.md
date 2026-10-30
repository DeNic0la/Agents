---
description: Recipe for a version of the improve-codebase-architecture skill tailored to this repository.
---

# improve-codebase-architecture (recipe)

Generate `.agents/skills/improve-codebase-architecture/`: a version of the architecture review that knows this repository's structure, hot spots, domain language and recorded decisions.

## Generate

1. **Inspect the project.**
   - The top-level structure: packages, layers, services, and how a request or job flows through them.
   - Recent hot spots from `git log` (files and areas that change most), as the default scope.
   - The domain glossary (`GLOSSARY.md`, `GLOSSARY-MAP.md`) and where ADRs live.
   - The test setup: where tests live, how they reach modules (through interfaces or through mocks of internals), and the real test commands.
   - Known pain points mentioned in docs, TODOs or issues.
2. **Write `SKILL.md`** with frontmatter `name: improve-codebase-architecture` and a one-line `description` for the human (it's user-invoked). Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Sections:
   - **Overview:** surface deepening opportunities for testability and AI-navigability, using the design vocabulary and this repo's glossary and ADR locations.
   - **Process:** explore (scope from the user's direction or this repo's hot spots; a fresh-context subagent; the friction questions; the deletion test), present candidates as a temp-dir HTML report with before/after diagrams and recommendation badges, then the grilling loop with the `grilling` and `domain-modeling` skills.
3. **Copy both adapters** from the global skill unchanged: `agents/claude.yaml` (`disable-model-invocation`, `argument-hint`) and `agents/openai.yaml` (`allow_implicit_invocation: false`). They keep it user-invoked.
4. **Put details in supporting files** under `references/`, each with a "read when" line in `SKILL.md`:
   - the design vocabulary and design-it-twice, with examples drawn from this repo's own modules
5. **Keep it small.** `SKILL.md` stays under about 120 lines, with no placeholders.
6. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
