---
name: compound
description: Use after a problem is solved and verified ("that worked", "it's fixed", "problem solved") when the reasoning behind the fix - root cause, dead ends, a non-obvious invariant or decision - isn't readily recoverable from the final code, tests or docs and losing it would cause rediscovery or risk. Records one learning in docs/solutions/, updating an overlapping doc instead of duplicating it.
---

# Compound

> **Repo version first:** if this repository has `.agents/skills/compound/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

## Overview

Preserve the reasoning behind a solved problem when the implementation alone won't. The first time a problem costs 30 minutes of investigation. With a findable doc, the second time costs 2. Capture while the context is fresh: what didn't work is the most expensive part of an investigation, and it's the first thing forgotten.

The output is one doc in `docs/solutions/<category>/<name>.md`. Planning, debugging and design work read that folder before investigating from scratch.

## When to Use

All three must hold:

1. **Non-obvious:** the reasoning isn't readily recoverable from the final code, tests, types, comments or existing docs.
2. **Durable:** it explains an invariant, constraint, root cause, rejected approach or decision that stays useful beyond this diff.
3. **Material:** forgetting it would plausibly cause recurrence, real risk or substantial rediscovery.

**The counterfactual:** if this doc disappeared, would a future engineer reading the final implementation still be likely to repeat the mistake or redo the investigation? If not, don't compound. Completion phrases mark the moment to ask this question. They don't answer it. Neither effort nor diff size counts.

Not for: unverified or in-progress fixes, docs that would only narrate the diff, or several learnings at once (run once per learning).

Put knowledge in the narrowest home that holds it completely. Use `docs/solutions/` only for the last row:

| Knowledge | Home |
|---|---|
| Machine-enforceable behavior | test, type or assertion |
| Local non-obvious rationale | code comment |
| Change-specific history | commit or PR description |
| Domain language | `GLOSSARY.md` (the `domain-modeling` skill) |
| Durable reasoning that crosses implementation boundaries | `docs/solutions/` |

## Arguments

- empty: evaluate the most recent verified fix in this conversation.
- free text: which solved problem to capture, if the session has several.
- `mode:non-interactive`: no blocking questions, for automations and standing instructions. Never edits instruction files.
- `depth:lightweight` or `depth:full`: only valid together with `mode:non-interactive`. If you get it without that flag, or get an unknown value, stop and say so.

**Depth.** Full is the default. Use lightweight when the session is close to its context limit or subagents aren't available, or when you're told to. The first line of your output names the depth you ran at and why.

## Process

1. **Gate.** Apply the three conditions and the counterfactual. If they fail, say in one line why there's nothing to compound and stop.
2. **Find related docs** (full: a subagent with a fresh context, running in parallel with step 3). Search `docs/solutions/` for overlap with the new learning on five dimensions: problem statement, root cause, solution approach, referenced files, prevention rule. Also sample the existing frontmatter values and category folder names, so you can reuse them.
3. **Classify and draft** in the main session, because it holds the conversation. Pick the track and frontmatter as described in [references/doc-format.md](references/doc-format.md) (read it now). Take the dead ends from the conversation: every approach that was tried and why it failed.
4. **Resolve overlap.**
   - 4-5 dimensions match: update that doc in place, keeping its path, and set `last_updated`.
   - 2-3 match: create the new doc, link the related one, and flag both for consolidation in your report.
   - 0-1 match: create the new doc.
5. **Ground it.** Run `scripts/check-doc.sh <doc>`. Each flag it returns is something to judge, not an automatic failure: fix the doc or explain why the flag is wrong. In full depth, also send a read-only subagent to check every claim about code behavior by quoting the source line that defines it. Correct or remove any claim it can't back up.
6. **Check discoverability.** Would the project's `AGENTS.md` (or `CLAUDE.md`) lead a future agent to `docs/solutions/`? If not:
   - Interactive full: propose the smallest addition, outside any managed block, and apply it only after the user consents.
   - Otherwise: report `Instruction-file edit: gap noted, not applied`.
7. **Report** in three or four lines: the depth, the doc path (created or updated), any overlap flagged for consolidation, and any older doc this learning makes stale. Don't offer a "what's next" menu.

If the user wants capture to happen automatically, read [references/standing-instruction.md](references/standing-instruction.md).

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "It took an hour, so it's worth a doc" | Effort isn't the bar. If the fix and its test tell the whole story, a doc just duplicates them and goes stale. |
| "I'll write it up at the end of the session" | By then the dead ends are gone from context. Capture right after the fix is verified. |
| "A new doc is simpler than editing the old one" | Two docs on one problem drift apart. Update the canonical one. |
| "Skip the dead ends, the solution is what matters" | The dead ends are what saves the next person the time. |
| "The claim about the library default is obviously right" | Quote the source line or remove the claim. A confident wrong doc is worse than no doc. |

## Red Flags

- The doc mostly retells the diff.
- "What Didn't Work" is empty after a long investigation.
- Cited paths or SHAs don't resolve.
- One run captures two unrelated learnings.
- An instruction file was edited without consent, or in non-interactive mode.

## Verification

- [ ] The gate was applied and passed, and the report says why.
- [ ] The overlap decision is recorded: updated, created and flagged, or created.
- [ ] `scripts/check-doc.sh` flags are all resolved or explained.
- [ ] Discoverability was checked; any instruction-file edit has the user's consent.
