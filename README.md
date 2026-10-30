# Agents

My personal setup for AI coding agents (**Claude Code**, **Codex** and **GitHub Copilot**), kept in one place so it works the same in every tool, on every machine and in every project.

- **Global:** clone it once per computer and run the installer. All three tools then get my instructions, skills, subagents, commands, concepts and references.
- **Per project:** in any repository, `agents setup` copies chosen items into the folders each tool reads, where they can be committed.
- **Up to date:** `agents update` pulls the latest version of this repo and refreshes both your home and the current project.

Everything is written once in a tool-neutral form and installed where each tool expects it. Works on Linux, native Windows, and Windows with WSL. The full list of requirements is in [REQUIREMENTS.md](REQUIREMENTS.md).

## The mental model

The preset has six composable layers. Knowing what each one is for prevents the most common mistakes: putting reference material in a skill, building a persona that routes to other personas, and duplicating content across skills.

| Layer | Location | Job | In one word |
|---|---|---|---|
| Skills | `preset/skills/<name>/SKILL.md` | Step-by-step workflows with verification gates | How |
| Personas | `preset/agents/<role>.md` | Roles with a perspective and an output format | Who |
| Commands | `preset/commands/<name>.md` | User-facing entry points; the orchestration layer | When |
| References | `preset/references/*.md` | Checklists skills pull in on demand, or recipes that generate a project's own checklists | What to check |
| Concepts | `preset/concepts/<name>/CONCEPT.md` | Rules for how all the other layers are written | Rules |
| Hooks | `preset/hooks/` | Scripts the tool runs automatically on lifecycle events | Always |

How they compose:
- **Skills** hold the process. Checklists live in references and get pulled in on demand, never copied into a skill. One skill points to another by name instead of repeating it.
- **Personas** apply one perspective, such as a reviewer or an architect, and may use skills. A persona never routes to other personas; that's what commands are for.
- **Commands** are the thin entry points that decide when to run which skill or persona. They're Claude Code only (see below). An entry point that should work in all three tools is a **user-invoked skill** instead: a skill only the user can start (see [Skills in the preset](#skills-in-the-preset)). Either way, the real work lives in skills.
- **Concepts** govern how every other layer is written. They're read when someone writes or changes a layer, not while running one.
- **Hooks** enforce what must always happen, without relying on the model to remember.

## What's inside

```
preset/                  tool-neutral content, written once
  AGENTS.md              global instructions
  skills/<name>/SKILL.md skills: the global version (Agent Skills spec fields only)
  skills/<name>/GENERATE.md  recipe for a repo-tailored version of the skill
  skills/<name>/agents/  optional per-tool adapters (openai.yaml, claude.yaml)
  agents/<name>.md       subagents
  commands/<name>.md     slash commands (Claude Code only - prefer skills)
  hooks/                 hook scripts
  concepts/INDEX.md      index of all concepts
  concepts/<name>/       one concept: CONCEPT.md + supporting files
  references/*.md        checklists, lookup material, and recipes for project files
  references/claude-code/ Claude Code docs, condensed with links to every source section (INDEX.md)
  defaults.txt           items added automatically to a newly set-up project
tools/claude|codex|copilot/   tool-specific files, mirrored as-is into that tool's home
                         (e.g. tools/claude/skills/claude-handoff, which needs the claude CLI)
bin/agents               the `agents` command
install.sh / install.ps1 global installers
lib/common.sh            shared bash helpers
AGENTS.md                instructions for working on this repo itself (CLAUDE.md imports it)
```

### Where things end up

