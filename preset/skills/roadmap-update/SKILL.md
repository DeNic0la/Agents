---
name: roadmap-update
description: Use when adding an initiative to a product roadmap and deciding what moves to make room, reprioritizing after new information, shifting timelines after a dependency slip, or building a Now/Next/Later roadmap from scratch. Updates, creates or reprioritizes a product roadmap.
---

# Roadmap update

Update, create or reprioritize a product roadmap.

## 1. Understand the current state

If the project tracker is connected, pull the roadmap items with status, owner and dates. Flag items that are overdue, at risk, recently completed, or missing an owner or date.

Otherwise, ask the user to paste or describe the roadmap. Any format works: list, table, spreadsheet, screenshot, prose.

## 2. Determine the operation

- **Add an item:** gather name, description, priority, effort, target timeframe, owner and dependencies. Suggest where it fits given priorities and capacity, and ask what comes off or moves.
- **Update status:** not started, in progress, at risk, blocked, completed, cut. For at risk or blocked, ask for the blocker and the mitigation.
- **Reprioritize:** ask what changed (new information, strategy shift, resources, customer feedback). Apply a prioritization framework if it helps. Show before and after.
- **Move a timeline:** ask why (scope change, dependency slip, resources). Trace the impact on dependent items and flag anything pushed past a hard deadline.
- **Create a roadmap:** ask the timeframe (quarter, half, year), the format (Now/Next/Later, quarterly themes, OKR-aligned) and the initiatives to include.

Read [references/frameworks.md](references/frameworks.md) when choosing a roadmap format or prioritization framework (RICE, MoSCoW, ICE, value vs. effort), mapping dependencies, checking capacity, or communicating a change.

## 3. Write the roadmap summary

1. **Status overview:** X in progress, Y completed this period, Z at risk.
2. **Items:** name and one-line description, status (**Done**, **On Track**, **At Risk**, **Blocked**, **Not Started**), target timeframe, owner, key dependencies. Group by Now/Next/Later, by quarter, or by theme, as the user prefers. Tables work well.
3. **Risks and dependencies:** blocked and at-risk items with details, cross-team dependencies and their status, items near hard deadlines.
4. **Changes this update:** items added, removed or reprioritized; timeline shifts; status changes.

## 4. Follow up

Offer to adapt it for an audience (executive, engineering, customer-facing; the `stakeholder-update` skill helps), to draft the change announcement, or to update ticket statuses in the connected tracker. Change the tracker only after the user confirms.

## Rules

- A roadmap is a communication tool, not a project plan: themes and outcomes, not tasks.
- When reprioritizing, ask what changed. Shifts follow new information, not whim.
- Roadmaps are zero-sum against capacity. Adding something means something comes off or moves.
- Flag capacity problems early. Cut scope; don't pretend people can do more.
- Dependencies are the biggest risk. Surface them explicitly.
