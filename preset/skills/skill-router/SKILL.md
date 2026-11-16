---
name: skill-router
description: Use at the start of every task and again whenever its goal, focus or context changes - a new request, a change of direction, a lifecycle state change, other files or another area of work. Finds the skills that fit the work now, including skills listed by name only, and loads them.
license: MIT
---

# Skill router

Skills may be listed by name only, without their description, so every session's context stays small. This skill finds the ones that fit what you're doing now and loads them, so a skill is in context when it applies and not before.

## When to use

- At the start of every task.
- Again whenever the goal, the focus or the context changes:
  - the user asks for something new or changes direction
  - the work moves to another lifecycle state, such as from Explore to Plan or from Implement to Review
  - you move to other files, another layer or another area of work
  - a subtask needs a different kind of work, such as a migration, a review or a data question
- Not before each message of the same goal: skills you loaded stay in the conversation.

A skill whose name plainly fits the step at hand can be used directly, without routing first. For example, use `dependency-vetting` before you install or add a package.

## Steps

1. Say to yourself in a few words what the work is now: the goal, the lifecycle state and the next step.
2. Pick the one or two areas below that fit it.
3. Read each chosen area's router file, `<area>/SKILL.md`. Take it from `.agents/skills/` in the repository if it's there, else from `~/.agents/skills/`. Use its **Choosing** section and its **Skills** table as a catalog, and don't follow its steps. Most routers are skills only the user may start, but reading the file isn't starting it.
4. Skills the repository adds itself are listed with their descriptions. Include them when they fit.
5. Load what fits, usually one or two skills:
   - Invoked by `agent`: use that skill now, by its name.
   - Invoked by `user`: don't start it. Tell the user its name and what it would do, and go on.
   - Nothing fits: go on without a skill. Don't force one.
6. When the set of skills changes, tell the user in one line, for example: `Skills: planning-and-task-breakdown -> tdd, code-review`. From then on follow the new skills, and stop following the ones that no longer apply.

## Areas

| Area | Pick it for |
|---|---|
| think | exploring a request, an idea or a decision before anything gets built |
| design | shaping the domain, the architecture or an interface |
| planning | turning a decision into specs, tickets or tasks, or handing work over |
| build | building a change, from one fix to a whole spec |
| improve | fixing, cleaning up or hardening code that already exists |
| ship | checking a change, getting it merged and released, and running it |
| data | a data question, from one query to a shared dashboard |
| product | product work: specs, roadmaps, sprints, research and updates |
| support | customer support: triage, research, replies and knowledge base articles |
| productivity | the user's own tasks and working memory |
| agent-setup | improving the agent itself: its skills, instructions, context, prompts and usage |

## Red flags

- You started work in a new area or state without routing again.
- You routed again before every message, although the goal didn't change.
- You loaded every skill an area lists, rather than the one or two that fit.
- You started a user-invoked skill yourself.
