---
description: Recipe for a version of the deprecation-and-migration skill tailored to this repository.
---

# deprecation-and-migration (recipe)

Generate `.agents/skills/deprecation-and-migration/`: a version of the deprecation and migration skill that uses this repository's release process, versioning, migration tooling and consumers.

## Generate

1. **Inspect the project.**
   - How it ships: a library or package, a service, an app, a CLI. How deploys and rollouts work (canary, staged, all at once).
   - How it versions and announces changes: semver, changelog, release notes, deprecation annotations or warnings in the language.
   - Who consumes it: internal modules, other teams' services, public users. How usage is measured (metrics, logs, dependency analysis, code search).
   - The database and its migration tooling, whether migrations have down paths, and how backfills are run today.
   - Whether feature flags or traffic routing exist, and which tool provides them.
   - Existing deprecated code, deprecation notices or half-finished migrations.
2. **Write `SKILL.md`** with frontmatter `name: deprecation-and-migration` and a `description` that says what it does and when to use it. Use spec fields only and no runtime controls; see the portable-skills concept. Leave out the "Repo version first" notice. Sections:
   - **Overview** and **When to Use:** code is a liability; removing it safely, applied to the kinds of things this repo replaces or sunsets.
   - **Core principles:**
     - code is a liability
     - Hyrum's Law makes removal hard: replacements must cover depended-on behavior
     - deprecation planning starts at design time
   - **The deprecation decision:** the five questions, with usage measured the way this repo can measure it.
   - **Compulsory vs advisory:** default to advisory; what a deadline and migration tooling look like here.
   - **The migration process:** build the replacement, announce and document in this repo's format (changelog, annotation, notice), migrate incrementally with the Churn Rule, remove the old system only after verified zero usage.
   - **Migration patterns:** a short summary of the patterns that fit this repo, linking to the reference.
   - **Zombie code:** the signs, and owner-or-remove.
   - **Common Rationalizations**, **Red Flags** and a **Verification** checklist, kept to the items that apply here. Drop the schema-migration items if the repo has no database.
3. **Put details in supporting files** under `references/`, each with a "read when" line in `SKILL.md`. Write only the ones that apply, with examples in the repo's own language and tools:
   - migration patterns: strangler, adapter and feature flag migration, using the repo's routing or flag tool
   - database schema migrations with expand/contract: expand, dual-write, backfill in batches, switch reads, contract in a separate deploy, with the migration tool's commands and how a down path is written and tested
   - a deprecation notice template in the format this repo already uses
4. **Keep it small.** `SKILL.md` stays under about 200 lines, with no placeholders.
5. **Finish.** Show the skill to the user for approval, run `agents sync` so Claude Code gets its copy, and commit it.
