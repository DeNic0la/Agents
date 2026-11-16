---
name: repo-checkout-roles
description: A clone of a codebase has a job of its own (integration, read-only reference, development). The agent infers the role from what the owner does there, proposes it with evidence and the checkout level it would add, and writes it only after a yes.
---

# Repo checkout roles

Applies to every agent working in a checkout of a repository that the preset is set up in. One codebase often has several clones with different jobs. Most of their setup is shared (the project level); each role adds its own (the checkout level).

## Rules

1. **Infer, don't ask for a declaration.** Roles are free-form and come from what the owner actually does in the checkout. Signals:
   - only questions and no edits
   - merges from an upstream or vendor branch
   - feature branches and commits
   - the branch the checkout stays on
   - whether it is kept at the production version
2. **Propose, then write.** Say the role you infer, the evidence, and the checkout level you would add: instructions, skills, settings such as a write deny. Write it only after the owner's yes. When the evidence is thin, ask instead of guessing. A wrong guess written silently could lock a checkout.
3. **A new clone starts with the project level only.** Don't propose a role on the first look; wait until the use is clear.
4. **Match known roles first.** Compare the signals with [roles.md](roles.md) and propose the matching pattern's typical level, adjusted to this checkout.
5. **Record new patterns.** When the same role shows up in several projects and isn't in `roles.md`, add it there: its signals and typical level, in neutral words, with no project, company or product names.

## What a checkout level holds

It lives in `.agents/levels/` in the checkout, never tracked by the repository (`agents` keeps it out through the git exclude file). It adds to the project level and the core; it never repeats them.

- `skills/<skill>.md` and `agents/<agent>.md`: specifics for one tailored skill or subagent, composed by `agents sync` under `## In this checkout`.
- `settings/claude.json`: Claude Code settings, such as `permissions.deny` rules. An instruction alone isn't enforced; a deny rule is.
- Core text may be removed only as the reviewed exception in [portable-skills](../portable-skills/CONCEPT.md).

Write a level file only for a skill or subagent the checkout actually selects and whose recipe says the role needs it.

## Supporting files

- [roles.md](roles.md): read when you infer a role, to match the signals against known patterns, or when you record a new one.
