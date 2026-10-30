# Meetings and decision records

## Standup / daily sync

Surface blockers and coordinate. Each person: done since last sync, working on next, blocked by.

- 15 minutes. Take discussions offline.
- Blockers are the most valuable part; track them and follow up.
- Cancel it when there's nothing to sync.

## Sprint planning

Use the `sprint-planning` skill. When facilitating: come with a proposed priority order, push back on overcommitment, give every item an owner and acceptance criteria, and flag items with hidden complexity.

## Retrospective

1. Set the stage: the goal, and psychological safety.
2. Gather data: what went well, what didn't, what was confusing.
3. Find patterns and root causes.
4. Pick 1-3 specific improvements. More and nothing changes.
5. Close by thanking people for their honesty.

Focus on systems, not individuals. Follow up on the last retro's actions or people stop engaging. Vary the format now and then.

## Stakeholder review / demo

1. Context: the goal and what they saw last time.
2. Demo the real product, not slides.
3. Early metrics and feedback.
4. Structured feedback: "What feedback do you have on X?" beats "Any thoughts?"
5. Next steps and the next review date.

Capture feedback visibly and commit to addressing it or explaining why not. Say what kind of feedback is actionable at this stage.

## Decision records

For decisions in a codebase, use the `domain-modeling` skill's ADR format. For product decisions, write a short record:

```
# [Decision title]

## Status
[Proposed / Accepted / Deprecated / Superseded by ...]

## Context
The situation and the forces at play.

## Decision
What we decided, stated directly. Who was involved, who made the call.

## Consequences
Positive consequences, tradeoffs accepted, what it enables or prevents.

## Alternatives considered
Each option and why it was rejected.
```

Write one for strategic choices (segment, platform), big technical or vendor choices, contested decisions, decisions that constrain future options, and ones people will question later. Write it when the decision is made, give generous context, keep it to a page. A decision that proved wrong gets a "superseded by" link, not deletion.
