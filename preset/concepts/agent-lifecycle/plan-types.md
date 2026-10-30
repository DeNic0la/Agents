# Plan types

In Plan, recommend one type with a one-line reason and let the user choose. Default: **Quick** for a small, obvious change, **Task breakdown** for everything else. A trivial change (no behavior change: a typo, a comment, formatting) needs no plan type and no task file (rule 9).

Every type is a task in `.specs/tasks/`, in the format of `specs-workflow.md` (see tasks.md). It starts as a draft (`add-task`) and moves to `todo/` once planned. The types differ in who writes the plan, how `plan-task` is run, and what the plan stresses.

| Type | Use for | How it's planned |
|---|---|---|
| **Quick** | small, obvious changes | No subagents. The agent writes a short version of each section into the draft itself: a one-paragraph Description, the few checklist items and regular checks that apply, and a one-step Implementation Process. Then it moves the task to `todo/`. `plan-task --one-shot` does the same with agents. |
| **Task breakdown** | normal feature work | `plan-task --human-in-the-loop 2` with its full stages, or `plan-task --fast` for medium-sized work (the spec gate is then a yes in the conversation before it runs decomposition) |
| **Design-first** | technically constrained work, where the architecture decides what's feasible | `plan-task --human-in-the-loop 2,3`, so the user confirms the spec, then approves the design before it's decomposed |
| **Test-first** | logic-heavy or bug-prone work | `plan-task --human-in-the-loop 2`, telling the tech lead that every step writes its failing tests first; the Test Strategy's cases drive the steps |
| **Spike, then plan** | the approach is still uncertain | The draft task names the question the spike answers. A time-boxed throwaway prototype answers it; its code isn't kept, and its lessons go into the draft. Then the draft is planned as one of the other types. |
| **Staged rollout** | migrations and risky production changes | `plan-task --human-in-the-loop 2`, telling the tech lead to cut phases as expand/contract steps, each deployable on its own, with a check and a rollback per phase (the `deprecation-and-migration` skill) |
| **Map** | work too big for one session | A map of decision tickets in the issue tracker (the `wayfinder` skill). Each resolved decision becomes a draft task (`add-task`) and is planned as one of the types above. |

Without subagents, or when the user wants a lighter plan than `plan-task`, use the `planning-and-task-breakdown` skill. Write its result into the draft task's sections, not into a separate plan file.
