---
name: qa
description: Use after implementing a change and before code review, or when the user asks for a QA pass, a smoke test or a click-through, or asks whether a change actually works. Runs the changed program the way its user meets it - a CLI or terminal UI through tmux, a web app through a browser - and checks every requested behavior against what it observes.
license: MIT
compatibility: Terminal QA needs tmux, Perl and a POSIX shell. Web QA needs a browser tool in the session.
---

# QA

> **Repo version first:** if this repository has `.agents/skills/qa/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

## Overview

QA checks the running program against what was requested; tests check the code against what its author expected. A scenario passes only on a result you **observed** in the running program. A green suite, a read of the code or an exit status alone is not an observation.

QA hunts for the fail. When this session wrote the change, run QA in a fresh subagent: give it the diff, the request and this skill, and tell it to find where the change breaks. Without subagents, run it yourself and state the independence gap.

QA runs before the `code-review` skill: once QA shows the change does what was asked, the review can focus on how the code is written and how it fails.

QA reports to its caller and leaves the code and the issue tracker as it found them: it files, comments on and labels no issue. Scratch state, scenario lists, evidence and screenshots go in `$DIR`, a fresh `mktemp -d` outside the repository. Saving QA artifacts in the repository needs an explicit request from the user. The caller fixes each fail test-first (the `tdd` skill) and runs QA again.

## Inputs

- **Fixed point** (optional): the commit the change started from.
- **Request** (optional): the spec or issue the change implements.
- **Prior QA output and its tested commit** (follow-up only).
- A running preview's start command, URL and ownership, when the caller has one.

## Process

### 1. Pin the change and the request

The change is the diff since a fixed point: the one named; else the default branch when `HEAD` is on another branch; else `HEAD` when the default branch has uncommitted work. Write it with `git diff <fixed-point> > "$DIR/diff.patch"` and read the file in full, in ranges when it's long: a diff printed to the terminal can be cut short. Also read each untracked file `git status --short` lists.

The request is what the change was meant to do: the spec or issue passed in, else the issue its commits reference, else the request settled in this conversation. With none, ask.

**Follow-up:** inspect the diff since the prior tested commit. Rerun the earlier fails, the scenarios the fix affects, and one adjacent regression flow. Carry forward unaffected passes and blocked scenarios with their original evidence. A test-only diff with unchanged runtime code keeps the earlier verdict. Without a usable prior result, run the full pass.

### 2. Write the scenarios

A **scenario** is one thing a user does and the result they should then see, taken from the request. Write the list to `$DIR/scenarios.md` before launching anything. Read [references/scenarios.md](references/scenarios.md) now for what a full pass covers and how to handle a behavior-preserving change. Done when every requirement and every changed user-reachable path maps to at least one scenario.

### 3. Launch the program

Use the repository's own build and start commands (README, package scripts, `Makefile`, `--help`) unless a current build or preview is already available and verified. Point it at scratch state: a directory under `$DIR`, a test database, a seeded test account, a local server. A scenario that can only run against real user data, a production service or a live account is **blocked**: name what it needs and move on.

Pick the driver by the program's interface:

- A CLI or terminal UI: read [references/terminal.md](references/terminal.md).
- A web app: read [references/browser.md](references/browser.md).
- A library or HTTP API with no UI: call its public interface from a scratch script in `$DIR`, or with `curl`, the way its caller would.

### 4. Run the scenarios

Do each step as the user would: type the command, press the keys, click, fill the form, submit. After each step, read what the program shows and compare it with the expected result. Check the logs, stderr and browser console for errors on every scenario, passing ones too.

Judge each result against the request and against consistency oracles: a result that matches the request still fails when it contradicts the rest of the product (a sibling command names its flags another way), the program's own claims (`--help`, README, error text), or platform conventions (`NO_COLOR`, `-` for stdin, a 4xx status for a bad request). An error message passes when it names the bad input and what to do next.

A screen that says "Saved" only shows that the program claims the write. Confirm each write at its store (read back the file, the row or the API), then restart or reload and read it again.

Record each scenario as **pass**, **fail** or **blocked**, with evidence the tool wrote: redirect or `tee` output into a file in `$DIR` and cite it. Before recording a fail, spend a few steps on it:

- **Isolate:** cut the steps to the fewest that still fail.
- **Maximize:** follow the same path to a worse outcome, such as a crash or lost data.
- **Generalize:** try the sibling paths that reach the same code.
- **Introduced or pre-existing:** run the same steps on the base build and record which.

A fail records the steps to reproduce, the expected result and the observed one. It ends that scenario, not the run.

Once every scenario has a status, run one exploratory charter on the riskiest part of the change ("Explore <target> with <resources> to discover <information>") for about twenty actions. Add each problem it finds as a new scenario.

### 5. Clean up and report

Stop everything you started: each tmux session (`tui stop qa-<name>`), servers you started, browser tabs you opened. Keep the evidence files the output cites in `$DIR` and delete the rest. Use literal paths in cleanup commands, not a variable or command substitution. A cleanup that fails goes in the output as leftover state, with the command to remove it.

Report one line per scenario (status, what it checked, evidence path), then every fail in full, then:

- **Not covered:** what no scenario tested and why (a platform, a browser, a terminal you didn't run).
- **Concerns:** neither pass nor fail but looked wrong (a slow first load, a stray warning). A result that contradicts a sentence of the request is a fail, not a concern.

Then the verdict, on its own line:

- Any fail: **Fails QA**.
- Otherwise any blocked scenario: **Passes with gaps**, naming each blocked scenario and what it needs.
- Otherwise: **Passes QA**.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The tests pass, so it works" | Tests check the author's expectations. QA observes the running program. |
| "The screen said Saved" | Read the write back at its store, then after a restart. |
| "I'll just check the happy path" | The unhappy paths and data attacks are where changes break. |
| "I wrote it, so I'll QA it here" | Use a fresh subagent; an author grades too kindly. |

## Red Flags

- A pass recorded without captured output, a screenshot or a file in `$DIR`.
- Scenarios written after launching, or none for the unhappy paths.
- QA run against real user data or a live account.
- Sessions, servers or tabs left running after the run.

## Verification

- [ ] Every requirement and changed path maps to a scenario.
- [ ] Every scenario has a status and cited evidence.
- [ ] Everything started was stopped, or is listed as leftover state.
- [ ] The output ends on the verdict.
