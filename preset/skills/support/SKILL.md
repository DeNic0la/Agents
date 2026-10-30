---
name: support
description: Pick the skill for customer support: triage, research, replies and knowledge base articles.
license: MIT
metadata:
  router: "true"
---

# Support

A router: it names the skills for one area of work and when to reach for each. It does none of the work itself.

1. Take what the user wants from the argument, else from the conversation. If it's still unclear, ask one question.
2. Pick the one skill below that fits, using **Choosing**, and say why in one line.
3. Hand over:
   - Invoked by `agent`: use that skill now, on what the user asked.
   - Invoked by `user`: only the user can start it. Tell them its name and what to pass it, then stop.
   - Not available in this setup: say so, and name the closest skill that is.

If nothing here fits, name the router that does: `think`, `design`, `planning`, `build`, `improve`, `ship`, `agent-setup`, `data`, `product`, `productivity`.

## Choosing

- A new ticket: `ticket-triage`. A question you need answered before replying: `customer-research`. The reply: `draft-response`. A resolved issue others will hit: `kb-article`.

## Skills

| Skill | Use it to | Invoked by |
|---|---|---|
| ticket-triage | categorize, prioritize and route a customer support ticket, with a first reply | agent |
| customer-research | research a customer question across sources with attribution and confidence | agent |
| draft-response | draft a customer-facing reply tailored to the situation and relationship | agent |
| kb-article | draft a searchable knowledge base article from a resolved issue or common question | agent |
