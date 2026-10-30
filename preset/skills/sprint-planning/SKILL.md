---
name: sprint-planning
description: Use when kicking off a team sprint, sizing a backlog against team availability (PTO, meetings, on-call), deciding what's P0 vs. stretch, or handling carryover from the last sprint. Drafts a sprint plan with goal, capacity, scoped backlog and risks.
---

# Sprint planning

Plan a sprint: set one goal, estimate capacity, scope the backlog and name the risks.

## 1. Gather inputs

Ask for what you can't pull from connected tools:

- **Team:** who's on it and their availability this sprint.
- **Sprint length** in days or weeks.
- **Backlog:** what's prioritized. Pull it from the project tracker if one is connected; otherwise ask the user to paste or describe it.
- **Carryover:** anything unfinished from the last sprint, and why it didn't ship.
- **Dependencies:** anything blocked on other teams.

If a calendar is connected, use it for PTO and meetings.

## 2. Plan

- Compute capacity per person, net of PTO, on-call and meetings.
- Load the sprint to 70-80% of capacity. Interrupts will come.
- Write one sprint goal in one sentence. If you can't, the sprint is unfocused.
- Order the backlog P0 (must ship), P1 (should ship), P2 (stretch). The stretch items are what you cut when things run long.
- Re-commit carryover only once you know why it slipped.

## 3. Write the plan

```markdown
## Sprint plan: [Sprint name]
**Dates:** [Start] to [End] | **Team:** [X] engineers
**Sprint goal:** [One sentence about what success looks like]

### Capacity
| Person | Available days | Allocation | Notes |
|--------|----------------|------------|-------|
| [Name] | [X] of [Y] | [X] points/hours | [PTO, on-call, ...] |
| **Total** | **[X]** | **[X] points** | |

### Sprint backlog
| Priority | Item | Estimate | Owner | Dependencies |
|----------|------|----------|-------|--------------|
| P0 | [Must ship] | [X] pts | [Person] | [None / Blocked by X] |
| P1 | [Should ship] | [X] pts | [Person] | [None] |
| P2 | [Stretch] | [X] pts | [Person] | [None] |

**Capacity:** [X] points | **Load:** [X] points ([X]% of capacity)

### Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| [Risk] | [What happens] | [What to do] |

### Definition of done
- [ ] Code reviewed and merged
- [ ] Tests passing
- [ ] Documentation updated (if applicable)
- [ ] Product sign-off

### Key dates
| Date | Event |
|------|-------|
| [Date] | Sprint start |
| [Date] | Mid-sprint check-in |
| [Date] | Sprint end / demo |
| [Date] | Retro |
```

Use the team's own definition of done if it has one.

## 4. Follow up

Offer to create the sprint and assign items in the connected tracker, or to share the plan in team chat. Do either only after the user confirms.