| Item | Claude Code | Codex | GitHub Copilot |
|---|---|---|---|
| Instructions, global | `~/.claude/CLAUDE.md` | `~/.codex/AGENTS.md` | `~/.copilot/copilot-instructions.md` |
| Instructions, project | `CLAUDE.md` (imports `AGENTS.md`) | `AGENTS.md` | `AGENTS.md` |
| Skills, global | `~/.claude/skills/` | `~/.agents/skills/` | `~/.agents/skills/` |
| Skills, project (repo version) | `.claude/skills/` (mirror) | `.agents/skills/` | `.agents/skills/`, `.claude/skills/` |
| Subagents, global | `~/.claude/agents/<n>.md` | `~/.codex/agents/<n>.toml` (generated) | `~/.copilot/agents/<n>.agent.md` |
| Subagents, project | `.claude/agents/` | `.codex/agents/` (generated) | `.github/agents/` |
| Commands | `~/.claude/commands/`, `.claude/commands/` | – | – |
| Concepts, references, hooks | `~/.agents/…` globally, `.agents/…` in a project (shared by all three) | | |

- **Global installs** are links back to this repo, so edits show up in the repo, ready to commit.
- **Project setups** are copies, so they can be committed.
- **Codex subagents** are TOML files generated from the Markdown subagent's `name`, `description` and body. Edit the Markdown, never the TOML.
- **Commands** are Claude Code only: Codex has deprecated custom prompts in favor of skills, and Copilot's prompt files are VS Code-specific. Write a skill when something should work in all three tools.

### Skills and runtime controls

