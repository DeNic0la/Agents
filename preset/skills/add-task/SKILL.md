---
name: add-task
description: Capture a request as a draft task file in .specs/tasks/draft/, keeping the user's original words, ready for the plan-task skill.
---

# Add task

> **Repo version first:** if this repository has `.agents/skills/add-task/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

Create a draft task file that records exactly what the user asked for. Planning happens later, in the `plan-task` skill; this skill only names, classifies and stores the request.

The layout and file format are in `.agents/references/specs-workflow.md` (or `~/.agents/references/specs-workflow.md` if the project has none). Read it first.

## Steps

1. **Set up the folders.** Create any missing `.specs/` folders from the reference.
2. **Read the request.** Extract the objective, the type it implies, and any tasks it depends on. Ask only if the type or a dependency is truly unclear; otherwise assume no dependencies.
3. **Write the title.** Start with a verb (Add, Fix, Update, Implement, Remove, Refactor); be specific and short: "Add validation to login form".
4. **Pick the type:** `feature` (new capability), `bug` (something broken), `refactor` (restructure, same behavior), `test`, `docs`, `chore` (maintenance, dependencies), `ci`.
5. **Name the file** `<short-name>.<type>.md`: the title lowercased and hyphenated, special characters removed, 3-5 words (`add-validation-login-form.feature.md`). Check all four status folders; if the name exists, choose a more specific one.
6. **Write `.specs/tasks/draft/<file>`:**

   ```markdown
   ---
   title: <title>
   depends_on: <task files; omit this line if none>
   ---

   ## Initial User Prompt

   <the user's request, verbatim>

   ## Description

   // Will be filled in future stages by business analyst
   ```

## Rules

- Keep the user's words exactly; don't write the description yourself.
- Don't modify existing task files or create anything outside `.specs/`.
- Don't start planning. Suggest the `plan-task` skill as the next step.

## Report

```
Created task file: .specs/tasks/draft/<name>.<type>.md
Title: <title>
Type: <type>
Depends on: <task files or none>
```
