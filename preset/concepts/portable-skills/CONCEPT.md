---
name: portable-skills
description: Shared skills use only Agent Skills spec fields; vendor extras go in metadata or per-tool adapter files, runtime controls are opt-in local overrides, and each skill is tailored (with a recipe) or global.
---

# Portable skills

Applies to every skill (`SKILL.md`) and command written for more than one agent or user. The baseline is the [Agent Skills specification](https://agentskills.io/specification), which Claude Code, Codex and GitHub Copilot all support.

## Rules

1. **Shared frontmatter uses spec fields only:** `name`, `description`, `license`, `compatibility`, `metadata`. The spec's sixth field, `allowed-tools`, is a runtime control (rule 3).
   - `name` must match the folder: 1-64 characters, lowercase letters, digits and single hyphens.
   - `description` is 1-1024 characters. It leads with when to use the skill (triggers, symptoms, situations) and names what it does in a few words. It never summarizes the workflow's steps: an agent that reads a step summary follows it instead of opening the skill.
2. **Vendor extras that aren't runtime controls** go in one of two places:
   - `metadata` (string keys and string values), or
   - a per-tool adapter in the skill folder: `agents/openai.yaml` (Codex, read natively) or `agents/claude.yaml` (merged into Claude's copy of the frontmatter).
3. **Runtime controls are opt-in, never a default.** `allowed-tools`, `disallowed-tools`, `context`, `agent`, `model` and `effort` decide how a skill runs for one user's agent and workflow. They never go in the shared `SKILL.md`, a shared command or an adapter. Each user adds them in their own override file:
   - `.agents/overrides/<tool>/<skill>.yaml` for a project
   - `~/.agents/overrides/<tool>/<skill>.yaml` for one machine
4. **A skill is tailored or global.** A tailored skill (the default) ships a core and a recipe. A **global skill** has nothing worth tailoring per repository: it has no `GENERATE.md` and no notice, and a project that wants it gets a plain copy. Make a skill global only when a tailored version would be the same as the global one.
   - The core is the global `SKILL.md`. It states what the skill must always do and starts with a "Repo version first" notice: follow `.agents/skills/<name>/SKILL.md` instead when the repository has one. Claude Code prefers the global skill over the project one, so precedence alone can't put the repo version first.
   - `GENERATE.md` is the recipe: a `description` in its frontmatter, what to inspect in a repository, and what to write.
   - **Specifics recipe** (`output: specifics` in its frontmatter, the preferred form): the agent writes only what differs, never the core. `agents sync` composes the skill from the core and the levels, so a change to the core reaches every checkout without regenerating anything. A level holds one file per skill, `skills/<skill>.md`:
     - project level: `~/.agents/local/projects/<name>/`, or `projects/<name>/` in the agents repo when the project chose that store
     - checkout level: `.agents/levels/`, only when the checkout's role needs it (see [repo-checkout-roles](../repo-checkout-roles/CONCEPT.md))
   - **Full-copy recipe** (no `output` field): the agent writes a complete `.agents/skills/<name>/SKILL.md` without the notice. It stays supported, but nothing refreshes it when the core changes.
   - **Subagents** are tailored the same way: a recipe in `preset/agents/recipes/<n>.md` and level files `agents/<n>.md`.
   - **Removing core text** is allowed only as a reviewed exception in a level's `## Removed from the core` section. `agents sync` applies an entry only with three cases, an agreeing independent review and unchanged core text.
   - The level file layout, composition and the removal format are in [skill-anatomy.md](skill-anatomy.md), "Tailoring".
5. **Follow the spec's folder layout:** `scripts/`, `references/` and `assets/` next to `SKILL.md`, with references one level deep (see [progressive-disclosure](../progressive-disclosure/CONCEPT.md)).
6. **Choose who invokes it.** By default the agent can invoke a skill on its own (model-invoked), and its description sits in context every session. A skill that should run only when the user asks for it (a pure entry point, or one with side effects like publishing an issue) is **user-invoked**. That's set in both adapters, never in the shared frontmatter:
   - `agents/claude.yaml`: `disable-model-invocation: true`, plus `argument-hint` if it takes arguments
   - `agents/openai.yaml`: `policy:` with `allow_implicit_invocation: false`
   - Copilot has no equivalent, so a user-invoked skill's description must still be safe for an agent to act on.

   A user-invoked skill's description is a one-line summary for the human. No other skill can invoke it, so material that two user-invoked skills share goes in a reference.
7. **Refer to other skills by name** ("use the `grilling` skill"), never by a tool-specific mechanism ("call the Skill tool", `/name`, `$name`).
8. **Validate before committing:** `agents check` rejects anything that breaks rules 1-4 and 6.

## Supporting files

- [skill-anatomy.md](skill-anatomy.md): read when writing a new skill or reviewing one's structure, or writing a recipe, a level file or a removal: sections, description style, supporting files, scripts, naming, writing principles and tailoring.
- [runtime-controls.md](runtime-controls.md): read when a user wants to restrict, pre-approve or isolate how a skill runs, or asks where such settings go.
