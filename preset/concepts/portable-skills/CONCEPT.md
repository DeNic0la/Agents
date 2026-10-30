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
4. **A skill is tailored or global.** A tailored skill (the default) ships two ways: a global version and a recipe for a repo version.
   - The global `SKILL.md` starts with a "Repo version first" notice telling agents to follow `.agents/skills/<name>/SKILL.md` instead when the repository has one.
   - `GENERATE.md` is the recipe: it has a `description` in its frontmatter and says what to inspect in a repository and how to write a version tailored to it. The generated version omits the notice.
   - The notice is needed because precedence differs per tool: Claude Code prefers the global skill over the project one, so precedence alone can't put the repo version first.

   A **global skill** has nothing worth tailoring per repository: it has no `GENERATE.md` and no notice, and a project that wants it gets a plain copy. Make a skill global only when a repo version would be the same as the global one.
5. **Follow the spec's folder layout:** `scripts/`, `references/` and `assets/` next to `SKILL.md`, with references one level deep (see [progressive-disclosure](../progressive-disclosure/CONCEPT.md)).
6. **Choose who invokes it.** By default the agent can invoke a skill on its own (model-invoked), and its description sits in context every session. A skill that should run only when the user asks for it (a pure entry point, or one with side effects like publishing an issue) is **user-invoked**. That's set in both adapters, never in the shared frontmatter:
   - `agents/claude.yaml`: `disable-model-invocation: true`, plus `argument-hint` if it takes arguments
   - `agents/openai.yaml`: `policy:` with `allow_implicit_invocation: false`
   - Copilot has no equivalent, so a user-invoked skill's description must still be safe for an agent to act on.

   A user-invoked skill's description is a one-line summary for the human. No other skill can invoke it, so material that two user-invoked skills share goes in a reference.
7. **Refer to other skills by name** ("use the `grilling` skill"), never by a tool-specific mechanism ("call the Skill tool", `/name`, `$name`).
8. **Validate before committing:** `agents check` rejects anything that breaks rules 1-4 and 6.

## Supporting files

- [skill-anatomy.md](skill-anatomy.md): read when writing a new skill or reviewing one's structure: sections, description style, supporting files, scripts, naming and writing principles.
- [runtime-controls.md](runtime-controls.md): read when a user wants to restrict, pre-approve or isolate how a skill runs, or asks where such settings go.
