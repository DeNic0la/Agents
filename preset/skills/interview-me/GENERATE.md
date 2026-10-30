---
description: Recipe for a version of the interview-me skill tailored to this repository.
---

# interview-me (recipe)

Generate `.agents/skills/interview-me/`: a version of the intent interview skill grounded in this repository's product domain, users and the place where it keeps intent, spec and decision docs.

## Generate

1. **Inspect the project.**
   - The product domain and what the project does, from the README, docs and code.
   - Who the users are: end users, internal teams, developers consuming a library. These are the people the "User" line of the restate names.
   - Where intent, specs, RFCs, ADRs or decision records live today, and their file naming. Use that location instead of `docs/intent/` when one exists.
   - The planning and spec workflow: how work goes from an ask to a spec, plan or task list, and any issue or proposal templates.
   - Which related skills are installed (for example `idea-refine`, a spec-writing or planning skill) to hand off to.
2. **Write `SKILL.md`** with frontmatter `name: interview-me` and a `description` that says what it does and when to use it. Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Sections:
   - **Overview** and **When to Use:** find the gap between what the user asks for and what they actually want before any plan, spec or code exists. Use when an ask is missing who, why, success or the binding constraint, or when the user asks to be interviewed. Not for unambiguous, mechanical or purely informational asks, and never in non-interactive contexts.
   - **Process,** as instructions:
     - State a one-sentence hypothesis with an honest confidence number, plus what is missing while it is below ~70%.
     - Ask one question at a time, each with your guess and the reasoning behind it attached, and wait for the answer. Occasionally guess in a direction you expect to be corrected.
     - Listen for "want vs. should want": best-practice talk, convention and buzzwords as goals. Probe with "If you didn't have to justify this to anyone, what would you actually want?"
     - Restate intent in the user's words as Outcome, User, Why now, Success, Constraint and Out of scope, framed in this repo's domain and users.
     - Gate on an explicit yes; "whatever you think", "sounds good" and silence are not yes.
     - Stop when you can predict the user's reaction to the next three questions; if several rounds don't get you there, say so and step back.
     - After the yes, deliver the statement of intent, offer the downstream paths this repo actually has, and stop the turn without starting downstream work.
   - **Output:** the confirmed statement of intent, saved only if the user asks, to the repo's own intent or decision docs folder and naming when one exists; otherwise `docs/intent/[topic].md`.
   - **Principles:** one question at a time, always with a guess, explicit yes only, Out of scope is non-negotiable, and specs and plans are downstream of the confirmed intent.
   - **Common Rationalizations**, **Red Flags** and a **Verification** checklist, kept to the items that apply here.
3. **Put details in supporting files** under `references/`, each with a "read when" line in `SKILL.md`. Write only the ones that help, adapted to this repo's domain and users:
   - a worked before-and-after interview using a realistic ask for this product
4. **Keep it small.** `SKILL.md` stays under about 200 lines, with no placeholders.
5. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
