---
name: jury
description: Put a question or decision to a jury of 3 or 5 subagents - blind independent votes, one anonymized review round, and one committed verdict with the vote, the dissent and the first action.
license: MIT
compatibility: Requires a host that can dispatch independent subagents.
---

# Jury

One model asked once gives one line of reasoning, and asking it to debate itself mostly makes it agree with itself. A jury gets independence from separate subagents that vote blind, and correction from one review round in which every changed vote must name its reason. You are the foreman: you frame, dispatch, check facts and deliver one verdict. There is always a verdict.

To pressure-test a technical idea before building it (BUILD / RESHAPE / DROP), use the `roast` skill instead. To clarify a plan through questions, use the `grilling` skill.

## Step 1: Gate

The question is the arguments. A trailing `5` sets the panel size and isn't part of the question. With no question, take the decision under discussion in this conversation; if there is none, ask for it.

Stop before dispatching anything when:

- The question has one checkable answer (what a function returns, what a doc says). Answer it and say that no jury was needed.
- The host can't dispatch subagents. Say so and stop. Never play the jurors yourself in one context: a juror that has read the other answers isn't independent.

## Step 2: Brief

Read what the question needs, once: the code, docs, links and conversation it points at. Then write the **brief**, the only thing every juror sees:

- **Question:** one sentence.
- **Options:** two to four, with neutral labels (A, B, C, or short plain names). A juror may also answer "none", with a better framing.
- **Criteria:** two to four things a good answer must do well.
- **Facts:** each with its source (`path:line`, URL, or "user said").
- **Constraints:** budget, deadline, what can't change.

Leave your own leaning out, and any label that judges ("the safe option"). Ask the user one question only if you can't name the options. Show the brief, then continue without waiting.

## Step 3: Seat the panel

Seat three jurors, or five when the arguments end in `5`. Each seat gets one **lens**, in table order. A lens tells the juror where to look. It doesn't pick a side, so every vote stays free.

| # | Lens | Question the lens asks |
|---|---|---|
| 1 | Pre-mortem | It's a year later and this choice failed. What caused it? |
| 2 | First principles | Set aside how it's usually done. What does the problem itself require? |
| 3 | Cost | What does each option cost to build, to run and to undo? |
| 4 | Outsider | What does someone with no history in this choice see? |
| 5 | Evidence | Which facts in the brief carry the decision, and how solid is each? |

If the host can run subagents on different models or model families, spreading the seats across families reduces shared blind spots. Record which model each seat ran on for the Panel line.

## Step 4: Blind vote

Every seat is a **fresh subagent**, never a fork of this conversation, that gets only the juror prompt from [references/prompts.md](references/prompts.md) (read it before dispatching). It gets the original blind inputs, never another seat's answer.

Respect the host's limit on parallel subagents: dispatch the seats that fit, queue the rest and start them as others finish. If the limit is unknown, run one at a time. A seat rejected for capacity stays queued; that isn't a failure.

Wait for every seat without writing a message for each arrival. Retry a seat that fails or returns no `CHOICE` once, then drop it and note the drop. Tally the choices: this is the **blind vote**.

If the blind vote is unanimous and every confidence is 70 or higher, go to Step 6.

## Step 5: Review

Run one review round, never more. More rounds make jurors agree with each other; they don't make the answer more correct.

1. **Check facts.** Find the factual claims the jurors disagree on that could change the vote. Check each against its source yourself and mark it verified, contradicted or unverifiable.
2. **Anonymize.** Strip the lens names from the juror blocks. Label them Position A, B, C, and give each reviewer its own shuffled order.
3. **Dispatch fresh reviewers,** one per seat, never forks, with the same capacity rules as Step 4. Each gets the reviewer prompt from [references/prompts.md](references/prompts.md) with the brief, the fact checks and the anonymized positions. A fresh reviewer wrote none of the positions, so it has no answer of its own to protect.

Tally the choices: this is the **review vote**.

## Step 6: Verdict

The review vote decides, or the blind vote when Step 5 was skipped. The blind vote stands instead when the review majority differs from it and no reviewer names the argument or fact behind the change: a change with no reason is agreement, not evidence.

You may overrule the majority only with a checked fact that defeats its main reason, and you say so in the verdict. On a tie, pick the option whose main reason survived the fact checks. If that still ties, pick the option that's cheaper to undo.

Confidence:

- **HIGH:** all seats, or four of five, chose it, and the reasons under Why are verified or rest on files you read.
- **MEDIUM:** a majority chose it.
- **LOW:** you broke a tie, you overruled the majority, or the main reason is unverifiable.

A "none" verdict is valid: give the better framing as the verdict, with the first action under it.

## Step 7: Report

Output only the report block from [references/prompts.md](references/prompts.md). The brief was already shown in Step 2. Show the juror blocks and reviews only if the user asks.

When the user comes back with the result of the Test, run the jury again from Step 2 with that result as a fact.
