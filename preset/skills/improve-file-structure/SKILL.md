---
name: improve-file-structure
description: Assess how a project's files are organized and, when a reorganization is justified, prepare a behavior-preserving migration plan for the implement skill.
license: MIT
---

# Improve File Structure

> **Repo version first:** if this repository has `.agents/skills/improve-file-structure/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

## Overview

Find where file placement makes a project hard to navigate or change, and design the smallest useful reorganization, grounded in the project's language, framework and existing conventions. End with a plan for the `implement` skill. This skill changes no project files. Present the plan in the conversation unless the user asks for a saved file.

**File placement is the scope:** moves, descriptive path names, and the import or configuration updates they need. Name other needs without adding them to the plan:

- Responsibilities, interfaces or dependency direction: the `improve-codebase-architecture` skill.
- Code-level cleanup: the `refactor` skill.

## Principles

- **Friction before folders.** A crowded directory is a clue, not a finding. Cite the navigation or maintenance problem and the files that cause it. A small flat project can be healthy; file-count limits and symmetry don't justify moves.
- **Locality with ownership.** Group files that implement the same concept and change together. Imports and change history support that judgment; neither proves it alone. Prefer feature or domain grouping when it solves the observed problem; keep an established layout that works.
- **Paths can be contracts.** Runtime discovery, package visibility, public imports and published artifacts can depend on a path. Preserve them by default.
- **Every directory earns its place.** It has a clear responsibility and a rule for what belongs there. Keep feature-specific helpers, types, tests and assets near their owner. Create shared areas only for demonstrated shared use, never as a new catch-all.

## Process

### 1. Map the area

Use the user's path or pain point as the scope; otherwise inventory the repository at a high level and look at likely trouble spots first. Read the project instructions, `GLOSSARY.md` and relevant ADRs before choosing a convention.

Identify languages, frameworks, applications versus libraries, workspace and package boundaries, entry points, and the build, test and package commands. Separate authored source, tests, resources, tooling, generated output and vendored code; generated and vendored files are not candidates (inspect their producers when paths matter).

Use a symbol-aware tool (a language server or code index) when one is available, otherwise search and read the source. Map each directory's role, related file clusters, dependencies crossing the scope, and path-based discovery. Check git history for files that change together, discounting bulk moves and formatting commits. Mark text-search and dynamic-reference gaps; don't claim a complete dependency graph from filename matches.

Read only the language references used in this area:

- [references/typescript.md](references/typescript.md): TypeScript or JavaScript apps, libraries or workspaces.
- [references/go.md](references/go.md): Go packages and commands.
- [references/python.md](references/python.md): Python packages and applications.
- [references/ruby.md](references/ruby.md): Ruby gems and applications, including Rails.

For another language or an uncertain framework rule, consult its primary documentation (try the site's `llms.txt` first), record the source and its scope, and don't present one framework's preference as a language rule.

Done when the inventory accounts for the directories reviewed, their roles and constraints, and the exclusions or unknowns that limit the assessment.

### 2. Assess

Look for mixed concerns in one folder, one feature scattered across unrelated folders, catch-all locations, redundant nesting, and inconsistent placement that leaves the next file's home unclear. Read the implicated files before reporting. Each finding cites paths, a real navigation or change task it makes harder, and how a placement change helps. Rank benefit against churn and compatibility risk. A cycle that needs interface redesign is an architecture finding.

| Verdict | Action |
|---|---|
| **Healthy** | Explain why the layout works and stop. |
| **Localized** | Present the affected clusters and the smallest useful reorganization. |
| **Systemic** | Rank independent candidates and propose an incremental starting area. |

Keep inspection gaps visible next to the verdict. For a recently reorganized area, require new evidence before proposing another layout. Honor a specific user request on healthy code, but call it a preference, not a defect. A requested move that would break a path contract doesn't make the current layout defective: report the conflict and keep that candidate pending.

### 3. Choose and design

Present candidates with stable IDs, affected paths, benefit, migration cost and contract risks. Recommend one and ask which to pursue, unless the request already chose. Ask only what the repository can't answer.

For the chosen candidate, show a before/after tree and each new directory's responsibility, and say where the next similar file belongs (local or shared). Use project vocabulary. A feature folder isn't automatically a new package, public API, barrel or layer. Settle choices about public paths, framework discovery, package boundaries or scope with the user. Preserve contracts with existing entry points or a concrete forwarding plan; if preserving them needs a broader design change, stop that candidate at the architecture handoff.

### 4. Write the migration plan

Read [references/migration-plan.md](references/migration-plan.md) now for the required sections. Run cheap read-only checks when they settle an uncertainty; leave anything that writes (generation, migrations, auto-fix) to implementation. Done when every move has a destination, its reference updates, its compatibility treatment and a check that would catch its likely failure.

### 5. Hand off

Hand off only when step 4 is complete. A missing fact that decides a move, a reference update or a check keeps the plan provisional: inspect it or ask first. Checks that can't run here stay listed as verification gaps.

For work that fits one session, tell the user to run the `implement` skill with this plan. For several sessions, point to the `to-spec` skill first, then `implement`. Recommend; don't invoke them or start moving files.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "This folder has too many files" | Count isn't friction. Name the task it makes harder. |
| "Let's move it to a feature folder while we're at it" | Each move needs evidence, a contract check and a verification. |
| "The imports compile, so the move is safe" | Runtime discovery, packaging and dynamic references can still break. |

## Red Flags

- A move map row without a verification that could catch its failure.
- Public paths changed without the user choosing a compatibility approach.
- Interface or behavior changes mixed into the relocation plan.
- Project files edited by this skill.

## Verification

- [ ] The verdict cites concrete paths and the friction they cause, or why the layout is healthy.
- [ ] Every moved path is in the move map and the verification strategy.
- [ ] Path contracts are preserved or have an approved compatibility plan.
- [ ] No project file was changed.
