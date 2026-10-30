---
name: think
description: Pick the skill for exploring a request, an idea or a decision before anything gets built.
license: MIT
metadata:
  router: "true"
---

# Think

A router: it names the skills for one area of work and when to reach for each. It does none of the work itself.

1. Take what the user wants from the argument, else from the conversation. If it's still unclear, ask one question.
2. Pick the one skill below that fits, using **Choosing**, and say why in one line.
3. Hand over:
   - Invoked by `agent`: use that skill now, on what the user asked.
   - Invoked by `user`: only the user can start it. Tell them its name and what to pass it, then stop.
   - Not available in this setup: say so, and name the closest skill that is.

If nothing here fits, name the router that does: `design`, `planning`, `build`, `improve`, `ship`, `agent-setup`, `data`, `product`, `support`, `productivity`.

## Choosing

- Nothing is clear yet and you don't know what the user wants: `interview-me`. A vague idea: `idea-refine`. A request that should end as an approved design doc: `brainstorming`. Looking for what to build next: `ideate`.
- A plan already exists and needs testing: `grilling` (`grill-me` is the user's shortcut to it). A technical idea that needs a build, reshape or drop verdict: `roast`. One hard decision between named options: `jury`.
- The agent is stuck on a question of its own: `what-would-you-do`. The agent's last message was unclear: `wait-what`.
- A question of fact: `research`. A design question that running code answers faster than talk: `prototype`. Learning a topic over several sessions: `teach`.

## Skills

| Skill | Use it to | Invoked by |
|---|---|---|
| interview-me | find out what the user actually wants before anything exists | agent |
| idea-refine | turn a vague idea into concrete variations and pick one | agent |
| brainstorming | go from a request to an approved design doc | agent |
| ideate | generate grounded ideas for what to build next, critique them and rank the survivors | user |
| grilling | stress-test an existing plan, decision or idea in rounds of questions | agent |
| grill-me | start a grilling session on a plan or design (entry point to `grilling`) | user |
| roast | have five independent reviewers attack a technical idea, then get one BUILD / RESHAPE / DROP verdict | user |
| jury | put a hard decision to 3 or 5 blind-voting subagents and get one verdict with dissent | user |
| what-would-you-do | have the agent explain its open question and recommend an answer, with the case for and against each option | user |
| wait-what | have the agent re-explain its last message in plain words | user |
| research | research a question against primary sources and save the cited findings as one Markdown file | agent |
| prototype | build a throwaway prototype that answers one logic or UI design question | agent |
| teach | learn a topic over several sessions in a teaching workspace | user |
