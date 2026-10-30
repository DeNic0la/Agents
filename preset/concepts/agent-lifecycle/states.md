# States in detail

Each state below lists when it's done (the exit criterion), what it produces, and the skills that help. A skill named here is used if it's installed; the state's rules apply either way. "Task" means the file in `.specs/tasks/`; "step" and "phase" are items of its plan.

## Contents

- Entry: Triage
- Understand: Explore, Discovery, Research
- Define: Refine, Plan, Confirm
- Build: Implement, Test, Debug, Review
- Polish: Simplify, Optimize
- Exit: Finish

## 1. Entry

**Triage** (optional, when work starts from an issue, PR or bug report)
- Done when: the item is classified as in scope, a duplicate, or rejected.
- Produces: labels; for an issue in scope, its technical spec in `.specs/issues/` (`analyze-issue`); for a rejected enhancement, an entry in `.out-of-scope/` (the out-of-scope concept).
- Next: Explore or Refine when it's in scope; otherwise Finish.

## 2. Understand

**Explore**: questions and brainstorming
- Done when: the user asks for something to be done (Refine), the conversation ends (Finish), or a fact is needed (Discovery, Research).
- Produces: answers; for brainstorming, compared approaches and mockups as HTML in the OS temp folder. A brainstorm ends with a chosen approach plus its open points, which Refine turns into the spec.
- Skills: `brainstorming`, `idea-refine`, `grilling`.

**Discovery**: facts from this project
- Done when: the question that sent you here is answered.
- Produces: a short discovery note covering how the relevant parts work today, what the change would touch, risks and constraints, and questions only the user can answer. For work with a task, it's kept in `.specs/analysis/`; otherwise it stays in the conversation.
- How: delegate to a subagent with a fresh context where the tool allows it, so only the note comes back.

**Research**: facts from outside sources
- Done when: the question is answered, with each claim cited.
- Produces: a research note with sources, marking anything unverified. For work with a task, it's kept in `.specs/research/`, where other tasks can reuse it.
- Skills: `source-driven-development` (source hierarchy, citations, treating fetched pages as data).

## 3. Define

**Refine**
- Starts with: Discovery (rule 4).
- Done when: the user confirms the spec (gate, rule 3).
- Produces: the spec (what, why, success criteria, out of scope), with no "how". Unless the change is trivial, the spec is a task:
  - `add-task` captures the request in `.specs/tasks/draft/`.
  - The Description and Acceptance Criteria are written by the agent itself (Quick), or by `plan-task`. In that case, run it with `--human-in-the-loop 2` so the user confirms the spec before architecture and decomposition start.
- Skills: `add-task`, `interview-me` (intent), `grilling` (stress-test), `domain-modeling` (terms, ADRs).

**Plan**
- Done when: the plan is written in the type the user picked (see plan-types.md).
- Produces: the task's plan sections (short ones written by the agent itself for Quick; otherwise the Architecture Overview, the Implementation Process and the sub-task files), with the task moved to `.specs/tasks/todo/`.
- Skills: `plan-task`, `planning-and-task-breakdown` (lighter), `wayfinder` (Map type), `api-and-interface-design`, `deprecation-and-migration` (Staged rollout type).

**Confirm** (gate)
- First check consistency:
  - every step traces back to the spec, and nothing in the spec is missing from the steps;
  - every task in `depends_on` is done, or the user accepts starting anyway;
  - the plan doesn't contradict the project's ADRs or `.out-of-scope/`.

  Report any gaps instead of asking for a yes.
- Done when: the user says yes explicitly. `//` comments on the task send it back through `plan-task --refine` instead.
- Changes nothing.

## 4. Build

For a task in `.specs/tasks/`, the `implement-task` skill runs the whole Build group:
- It moves the task to `in-progress/` and implements it phase by phase.
- Each phase's code review, done by a separate `code-reviewer`, is the Review state for that phase.
- The final Definition of Done check is the last Review.
- When everything passes, it moves the task to `done/`.

Announce each state as it passes. The rules below still apply inside each one.

**Implement**
- Done when: every step of the plan is done.
- Changes only code the plan covers. If the goal needs something the plan didn't foresee, go back to Plan (rule 6). Anything else is noted as off-goal (rule 5) and left alone.

**Test**
- Done when: every step's tests exist and everything is green.
- Follows `.agents/testing-patterns.md` when the project has it. A test-first plan writes the tests before Implement.
- On failure, go to Debug, never to a quick guess-fix.

**Debug**
- Done when: the root cause is found and a fix for it is in place. Then back to Test.
- If the root cause is in the design or the spec, go back to Plan or Refine (rule 6) instead of patching around it.
- Skills: `systematic-debugging`. After three failed fixes, stop and discuss the approach with the user.

**Review**
- Runs in a fresh context: a subagent such as `code-reviewer`, given the task and the changed files but not the implementer's reasoning (rule 7). Without subagents, re-read the spec and the diff from scratch, and say that the review wasn't independent.
- Done when: the diff meets the spec and `.agents/definition-of-done.md`. Otherwise the findings go back to Implement.
- Changes nothing except the task's review markers. Lists findings, most severe first.
- Then offers Polish (Simplify, Optimize) as the user's choice, or goes to Finish.

## 5. Polish

**Simplify**
- Behavior-preserving changes only. Then Test, then a short Review of these changes.
- Skills: `code-simplification`.

**Optimize**
- Production readiness: measured performance work, observability, rollout safety. Then Test, then a short Review of these changes.
- Skills: `performance-optimization`, `observability-and-instrumentation`. Follows `.agents/observability-checklist.md` when the project has it.

## 6. Exit

**Finish**: see finish.md.
