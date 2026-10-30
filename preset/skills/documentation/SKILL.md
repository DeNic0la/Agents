---
name: documentation
description: Use when writing or updating documentation for people - a README, API reference, runbook, architecture doc, onboarding guide - or when asked to "document this" or "write docs for" something. Writes docs for a named reader, verified against the code.
---

# Documentation

> **Repo version first:** if this repository has `.agents/skills/documentation/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

## Overview

Write documentation a named reader can act on, accurate to the code as it is now. Outdated docs are worse than none, so every command and example is checked before it ships.

## When to Use

- Writing or updating a README, API reference, runbook, architecture doc or onboarding guide
- Code changed and the docs describing it didn't
- "Document this", "write a runbook for", "how would a new hire set this up?"

**Not for:**
- Docs an agent reads (skills, `AGENTS.md`, prompts): use the `writing-for-agents` skill.
- The reasoning behind one solved problem: use the `compound` skill.
- A decision with alternatives: record an ADR with the `architecture` or `domain-modeling` skill.
- A documentation step in a planned task: the `tech-writer` subagent does that.

## Process

1. **Name the reader and the job.** Who opens this doc, and what must they be able to do after reading it? One reader per doc. If you can't name one, ask.
2. **Pick the doc type.** README, API reference, runbook, architecture doc or onboarding guide. Read [references/doc-types.md](references/doc-types.md) for what each must contain.
3. **Read what exists.** Find the docs around the topic and match their structure, terms (`GLOSSARY.md` if it exists) and tone. Extend an existing page rather than starting a parallel one.
4. **Read the code you document.** Take examples from the real code and real commands, not from memory.
5. **Write, most useful first.** Lead with what the reader needs to do or know. Show commands and code instead of describing them. Link to other docs instead of copying them.
6. **Verify.** Run every command, check every path, option and code sample against the current code. Remove or fix what you can't confirm. For a runbook, walk the steps in a safe environment if one exists, or mark the unverified steps for the user.
7. **Report** the files changed and anything left unverified.

## Principles

1. **Write for the reader.** What do they already know, and what do they need now?
2. **Don't bury the lede.** The quick start comes before the theory.
3. **Show, don't tell.** Commands, code, expected output.
4. **Keep it current.** Update docs in the same change as the code they describe.
5. **Link, don't duplicate.** One source of truth per fact.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The command is obviously right" | Run it. A broken first command loses the reader for good. |
| "A new page is cleaner than editing the old one" | Two pages on one topic drift apart. Extend the existing one. |
| "I'll document every option" | Document what the reader needs. Link the full reference. |
| "The code is the documentation" | The code says what, not how to start, operate or recover. |

## Red Flags

- No named reader.
- Examples written from memory, not taken from the code.
- The same fact copied into several docs.
- A runbook without rollback or escalation steps.

## Verification

- [ ] The doc names or clearly serves one reader and their job.
- [ ] Every command, path and code sample was checked against the current code, or is marked unverified.
- [ ] Existing docs were extended, not duplicated.
- [ ] The doc type's required parts from `references/doc-types.md` are present.
