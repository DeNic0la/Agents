# Persuasion principles

Models respond to the same persuasion principles as people: they were trained on human text, where these patterns precede compliance. Used well, they make sure a critical practice holds under pressure. Meincke et al. (2025) found that persuasion techniques roughly doubled compliance across 28,000 conversations (33% to 72%).

## The principles

| Principle | How it shows in a prompt | Use for | Example |
|---|---|---|---|
| **Authority** | Imperatives, non-negotiable framing ("No exceptions") | Discipline and safety rules, settled best practice | "Code written before its test? Delete it and start over. No exceptions." |
| **Commitment** | Require an announcement, an explicit choice, or a tracked checklist | Making sure a process is actually followed; multi-step work | "When you use a skill, announce it: 'I'm using <skill>.'" |
| **Scarcity** | Time-bound triggers ("before proceeding", "immediately after X") | Verification that must not be deferred | "After each task, request review immediately, before starting the next." |
| **Social proof** | Universal patterns and named failure modes ("X without Y = failure. Every time.") | Warning about common failures, establishing norms | "Checklists without tracking get steps skipped. Every time." |
| **Unity** | Shared identity and goals ("we", "our codebase") | Collaborative work where you want honest judgement | "We're colleagues. I need your honest technical judgement." |
| **Reciprocity** | Returning a favour | Almost never; it reads as manipulation | |
| **Liking** | Flattery, rapport | Never for compliance: it breeds sycophancy and undermines honest feedback | |

## Combine by document type

| Document | Use | Avoid |
|---|---|---|
| Discipline-enforcing (a gate, a mandatory check) | authority, commitment, social proof | liking, reciprocity |
| Guidance or technique | moderate authority, unity | heavy authority |
| Collaborative | unity, commitment | authority, liking |
| Reference | clarity only | all persuasion |

Two or three principles at most. Stacking all of them dilutes each.

## Why it works

- **Bright lines** remove the "is this an exception?" question that rationalization starts from. Pair a firm rule with the positive target behavior, so attention lands on what to do.
- **Implementation intentions:** "when X, do Y" fires more reliably than "generally do Y".
- **Commitment sequences:** a stated intention ("I'm using…") makes the following action more likely.

## Ethics

Legitimate: making sure critical practices are followed and predictable failures prevented. Illegitimate: false urgency, guilt, or steering for anyone's gain other than the user's.

The test: would this technique serve the user's genuine interests if they fully understood it?
