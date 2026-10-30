---
name: incident-response
description: Use when production is down or degraded ("we have an incident", "prod is down"), when an alert needs a severity call, when a status update is due mid-incident, or when writing a blameless postmortem after one is resolved. Runs triage, communication, mitigation and the postmortem.
---

# Incident Response

> **Repo version first:** if this repository has `.agents/skills/incident-response/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

## Overview

Take an incident from detection to postmortem: classify it, keep people informed, restore service first, and learn from it without blame. During an incident, mitigation beats root cause; the root cause comes after users are no longer affected.

## When to Use

- Production is down or degraded, or an alert fired and needs a severity call
- An incident is running and a status update is due
- An incident is resolved and needs a postmortem

**Not for:** a bug without user impact, or finding the root cause once service is restored: use `systematic-debugging`.

## Pick the Phase

If the user doesn't say, ask which phase the incident is in: **new**, **update**, or **postmortem**.

## Phase 1: Triage (new incident)

The incident-management concept (`.agents/concepts/incident-management/` in the project, else `~/.agents/concepts/`) holds the severity scale, the status vocabulary, the rules and the incident record format. Follow it throughout.

1. **Assess severity** on the concept's SEV1-4 scale, or the project's own if it has one, and state why. When unsure between two levels, pick the higher one.
2. **Open the incident record** where the project keeps incidents (the concept's `records.md`), and start its timeline in UTC with the detection.
3. **Scope the impact:** which systems, which users, since when. Check recent deploys, config changes and dependency status first: they're the most common cause.
4. **Name the roles:** an incident commander who coordinates, someone on communications, and the responders. One person can hold several in a small team, but the commander doesn't debug.

## Phase 2: Communicate

- Post the first status update right away, even with little information. Use [references/status-update.md](references/status-update.md).
- Every update says what's happening, who's affected, what's being done, and when the next update comes. Facts only; no guesses about the cause.
- Keep the cadence the concept's severity table sets (every 30 minutes for SEV1-2), and use its status vocabulary: Investigating, Identified, Monitoring, Resolved.
- Draft a customer-facing message when customers are affected, in plain language without internal names. The user sends it.
- Use the incident channel or paging tool if one is connected; otherwise give the user the text to post.

## Phase 3: Mitigate

1. **Restore service first:** roll back the last deploy, turn off the feature flag, fail over, scale up, or block the bad traffic. Prefer the fastest reversible action.
2. **Ask before any action that changes production.** State what it does, its risk, and how to undo it.
3. **Log every action** in the timeline with its time and its effect.
4. **Confirm resolution** with the same signal that showed the problem: error rate, latency, a user flow. Then watch it for a while before calling it resolved.

## Phase 4: Postmortem

Write it within a few days, while memory is fresh, with [references/postmortem.md](references/postmortem.md), into the incident record's Postmortem section.

- **Blameless.** Describe what systems and processes allowed the failure, not who made a mistake. "The deploy had no canary" not "Alex deployed without checking".
- **Rebuild the timeline** from logs, alerts, chat and deploy history, not memory alone.
- **Find the root cause** with five whys, going past the trigger to why it was possible. Use `systematic-debugging` if it isn't known yet.
- **Action items** each have an owner, a priority and a due date, and prevent recurrence or shorten detection or recovery. Offer to capture them as draft tasks (`add-task`) or file them in the issue tracker (`.agents/issue-tracker.md`; if it doesn't exist, generate it first with the issue-tracker recipe: `.agents/references/issue-tracker.md` in the project, else `~/.agents/references/issue-tracker.md`).
- **Follow-up:** the root-cause fix is its own `bug` task whose regression test names the incident ID; correct every runbook that was used; link all of it in the record's Follow-up section.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Wait to post until we know more" | Silence makes people assume the worst. Post what you know now. |
| "Let's find the root cause before rolling back" | Users are still affected. Mitigate first, investigate after. |
| "It was a one-off, skip the postmortem" | One-offs repeat. A short postmortem is enough for a small incident. |
| "Name who caused it, so it's clear" | Blame makes people hide information. Fix the system that allowed it. |

## Red Flags

- A production change made without the user's go-ahead.
- Updates that speculate about the cause.
- Timeline entries without times.
- Action items without owners, or "be more careful" as an action item.

## Verification

- [ ] Severity is set and the reason is stated.
- [ ] Each status update has impact, actions, next steps and the next update time.
- [ ] Every mitigation action is in the timeline.
- [ ] The postmortem is blameless, and each action item has an owner, priority and due date.
