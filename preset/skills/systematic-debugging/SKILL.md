---
name: systematic-debugging
description: Use when encountering any bug, test failure, build failure, performance regression or unexpected behavior, before proposing fixes. Finds the root cause first.
---

# Systematic Debugging

> **Repo version first:** if this repository has `.agents/skills/systematic-debugging/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

## Overview

**Core principle:** ALWAYS find root cause before attempting fixes. Symptom fixes are failure.

**Violating the letter of this process is violating the spirit of debugging.**

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

If you haven't completed Phase 1, you cannot propose fixes.

## When to Use

Use for ANY technical issue:
- Test failures
- Bugs in production
- Unexpected behavior
- Performance problems
- Build failures
- Integration issues

**Use this ESPECIALLY when:**
- Under time pressure (emergencies make guessing tempting)
- "Just one quick fix" seems obvious
- You've already tried multiple fixes
- Previous fix didn't work
- You don't fully understand the issue

**Don't skip when:**
- Issue seems simple (simple bugs have root causes too)
- You're in a hurry (rushing guarantees rework)
- Manager wants it fixed NOW (systematic is faster than thrashing)

## Before You Start

- **Prior attempts.** If the user has been trying, ask what they tried, so you skip their dead ends. If they link an issue, read the whole thread, latest comments first: they often carry newer repro steps or a different suspect.
- **Redact secrets.** Write `<REDACTED>` in place of every secret in the commands, outputs and artifacts you show. Keep credentials in env vars, not in commands. Quote only the lines of a captured request that carry the signal, never its auth headers. If the redacted output isn't enough, say so and ask the user.

## The Four Phases

You MUST complete each phase before proceeding to the next.

### Phase 1: Root Cause Investigation

**BEFORE attempting ANY fix:**

1. **Read Error Messages Carefully**
   - Don't skip past errors or warnings
   - They often contain the exact solution
   - Read stack traces completely
   - Note line numbers, file paths, error codes

2. **Build a Feedback Loop and Reproduce**
   - Get one command that goes red on *this* bug: a failing test, a script, a CLI call. Run it and show its output.
   - It must assert the user's exact symptom, not a nearby failure. Wrong bug = wrong fix.
   - Make it fast and deterministic; for flaky bugs, raise the reproduction rate until it's debuggable
   - Shrink the repro until every remaining part is needed for the failure
   - If you can't build a loop, stop, say what you tried, and ask for access or a captured artifact. Don't guess.
   - Read [references/feedback-loops.md](references/feedback-loops.md) for ways to build, tighten and minimise the loop

3. **Check Recent Changes and the Environment**
   - What changed that could cause this? Git diff, `git log --oneline -10 -- <file>` on the files involved
   - New dependencies, config changes, deploys. When did it start, and who is affected?
   - Right branch, dependencies current, expected runtime version, env vars set, no stale build output
   - **A dirty tree is a suspect.** If uncommitted work could reach the failing code: `git stash push -u -m "debugging: without WIP"`, re-run the loop, then restore exactly that entry with `git stash pop --index stash@{n}`. Green without the WIP means the user's own edit is the cause. On a pop conflict, show the user and leave it to them.

4. **Gather Evidence in Multi-Component Systems**

   **WHEN system has multiple components (CI → build → signing, API → service → database):**

   **BEFORE proposing fixes, add diagnostic instrumentation:**
   ```
   For EACH component boundary:
     - Log what data enters component
     - Log what data exits component
     - Verify environment/config propagation
     - Check state at each layer

   Run once to gather evidence showing WHERE it breaks
   THEN analyze evidence to identify failing component
   THEN investigate that specific component
   ```

   **Example:** secrets set in the workflow ✓, visible in the build script ✗: the break is between workflow and build.

5. **Trace Data Flow**

   **WHEN error is deep in call stack:** read [references/root-cause-tracing.md](references/root-cause-tracing.md) for the complete backward tracing technique.

   **Quick version:**
   - Where does bad value originate?
   - What called this with bad value?
   - Keep tracing up until you find the source
   - Fix at source, not at symptom

### Phase 2: Pattern Analysis

**Find the pattern before fixing:**

1. **Find Working Examples**
   - Locate similar working code in same codebase
   - What works that's similar to what's broken?

2. **Compare Against References**
   - If implementing pattern, read reference implementation COMPLETELY
   - Don't skim - read every line
   - Understand the pattern fully before applying

3. **Identify Differences**
   - What's different between working and broken?
   - List every difference, however small
   - Don't assume "that can't matter"

4. **Understand Dependencies**
   - What other components does this need?
   - What settings, config, environment?
   - What assumptions does it make? Mark each one *verified* (you read it, ran it or checked state) or *assumed*. Many wrong hypotheses are right ones tested against a wrong assumption.

5. **Match Known Bug Classes**
   - Read [references/bug-classes.md](references/bug-classes.md) and match the symptom (timezone, encoding, cache staleness, concurrency, test pollution and others). A match is a cheap first hypothesis.

### Phase 3: Hypothesis and Testing

**Scientific method:**

1. **Rank Candidates, Then Pick One**
   - List 3-5 candidate causes, ranked, before testing any. One candidate anchors on the first plausible idea.
   - Show the ranked list to the user: they may know one is already ruled out. Don't block on it.
   - Test one at a time: "I think X is the root cause because Y"

2. **State a Falsifiable Prediction**
   - "If X is the cause, then changing Y makes the bug disappear / changing Z makes it worse."
   - No prediction = a vibe: sharpen it or discard it
   - A good prediction names something you haven't looked at yet. "`user` will be null when I log it" only restates "`user` is null".

3. **Test Minimally**
   - Make the SMALLEST possible change to test hypothesis
   - One variable at a time
   - Prefer a debugger or REPL; else targeted logs at the boundaries that tell candidates apart. Never "log everything and grep".
   - Tag every debug log with a unique prefix, e.g. `[DEBUG-a4f2]`, so cleanup is one grep. A tagged probe that prints nothing was probably never reached: check where it sits before changing it.
   - Don't know who passes the bad value? Log a stack trace just before the failing operation.
   - **Heisenbug:** if the bug vanishes when you add a probe, the probe changed timing or ordering. That's evidence: suspect races, async ordering, unflushed I/O, and observe from outside the path.
   - **Performance regression:** read [references/performance-comparisons.md](references/performance-comparisons.md) and measure a baseline before comparing changes.

4. **Verify Before Continuing**
   - Did it work? Yes → Phase 4
   - Didn't work? Form NEW hypothesis
   - DON'T add more fixes on top

5. **When You Don't Know**
   - Say "I don't understand X"
   - Don't pretend to know
   - Ask for help
   - Research more

**Done when** you can state the chain from trigger to symptom, each step with a `file:line` and an observed value that confirms it. "Somehow X leads to Y" is a gap: probe it.

### Phase 4: Implementation

**Fix the root cause, not the symptom:**

1. **Create Failing Test Case**
   - Simplest possible reproduction: turn the minimised repro into the test
   - Automated test if possible
   - One-off test script if no framework
   - MUST have before fixing
   - Write the failing test first with the `tdd` skill, following the project's `.agents/testing-patterns.md` when it exists
   - The test must exercise the real bug pattern at its call site. If no seam can do that, a shallow test gives false confidence: report the missing seam to the user as an architecture finding (the `improve-codebase-architecture` skill finds where it should go).

2. **Implement Single Fix**
   - Record `git rev-parse HEAD` first, so the fix can be reviewed against it
   - Address the root cause identified
   - ONE change at a time
   - No "while I'm here" improvements
   - No bundled refactoring

3. **Verify Fix**
   - Test passes now?
   - Original, un-minimised repro no longer reproduces?
   - No other tests broken?
   - Issue actually resolved?
   - For a user-facing bug, check the fix in the running program with the `qa` skill
   - Review the fix since the recorded commit with the `code-review` skill
   - Check the change against the project's `.agents/definition-of-done.md` (when it exists) before claiming success

4. **If Fix Doesn't Work**
   - STOP and revert it
   - State which evidence ruled the hypothesis out. "Maybe the other branch" is the same hypothesis, not a new one.
   - Count: How many fixes have you tried?
   - If < 3: Return to Phase 1, re-analyze with new information
   - **If ≥ 3 (or 2-3 dead hypotheses): STOP, match the pattern below and show it to the user**
   - DON'T attempt Fix #4 without that discussion

5. **If 3+ Fixes Failed: The Diagnosis Is Wrong**

   | Pattern | Diagnosis | Next move |
   |---|---|---|
   | Hypotheses point at different subsystems, each fix reveals new coupling elsewhere | Design problem, not a local bug | Question the architecture with your human partner before more fixes |
   | Evidence contradicts itself | Wrong mental model of the code | Re-read the path from its entry point, assuming nothing |
   | Works locally, fails in CI or production | Environment difference | Compare config, dependencies, data, timing |
   | Fix works but the prediction was wrong | Symptom fix; the cause is still active | Keep investigating |

   **STOP and question fundamentals:** Is this pattern fundamentally sound? Are we sticking with it through sheer inertia? This is NOT a failed hypothesis - this is a wrong architecture.

6. **Clean Up**
   - Remove all `[DEBUG-...]` probes (grep the prefix) and throwaway harnesses
   - Full test suite passes
   - Commit the test and fix; the commit message states the hypothesis that turned out correct
   - Report in four parts: reproduction (expected, actual, steps), root cause, fix, prevention (test or guard added)

## Red Flags - STOP and Follow Process

If you catch yourself thinking:
- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "Add multiple changes, run tests"
- "Skip the test, I'll manually verify"
- "It's probably X, let me fix that"
- "I don't fully understand but this might work"
- "Pattern says X but I'll adapt it differently"
- "Here are the main problems: [lists fixes without investigation]"
- Proposing solutions before tracing data flow
- Reading code to build a theory before a red-capable command exists
- **"One more fix attempt" (when already tried 2+)**
- **Each fix reveals new problem in different place**

**ALL of these mean: STOP. Return to Phase 1.**

**If 3+ fixes failed:** Question the architecture (see Phase 4, step 5)

## Your Human Partner's Signals You're Doing It Wrong

**Watch for these redirections:**
- "Is that not happening?" - You assumed without verifying
- "Will it show us...?" - You should have added evidence gathering
- "Stop guessing" - You're proposing fixes without understanding
- "Ultra-think this" - Question fundamentals, not just symptoms
- "We're stuck?" (frustrated) - Your approach isn't working

**When you see these:** STOP. Return to Phase 1.

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Issue is simple, don't need process" | Simple issues have root causes too. Process is fast for simple bugs. |
| "Emergency, no time for process" | Systematic debugging is FASTER than guess-and-check thrashing. |
| "Just try this first, then investigate" | First fix sets the pattern. Do it right from the start. |
| "I'll write test after confirming fix works" | Untested fixes don't stick. Test first proves it. |
| "Multiple fixes at once saves time" | Can't isolate what worked. Causes new bugs. |
| "Reference too long, I'll adapt the pattern" | Partial understanding guarantees bugs. Read it completely. |
| "I see the problem, let me fix it" | Seeing symptoms ≠ understanding root cause. |
| "I can't reproduce it, but I know the cause" | Without a red loop you can't tell a fix from a coincidence. Build the loop or ask for an artifact. |
| "One more fix attempt" (after 2+ failures) | 3+ failures = architectural problem. Question pattern, don't fix again. |

## Quick Reference

| Phase | Key Activities | Success Criteria |
|-------|---------------|------------------|
| **1. Root Cause** | Read errors, build a red loop, check changes, gather evidence | Red-capable command; understand WHAT |
| **2. Pattern** | Find working examples, compare, audit assumptions, match bug classes | Identify differences |
| **3. Hypothesis** | Rank candidates, predict, test minimally | Causal chain with no gaps |
| **4. Implementation** | Create test, fix, verify, clean up | Bug resolved, tests pass, probes gone |

## When Process Reveals "No Root Cause"

If systematic investigation reveals issue is truly environmental, timing-dependent, or external:

1. You've completed the process
2. Document what you investigated
3. Implement appropriate handling (retry, timeout, error message)
4. Add monitoring/logging for future investigation

**But:** 95% of "no root cause" cases are incomplete investigation.

## Supporting Techniques

- [references/feedback-loops.md](references/feedback-loops.md): read in Phase 1 when no quick failing test reaches the bug, the bug is flaky, or the repro needs minimising.
- [references/bug-classes.md](references/bug-classes.md): read in Phase 2 before ranking hypotheses.
- [references/performance-comparisons.md](references/performance-comparisons.md): read before comparing changes for a performance regression.
- [references/root-cause-tracing.md](references/root-cause-tracing.md): read when the error shows up deep in a call stack, or a test pollutes state and you don't know which one.
- [references/defense-in-depth.md](references/defense-in-depth.md): read after finding the root cause, when invalid data could reach the same point through other paths.
- [references/condition-based-waiting.md](references/condition-based-waiting.md): read when a test is flaky or timing-dependent, or uses sleeps and fixed timeouts.
- `scripts/hitl-loop.template.sh`: copy and edit it only when a person must drive the repro; the user runs it, not you.
