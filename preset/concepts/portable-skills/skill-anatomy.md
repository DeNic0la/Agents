# Skill Anatomy

This document describes the structure and format of skill files. Use it as a guide when writing new skills or reviewing existing ones. The rules in [CONCEPT.md](CONCEPT.md) take precedence.

## File Location

Every skill lives in its own directory under `preset/skills/`:

```
skills/
  skill-name/
    SKILL.md           # Required: The skill definition (global version)
    GENERATE.md        # Required unless the skill is global: Recipe for the project and checkout levels
    scripts/           # Optional: Runnable helpers used by the skill workflow
    references/        # Optional: Skill-specific reference documentation
    supporting-file.md # Optional: Reference material loaded on demand
```

`SKILL.md` and `GENERATE.md` are the required files; a global skill has only `SKILL.md` (see rule 4 in [CONCEPT.md](CONCEPT.md)). Add `scripts/` or `references/` only when the skill actually needs them, and omit them entirely for simpler skills.

## SKILL.md Format

### Frontmatter (Required)

```yaml
---
name: skill-name-with-hyphens
description: Guides agents through [task/workflow]. Use when [specific trigger conditions].
---
```

**Rules:**
- `name`: Lowercase, hyphen-separated. Must match the directory name.
- `description`: Start with what the skill does in third person, then include one or more clear "Use when" trigger conditions. Include both *what* and *when*. Maximum 1024 characters.
- Top-level keys are limited to the [Agent Skills specification](https://agentskills.io/specification) fields: `name`, `description`, `license`, `compatibility` and `metadata`. Vendor extras that aren't runtime controls go under `metadata` or in a per-agent adapter file (`agents/openai.yaml`, `agents/claude.yaml`). Runtime controls such as `allowed-tools`, `disallowed-tools`, `model`, `context` or `agent` are opt-in: they never ship with the skill, and each user adds them in a local override (see [runtime-controls.md](runtime-controls.md)). `agents check` rejects any other top-level key.

Published names are compatibility identifiers: other skills, overrides and project manifests refer to a skill by name. Treat a rename as a breaking change.

**Why this matters:** Agents discover skills by reading descriptions. The description is injected into the system prompt, so it must tell the agent both what the skill provides and when to activate it. Do not summarize the workflow — if the description contains process steps, the agent may follow the summary instead of reading the full skill.

### Standard Sections (Recommended Pattern)

The frontmatter contract above is required. The section layout below is a recommended pattern, not a rigid template: equivalent headings are acceptable when they serve the same purpose clearly.

```markdown
# Skill Title

## Overview
One-two sentences explaining what this skill does and why it matters.

## When to Use
- Bullet list of triggering conditions (symptoms, task types)
- When NOT to use (exclusions)

## [Core Process / The Workflow / Steps]
The main workflow, broken into numbered steps or phases.
Include code examples where they help.
Use flowcharts (ASCII) where decision points exist.

## [Specific Techniques / Patterns]
Detailed guidance for specific scenarios.
Code examples, templates, configuration.

## Common Rationalizations
| Rationalization | Reality |
|---|---|
| Excuse agents use to skip steps | Why the excuse is wrong |

## Red Flags
- Behavioral patterns indicating the skill is being violated
- Things to watch for during review

## Verification
After completing the skill's process, confirm:
- [ ] Checklist of exit criteria
- [ ] Evidence requirements
```

## Section Purposes

### Overview
The "elevator pitch" for the skill. Should answer: What does this skill do, and why should an agent follow it?

### When to Use
Helps agents and humans decide if this skill applies to the current task. Include both positive triggers ("Use when X") and negative exclusions ("NOT for Y").

### Core Process
The heart of the skill. This is the step-by-step workflow the agent follows. Must be specific and actionable — not vague advice.

**Good:** "Run `npm test` and verify all tests pass"
**Bad:** "Make sure the tests work"

### Common Rationalizations
The most distinctive feature of well-crafted skills. These are excuses agents use to skip important steps, paired with rebuttals. They prevent the agent from rationalizing its way out of following the process.

Think of every time an agent has said "I'll add tests later" or "This is simple enough to skip the spec" — those go here with a factual counter-argument.

### Red Flags
Observable signs that the skill is being violated. Useful during code review and self-monitoring.

### Verification
The exit criteria. A checklist the agent uses to confirm the skill's process is complete. Every checkbox should be verifiable with evidence (test output, build result, screenshot, etc.).

## Supporting Files

Create supporting files only when:
- Reference material exceeds 100 lines (keep the main SKILL.md focused)
- Code tools or scripts are needed
- Checklists are long enough to justify separate files

Keep patterns and principles inline when under 50 lines.

If a skill does not need runnable helpers, do not create an empty `scripts/` directory just to mirror other skills. Empty directories add noise without changing how the skill works.

## Shared References

Checklists used by more than one skill, such as testing, security, performance, accessibility or definition-of-done, live in `preset/references/`, deliberately *not* inside any skill directory.

The Agent Skills spec describes a skill as a self-contained directory, but several skills can point at the same checklist. Colocating it would mean either copying the checklist into every skill that uses it, or picking one skill to "own" it and having the others reach into that directory. Both drift over time. A single shared copy stays the source of truth.

Shared references are installed to `~/.agents/references/`, or `.agents/references/` in a project, not next to the skill. So refer to them by that path (for example `~/.agents/references/security-checklist.md`), never by a relative link from the skill. In a project, add the reference along with the skill (`agents add references/<file>`) so the path resolves there too.

Current convention: material used by exactly one skill is a supporting file inside that skill's directory; material shared across skills goes in `preset/references/`.

## Context Efficiency

Skills load on demand: only the skill name and description sit in context at startup. The full `SKILL.md` loads only when an agent decides the skill is relevant. To keep that load cheap:

- **Keep `SKILL.md` under 500 lines.** Move detailed reference material into supporting files.
- **Write specific descriptions.** A precise description helps the agent activate the skill at the right moment and skip it otherwise.
- **Use progressive disclosure.** Reference supporting files that are read only when the workflow reaches them.
- **Prefer scripts over inline code.** Executing a script consumes no context; only its output does. Inline code blocks are paid for on every load.
- **Keep file references one level deep.** Link directly from `SKILL.md` to supporting files rather than chaining through intermediate documents.

## Script Requirements

When a skill ships runnable helpers under `scripts/`, each script follows these conventions:

- Use a `#!/bin/bash` shebang.
- Use `set -e` for fail-fast behavior.
- Write status messages to stderr: `echo "Message" >&2`.
- Write machine-readable output (JSON) to stdout.
- Include a cleanup trap for temporary files.
- Reference the script relative to the skill root, as `scripts/<script>.sh`. Skills are installed into different folders for each tool, so a repo-relative path won't resolve.

## Writing Principles

1. **Process over knowledge.** Skills are workflows, not reference docs. Steps, not facts.
2. **Specific over general.** "Run `npm test`" beats "verify the tests".
3. **Evidence over assumption.** Every verification checkbox requires proof.
4. **Anti-rationalization.** Every skip-worthy step needs a counter-argument in the rationalizations table.
5. **Progressive disclosure.** Main SKILL.md is the entry point. Supporting files are loaded only when needed.
6. **Token-conscious.** Every section must justify its inclusion. If removing it wouldn't change agent behavior, remove it.
7. **Model-neutral.** Write the procedure, not the workaround. See [Write the Procedure, Not the Workaround](#write-the-procedure-not-the-workaround).

## Write the Procedure, Not the Workaround

Skills in this preset run on many agents and model generations. A step that exists because one model gets a specific call wrong is a liability on every other model: it constrains agents that would have solved the task directly, and it spends turns that stronger models need for the actual work. Cross-model transfer measurements ([WikiSkill, arXiv:2608.27454](https://arxiv.org/abs/2608.27454)) show skills authored against one model's execution failures can leave a stronger model performing *worse than with no skill at all*.

**The rule:** if a step cannot be justified without naming a model, a model version, or one agent's private tool name, it belongs in an issue, not in a skill. Describe the capability ("run the focused test command", "write the file"), not the mechanism one runtime happens to expose (`run_command`, `write_to_file`).

Two smells to check for before proposing skill content:

- **Over-specified mechanics.** Prescribing an exact command form or serialization detail where stating the goal alone would do. If the justification is "model X gets this wrong otherwise", it's a workaround, not a procedure.
- **Fragmented diagnostics.** A multi-step inspection sequence where one step would confirm the same thing. Every extra step spends turns, and turn budget is finite.

This is about skill *content*; the portability of `references/` *paths* is a separate concern (see [Shared References](#shared-references)).

## Naming Conventions

- Skill directories: `lowercase-hyphen-separated`
- Skill files: `SKILL.md` (always uppercase)
- Supporting files: `lowercase-hyphen-separated.md`
- Shared references: stored in `preset/references/`, not inside skill directories (see [Shared References](#shared-references) for why).
- Skill-specific references: a single supporting doc can stay as a loose file in the skill directory (the `Supporting files` entry above); when several related docs travel with the skill, the emerging convention for self-contained, distributable skills is to group them in a `references/` directory inside the skill directory, so the skill carries its own supporting docs.

## Tailoring

A tailored skill has a core (`SKILL.md`) and a recipe (`GENERATE.md`). A tailored subagent has its core in `preset/agents/<n>.md` and its recipe in `preset/agents/recipes/<n>.md`, which `agents check` validates the same way. A recipe names only what a repository shows; the agent never repeats the core in what it writes.

### Specifics recipe

Frontmatter: `description` and `output: specifics`. Without `output`, the recipe is a full-copy recipe and the agent writes a whole `SKILL.md`. The body says:

1. What to inspect in the repository.
2. What the project-level file holds: what every clone of the codebase shares. It goes to `skills/<skill>.md` (or `agents/<agent>.md`) in the project store: `~/.agents/local/projects/<name>/`, or `projects/<name>/` in the agents repo when the project chose that store.
3. When a checkout-level file is needed and what it holds: only what the checkout's role adds (see [repo-checkout-roles](../repo-checkout-roles/CONCEPT.md)). It goes to `.agents/levels/skills/<skill>.md` (or `agents/<agent>.md`).
4. That neither file repeats the core, and that neither carries frontmatter or the "Repo version first" notice (`agents sync` warns when a level does).

A level may also carry `settings/claude.json`: Claude Code settings such as a `permissions.deny` write rule. Codex and Copilot levels carry instructions only.

### Composition

`agents sync` writes the instance; the agent never does. Order: the core without its notice, `## In this project`, `## In this checkout`, then one sentence saying the more specific section wins. A missing level is left out. With no level file at all, the skill behaves as before. Never edit a composed file; change the level file and sync.

### Removing core text

Put this at the end of a level file:

```markdown
## Removed from the core

### <short title>
Core text: "<exact text from the core>"
Replacement: "<new text, or empty to remove>"
Cases:
1. <case>
2. <case>
3. <case>
Review: <reviewing agent and model or tool>, <date>, agreed: <one-line reason>
```

- Cases are concrete times the core text made the agent behave wrongly or uselessly in this context. At least three.
- The reviewer is an independent agent on another model or tool. It must agree that the change doesn't make agents misbehave. Write "agreed" in the `Review:` line only after it did.
- `Core text:` and `Replacement:` are one line each, with both quotes on that line. A rule that spans two lines in the core can't be quoted whole: quote a part of one line, or leave the rule. An entry with an open quote is refused with a message about the line.
- `agents sync` applies an entry only when the core text occurs exactly once in the core (as it is, not as another entry left it), there are three cases and the review agreed. Entries whose core texts overlap can't both apply: the later one is refused. Otherwise the core text stays and sync warns with the title. When the core text changes later, the entry stops applying until it is reviewed again.
- A safety rule is narrowed, never dropped.

## Cross-Skill References

Reference other skills by name:

```markdown
Follow the `test-driven-development` skill for writing tests.
If the build breaks, use the `debugging-and-error-recovery` skill.
```

Don't duplicate content between skills — reference and link instead.

## Required vs Recommended

Required:

- A `preset/skills/<skill-name>/SKILL.md` file, with the "Repo version first" notice unless the skill is global
- A `preset/skills/<skill-name>/GENERATE.md` recipe, unless the skill is global; new recipes use `output: specifics`
- Valid YAML frontmatter with `name` and `description`
- A description that includes both what the skill does and when to use it

Recommended:

- The standard section flow shown above
- Equivalent headings such as `How It Works`, `Core Process`, or `Workflow` when they read more naturally for the skill
- Supporting files only when they keep the main `SKILL.md` focused
