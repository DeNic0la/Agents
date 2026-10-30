# Lifecycle and `.specs/` tasks

All work that reaches Refine and isn't trivial is a **task** in `.specs/tasks/`, Quick changes included. The lifecycle state itself is never stored; it lives only in the conversation.

The task format is a contract shared by many projects, and by the `add-task`, `plan-task`, `implement-task`, `do-in-steps`, `analyze-issue` and `checkpoint` skills. It's defined in `specs-workflow.md`: `.agents/references/` in the project, else `~/.agents/references/`. The lifecycle uses that format as it is and never changes it.

## Where each state lives

| Lifecycle state | In `.specs/` | Moved or written by |
|---|---|---|
| Triage (from an issue) | `issues/<NNN>-<title>.md`, then its `.specs.md` | `analyze-issue`, which hands over to `add-task` |
| Discovery | `analysis/` | the `code-explorer` agent (inside `plan-task`), or a discovery subagent |
| Research | `research/`, reusable across tasks | the `researcher` agent (inside `plan-task`), or `source-driven-development` |
| Refine starts | `tasks/draft/<name>.<type>.md`, with the user's words verbatim | `add-task` |
| Refine (spec) | the draft gets Description and Acceptance Criteria; the spec gate is `--human-in-the-loop 2` | `plan-task`, or the agent itself for Quick |
| Plan | Architecture Overview, Implementation Process and the files in `sub-tasks/<task-name>/`; then the task moves to `tasks/todo/` | `plan-task`, or the agent itself for Quick |
| Confirm | the task waits in `tasks/todo/`. The user's `//` comments send it through `plan-task --refine`; an explicit yes starts Implement | the user |
| Implement, Test, Debug, Review | `tasks/in-progress/`, with `[DONE]` on steps, `[REVIEWED]` on phases, and reports in `reports/` | `implement-task`: each phase review is a Review, then the Definition of Done check |
| Finish (done) | `tasks/done/` | `implement-task` |
| Finish (paused) | the task stays where it is, with its markers and checkboxes up to date | `checkpoint` for the task; `handoff` for the session |
| Finish (abandoned) | ask the user: delete the task file and its `sub-tasks/` folder, or leave it in `draft/` or `todo/` for later | the user decides |

## Resuming a task

A new session works out the state from the task's status, then announces the state it worked out, so the user can correct it:

| Task is in | Resume in |
|---|---|
| `draft/`, without Acceptance Criteria | Refine |
| `draft/`, with Acceptance Criteria | Plan |
| `todo/` | Confirm (a yes from an earlier session doesn't carry over) |
| `in-progress/` | Implement, at the first phase without `[REVIEWED]` or `[REVIEWED-SKIPPED]` (`implement-task --continue`) |
| `done/` | Polish or Finish only |

## Rules

- **The task file is a specification, never a log.** No lifecycle state, transition log or session notes go into it; only the markers and checkboxes `specs-workflow.md` allows.
- **Every non-trivial piece of work is a file, Quick ones too.** For a Quick change, capture it with `add-task` and write its short sections directly into the task (see plan-types.md). It still goes draft → todo → in-progress → done.
- **No task without Refine.** Explore, Discovery and Research create no task while they only answer questions.
- **Off-goal notes become drafts, if the user wants.** Finish offers to capture each one with `add-task`. It lands in `tasks/draft/` and goes through Refine later.
- **Polish after `implement-task`** works on the finished task, already in `done/`, and is announced as its own state. It runs Test and a short Review again, but doesn't move the task.
- **Only the orchestrator announces.** The agents that `plan-task` and `implement-task` dispatch work inside the orchestrator's state and don't announce their own.
