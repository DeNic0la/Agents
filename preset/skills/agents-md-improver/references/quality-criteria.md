# Quality criteria for agent instruction files

Score each file out of 100. Grades: A 90-100 (comprehensive, current, actionable), B 70-89 (minor gaps), C 50-69 (missing key sections), D 30-49 (sparse or outdated), F 0-29 (missing or badly outdated).

## Rubric

### 1. Commands and workflows (20)

- 20: build, test, lint and run commands present with context; the development workflow is clear.
- 15: most commands, some without context.
- 10: basic commands, no workflow.
- 5: few commands.
- 0: none.

### 2. Architecture and navigation (20)

- 20: key directories, module relationships and entry points named; pointers to deeper docs where they exist.
- 15: good overview, minor gaps.
- 10: a bare directory listing.
- 5: vague or incomplete.
- 0: none.

### 3. Non-obvious patterns (15)

- 15: gotchas, workarounds, edge cases, and why unusual patterns exist.
- 10: some.
- 5: minimal.
- 0: none.

### 4. Conciseness (15)

- 15: every line changes agent behavior; long material sits in pointed-to docs; no duplication with other instruction files.
- 10: mostly concise, some padding.
- 5: verbose in places.
- 0: mostly filler or restates the code.

### 5. Currency (15)

- 15: commands work, paths exist, the stack is current.
- 10: minor staleness.
- 5: several outdated references.
- 0: badly outdated.

### 6. Actionability (15)

- 15: commands copy-paste ready, steps concrete, paths real.
- 10: mostly actionable.
- 5: some vague instructions.
- 0: vague or theoretical.

## Assessment

1. Read the file completely.
2. Cross-check against the codebase: run or inspect the commands, confirm referenced files exist, compare the described architecture with the tree.
3. Score each criterion, total it, assign the grade.
4. List the specific issues and the concrete improvements.

## Report format

```
## Instruction file report

Files found: X · average score: X/100 · files needing updates: X

### 1. ./AGENTS.md (project root, canonical)
Score: XX/100 (grade X)

| Criterion | Score | Notes |
|---|---|---|
| Commands and workflows | X/20 | ... |
| Architecture and navigation | X/20 | ... |
| Non-obvious patterns | X/15 | ... |
| Conciseness | X/15 | ... |
| Currency | X/15 | ... |
| Actionability | X/15 | ... |

Issues:
- ...

Recommended changes:
- ...

### 2. ./CLAUDE.md (alias of AGENTS.md)
...
```

## Red flags

- Commands that would fail: wrong paths, missing dependencies, renamed scripts.
- References to deleted files or folders.
- Outdated tool or framework versions.
- Template text copied in without being made project-specific.
- Generic advice that applies to any project.
- Unfinished to-do markers left in the file.
- The same content in several instruction files.
- Missing environment setup: required variables or config nobody mentions.
