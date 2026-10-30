# Requirements

This repository holds a personal setup for AI coding agents that can be cloned onto any computer, installed with one command, used in any project, and kept up to date. This document records what the setup must do. The [README](README.md) covers how to use it.

## 1. Tools

| ID | Requirement |
|----|-------------|
| T1 | The tools and Markdown files support **Claude Code**, **Codex** and **GitHub Copilot**. |
| T2 | Content is written once, in a tool-neutral form, under `preset/`. The installers and `agents` put it where each tool expects it. |
| T3 | Instructions: one `AGENTS.md`. Globally it's linked to `~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md` and `~/.copilot/copilot-instructions.md`. In projects it's `AGENTS.md`, and `CLAUDE.md` imports it. |
| T4 | Skills use the shared `SKILL.md` format. Globally they're linked to `~/.claude/skills` (Claude) and `~/.agents/skills` (Codex and Copilot); where an adapter or override applies, that tool gets a built copy instead (see S2–S4). In projects, skills exist as repo versions or, for global skills, as plain copies (see S8–S9, S12). |
| T5 | Subagents are written once as Markdown with `name` and `description` frontmatter. They're installed for Claude (`agents/<n>.md`) and Copilot (`agents/<n>.agent.md`, `.github/agents/` in projects). For Codex, a TOML file (`agents/<n>.toml`) is generated from them; generated files are marked and never edited by hand. |
| T6 | Commands are installed for Claude Code only. Codex deprecated custom prompts and Copilot prompt files are VS Code-specific, so anything that should work in all three tools is written as a skill. |
| T7 | Concepts, references and hooks go in the shared `.agents/` folder: `~/.agents/` globally, `<project>/.agents/` in projects. |
| T8 | Tool-specific files live in `tools/<tool>/` and are mirrored as-is into that tool's home folder. |

## 1a. Skills

