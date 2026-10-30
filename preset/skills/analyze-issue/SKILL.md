---
name: analyze-issue
description: Analyze an issue from the project's tracker and write a technical specification for it in .specs/issues/.
---

# Analyze issue

> **Repo version first:** if this repository has `.agents/skills/analyze-issue/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

Turn one issue into a technical specification grounded in the code: what's wrong or wanted, how to solve it, what to change and how to test it. You write the spec; you don't implement it.

## Steps

1. **Get the issue.** Check `.specs/issues/` for a saved copy named `<number, padded to 3 digits>-<kebab-case title>.md`. If there isn't one, read the issue (title, body, labels, comments) as `.agents/issue-tracker.md` and the issue-tracker concept describe, and save it under that name. If that file doesn't exist, generate it first with the issue-tracker recipe: `.agents/references/issue-tracker.md` in the project, else `~/.agents/references/issue-tracker.md`. If there is no tracker to read from, ask the user to paste the issue.
2. **Understand the requirements**, including what the comments added or changed.
3. **Read the related code** and the project's structure until you can explain how the affected parts work today. Find existing utilities the solution can reuse.
4. **Check the project's bar:** `.agents/definition-of-done.md`, `.agents/testing-patterns.md` and its instruction files, if present. The spec's approach, test plan and success criteria follow them.
5. **Write the spec** to `.specs/issues/<same name>.specs.md`:

   ```markdown
   # Technical specification for issue #<number>

   ## Issue summary
   - Title, a short description, labels, and priority (high / medium / low, from the issue's content)

   ## Problem statement
   <1-2 paragraphs>

   ## Technical approach
   ## Implementation plan
   1. <step>

   ## Test plan
   - Unit tests: <scenarios>
   - Component tests: <scenarios>
   - Integration tests: <scenarios>

   ## Files to modify
   - <path>: <change>

   ## Files to create
   - <path>: <purpose>

   ## Existing utilities to reuse
   - <name or path>: <purpose>

   ## Success criteria
   - [ ] <criterion>

   ## Out of scope
   - <item>
   ```

   Name only paths you've read or that the plan creates. Drop a test level that doesn't apply rather than inventing scenarios.

## Report

The issue number and title, the spec's path, and its 2-3 key points. Offer the next step: the `add-task` skill with the spec as input, to plan and implement it through the `.specs/` workflow.
