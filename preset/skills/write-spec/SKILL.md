---
name: write-spec
description: Use when turning a vague product idea, problem statement or user request into a PRD document, scoping a feature with goals and non-goals, defining success metrics and acceptance criteria, or splitting a big ask into a phased spec. Writes a product requirements document with the user. To publish an already-discussed spec to the issue tracker, use to-spec instead.
---

# Write spec

Write a feature spec or product requirements document (PRD) with the user.

This skill asks questions and produces a PRD document. When the spec was already worked out in the conversation and should go to the issue tracker as an implementable ticket, use the `to-spec` skill instead.

## 1. Understand the feature

Accept any starting point: a feature name ("SSO support"), a problem ("enterprise customers keep asking for centralized auth"), a user request ("export data as CSV"), or a vague idea ("do something about onboarding drop-off").

## 2. Gather context

Ask conversationally, most important first, never all at once:

- **User problem:** what problem, who has it?
- **Target users:** which segments?
- **Success metrics:** how will we know it worked?
- **Constraints:** technical, timeline, regulatory, dependencies.
- **Prior art:** tried before? Existing solutions?

If connected, also search the project tracker for related tickets, epics, existing acceptance criteria and dependencies; the knowledge base for research, prior specs, design docs and decision records; and the design tool for mockups and relevant design-system components. If nothing is connected, work from what the user gives you; don't ask them to connect tools.

## 3. Write the PRD

Read [references/prd-guide.md](references/prd-guide.md) when writing the PRD: what each section needs, user story and acceptance criteria rules, prioritization, metrics and scope control.

Sections:

1. **Problem statement:** the problem, who has it and how often, the cost of not solving it, grounded in evidence. 2-3 sentences.
2. **Goals:** 3-5 measurable outcomes, not outputs.
3. **Non-goals:** 3-5 things explicitly out of scope, each with a short reason.
4. **User stories:** "As a [user type], I want [capability] so that [benefit]", grouped by persona, most important first, including edge cases.
5. **Requirements:** P0 must-have, P1 nice-to-have, P2 future considerations, each with acceptance criteria.
6. **Success metrics:** leading and lagging indicators with specific targets and how they're measured.
7. **Open questions:** each tagged with who answers (engineering, design, legal, data) and whether it blocks.
8. **Timeline considerations:** hard deadlines, dependencies, phasing.

Use Markdown with clear headers. A busy reader should get the gist from the headers and bold text alone.

## 4. Review and iterate

Ask which sections need changes and offer to expand any. Offer follow-ups: a design brief, a stakeholder pitch, or engineering tickets (`to-spec` publishes the result to the tracker).

## Rules

- Be opinionated about scope. A tight spec beats an expansive vague one.
- Too big for one spec? Propose phases and spec the first.
- If everything is P0, nothing is. Challenge each must-have: would we really not ship without it?
- Non-goals matter as much as goals; they stop scope creep.
- Open questions must be really open. Don't list what you can answer from context.