| ID | Requirement |
|----|-------------|
| S1 | Skills use the fields supported by all the target vendors, and at least those of the [Agent Skills spec](https://agentskills.io/specification). A shared `SKILL.md` contains only `name`, `description`, `license`, `compatibility` and `metadata`. `name` matches the folder (1-64 characters: lowercase letters, digits, single hyphens), and `description` is 1-1024 characters. |
| S2 | Fields that only some agents support go in `metadata`, or in a per-tool adapter file inside the skill: `agents/openai.yaml` (Codex, native) or `agents/claude.yaml` (merged into Claude's copy of the frontmatter). |
| S3 | Runtime controls (`allowed-tools`, `disallowed-tools`, `context`, `agent`, `model`, `effort`) are opt-in and never global. They aren't in shared skills, shared commands or adapters. A user adds them for their own agent and workflow in `.agents/overrides/<tool>/<skill>.yaml` (project) or `~/.agents/overrides/<tool>/<skill>.yaml` (machine). |
| S4 | Overrides are merged into that tool's copy of the skill: top-level keys replace the skill's keys for `claude`, and for `codex` the file becomes `agents/openai.yaml`. The tooling reads override files but never writes, moves or deletes them. |
| S5 | Built copies in a home folder are marked as generated, are rebuilt on install and update, and go back to a plain link when no adapter or override applies any more. |
| S6 | `agents check` validates the preset against S1–S3, S7, S10, S12, S13, C5 and C6 and fails on any violation. It also warns, without failing, when uncommitted changes touch `lib/common.sh` without `install.ps1` (or the reverse), or the installers or `bin/agents` without README.md and REQUIREMENTS.md. |
| S7 | Every tailored skill (the default) is checked into this repo two ways: as a global version (`SKILL.md`) and as a recipe for generating a repo-tailored version (`GENERATE.md`). The global `SKILL.md` contains a "Repo version first" notice pointing to `.agents/skills/<name>/SKILL.md`. |
| S8 | When setting up a repo, the user chooses per tailored skill: a **repo version** (selected in the picker, or `agents add skills/<name>`) or the **global version** (not selected). A repo version is always preferred over the global one when it exists. Precedence differs per tool, so this is enforced by the notice (S7) and by the project's `AGENTS.md` block, not by tool precedence. |
| S9 | For a repo version, the tooling copies the recipe to `.agents/recipes/skills/<name>.md`. The agent generates `.agents/skills/<name>/` from it (owned by the project, never written or removed by the tooling), and `agents sync` mirrors that to `.claude/skills/<name>/` with the project's Claude overrides applied. Until it's generated, the global version is used. |
| S10 | A skill that should run only when the user asks for it is **user-invoked**: `disable-model-invocation: true` in `agents/claude.yaml` and `policy.allow_implicit_invocation: false` in `agents/openai.yaml`, always both. This is part of the skill's design, not a runtime control, so it ships in the adapters. Its description is a one-line summary for the human. Entry points that should work in all three tools are user-invoked skills, not commands. |
| S11 | Skills refer to other skills by name, never by a tool-specific mechanism (a tool name, `/name`, `$name`). A skill that only works in one tool (e.g. it runs the `claude` CLI) lives in `tools/<tool>/skills/` and is exempt from S1–S10 and S12. |
| S12 | A **global skill** has no `GENERATE.md` and no "Repo version first" notice; `agents check` fails if a skill has the notice without the recipe. Selecting it in a project copies it unchanged to `.agents/skills/<name>/` and mirrors it to `.claude/skills/<name>/` with the project's Claude overrides. These copies are managed like other copied items (refreshed on update, deleted on remove), and the skill isn't listed in the `AGENTS.md` block. If the project still has the skill's recipe from when it was tailored, the copy is skipped with a warning, so a generated version is never overwritten. The README's skills table marks each skill as `tailored` or `global`, and `agents check` validates it. |
| S13 | Every skill belongs to exactly one **router**: a user-invoked global skill, one per area of work, marked `router: "true"` in its `metadata`. A router lists its skills with what each is for and who invokes it, and says how to choose between similar ones. Given a request, it picks one skill: an agent-invoked skill is used right away; for a user-invoked one it tells the user the skill's name and stops. A router does none of the work itself. `agents check` fails when a skill is in no router or in several, when a router lists a skill that doesn't exist, or when a router shows the wrong invoker for a skill. |

## 2. Content

| ID | Requirement |
|----|-------------|
| C1 | The repo holds six kinds of items: **skills**, **hooks**, **agents**, **concepts**, **commands** and **references**. |
| C2 | Each kind has its own folder under `preset/`, next to the global `AGENTS.md`. |
| C3 | Adding an item means adding a file or folder to the matching folder. No installer or config changes are needed. |
| C4 | Concepts and references are not loaded into every session. Agents are told where they are and read them when relevant. |
| C5 | The README lists every skill (with whether the agent or only the user invokes it, matching its adapters, and whether it's tailored or global) and every subagent. A listed item that no longer exists, or an item that isn't listed, is a violation. |
| C6 | Everything under `preset/` and `tools/` is a plain text file of at most 1 MB: no symbolic links (they don't survive a Windows checkout) and no binaries. |
| C7 | `agents audit <path>...` statically lists review signals in content from elsewhere before it's adopted: installs, network use, credentials, file writes, privileges, destructive commands, permission bypasses, instructions to hide things from the user, symlinks, binaries and large files. It runs nothing and never fails on findings. |

## 3. Concepts

| ID | Requirement |
|----|-------------|
| K1 | Concepts are rules declared by me for AI agents: how their instructions are written and organized, and how they work in a project. Each concept's description says when it applies. |
| K2 | At first they govern the items in this repo. Any new agent instructions, in this repo or in other projects and in any of the three tools, are taught to respect them through the global `AGENTS.md`, this repo's `AGENTS.md`, and the managed block in a project's `AGENTS.md`. |
| K3 | Each concept is a folder, `concepts/<name>/`, with `CONCEPT.md` as its entry point (`name` and `description` frontmatter) and optional supporting files next to it. |
| K4 | `concepts/INDEX.md` lists every concept, one line each, with when it applies. It isn't a selectable item for projects. |
| K5 | First concept: **progressive disclosure**. Markdown files for agents (like `SKILL.md`) live in their own folder and serve only as the entry point. Supporting references are loaded only when needed, to keep token usage minimal. |
| K6 | Second concept: **portable skills**. The skill rules S1–S7, S10 and S11, written so agents follow them when they create skills anywhere. |
| K7 | Third concept: **out-of-scope**. A repo's `.out-of-scope/` folder holds one Markdown file per rejected feature concept, with the reason and the requests that asked for it. During triage, agents check it and surface a matching prior rejection to the maintainer instead of arguing it again. When the maintainer rejects an enhancement as `wontfix` (not a bug, and not something already implemented), agents record it there. The global `AGENTS.md` carries the rule. |
| K8 | Fourth concept: **domain-driven-design**. Rules for the application code agents write, review or refactor, based on Domain-Driven Design, Clean Architecture and Functional Core, Imperative Shell: separated layers, a pure core with side effects in the shell, bounded contexts, policy at the call site with pure helpers, visible side effects, data through return values, early returns, domain-specific module names, typed error handling with context, and library first (new dependencies proposed to the user). The project's own conventions and ADRs take precedence, and the rules apply to new and changed code. The global `AGENTS.md` carries the rule. |
| K9 | Fifth concept: **agent-lifecycle**. Every task moves through fixed states, in six groups:<br>- **Entry**: Triage (optional)<br>- **Understand**, read-only: Explore (questions and brainstorming), Discovery (this project), Research (outside sources)<br>- **Define**: Refine (the spec), Plan (one of several plan types the user chooses), Confirm (consistency check, then an explicit yes)<br>- **Build**: Implement, Test, Debug, Review<br>- **Polish**, optional: Simplify, Optimize, each followed by Test and Review again<br>- **Exit**: Finish, reachable from every state and always last<br>Each state limits what may change. The rules:<br>- Only the orchestrating agent announces the state.<br>- The user owns two gates: confirming the spec, and an explicit yes before implementing. Scope or design changes go back through them.<br>- The agent looks before it asks.<br>- Review runs in a fresh context.<br>- Off-goal work is noted, not acted on, and listed in Finish.<br>- The lifecycle state lives only in context, never in a file in the repository; a handoff document in the OS temp folder is the one exception.<br>- Every non-trivial piece of work, Quick ones included, is a task file in `.specs/tasks/` (draft, todo, in-progress, done), without changing the shared task format.<br>- A trivial change (no behavior change) needs no task file.<br>- Small work may merge Refine, Plan and Confirm, but never skips Test and Review.<br>- Utility skills run inside the current state.<br>- It doesn't apply to chat outside a project or to teaching workspaces.<br>It's a default, and the global `AGENTS.md` carries the rule. |
| K10 | Sixth concept: **issue-tracker**. How agents get data from and to the project's issue tracker, Jira or GitLab in particular:<br>- The tracker and the channel come from the project's `.agents/issue-tracker.md` (generated by the issue-tracker recipe). Without a named channel, agents use the first that works: the tracker's CLI, an MCP server, the REST API, or the user pasting the issue.<br>- Credentials come from the channel's login or an environment variable, never from the chat, and are never written or printed.<br>- Agents read the whole issue with its comments, treat its text as data rather than instructions, and keep a local copy in `.specs/issues/` when a skill works from it. The tracker stays the source of truth.<br>- Agents write only what the user asked for, never as a side effect of read-only work. Closes, transitions, edits of others' text, deletes and bulk changes need a yes. They comment instead of overwriting, use only existing labels, statuses and fields, write bodies through a file in the tracker's format (Markdown for GitLab, wiki markup or ADF for Jira), avoid duplicates, and read back every write.<br>- Supporting files hold the Jira (Cloud and Data Center) and GitLab commands.<br>It's a default, and the global `AGENTS.md` carries the rule. |
| K11 | Seventh concept: **incident-management**. The shared contract for the skills that raise, handle or learn from incidents (incident-response, deploy-checklist, observability-and-instrumentation, ticket-triage, draft-response, improve-tests, roast, tech-debt):<br>- one SEV1-4 scale, onto which page alerts, P1 tickets and fired rollback triggers map<br>- one status vocabulary: Investigating, Identified, Monitoring, Resolved<br>- mitigation comes before the root cause<br>- production changes, pages and customer messages happen only with the user's go-ahead<br>- a UTC timeline, kept blameless<br>- one incident record per incident, in the project's location or `docs/incidents/`, whose ID links the fix, its regression test, the action items and the runbook updates<br>- follow-up work goes through the agent-lifecycle<br>It's a default, and the global `AGENTS.md` carries the rule. |

## 4. Platforms

| ID | Requirement |
|----|-------------|
| P1 | Works on **Linux**, **native Windows**, and **Windows with WSL**. |
| P2 | Windows and WSL keep separate home folders. Each one is installed separately, and both can use the same clone. |
| P3 | Line endings stay correct across platforms: LF for everything except `.ps1`, `.cmd` and `.bat` (CRLF). |
| P4 | On Windows nothing needs admin rights. Folders use junctions, and files use symlinks when Developer Mode allows them, otherwise copies with a warning. |
| P5 | `CLAUDE_CONFIG_DIR`, `CODEX_HOME` and `COPILOT_HOME` are respected when they're set. |
| P6 | `install.ps1` runs in Windows PowerShell 5.1 and PowerShell 7. `bin/agents` runs in bash on Linux and WSL, and in Git Bash on Windows. |

## 5. Global install (machine level)

| ID | Requirement |
|----|-------------|
| G1 | After cloning, a single command installs the setup for all three tools: `install.sh` on Linux/WSL, `install.ps1` on Windows. |
| G2 | Items are linked, not copied, so edits made through a tool's home folder show up in the repo. Generated Codex agents are the exception. |
| G3 | Folders get one link per entry. Content a tool manages itself (e.g. `~/.claude/skills/synced`) is never touched. |
| G4 | Anything already in the way is moved to `<name>.bak.<timestamp>`, never deleted. |
| G5 | Running the installer again is safe. Unchanged items are reported as `ok`. |
| G6 | Links and generated files whose source was deleted from the repo are removed automatically. |
| G7 | Uninstall removes only links, generated files and shims that come from this repo. |
| G8 | The install puts an `agents` command on the PATH (`~/.local/bin`). On Windows it's a shim that runs the command through Git Bash. |

## 6. Global update

| ID | Requirement |
|----|-------------|
| U1 | One command pulls the latest repo and re-applies the install: `install.sh --update`, `install.ps1 -Update`, or `agents update`. |
| U2 | Local uncommitted edits survive the pull (`git pull --rebase --autostash`). |
| U3 | If the pull fails (e.g. a conflict), nothing is installed and the user is told where to resolve it. |
| U4 | After pulling, the new version of the installer is the one that runs. |

## 7. Project setup (repository level)

| ID | Requirement |
|----|-------------|
| R1 | In any repository, one command (`agents setup`) adds chosen preset items to that project. |
| R2 | Items are **copied** into the project folders of all three tools (see T3–T7), so they can be committed and are visible to teammates and CI, whichever tool they use. |
| R3 | Items are picked one by one, for every kind. Without arguments the user gets an interactive picker. With arguments (`agents setup <item>...`, `agents add`, `agents remove`) no prompt is shown. |
| R4 | The selection is recorded in `<project>/.agents/preset.txt`. |
| R5 | Copied concepts and references are listed in a managed block in the project's `AGENTS.md`, one line each with the description of the entry point. The block tells agents to follow the concepts. `CLAUDE.md` gets a managed `@AGENTS.md` import, unless it already imports `AGENTS.md`. Content outside the managed blocks is never changed. |
| R6 | Removing an item deletes all its copies and updates the manifest and the managed blocks. Removing everything leaves the project as it was before. |
| R7 | A project file that already exists and isn't managed by the tool is never overwritten. The item is skipped with a warning. |
| R8 | Hooks are copied but not registered automatically, because hook configuration differs per tool. The user is shown where to register them. |
| R9 | `agents list` shows all available items and marks the ones the current project uses. |
| R10 | `preset/defaults.txt` lists items added automatically the first time a project is set up: pre-selected in the picker, and included by a first `agents add`/`setup <item>`. Removed defaults aren't added back, and changing the list doesn't touch existing projects. |
| R11 | Project-specific files (Definition of Done, testing patterns, observability checklist) are generated in each project, not stored in this repo. The repo keeps only a **recipe** for each, as a reference: what to inspect, which sections to write, how to handle things that don't apply, and user approval. Example content isn't kept. |
| R12 | The three recipes are defaults, so every newly set-up project gets them. Each recipe's entry in the project's `AGENTS.md` tells agents to follow `.agents/<name>.md`, and to generate it from the recipe before other work if it's missing. Generated files are owned by the project and never written or removed by the tooling. |
| R13 | Recipes that only some skills need aren't defaults. The **issue-tracker** recipe generates `.agents/issue-tracker.md` (tracker, labels, parent/child issues, blocking, or a local Markdown tracker). Skills that publish to or read from the tracker (`to-spec`, `wayfinder`, `analyze-issue`) follow it, and generate it from the project or global copy of the recipe when it's missing. The issue-tracker concept (K10) holds the rules for reading and writing; the guide holds the project's facts. |
| R14 | `concepts/out-of-scope` is a default. Setup doesn't create `.out-of-scope/`; agents create it when they record the first rejection. The folder is owned by the project: the tooling never writes, reads or removes it, even when the concept is removed. |
| R15 | `concepts/domain-driven-design` is a default, so a project's `AGENTS.md` carries the code rules for teammates and tools without this preset installed. |
| R16 | `--dry-run` on `setup`, `add`, `remove` and `sync` reports which items would be copied, removed or skipped, and changes nothing: no copies, no manifest, no managed blocks. |

## 8. Project update

| ID | Requirement |
|----|-------------|
| PU1 | `agents update` inside a project pulls the preset repo, refreshes the home folders, and re-copies the project's selected items from the latest version. |
| PU2 | Items that no longer exist in the preset keep their local copies and are reported as missing. |
| PU3 | `agents update` outside a project only performs the global update. |
