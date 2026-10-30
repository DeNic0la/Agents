# Update templates and status rules

## Executive / leadership

They want strategic context, progress against goals, risks needing their help, decisions needing their input.

```
Status: [Green / Yellow / Red]

TL;DR: [One sentence: the most important thing to know]

Progress:
- [Outcome achieved, tied to goal or OKR]
- [Milestone reached, with impact]
- [Key metric movement]

Risks:
- [Risk]: [Mitigation]. [Ask, if needed].

Decisions needed:
- [Decision]: [Options with recommendation]. Need by [date].

Next milestones:
- [Milestone]: [Date]
```

- Conclusion first, not the journey.
- Aim for under 200 words. They'll ask for more.
- Only list risks you want help with or they must know about.

## Engineering team

They want clear priorities, technical context, blockers removed, decisions that affect their work.

```
Shipped:
- [Feature or fix]: [Link to PR or ticket]. [Impact if notable].

In progress:
- [Item]: [Owner]. [Expected completion]. [Blockers].

Decisions:
- [Decision made]: [Rationale]. [Link to ADR if one exists].
- [Decision needed]: [Context]. [Options]. [Recommendation].

Priority changes:
- [What changed and why]

Coming up:
- [Next items]: [Why these are next]
```

- Link tickets, PRs and docs; engineers click through.
- Explain why priorities changed. People buy in when they understand the reason.
- Say what blocks them and what you're doing about it. Skip what doesn't affect their work.

## Cross-functional partners

```
What's coming:
- [Feature or launch]: [Date]. [What it means for your team].

What we need from you:
- [Specific ask]: [Context]. By [date].

Decisions made:
- [Decision]: [How it affects your team].

Open for input:
- [Topic]: [How to give feedback].
```

## Customers / external

```
What's new:
- [Feature]: [Benefit in customer terms]. [How to use it or link].

Coming soon:
- [Feature]: [Expected timing]. [Why it matters to you].

Known issues:
- [Issue]: [Status]. [Workaround if available].

Feedback:
- [How to share feedback or request features]
```

- No jargon, ticket numbers or implementation details.
- Frame it as what the customer can now do, not what you built.
- Don't overcommit: "later this quarter" beats a date you might miss.
- Mention known issues only if customer-impacting and with a resolution plan.

## Status colors

- **Green, on track:** progressing as planned, no significant risk, commitments will be met. Not a default.
- **Yellow, at risk:** slower than planned or a risk materialized; mitigation underway, outcome uncertain. Flag early; earlier means more options.
- **Red, off track:** significantly behind, a major blocker without clear mitigation; commitments will be missed without intervention (scope cut, people, time). Use it when you need help, before it's too late.

Move to yellow at the first sign of risk. Move to red when your own options are exhausted. Move back to green only when the risk is resolved, not paused. Always say why the status changed.

## Communicating a risk

1. The risk: "There's a risk that [thing] happens because [reason]."
2. Impact: "If it happens, [consequence]."
3. Likelihood: "This is [likely / possible / unlikely] because [evidence]."
4. Mitigation: "We're managing it by [actions]."
5. Ask: "We need [specific help] to reduce it further."

**ROAM** for tracking risks: Resolved (say how), Owned (owner and plan), Accepted (proceeding without mitigation; record why), Mitigated (what reduced it).

Mistakes: burying risks in good news, vagueness ("some delays": say what, how long, why), risks without mitigation, raising them late. Early, a risk is a planning input; late, it's a fire drill.
