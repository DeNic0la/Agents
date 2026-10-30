# Triage rules

## Categories

| Category | Description | Signal words |
|----------|-------------|--------------|
| Bug | Product behaves incorrectly or unexpectedly | error, broken, crash, not working, wrong, failing |
| How-to | Needs guidance using the product | how do I, can I, where is, set up, configure |
| Feature request | Wants a capability that doesn't exist | would be great if, wish I could, any plans to |
| Billing | Payment, subscription, invoice, pricing | charge, invoice, payment, refund, upgrade, downgrade |
| Account | Access, permissions, settings, user management | login, password, access, permission, SSO, locked out |
| Integration | Third-party tools or APIs | API, webhook, integration, OAuth, sync |
| Security | Security concerns, data access, compliance | breach, unauthorized, compliance, GDPR, SOC 2, vulnerability |
| Data | Data quality, migration, import/export | missing data, export, import, migration, duplicates |
| Performance | Speed, reliability, availability | slow, timeout, latency, down, degraded |

- Bug and feature request in one ticket: the bug is primary.
- The root cause decides the category.
- "It used to work and now it doesn't" is a bug. "I want it to work differently" is a feature request. "How do I make it work?" is a how-to.
- In doubt, lean toward bug. Investigating beats dismissing.

## Priorities

**P1, critical:** production down, data loss or corruption, a security breach, all or most users affected, or the problem is spreading. Respond within 1 hour, work continuously until resolved or mitigated, update every 1-2 hours.

A P1 that reports production down, data loss or a breach is also an incident: hand it to the `incident-response` skill, which classifies it on the SEV scale of the incident-management concept. A P2 with many users affected may be one too.

**P2, high:** a core workflow broken but the product partly usable, many users or a key account affected, time-sensitive work blocked, no reasonable workaround. Respond within 4 hours, investigate the same day, update every 4 hours.

**P3, medium:** a feature partly broken with a workaround, inconvenient but not blocking critical work, a single user or small team, no urgent escalation. Respond within 1 business day; resolve or update within 3.

**P4, low:** cosmetic issues, feature requests, general questions, issues with simple documented solutions. Respond within 2 business days.

Use the team's own SLAs if they differ.

**Raise the priority when** the customer waited past the SLA, several customers report the same issue, the customer escalates or mentions executives, a workaround stops working, or the scope grows (more users, more data, new symptoms).

## Routing

| Route to | When |
|----------|------|
| Tier 1 (frontline) | How-to questions, known issues with documented fixes, billing questions, password resets |
| Tier 2 (senior support) | Bugs needing investigation, complex configuration, integration troubleshooting, account issues |
| Engineering | Confirmed bugs needing code fixes, infrastructure, performance degradation |
| Product | Feature requests with real demand, design decisions, workflow gaps |
| Security | Data access concerns, vulnerability reports, compliance questions |
| Billing / finance | Refunds, contract disputes, complex billing adjustments |

## Duplicate check

1. Search by symptom: similar error messages and descriptions.
2. Search by customer: an open ticket from them for the same thing.
3. Search by product area: recent tickets in the same feature.
4. Compare against documented known issues.

When it's a duplicate: link the tickets, tell the customer it's a known issue being tracked, add the new information to the existing ticket, and raise its priority if this report adds urgency.
