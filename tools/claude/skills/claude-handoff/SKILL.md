---
name: claude-handoff
description: Hand the current conversation off to a fresh background agent that picks up the work immediately.
argument-hint: "What will the next session be used for?"
disable-model-invocation: true
---

Write a handoff summary of the current conversation so a fresh agent can continue the work. Follow the `handoff` skill for what goes in it: the "suggested skills" section, references instead of duplicated artifacts, redaction, and tailoring to the user's arguments. Redaction matters even more here, since the summary becomes the agent's prompt.

Save it to the temporary directory of the user's OS, then launch a background agent seeded with it as its prompt: `claude --bg --name "<descriptive name>" -- "$(cat <summary file>)"`. Passing the file keeps the shell from running backticks or expanding `$` in the summary. It starts in the current working directory and returns immediately; the user manages it with `claude agents`.

Always pass `-n`/`--name` with a descriptive name (e.g. `--name "Fix login bug"`); it sets the display name shown in the job list, session picker, and terminal title.