Shared skills use only the fields from the [Agent Skills spec](https://agentskills.io/specification): `name`, `description`, `license`, `compatibility` and `metadata`.

- **Tool-specific extras** go in `metadata` or in an adapter inside the skill folder. Codex reads `agents/openai.yaml` natively. `agents/claude.yaml` is merged into Claude's copy of `SKILL.md`.
- **Runtime controls** (`allowed-tools`, `disallowed-tools`, `context: fork`, `agent`, `model`, `effort`) are **opt-in**, so they never ship with a skill. You add them for your own workflow in an override file, which `agents` merges into that tool's copy of the skill:

```yaml
# .agents/overrides/claude/code-review.yaml   (one project)
# ~/.agents/overrides/claude/code-review.yaml (this machine)
context: fork
disallowed-tools: Edit Write
```

When an adapter or override applies, that tool gets a built copy of the skill instead of a link. Run `agents update` after changing an override. `agents check` validates every skill in the preset against these rules. The details are in the [portable-skills](preset/concepts/portable-skills/CONCEPT.md) concept.

**User-invoked skills.** Some skills should only run when you ask for them, such as a handoff or publishing a spec. They're marked in both adapters, so the agent never starts them on its own and their descriptions don't fill the context:

```yaml
# agents/claude.yaml               # agents/openai.yaml
disable-model-invocation: true     policy:
argument-hint: "What for?"           allow_implicit_invocation: false
```

Copilot has no equivalent, so there they behave like any other skill. Start one by name: `/handoff` in Claude Code, `$handoff` in Codex.

### Skills in the preset

| Skill | Use it to | Invoked by |
|---|---|---|
| **Understand and design** | | |
| interview-me | find out what the user actually wants before anything exists | agent |
| idea-refine | turn a vague idea into concrete variations and pick one | agent |
| brainstorming | go from a request to an approved design doc | agent |
| grilling | stress-test an existing plan, decision or idea in rounds of questions | agent |
| domain-modeling | sharpen the project's language (`GLOSSARY.md`) and record decisions (ADRs) | agent |
| grill-with-docs | grill a plan while keeping the glossary and ADRs current | user |
| api-and-interface-design | design APIs and module interfaces | agent |
| improve-codebase-architecture | find deepening opportunities and present them as an HTML report | user |
| **Plan and hand off** | | |
| planning-and-task-breakdown | break a spec into small, verifiable, ordered tasks | agent |
| to-spec | turn the conversation into a spec in the issue tracker | user |
| wayfinder | chart work too big for one session as a map of decision tickets | user |
| to-questionnaire | write a questionnaire for someone who knows what you don't | user |
| handoff | write a handoff document for the next agent session | user |
| **Build and fix** | | |
| source-driven-development | ground framework code in the official docs and cite them | agent |
| systematic-debugging | find the root cause before proposing any fix | agent |
| code-simplification | simplify code without changing behavior | agent |
| performance-optimization | measure, then optimize | agent |
| observability-and-instrumentation | add logs, metrics and traces | agent |
| deprecation-and-migration | retire old code and migrate its users | agent |
| **Write for agents** | | |
| writing-for-agents | write or restructure a skill, AGENTS.md or any doc an agent reads | agent |
| writing-skills | prove a skill changes agent behavior: baselines, pressure tests, closing loopholes | agent |
| context-engineering | set up the context an agent works with | agent |
| retro | review a session and improve the agent's environment | user |
| wait-what | have the agent re-explain its last message in plain words | user |
| teach | learn a topic over several sessions in a teaching workspace | user |

Claude Code also gets `claude-handoff` (from `tools/claude/`), which starts a background `claude` session from a handoff.

### Concepts

Concepts are rules I declare for AI agents: how their instructions are written and organized, and how they work in a project. Everything in this repo follows them.

The global instructions tell every tool to read [the index](preset/concepts/INDEX.md) and follow the concepts that apply whenever it writes or changes agent instructions. Projects that pull in a concept with `agents setup` get the same instruction in their `AGENTS.md`.

| Concept | In short |
|---|---|
| [progressive-disclosure](preset/concepts/progressive-disclosure/CONCEPT.md) | Agent Markdown files are small entry points in their own folder; supporting files load only when needed. |
| [findings](preset/concepts/findings/CONCEPT.md) | Anything off the current goal goes in `.findings/generic.md` instead of being acted on; agents read `.findings/` only when asked. A default, so `agents setup` creates `.findings/generic.md` in every project. |
| [portable-skills](preset/concepts/portable-skills/CONCEPT.md) | Skills use spec fields only; vendor extras go in metadata or adapters; runtime controls are opt-in local overrides; user-invoked skills are marked in both adapters. |

To add a concept, create `preset/concepts/<name>/CONCEPT.md` with `name` and `description` frontmatter, then add a row to `INDEX.md`.

## Setup

### 1. Install on a computer

**Linux / WSL**

```bash
git clone https://github.com/DeNic0la/Agents.git ~/Agents
~/Agents/install.sh
```

**Windows (PowerShell)**

```powershell
git clone https://github.com/DeNic0la/Agents.git $HOME\Agents
powershell -ExecutionPolicy Bypass -File $HOME\Agents\install.ps1
```

**Windows + WSL**: Windows and WSL each have their own home folder, so run both installers. WSL can use the same Windows clone (`/mnt/c/Users/<you>/Agents/install.sh`).

The installer:
- installs for all three tools, whether or not each tool is installed yet
- links each item separately, so files the tools keep in those folders themselves (like `~/.claude/skills/synced`) are left alone
- moves anything already in the way to `<name>.bak.<timestamp>`
- puts the `agents` command in `~/.local/bin`. On Windows it also adds that folder to your user PATH, so open a new terminal afterwards.

It respects `CLAUDE_CONFIG_DIR`, `CODEX_HOME` and `COPILOT_HOME` if they're set.

> **Windows:** folders are linked with junctions, which don't need admin. File symlinks need **Developer Mode** (Settings → System → For developers). Without it, files are copied instead and you'll see a warning; run the installer again after changes. The `agents` command runs through Git Bash, which comes with Git for Windows. Don't run `install.sh` from Git Bash; use `install.ps1`.

### 2. Set up a project

In any repository:

```bash
agents setup                                  # pick items interactively
agents setup concepts/progressive-disclosure  # or name them directly
```

```
  1 * concepts/progressive-disclosure
  2   references/git.md
  3   skills/deploy
Select items (e.g. 1 3-5, all, none; Enter keeps the * ones):
```

- Each selected item is copied to the project folders listed in the table above.
- Your choice is saved in `.agents/preset.txt`.
- Concepts and references are listed in a managed block in the project's `AGENTS.md`. `CLAUDE.md` gets a managed `@AGENTS.md` import, so Claude Code reads the same list.

Commit these files so teammates get the same setup, whichever tool they use.

**Skills: repo version or global.** In the picker, every skill you select gets a *repo version*: a version of the skill tailored to this repository, which is always preferred over the global one. Skills you don't select stay global.
- Every skill in this repo ships as both a global `SKILL.md` and a `GENERATE.md` recipe.
- For a repo version, `agents` copies the recipe to `.agents/recipes/skills/<name>.md`.
- The agent generates `.agents/skills/<name>/` from it the first time the skill is needed, or when you ask ("generate the repo versions of our skills"). Codex and Copilot read that folder directly.
- `agents sync` then mirrors it to `.claude/skills/<name>/` for Claude Code, applying your Claude overrides.
- Until the repo version exists, the global version is used.
- The generated skill belongs to the project. `agents remove` keeps it and tells you to delete it if you want to go back to the global version.

Precedence differs per tool (Claude Code prefers the global skill, Copilot the project one). So every global `SKILL.md` starts with a "Repo version first" notice that sends the agent to the repo version when there is one, which works the same in all three tools.

**Defaults:** the first time a repo is set up, the items in [preset/defaults.txt](preset/defaults.txt) are added automatically. In the picker they're pre-selected. You can remove them like any other item, and existing projects aren't changed when the list changes.

**Generated project files:** some references are *recipes*, not content. This repo keeps only the instructions, and each project gets its own version, generated by its agent. The three defaults are:

| Recipe | Generates | Used when |
|---|---|---|
| [definition-of-done.md](preset/references/definition-of-done.md) | `.agents/definition-of-done.md` | every change, before it counts as done |
| [testing-patterns.md](preset/references/testing-patterns.md) | `.agents/testing-patterns.md` | writing or changing tests |
| [observability-checklist.md](preset/references/observability-checklist.md) | `.agents/observability-checklist.md` | changing code that runs in production |

One more recipe isn't a default, because only some skills need it. Add it with `agents add references/issue-tracker.md`, or let `to-spec` and `wayfinder` generate it from the global copy the first time:

| Recipe | Generates | Used when |
|---|---|---|
| [issue-tracker.md](preset/references/issue-tracker.md) | `.agents/issue-tracker.md` | publishing specs or decision tickets: the tracker, labels, parent/child issues and blocking |

- `agents update` refreshes the recipe. Its line in the project's `AGENTS.md` tells agents to follow the generated file, and to generate it first if it's missing.
- The agent inspects the project (its real tools, commands and test layers), writes the file without placeholders, and asks you to approve it.
- The generated file belongs to the project: `agents` never overwrites or removes it.

Other project commands:

| Command | What it does |
|---|---|
| `agents list` | show all items (`*` = used here) |
| `agents add <item>...` | add items |
| `agents remove <item>...` | remove items and all their copies |
| `agents sync` | re-apply this project's items without pulling (e.g. after a repo skill was generated) |
| `agents check` | validate the preset's skills and commands |

Files that already exist in the project and weren't added by `agents` are never overwritten, and nothing outside the managed blocks is changed. Hooks are copied to `.agents/hooks/` but not registered: hook configuration differs per tool (`.claude/settings.json`, `.codex/hooks.json`, `.github/hooks/*.json`).

## Update

```bash
agents update
```

Run it anywhere. It:
1. pulls the latest version of this repo (`git pull --rebase --autostash`, so uncommitted edits survive the pull)
2. refreshes your home for all three tools: new items get installed, and anything deleted from the repo is removed
3. inside a project that uses `agents`, re-copies that project's items from the latest version. Review the changes with `git diff` and commit them.

If the pull hits a conflict, nothing is installed. Resolve the conflict in the repo, then run `agents update` again.

Without the `agents` command, you can still update with `~/Agents/install.sh --update` (Linux/WSL) or `install.ps1 -Update` (Windows).

## Uninstall

```bash
~/Agents/install.sh --uninstall               # Linux / WSL
```

```powershell
powershell -ExecutionPolicy Bypass -File $HOME\Agents\install.ps1 -Uninstall   # Windows
```

This removes only the links, generated files and shims that come from this repo. To remove the preset from a project, run `agents setup` and choose `none`.
