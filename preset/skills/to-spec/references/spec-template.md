# Spec template

Write the spec with these sections, in this order.

<spec-template>

## Problem Statement

The problem that the user is facing, from the user's perspective.

## Solution

The solution to the problem, from the user's perspective.

## User Stories

A LONG, numbered list of user stories. Each user story should be in the format of:

1. As an <actor>, I want a <feature>, so that <benefit>

<user-story-example>
1. As a mobile bank customer, I want to see balance on my accounts, so that I can make better informed decisions about my spending
</user-story-example>

This list of user stories should be extremely extensive and cover all aspects of the feature.

## Implementation Decisions

A list of implementation decisions that were made. This can include:

- The modules that will be built/modified
- The interfaces of those modules that will be modified
- Technical clarifications from the developer
- Architectural decisions
- Schema changes
- API contracts
- Specific interactions

When a provider and consumer evolve or deploy independently, name one authoritative contract, its owner, and how each side will be checked against it. Include real serialization and consumer fixtures in the testing decisions, with the relevant error, null, mock and feature-flag paths. For components changed and built together, an existing shared type can be that contract; require an extra schema or generator only for a concrete gap.

Name modules and their interfaces, not source file paths or code snippets: those go stale fast. Two kinds of path are durable and belong in the spec: a document the spec builds on (a behavioural spec, an ADR), and the existing tests named as prior art.

Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can (state machine, reducer, schema, type shape), inline it within the relevant decision and note briefly that it came from a prototype, citing its `prototype/<name>` branch. Trim to the decision-rich parts, not a working demo, just the important bits.

## Testing Decisions

A list of testing decisions that were made. Include:

- A description of what makes a good test (only test external behavior, not implementation details)
- Which modules will be tested
- The seams under test, as agreed with the user
- Prior art for the tests (i.e. similar types of tests in the codebase)

## Out of Scope

A description of the things that are out of scope for this spec.

## Further Notes

Any further notes about the feature.

</spec-template>
