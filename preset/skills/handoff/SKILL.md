---
name: handoff
description: Compact the current conversation into a handoff document for another agent to pick up.
license: MIT
---

# Handoff

> **Repo version first:** if this repository has `.agents/skills/handoff/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

Write a handoff document summarising the current conversation so a fresh agent can continue the work. Save to the temporary directory of the user's OS (`$TMPDIR`, else `/tmp`; `%TEMP%` on Windows) - not the current workspace. Tell the user the file's absolute path, so they can open it in the next session or send it on.

Include a "suggested skills" section in the document, naming which skills the next agent should use. For a user-invoked skill, say that the user has to invoke it.

Do not duplicate content already captured in other artifacts (specs, plans, ADRs, issues, commits, diffs). Reference them by path or URL instead.

Preserve the working state the next agent can't recover from those pointers: the objective, decisions, failed attempts and their outcomes, blockers, explicit user stops, and the scope of authorization already given. Carry that authorization forward as it is: don't invent new permission, and don't make the next agent ask again for an approval already given. End with one concrete next action.

For repository work, record the repository, branch, commit and dirty state. Tie each check or verdict to the state actually tested, including relevant configuration or environment, and keep current evidence apart from earlier claims. Missing or blocked checks stay marked incomplete. Tell the next agent to recheck mutable state before acting: branch, worktree, running processes, and remote issue or PR state when relevant.

Redact any sensitive information, such as API keys, passwords, or personally identifiable information.

If the user passed arguments, treat them as a description of what the next session will focus on and tailor the doc accordingly.
