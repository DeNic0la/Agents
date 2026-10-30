---
description: Recipe for this project's Definition of Done. Every change must meet `.agents/definition-of-done.md`. If that file doesn't exist, generate it with this recipe before starting other work.
---

# Definition of Done (recipe)

The Definition of Done is a standing, project-wide bar that every change has to clear. Acceptance criteria vary per task and answer "did we build this thing?". The Definition of Done is the same every time and answers "is it ready?". A task is done only when both are met. This recipe describes how to generate the project's own Definition of Done in `.agents/definition-of-done.md`.

## Generate

1. **Inspect the project.**
   - Languages and frameworks.
   - The real commands for tests, lint, format and build: package scripts, Makefile, CI config.
   - Whether it runs in production (service, worker) or not (library, CLI).
   - Public interfaces, where docs live, whether there's a folder for decision records.
   - Which skills are installed.
2. **Write `.agents/definition-of-done.md`** with these sections. Each one is a checklist of items you can verify with evidence, naming the project's real commands and paths:
   - **Intro:** what the Definition of Done is, how it differs from acceptance criteria, and that both must be met.
   - **Correctness:**
     - acceptance criteria met
     - behavior checked at runtime, not just compiled (say how in this project)
     - new behavior covered by tests that fail without the change (name the command)
     - no regressions
     - edge cases and error paths handled
   - **Quality:**
     - names and structure reveal intent
     - no duplicated logic
     - no dead code or debug output left behind
     - changes scoped to the task
     - lint and format pass (name the commands)
   - **Integration:**
     - works with the rest of the system
     - migrations, config and feature flags accounted for, but only the ones the project has
     - backward compatibility for public interfaces
   - **Documentation:**
     - public interfaces and user-facing behavior documented (say where)
     - decisions worth keeping recorded (say where)
     - written in timeless language, describing the current state, not the change history
   - **Ship-readiness:**
     - security reviewed for untrusted input, auth and data handling
     - observability for new critical paths, pointing to `.agents/observability-checklist.md` if it applies
     - a rollback path for anything risky
     - human approval before merge or deploy
   - **How to apply:** Correctness and Quality per task, Integration and Documentation per feature, the full list per release.
   - **Red flags:**
     - "done" before it was run
     - "tests pass" used as a synonym for done
     - the bar shifting under deadline pressure
     - acceptance criteria treated as the whole bar
     - "done" declared before review
3. **Fit it to the project.** Drop items that can't apply, with one line on why. Mention a skill (e.g. `code-simplification`) only if it's installed. Leave no placeholders.
4. **Get approval.** Show the file to the user, apply their changes, and commit it.

## Afterwards

The generated file is the bar, and it belongs to the project: don't renegotiate it per task. If this recipe changes later, don't regenerate the file silently. Suggest the new items to the user instead.
