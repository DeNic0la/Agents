---
description: Recipe for a version of the idea-refine skill tailored to this repository.
---

# idea-refine (recipe)

Generate `.agents/skills/idea-refine/`: a version of the idea refinement skill grounded in this repository's product domain, users, constraints and the place where it keeps ideas and specs.

## Generate

1. **Inspect the project.**
   - The product domain and what the project does, from the README, docs and code.
   - Who the users are: end users, internal teams, developers consuming a library.
   - Where ideas, proposals, specs, RFCs or ADRs live today, and their file naming.
   - Existing planning docs: roadmaps, backlogs, design docs, issue templates.
   - Real constraints: stack, platforms, deployment targets, team size, compliance or performance limits.
   - Which related skills exist here (for example an interview or spec-writing skill) to hand off to.
2. **Write `SKILL.md`** with frontmatter `name: idea-refine` and a `description` that says what it does and when to use it. Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Sections:
   - **Overview** and **When to Use:** turn vague ideas into sharp, actionable concepts through divergent then convergent thinking, with hand-offs to this repo's related skills when they exist.
   - **Process,** as instructions:
     - Understand & Expand: restate the idea as a "How Might We", ask 3-5 sharpening questions (who it's for, what success looks like, real constraints, prior attempts, why now), then generate 5-8 variations through lenses such as inversion, constraint removal, audience shift, combination, simplification, 10x and expert lens, grounded in this repo's architecture and prior art.
     - Evaluate & Converge: cluster into 2-3 distinct directions, stress-test each on user value, feasibility and differentiation, and name hidden assumptions, killers and what is deliberately ignored. Be honest, not supportive.
     - Sharpen & Ship: produce a one-pager with Problem Statement, Recommended Direction, Key Assumptions to Validate, MVP Scope, Not Doing (and Why) and Open Questions, and save it only after the user confirms.
   - **Output location:** the repo's own ideas or specs folder and naming when one exists; otherwise `docs/ideas/[idea-name].md`.
   - **Principles:** simplest version that solves the real problem, start from the user experience, focus over breadth, challenge every assumption, and treat the Not Doing list as the most valuable part.
   - **Common Rationalizations**, **Red Flags** and a **Verification** checklist, kept to the items that apply here.
3. **Put details in supporting files** under `references/`, each with a "read when" line in `SKILL.md`. Write only the ones that help, adapted to this repo's domain and users:
   - ideation frameworks, e.g. SCAMPER, Jobs to Be Done, first principles, pre-mortem, with examples from this product
   - an evaluation rubric covering user value, feasibility, differentiation, an assumption audit and MVP scoping, weighted by this repo's real constraints
4. **Keep it small.** `SKILL.md` stays under about 200 lines, with no placeholders.
5. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
