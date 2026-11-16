# 0008 Development runs in the cloud, on GitHub issues

- **Status:** accepted, planned (see [development-workflow.md](../development-workflow.md) and [specs/cloud-development-workflow.md](../specs/cloud-development-workflow.md))

## Context

The repo is developed in local sessions the owner starts and steers, on the weekly plan budget. Ideas and requests live in conversations and in `.specs/` drafts on one machine, so they're lost or forgotten, and nothing moves while the owner isn't at a machine. The owner wants development to run by itself: requests and agents' recommendations collected in one place, refined and challenged by agents, and implemented once approved.

## Decision

- **GitHub issues on `DeNic0la/Agents` are the only backlog.** Owner requests and agent recommendations both become issues; labels carry the state.
- **Agents run in the cloud as Managed Agents sessions on the Claude Developer Platform**, started by a dispatcher without AI that connects GitHub events and a schedule to sessions.
- **A triage agent on the strongest model decides the process per issue**: direct, lean or full, by scope, complexity and how the issue was asked for.
- **The owner approves what gets built.** Only an issue the owner wrote, naming the exact change, is implemented without a separate approval. An agent's recommendation always needs it.
- **Who merges depends on risk**, in three classes: the implementing agent (typos, human-facing docs), a review agent (most changes), the owner (anything that runs on or governs the owner's machines, the workflow's own rules, security concerns, very big changes, or the owner's label). Agents can raise a class, only the owner can lower it, and repository protection enforces it.
- **Spend has a monthly cap and a cap per issue.** A scout agent recommends weekly, at most three issues per run.

## Rejected

- **`.specs/` task files as the backlog:** local to one machine and one clone, invisible from the cloud, and no place to ask the owner a question.
- **Claude Code cloud sessions or scheduled tasks on the plan budget:** they spend the weekly allowance the owner's own work depends on, and have no hard cost limit per session.
- **Claude Code GitHub Actions as the agent runtime:** triggers come for free, but per-role agent definitions, vaults, session records and per-session cost limits are what the platform provides. A GitHub workflow may still serve as the dispatcher; that's a build decision.
- **The owner merges everything:** safe, but every typo waits for a person, which defeats the purpose.
- **Agents merge everything that passes review:** `main` is pulled onto every machine by `agents update`, the work laptop included, so agent-written scripts, hooks and permission rules would run there unseen.
- **Agent recommendations on the direct route:** agents would propose, approve and merge changes to their own instructions with no person involved.
- **Triage by a cheap model:** triage decides how much every later stage costs and how much risk is accepted; a wrong call there is the most expensive mistake in the workflow.

## Consequences

- The Claude Developer Platform bills per use, apart from the plan budget, so the workflow has a cost of its own that the caps bound.
- Managed Agents and its scheduling are in beta, and the platform doesn't react to GitHub events itself: the dispatcher is a component to build and to keep working as the platform changes.
- Agents need a GitHub identity of their own, and the repository needs protection rules; both are prerequisites, not options.
- The `issue-tracker` concept's "write only what the user asked for" is met by the workflow document as a standing request. The concept's commands cover Jira and GitLab; GitHub needs its own guide.
- `.specs/` stays as working material for local sessions; in the cloud the issue is the task.
