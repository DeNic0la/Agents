---
name: stakeholder-update
description: Use when writing a weekly or monthly status for leadership, announcing a launch, escalating a risk or blocker, or turning the same progress into exec, engineering, partner, customer or board versions. Writes a stakeholder update tailored to audience and cadence.
---

# Stakeholder update

Write a status update tailored to its audience and cadence.

## 1. Update type

Ask which kind:

- **Weekly:** progress, blockers, next steps.
- **Monthly:** trends, milestones, strategic alignment.
- **Launch:** a feature or product launch, its details and impact.
- **Ad hoc:** an escalation, pivot or major decision.

## 2. Audience

Ask who it's for:

- **Executives:** outcomes, strategic framing, brief.
- **Engineering:** technical detail, blockers, decisions needed.
- **Cross-functional partners** (design, marketing, sales, support): what affects them, shared goals, dependencies.
- **Customers:** benefits, clear timelines, no internal jargon.
- **Board:** metrics, strategy, risk, very concise.

## 3. Gather context

Use whatever is connected:

- **Project tracker:** milestone and roadmap status, completed items since the last update, at-risk or blocked items, sprint progress.
- **Team chat:** relevant discussions, blockers raised, decisions made asynchronously.
- **Meeting transcripts or notes, knowledge base:** decisions, action items, design reviews.

If nothing is connected, ask: what was accomplished, current blockers and risks, decisions made or needed, what's next.

## 4. Write the update

Read [references/templates.md](references/templates.md) for the per-audience templates and the status color and risk rules.

- **Executives:** status color, one-line TL;DR, progress tied to goals, risks with mitigation, specific asks, next milestones. Under 300 words.
- **Engineering:** shipped (with links), in progress (with owners), blockers, decisions made and needed (options and recommendation), priority changes with reasons, what's next.
- **Partners:** what's coming that affects them, what you need from them by when, decisions that touch their team, where input is welcome.
- **Customers:** what's new as benefits, what's coming, customer-impacting known issues with workarounds, how to give feedback.
- **Launch:** what launched, why it matters, scope, availability and limitations, success metrics, rollout plan, feedback channels.

## 5. Review and deliver

Ask whether to adjust tone, detail or emphasis. Offer to format for the channel (email, chat post, doc, slides). If team chat is connected, offer to draft the message there; send it only after the user confirms.

Read [references/meetings.md](references/meetings.md) when the user also needs to run the meeting around the update: standup, retro or stakeholder demo, or wants a decision recorded.

## Rules

- Lead with the most important thing. If there's bad news, it goes first, not after the good news.
- Status colors reflect your real assessment, not optimism. Yellow is good risk management, not failure.
- Asks are specific: "a decision on X by Friday", not "support needed".
- For executives, outcomes and goals, not activities: "we shipped X and it moved Y", not "we closed 23 tickets".
- Match length to the audience's attention.
- Use `roadmap-update` to change the roadmap itself; this skill only reports on it.
