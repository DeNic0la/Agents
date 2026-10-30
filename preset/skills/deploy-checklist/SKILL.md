---
name: deploy-checklist
description: Use when about to ship a release or deploy a change to production, especially one with database migrations, feature flags or breaking API changes, or when rollback criteria need deciding before the deploy. Builds a pre-deploy checklist for this release and checks what it can.
---

# Deploy Checklist

> **Repo version first:** if this repository has `.agents/skills/deploy-checklist/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

## Overview

Build the checklist for one specific deploy, check off what can be verified now, and decide the rollback triggers before shipping, not during an incident. Run it for routine deploys too: the checklist exists for the step everyone forgets.

## When to Use

- Before a release or production deploy
- The change includes a database migration, a feature flag, a breaking API change or a config change
- Someone asks "are we ready to ship?"

**Not for:** planning a migration's phases (use `deprecation-and-migration`), or handling a deploy that already broke production (use `incident-response`).

## Process

1. **Identify the release.** The service, the version or commit range, and the deployer. List the changes in it from the git log or merged pull requests.
2. **Find what's special about it.** Look for migrations, new or changed feature flags, config or secret changes, breaking API or event schema changes, and dependency upgrades. Each adds a section to the checklist.
3. **Build the checklist** from [references/deploy-checklist.md](references/deploy-checklist.md): the base sections plus the conditional ones step 2 found. Drop items that don't apply to this deploy; don't leave them unchecked.
4. **Check what you can now**, with evidence: CI status for the release commit, review approvals, migrations run against a production-like copy, flag defaults. Mark each item checked with its evidence, or open with who must do it.
5. **Set rollback triggers** with real numbers: an error-rate and a latency threshold relative to the current baseline (read the monitoring if it's connected; otherwise ask the user), and the user flows that must keep working. Write down how to roll back and how long it takes. A migration that can't be rolled back must say so.
6. **Hand over** the checklist with the open items. Never deploy yourself unless the user asks you to.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "It's a routine deploy" | Routine deploys are where steps get skipped. Run the checklist. |
| "We'll decide on rollback if something goes wrong" | Under pressure, nobody agrees on thresholds. Decide now. |
| "The migration is backward compatible" | Show it: old code against the new schema, and the rollback path. |
| "CI was green yesterday" | Check the exact commit being deployed. |

## Red Flags

- Rollback triggers without numbers.
- A migration with no tested rollback, not flagged as one-way.
- Checklist items ticked without evidence.

## Verification

- [ ] The checklist covers every special change found in step 2.
- [ ] Every checked item has evidence; every open item has an owner.
- [ ] Rollback triggers have thresholds, and the rollback steps are written.
