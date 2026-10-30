---
name: draft-response
description: Use when replying to a customer: answering a product question, responding to a bug report, escalation or outage, delivering bad news like a delay or won't-fix, declining a feature request, following up after silence, or resolving a billing issue. Drafts a customer-facing response tailored to the situation and relationship.
---

# Draft response

Draft a customer-facing response that fits the situation, the relationship and the channel. The user sends it, never you.

## 1. Understand the context

From the user's input, determine:

- **Customer:** who it's for. Look up the account if a CRM is connected.
- **Situation:** question, issue, escalation, announcement, negotiation, bad news, good news, follow-up.
- **Urgency:** time-sensitive? How long have they waited?
- **Channel:** email, ticket, chat. Adjust formality and length.
- **Relationship:** new, established, frustrated or escalated.
- **Reader:** end user, manager, executive, technical, business.

## 2. Research

Use whatever is connected:

- **Email:** earlier correspondence on the topic, commitments or timelines already given, the thread's tone.
- **Team chat:** internal discussion of the customer or topic, guidance from product or engineering, similar cases.
- **CRM:** plan level, key stakeholders, past escalations or sensitivities.
- **Support platform:** related tickets, known issues and workarounds, SLA status.
- **Knowledge base:** help articles to link, shareable roadmap information, policies.

If the facts behind the answer aren't known yet, use the `customer-research` skill first.

## 3. Draft

Read [references/communication-guide.md](references/communication-guide.md) when choosing tone and structure, for the approach per situation, and for follow-up timing and escalation rules. Read [references/templates.md](references/templates.md) when the situation matches a template: bug report, billing issue, declined feature request, outage, follow-up after silence, internal escalation.

```
## Draft response

**To:** [Contact name]
**Re:** [Subject]
**Channel:** [Email / Ticket / Chat]
**Tone:** [Empathetic / Professional / Technical / Celebratory / Candid]

---

[Response text]

---

### Notes for you (internal, don't send)
- **Why this approach:** [tone and content choices]
- **Verify before sending:** [facts or commitments to confirm]
- **Risks:** [anything sensitive]
- **Follow-up:** [actions after sending]
- **Review:** [whether someone should check it first]
```

## 4. Check before presenting

- [ ] Tone fits the situation and relationship.
- [ ] No commitments beyond what's authorized.
- [ ] No roadmap details that shouldn't go outside.
- [ ] References to earlier conversations are accurate.
- [ ] Clear next steps and owners.
- [ ] Right level for the reader: not too technical for executives, not too vague for engineers.
- [ ] Length fits the channel.

## 5. Offer iterations

Offer to adjust tone (more formal, casual, empathetic, direct), add or cut points, shorten or lengthen, write a version for another stakeholder, draft the internal escalation note, or prepare a follow-up for when there's no reply.
