---
name: ticket-triage
description: Use when a new customer support ticket or customer-reported issue comes in and needs a category, a P1-P4 priority, a team to route it to, or a check for duplicates and known issues. Produces a triage assessment with a suggested first reply. For repository issues and pull requests use triage instead.
---

# Ticket triage

Categorize, prioritize and route an incoming support ticket or customer issue, and suggest a first reply.

This is for customer support tickets. For triaging issues and pull requests in a code repository's tracker, use the `triage` skill.

## 1. Parse the issue

Read the whole ticket first; later messages often change the assessment. Extract:

- **Core problem:** what the customer actually experiences.
- **Symptoms:** the specific behavior or error.
- **Customer context:** account, plan, history, if available.
- **Urgency signals:** blocked? Production? How many users?
- **Emotional state:** frustrated, confused, matter-of-fact, escalating.

## 2. Categorize and prioritize

Assign a primary category (bug, how-to, feature request, billing, account, integration, security, data, performance) and optionally a secondary one, a priority P1-P4, and the product area.

Read [references/triage-rules.md](references/triage-rules.md) for the category signals, priority criteria with SLAs and escalation triggers, routing table and duplicate check.

- Categorize by root cause, not symptom: can't log in because of a bug is a bug, not an account issue.
- Unsure about priority? Go higher. De-escalating is easier than recovering from a missed SLA.

## 3. Check duplicates and known issues

Before routing, search what's connected: the support platform for similar open or recently resolved tickets, the knowledge base for known issues and docs, the project tracker for an existing bug or feature request. If you find a duplicate, link it, add the new information to the existing ticket, and raise its priority if the new report adds urgency.

## 4. Route

Recommend a team or queue by category and complexity: tier 1, tier 2, engineering, product, security, or billing.

## 5. Write the triage

```
## Triage: [One-line summary]

**Category:** [Primary] / [Secondary]
**Priority:** [P1-P4]: [short justification]
**Product area:** [Area or team]

### Issue summary
[2-3 sentences on what the customer experiences]

### Key details
- **Customer:** [Name or account, if known]
- **Impact:** [Who and what is affected]
- **Workaround:** [Available / Not available / Unknown]
- **Related tickets:** [Links]
- **Known issue:** [Yes, with link / No / Checking]

### Routing
**Route to:** [Team or queue]
**Why:** [Short reasoning]

### Suggested first reply
[Acknowledge, set expectations, give a workaround if there is one.
Start from the category template in references/reply-templates.md.]

### Internal notes
- [Context for whoever picks it up]
- [Reproduction hints for a bug]
- [What you already checked or ruled out]
- [Escalation triggers to watch]
```

Read [references/reply-templates.md](references/reply-templates.md) when writing the suggested first reply.

## 6. Next steps

Offer to draft a full reply (the `draft-response` skill), research more context (the `customer-research` skill), check the tracker for a known bug, or package an escalation note. Change tickets in a connected tool only after the user confirms.

Flag patterns: the same issue arriving repeatedly deserves escalation even when each ticket is low priority.
