# Making capture automatic

Completion phrases mark a checkpoint, but they aren't a trigger by themselves. If the user wants the gate checked without having to ask, add one of these lines to the project's `AGENTS.md` (outside any managed block), or to the global `~/.agents/AGENTS.md` if it should apply in every repo. Copy it word for word, and ask the user which variant they want first.

**Offer first** (the agent asks before capturing):

> After a solved, verified problem, offer once to use the `compound` skill at the completion checkpoint, but only when the work produced durable project reasoning that isn't readily recoverable from the final code, tests, types, comments or existing documentation, and losing it would plausibly cause recurrence, material risk or substantial rediscovery. Apply the counterfactual: if the learning doc disappeared, would a future engineer reading the final implementation still be likely to repeat the mistake or redo the investigation? If not, don't offer. Completion, effort and diff size alone aren't enough. Offer while the learning can still be committed with the work that produced it, and only where the repository treats captured learnings as tracked, committed knowledge.

**Run automatically** (no prompt):

> After a solved, verified problem, use the `compound` skill with `mode:non-interactive` at the completion checkpoint, but only when the work produced durable project reasoning that isn't readily recoverable from the final code, tests, types, comments or existing documentation, and losing it would plausibly cause recurrence, material risk or substantial rediscovery. Apply the counterfactual: if the learning doc disappeared, would a future engineer reading the final implementation still be likely to repeat the mistake or redo the investigation? If not, don't use it. Completion, effort and diff size alone aren't enough. Capture while the learning can still be committed with the work that produced it, and only where the repository treats captured learnings as tracked, committed knowledge.

For a single pass without subagents, use `mode:non-interactive depth:lightweight` in place of `mode:non-interactive`.

Some phrases in these lines matter:

- **"use the `compound` skill"**, not a slash command: every tool reads instruction files, but the way to invoke a skill differs between tools.
- **"while the learning can still be committed with the work"**, not "before the PR opens": a PR can be opened early, so a deadline tied to the PR may already have passed.
- **"treats captured learnings as tracked, committed knowledge"**: forks and open-source projects you contribute to often don't want generated docs.
