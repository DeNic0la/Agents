---
name: customer-research
description: Use when a customer asks something you need to look up, when checking whether a customer-reported bug was reported before, when finding what was previously told to an account, or when gathering background before drafting a support reply. Researches a customer question across sources with attribution and a confidence level.
---

# Customer research

Research a customer question, product topic or account across every available source, and answer with attribution and a confidence level.

## 1. Parse the request

Identify the type:

- **Customer question:** needs an answer ("Does the product support SSO with Okta?").
- **Issue investigation:** background on a reported problem ("Reported before? Known workaround?").
- **Account context:** history with a customer ("What did we tell Acme last time?").
- **Topic research:** general support knowledge ("webhook retry best practices").

Before searching, decide whether the question is factual (one right answer), contextual (several perspectives) or exploratory (scope still open), and who the answer is for: the internal team, a customer or leadership.

## 2. Search by tier

Search systematically, using whatever is connected. Don't stop at the first hit; cross-check.

1. **Official internal:** knowledge base (product docs, runbooks, FAQs, policies), shared document storage, internal roadmap.
2. **Organizational context:** CRM account notes and history, support platform (past resolutions, known issues, workarounds), meeting notes.
3. **Team communications:** team chat, email, calendar notes.
4. **External:** web search, public docs and help centers, release notes, partner documentation.
5. **Inferred:** how similar questions or customers were handled, general best practice. Always flag this as inference.

Read [references/confidence-and-escalation.md](references/confidence-and-escalation.md) when assigning confidence, resolving contradicting sources, deciding whether to escalate, or writing findings into the knowledge base.

## 3. Write the research brief

```
## Research: [Question or topic]

### Answer
[Direct answer, bottom line first]

**Confidence:** [High / Medium / Low / Unable to determine]
[What drives that level]

### Key findings
**From [Source 1]:**
- [Specific finding]

**From [Source 2]:**
- [Specific finding]

### Context and nuance
[Caveats, edge cases]

### Sources
1. [Source name or link]: [what it contributed]

### Gaps and unknowns
- [What couldn't be confirmed; what needs an expert]

### Recommended next steps
- [What to do if this goes to a customer, further research, who verifies]
```

## 4. When sources come up empty

Do web research, then ask the user for internal context: internal docs, channels where the team discussed it, a subject matter expert. Say plainly what the answer rests on: "This is based on web research only. Verify it against internal documentation before sharing it with the customer."

## 5. Customer-facing answers

- Flag roadmap, pricing, legal and security topics for review before they reach the customer.
- Note if the answer differs from what the customer was told before.
- Suggest caveats for the reply, and offer to draft it with the `draft-response` skill.

## 6. Capture the knowledge

If the question will come up again or took real effort, offer to save it as a knowledge base entry or FAQ (the `kb-article` skill writes full articles). Write to a connected knowledge base only after the user confirms.
