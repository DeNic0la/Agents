---
name: grilling
description: Use when the user wants an existing plan, design, decision or idea stress-tested ("grill me", "grill this", "poke holes in it", "challenge this", "what am I missing?"), even without the word "grill". Walks the decision tree relentlessly in rounds of numbered questions until nothing is left silently assumed. For finding what the user wants before any plan exists, use interview-me.
license: MIT
---

# Grilling

> **Repo version first:** if this repository has `.agents/skills/grilling/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask at most four frontier questions in one round (fewer if your question tool allows fewer per call), starting with the ones whose answers remove the most other questions. Number each question and give your recommended answer. Before sending, test each pair: when any option of one question would answer or reshape the other, the second moves to the next round. Then wait for the user's answers.

Every choice question includes the smallest option: do nothing, reuse what exists, or defer. Recommend it unless you can name a concrete case the user will hit where it fails. When you recommend more, name what it adds (a field, a state, a command, a file, a concept) and what breaks without it.

## Asking

If your tool has a structured question capability that is permitted in the current mode and can represent the question, use it, and follow its live schema. Put the recommended option first, mark it as recommended if the schema allows, and give each option's tradeoff. Keep the Q-number in each prompt. Use the tool's own custom-answer field instead of adding an "Other" option. Ask in chat whatever the tool can't represent, and everything when there is no such tool, in this format:

```
❓ **Q1** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>

---

❓ **Q2** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>
```

Word each question so "yes" accepts your recommended answer.

Wait for the user's actual answers before dependent work, the next round, or claiming shared understanding. A question call that returns without a reply is not an answer: meanwhile, only do independent exploration. A preselected option, a timeout, a cancellation or an unanswered question leaves that decision open.

## Rounds, facts and decisions

Each round the user answers reshapes the tree: settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round.

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (filesystem, tools, etc.), dispatch a subagent with a fresh context window to find it; never ask the user for anything you could look up yourself. Don't block on it: a running exploration is an unsettled prerequisite, so only the questions downstream of it wait for the subagent to report; ask the rest of the frontier now. Without subagents, look it up yourself before the round. A question's premise is a fact too: when sources disagree on it or the user disputes it, settle it with the most direct evidence you can get (for example, run the tool in a scratch directory) before the decision that rests on it goes back to the user. The _decisions_ are the user's: put each to them and wait.

Ask only questions whose answer changes what gets built or what the user sees. A detail the implementer can settle alone is not a question and never joins the tree.

The session is done when the frontier is empty: every decision that changes what gets built is settled, nothing left silently assumed. Do not act on it until the user confirms you have reached a shared understanding.
