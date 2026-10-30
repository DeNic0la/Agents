---
description: Recipe for a version of the ideate skill tailored to this repository.
---

# ideate (recipe)

Generate `.agents/skills/ideate/`: a version of the grounded ideation workflow that knows where this repository's knowledge, pain points and ideation files live.

## Generate

1. **Inspect the project.**
   - Where its knowledge lives: the README, `GLOSSARY.md`, ADRs, product docs, roadmaps, `docs/solutions/` or other learning stores.
   - Where pain shows up: the issue tracker (`.agents/issue-tracker.md`), TODO and FIXME conventions, bug-labelled history in `git log`.
   - Where ideation files should go: an existing `docs/ideation/` or an equivalent folder. Ask the user before introducing one next to an existing store.
   - Who it's for (users, operators, developers), so the frames aim at the right audience.
2. **Write `SKILL.md`** with frontmatter `name: ideate`, `license: MIT` and a one-line `description` for the human (it's user-invoked). Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Keep the tagged basis, the six frames in four tasks with their charter, merge, the fresh-context refuting verifier, the cut with a reason for every rejected idea, and the output file, with this repo's knowledge sources and output folder filled in.
3. **Copy `CREDITS.md` and `NOTICE`** unchanged: the MIT attribution must travel with the skill.
4. **Copy both adapters** from the global skill so it stays user-invoked: `agents/claude.yaml` and `agents/openai.yaml`.
5. **Keep it small.** `SKILL.md` stays under about 120 lines, with no placeholders.
6. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
