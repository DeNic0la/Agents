---
name: agent-lifecycle
description: Always, for any work in a project - announce the lifecycle state, change only what that state allows, get the user's explicit yes before implementing, and end every piece of work in Finish.
---

# Agent lifecycle

Applies to every agent, in every tool, for any work in a software project. It doesn't apply to chat-only questions outside a project or to teaching workspaces (the `teach` skill).

**Terms:**
- **Work** is what the lifecycle tracks: one goal, from the first question to Finish.
- **Task** is the file that records the work in `.specs/tasks/`.
- **Steps** and **phases** are the items of a task's plan.
- A task's folder and markers are its **status**. The lifecycle **state** is where the work is right now, and it lives only in the conversation.

## Flow

```
Triage? → Explore ⇄ Discovery / Research
             ↓
          Refine ⇄ Explore            (gate: the user confirms the spec)
             ↓
           Plan → Confirm             (gate: consistency check, then an explicit yes)
             ↓
        Implement → Test ⇄ Debug → Review → Polish? (Simplify / Optimize → Test → Review)
             ↑                        │
             └──── findings ──────────┘          scope or design change → back to Refine or Plan

Finish: from any state, always last
```

## States

| Group | State | Purpose | Changes allowed | Next |
|---|---|---|---|---|
| 1. Entry (optional) | **Triage** | sort incoming work (issue, PR, bug report): in scope, duplicate, or rejected | labels, `.out-of-scope/`, `.specs/issues/` | Explore, Refine, Finish |
| 2. Understand (read-only) | **Explore** | answer questions and brainstorm with the user: approaches, mockups, what-ifs | none (mockups go to the OS temp folder) | Discovery, Research, Refine, Finish |
| | **Discovery** | facts from **this project**: code, history, tests, logs, ADRs | no code; a discovery note, kept in `.specs/analysis/` for a task | back to the state that asked |
| | **Research** | facts from **outside**: official docs, APIs, the web | no code; a research note, kept in `.specs/research/` for a task | back to the state that asked |
| 3. Define | **Refine** | turn the request into a spec the user confirms (what and why, not how) | the task: a draft, then its Description and Acceptance Criteria | Plan, back to Explore |
| | **Plan** | design plus steps, in the plan type the user chose | the task's plan sections and sub-task files | Confirm |
| | **Confirm** | ⛔ gate: consistency check, then the user's explicit "yes" | none | Implement, back to Plan or Refine |
| 4. Build | **Implement** | carry out the confirmed plan, nothing more | code covered by the plan | Test |
| | **Test** | write and run tests | tests | Review, or Debug on failure |
| | **Debug** | root cause first, then a fix | diagnostics, then the fix | Test, or back to Plan if the design is wrong |
| | **Review** | check the diff against the spec and the Definition of Done, in a fresh context | none except the task's review markers | Finish, Polish, back to Implement |
| 5. Polish (optional, the user's choice) | **Simplify** | make it clearer without changing behavior | code | Test, then Review again |
| | **Optimize** | get it ready for production: performance, observability, rollout | code, config | Test, then Review again |
| 6. Exit (always) | **Finish** | close properly however the work ends: done, answered, abandoned, paused, blocked | the task's folder, a commit or revert the user chose | end |

## Rules in every state

1. **Announce the state.** Start each reply with the current state in brackets, plus the task when there is one: `[Explore]`, `[Implement · add-validation-login-form.feature]`. When the state changes, say from which to which and why. Only the orchestrating agent announces; subagents it dispatches work inside its state.
2. **Stay inside the state.** Change only what the "Changes allowed" column permits.
3. **The user owns two gates.** Move between states on your own, except at these two:
   - Leaving Refine needs the user to confirm the spec. On the agent path, `plan-task` holds this gate with `--human-in-the-loop 2`.
   - Implement starts only after an explicit "yes" in Confirm. "Sounds good" about an idea, silence, or "whatever you think" is not a yes.
4. **Look before you ask.** Never ask the user what Discovery or Research could answer. Refine always starts with Discovery, scaled to the work: a look at the affected files for a small change, a full discovery note for larger work.
5. **Off-goal stays off.** Never act on anything the current goal doesn't need (an unrelated bug, a refactor, a tangent, an idea). Note it in one line and move on. Finish lists the notes, and the user decides what happens to them.
6. **Changes in scope go back.** If the user widens the goal, or Build shows the spec or the design is wrong, go back to Refine or Plan, and through Confirm again. Never stretch the confirmed plan to cover it.
7. **Review is independent.** Review runs in a fresh context (a subagent) where the tool allows it. The agent that wrote the code doesn't review it alone.
8. **Finish is reachable from anywhere.** Every piece of work ends there, never by just stopping.
9. **Small work merges states.**
   - **Small, obvious change:** Refine, Plan and Confirm collapse into one message ("I'll change X in Y. OK?"), and the user's yes counts as Confirm. The task file is still written, as a Quick task.
   - **Trivial change** (no behavior change: a typo, a comment, formatting): no task file.
   - Test and Review always happen. For a trivial change, they're a check that nothing else changed.
10. **The lifecycle lives in context only.** Never write the state into the repository: not into a task, a note, or a state or log file. The one exception is a handoff document outside the repository (the OS temp folder), which may carry it. A new session works out its state from the conversation and the task's status, and announces what it worked out so the user can correct it.
11. **Tasks are always files.** All work that reaches Refine and isn't trivial is a task in `.specs/tasks/`. Its folder (`draft`, `todo`, `in-progress`, `done`) and its markers are its status. Use the task format exactly as `specs-workflow.md` defines it, because many projects depend on it.
12. **Utility skills don't change the state.** Skills such as `wait-what`, `to-questionnaire`, `handoff` or `retro` run inside the current state.

## Supporting files

- [states.md](states.md): read when entering a state you haven't been in yet this session: its exit criterion, outputs and the skills that help.
- [plan-types.md](plan-types.md): read in Plan, to recommend a plan type and write the plan in its shape.
- [tasks.md](tasks.md): read when work has a task in `.specs/tasks/`, or is about to get one: which state lives in which folder, which skill moves it, and how to resume.
- [finish.md](finish.md): read when entering Finish: the checklist for each way work ends.
