# Layout and templates

## Folder layout

Skills follow the [Agent Skills](https://agentskills.io/specification) layout. Use the same shape for concepts and other agent folders.

```
<name>/
  SKILL.md            entry point (or CONCEPT.md, ...)
  references/         supporting docs, loaded on demand (REFERENCE.md, <topic>.md)
  scripts/            code to run rather than read
  assets/             templates, schemas, data files
  agents/<tool>.yaml  per-tool adapters, skills only (see portable-skills)
```

A small folder can keep a single supporting file next to the entry point instead of a `references/` folder. Name files after what they contain, not `notes.md` or `misc.md`.

## Entry point template

```markdown
---
name: <name>
description: <one sentence: what it does and when to use it>
---

# <Title>

<Two or three sentences: purpose and when it applies.>

## Rules / Steps

1. ...

## Supporting files

- [references/<topic>.md](references/<topic>.md): read when <situation>.
- `scripts/<script>`: run when <situation>.
```

## Writing a good "read when"

| Weak | Strong |
|---|---|
| `REFERENCE.md`: more info | `REFERENCE.md`: read when configuring retries or timeouts |
| `examples.md`: examples | `examples.md`: read when the input format is unfamiliar |

## Splitting an oversized entry point

The spec suggests keeping `SKILL.md` under 500 lines and under about 5,000 tokens. Aim well below that.

1. Keep the purpose, the trigger and the core rules in the entry point.
2. Move each self-contained section, such as examples, edge cases or option tables, into its own file.
3. Replace each moved section with one "read when" line.
4. Check that nothing a typical task needs requires opening more than one supporting file.
