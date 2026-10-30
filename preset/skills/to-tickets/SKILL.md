---
name: to-tickets
description: Break a plan, spec or the current conversation into tracer-bullet tickets with blocking edges, and publish them to the project issue tracker.
license: MIT
---

# To tickets

> **Repo version first:** if this repository has `.agents/skills/to-tickets/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

Break a plan, spec or conversation into **tickets**: tracer-bullet vertical slices, each declaring the tickets that **block** it. Each ticket is sized for one fresh agent session, which the `implement` skill then builds.

**Which skill:** to break work into a task list inside a plan, without publishing tickets, use `planning-and-task-breakdown`. To chart work whose decisions aren't made yet, use `wayfinder`. To write the spec itself first, use `to-spec`.

The issue tracker and triage label vocabulary are in `.agents/issue-tracker.md`. If that file doesn't exist, generate it first with the issue-tracker recipe: `.agents/references/issue-tracker.md` in the project, else `~/.agents/references/issue-tracker.md`.

## Process

### 1. Gather context

Work from what's already in the conversation. If the user passes a reference (a spec path, an issue number or URL), fetch it and read its full body and comments.

### 2. Explore the codebase (optional)

If you haven't explored the codebase yet, dispatch a fresh read-only subagent so the file contents stay out of this context. Have it return a summary: the current state of the code in the area, the glossary terms and ADRs that apply, and prefactoring candidates. Without subagents, explore yourself and say so. Ticket titles and descriptions use the project's glossary vocabulary and respect the ADRs in the area.

Look for chances to prefactor: "make the change easy, then make the easy change."

### 3. Draft vertical slices

Break the work into **tracer-bullet** tickets:

- Each slice cuts a narrow but complete path through every layer (schema, API, UI, tests): vertical, not one horizontal layer.
- A finished slice is demoable or verifiable on its own.
- Each slice fits in one fresh context window.
- Prefactoring comes first.

Give each ticket its **blocking edges**: the tickets that must finish before it can start. List only direct blockers; drop an edge another blocker already implies. A ticket with no blockers can start right away.

**Wide refactors are the exception.** A wide refactor is one mechanical change (rename a column, retype a shared symbol) whose **blast radius** fans across the codebase, so no vertical slice can land green. Sequence it as **expand-contract**:

- **Expand:** add the new form beside the old, so nothing breaks.
- **Migrate:** one ticket per batch of call sites, sized by blast radius (per package, per directory), each blocked by the expand. CI stays green because the old form still exists.
- **Contract:** delete the old form once no caller remains, blocked by every migrate batch.

When even the batches can't stay green alone, keep the sequence but let them share an integration branch that all block a final integrate-and-verify ticket; only that ticket promises green.

### 4. Quiz the user

Present the breakdown as a numbered list. For each ticket: **title**, **blocked by** (which tickets, if any), and **what it delivers** (the end-to-end behavior it makes work). Ask:

- Does the granularity feel right, or is it too coarse or too fine?
- Is each blocking edge real: does each ticket depend only on tickets that genuinely gate it?
- Should any tickets be merged or split?

Iterate until the user approves.

### 5. Publish

Publish the approved tickets one per issue, in dependency order (blockers first), so each ticket's edges can reference real identifiers. Follow `.agents/issue-tracker.md` for creating issues, parent and child links, and blocking: use the tracker's native blocking where it has one, otherwise its `Blocked by:` convention. A local Markdown tracker gets one file per ticket, never one combined file. Use the body in [references/ticket-template.md](references/ticket-template.md). Apply the `ready-for-agent` label unless told otherwise: the tickets are ready for an agent by construction.

If the source was a spec issue labelled `ready-for-agent`, remove that label from it: its tickets are now the work, and the spec stays open as their parent. Leave the parent otherwise untouched.

Then stop. Tell the user to build the tickets with the `implement` skill, one **frontier** ticket (all blockers closed) per fresh session, or the whole spec at once with `implement-spec`.

## Supporting files

- [references/ticket-template.md](references/ticket-template.md): read when writing the ticket bodies in step 5.
