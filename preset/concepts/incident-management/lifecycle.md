# Incidents and the agent lifecycle

An incident is handled outside the normal path of Refine → Plan → Confirm, because users are affected now. It still follows the agent-lifecycle's rules: announce the state, stay inside it, and never let the user's gates disappear.

## Mapping

| Incident phase (`incident-response`) | Lifecycle state | What may change |
|---|---|---|
| Triage: severity, scope, roles | **Triage** | the incident record |
| Investigate what changed and where | **Discovery** (logs, deploys, dashboards) | the incident record |
| Mitigate | **Implement**, as an emergency plan: each action is proposed and needs the user's yes (rule 2) | production, only the confirmed action |
| Confirm resolution | **Test**: the signal that showed the problem is back to normal | the incident record |
| Communicate | inside the current state (a utility, lifecycle rule 12) | drafts only; the user sends |
| Postmortem | **Review**: of the incident, not of a diff | the incident record |
| Close | **Finish** | the record's status, the follow-up links |

Announce it with the incident: `[Implement · incident 2026-10-30-checkout-errors]`.

## When an incident interrupts other work

1. **Pause the current work properly:** Finish with the ending *Paused* (the task stays where it is, see the agent-lifecycle's finish.md).
2. Handle the incident.
3. Resume the paused work afterwards from its task's status.

Never mix mitigation changes into a task's diff, and never continue a task's steps during an incident.

## Follow-up work goes through the normal lifecycle

Everything after resolution that changes code is ordinary work:
- **The root-cause fix** is a draft task of type `bug` (`add-task`) whose Description names the incident ID. It goes through Refine, Plan, Confirm, and its regression test names the incident ID too.
- **Action items** become draft tasks, or tracker issues when the team tracks them there (the issue-tracker concept). Each keeps its owner, priority and due date.
- **A mitigation that stays in place** (a disabled flag, a pinned version) is recorded in the incident's Follow-up as something to undo, with its own task.
