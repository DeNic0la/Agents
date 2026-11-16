# Concepts

Rules I declare for AI agents (Claude Code, Codex, GitHub Copilot): how their instructions are written and organized, and how they work in a project. They apply to everything in this repo, and to any new agent instructions: AGENTS.md and CLAUDE.md files, skills, subagents, commands, hooks and prompts.

Each concept is a folder with `CONCEPT.md` as its entry point. Open a concept only when it applies to the task.

| Concept | Applies when |
|---|---|
| [agent-lifecycle](agent-lifecycle/CONCEPT.md) | always, for any work in a project: which state the work is in, what that state may change, when to move on, and how to finish |
| [progressive-disclosure](progressive-disclosure/CONCEPT.md) | writing or restructuring any Markdown file meant for an AI agent |
| [out-of-scope](out-of-scope/CONCEPT.md) | triaging an issue or PR, or a maintainer rejects an enhancement: check and record rejections in `.out-of-scope/` |
| [portable-skills](portable-skills/CONCEPT.md) | writing a skill or command, deciding who may invoke a skill or whether it is tailored or global, or adding tool-specific or runtime settings (allowed-tools, context, ...) to one |
| [repo-checkout-roles](repo-checkout-roles/CONCEPT.md) | working in a clone of a codebase that has several clones with different jobs: infer the checkout's role from what the owner does, propose a checkout level, and match it to known roles |
| [issue-tracker](issue-tracker/CONCEPT.md) | reading an issue from, or writing an issue, comment, label, link or status to, the project's issue tracker (Jira, GitLab, ...) |
| [incident-management](incident-management/CONCEPT.md) | production is down or degraded, an alert or rollback trigger fires, a P1 ticket reports an outage, or you write or read an incident record, status update, postmortem or incident follow-up |
| [domain-driven-design](domain-driven-design/CONCEPT.md) | writing, reviewing or refactoring application code: layering, pure core, explicit call sites, domain naming, error handling, library first |
| [external-tools](external-tools/CONCEPT.md) | a task matches a listed external tool (maigret, Pulse Diagnostics, ...), or you notice repeated work an established program would do better: set tools up after a yes, and recommend unlisted ones |
| [security-scanning](security-scanning/CONCEPT.md) | running, scheduling or triaging a security scan (CVEs in dependencies, secrets, container images, IaC), or recommending a scanner |
| [usage-budget](usage-budget/CONCEPT.md) | always, for work that spends plan usage: picking a model, tier or effort, dispatching agents or a workflow, long sessions, and when the user mentions usage, limits or cost |

## Adding a concept

1. Create `<name>/CONCEPT.md` with `name` and `description` frontmatter. Put supporting files next to it.
2. Add one row to the table above.
