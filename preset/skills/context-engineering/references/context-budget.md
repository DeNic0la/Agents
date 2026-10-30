# Context Budget Management

The context window is not a filing cabinet — it's a working desk. As a session runs, conversation history, tool output, and exploration accumulate. Most of it becomes deadweight. Budget proactively: waiting until the window is full causes abrupt quality drops; managing regularly keeps the agent coherent through long tasks.

**Start trimming at 75% capacity, not 100%.** By the time the window is genuinely full, the model's attention is already fragmented across too many signals. The 75% threshold gives room to compress gracefully rather than cut desperately mid-task.

## What to cut first

| Content | When to cut |
|---|---|
| Past failed attempts and their error output | Once you've moved past them — keep the conclusion, not the journey |
| Verbose tool output (long `find` results, full file listings) | After you've extracted what you needed |
| Conversational back-and-forth | As soon as the decision is reached |
| Earlier drafts of code that were replaced | Immediately on replacement — the current file is the record |

## What to protect until the end

- The original task definition and key constraints
- The current error message or failing test output you are actively debugging
- The file currently being edited, or its most recent version
- Any hard constraints the agent has been asked to enforce (auth rules, naming conventions, etc.)

## Compress before dropping

Summarizing beats deleting. Before removing a long stretch of exploration, reduce it to one sentence capturing the conclusion:

```
Before: [8 messages debugging a failing import — various attempts, error logs, dead ends]
After:  "Import issue traced to a circular dependency in src/lib/db.ts —
         resolved by moving the shared type to src/types/index.ts."
```

The detail is gone; the decision is preserved. If the detail turns out to matter, the summary is a breadcrumb for re-investigation.

What each kind of content keeps when compressed:

| Content | Keep | Drop |
|---|---|---|
| Tool output | findings, numbers, conclusions | raw output |
| Conversation turns | decisions, commitments, changes of direction | back-and-forth |
| Retrieved documents | the facts and claims the task uses | supporting elaboration |
| Rules, task definition, hard constraints | everything | never compress |

Compress in that order: tool output first, then old turns, then retrieved documents.

## Mask old tool output

Once a tool result has served its decision, replace it with a compact reference (the command, the file, the one-line finding) that can be re-run or re-read if needed.

- **Never mask:** output from the latest turn, output critical to the current task, output still in active reasoning.
- **Consider masking:** output from three or more turns ago, and verbose output whose key points can be extracted.
- **Always mask:** repeated output, boilerplate, and output already summarized in the conversation.

## Partition across subagents

The strongest lever: give a subtask its own clean context, so its exploration never lands in the coordinator's window. Partition when the task splits into independent subtasks, when subtasks need different specialized context or have conflicting requirements, or when accumulated context threatens the limit.

- **Hand off lean.** Give the subagent the goal, the paths and constraints it needs, and the output format, not the coordinator's history:

  ```
  Good: "Review src/auth/ for security issues. Return findings as
         file:line, severity, one-line description."
  Bad:  "I need you to look at the authentication module, which is in
         src/auth/ and contains login.ts, session.ts, tokens.ts... [500 more tokens]"
  ```

- **Aggregate deliberately.** Check every partition finished, merge compatible results, resolve conflicts between them, and summarize if the combined result is still too large.

## Which technique when

| What dominates the window | Apply |
|---|---|
| Tool output | masking |
| Retrieved documents | summarizing, or partitioning |
| Message history | compaction with summaries |
| Several of these | combine them |

Measure first: look at what is actually filling the window before choosing.

## Order for recency

Put the most task-critical content **last** in context. Models recall content at the start and end of the window more reliably than the middle (the lost-in-the-middle effect — Liu et al., 2023). Keep stable rules and specs at the start; put the active task material last, closest to the generation point:

```
← session start                              generation point →
[background: rules, specs, architecture]  [working: current file, error, task]
```
