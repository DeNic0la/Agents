# Agents

My personal setup for AI coding agents (**Claude Code**, **Codex** and **GitHub Copilot**), kept in one place so it works the same in every tool, on every machine and in every project.

- **Global:** clone it once per computer and run the installer. All three tools then get my instructions, skills, subagents, commands, concepts and references.
- **Per project:** in any repository, `agents setup` copies chosen items into the folders each tool reads, where they can be committed.
- **Up to date:** `agents update` pulls the latest version of this repo and refreshes your home and every project on the machine that uses it.

What this project is meant to be, how tailoring to repositories works and why things are the way they are: [docs/](docs/README.md).

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
  skills/<name>/GENERATE.md  recipe for a repo-tailored version of the skill (none for global skills)
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
| Skills, project (repo version or global copy) | `.claude/skills/` (mirror) | `.agents/skills/` | `.agents/skills/`, `.claude/skills/` |
| Subagents, global | `~/.claude/agents/<n>.md` | `~/.codex/agents/<n>.toml` (generated) | `~/.copilot/agents/<n>.agent.md` |
| Subagents, project | `.claude/agents/` | `.codex/agents/` (generated) | `.github/agents/` |
| Commands | `~/.claude/commands/`, `.claude/commands/` | – | – |
| Concepts, references, hooks | `~/.agents/…` globally, `.agents/…` in a project (shared by all three) | | |

- **Global installs** are links back to this repo, so edits show up in the repo, ready to commit.
- **Machine-local instructions** go in `~/.agents/local/AGENTS.md`, outside the repo. Create it yourself on a machine that needs extra rules, such as a work laptop with its own safety rules or local paths; the installers never change anything in `~/.agents/local/` (only the `agents` command keeps its project list there). The global instructions point to it: Claude Code imports it with `@`, and Codex and Copilot read it because the instruction tells them to.
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

**Global skills.** Most skills are *tailored*: a project that selects one gets a version generated for that repository (see [Set up a project](#2-set-up-a-project)). A skill that has nothing to tailor is *global*: it has no `GENERATE.md` and no "Repo version first" notice, and a project that selects it gets a plain copy. To make a skill global, delete its `GENERATE.md` and the notice, and set its Kind to `global` below.

**Routers.** There are too many skills to remember, so each area of work has a **router**: a user-invoked global skill that names the area's skills and when to reach for each. Start the router with what you want (`/build add CSV export`). It picks one skill: it uses that skill right away if the agent may start it, or tells you its name if only you can. Routers are marked `router: "true"` in their `metadata`. `agents check` makes sure every other skill is in exactly one router, and that each router shows correctly who invokes each skill. A new skill goes into its area's router.

### Skills in the preset

Kind is `tailored` (projects generate their own version) or `global` (projects get a copy as it is). Each group starts with its router.

| Skill | Use it to | Invoked by | Kind |
|---|---|---|---|
| **Think it through** | | | |
| think | pick the skill for exploring what to build, testing an idea or settling a decision (router) | user | global |
| interview-me | find out what the user actually wants before anything exists | agent | tailored |
| idea-refine | turn a vague idea into concrete variations and pick one | agent | tailored |
| brainstorming | go from a request to an approved design doc | agent | tailored |
| ideate | generate grounded ideas for what to build next, critique them and rank the survivors | user | tailored |
| grilling | stress-test an existing plan, decision or idea in rounds of questions | agent | tailored |
| grill-me | start a grilling session on a plan or design (entry point to `grilling`) | user | global |
| roast | have five independent reviewers attack a technical idea, then get one BUILD / RESHAPE / DROP verdict | user | tailored |
| jury | put a hard decision to 3 or 5 blind-voting subagents and get one verdict with dissent | user | global |
| what-would-you-do | have the agent explain its open question and recommend an answer, with the case for and against each option | user | global |
| wait-what | have the agent re-explain its last message in plain words | user | tailored |
| research | research a question against primary sources and save the cited findings as one Markdown file | agent | tailored |
| prototype | build a throwaway prototype that answers one logic or UI design question | agent | tailored |
| teach | learn a topic over several sessions in a teaching workspace | user | tailored |
| **Design** | | | |
| design | pick the skill for shaping the domain language, the architecture or an interface (router) | user | global |
| domain-modeling | sharpen the project's language (`GLOSSARY.md`) and record decisions (ADRs) | agent | tailored |
| grill-with-docs | grill a plan while keeping the glossary and ADRs current | user | tailored |
| system-design | design a system or major component from requirements, with load estimates and trade-offs | agent | tailored |
| architecture | compare technology options or review a design proposal, and record the decision as an ADR | agent | tailored |
| codebase-design | design deep modules with a shared vocabulary for interfaces, seams and depth | agent | tailored |
| api-and-interface-design | design APIs and module interfaces | agent | tailored |
| schema-design | design or review database schemas (keys, types, constraints, indexes, partitioning) and deliver them as a migration | agent | global |
| improve-codebase-architecture | assess the architecture, stop if healthy, else design a deepening from an HTML report and plan it for `implement` | user | tailored |
| **Plan and hand off** | | | |
| planning | pick the skill for turning a decision into specs, tickets or tasks, or for handing work over (router) | user | global |
| to-spec | turn the conversation into a spec in the issue tracker | user | tailored |
| wayfinder | chart work too big for one session as a map of decision tickets | user | tailored |
| to-tickets | break a plan or spec into tracer-bullet tickets with blocking edges in the issue tracker | user | tailored |
| planning-and-task-breakdown | break a spec into small, verifiable, ordered tasks | agent | tailored |
| triage | move issues and external PRs through triage states and write agent-ready briefs | user | tailored |
| analyze-issue | write a technical spec for a tracker issue | user | tailored |
| read-jira-xml | turn a Jira XML export (one issue or a filter) into compact Markdown | agent | global |
| add-task | capture a request as a draft task in `.specs/tasks/draft/` | user | tailored |
| plan-task | turn a draft into acceptance criteria, architecture and judged, phased sub-tasks | user | tailored |
| to-questionnaire | write a questionnaire for someone who knows what you don't | user | tailored |
| checkpoint | before compaction or a break, update the task tracking, record learnings and write the session state | user | tailored |
| handoff | write a handoff document for the next agent session | user | tailored |
| **Build** | | | |
| build | pick the skill for building a change, from one fix to a whole spec (router) | user | global |
| implement | build a spec, tracker tickets or issues test-first, then QA, review and fix it on a branch | user | tailored |
| implement-spec | build a whole spec through parallel worktrees on one integration branch, ready for one PR | user | tailored |
| orchestrate | work through the issue queue unattended in parallel Herdr lanes and git worktrees | user | tailored |
| implement-task | implement a planned task one agent per step, with one code review per phase and a definition-of-done check | user | tailored |
| do-in-steps | run a task as dependent steps, each checked by an independent judge before the next | user | tailored |
| tdd | build or fix test-first at agreed seams, finishing with a mutation check | agent | tailored |
| source-driven-development | ground framework code in the official docs and cite them | agent | tailored |
| dependency-vetting | verify a package or tool is authentic and current before installing, adding or recommending it | agent | tailored |
| documentation | write or update READMEs, API references, runbooks and guides for a named reader, checked against the code | agent | tailored |
| file-conversion | convert a local file between image, audio, video, document and data formats with installed tools only, and verify the result | agent | tailored |
| **Fix and improve** | | | |
| improve | pick the skill for fixing, cleaning up or hardening code that already exists (router) | user | global |
| systematic-debugging | find the root cause before proposing any fix | agent | tailored |
| compound | record the reasoning behind a solved problem in `docs/solutions/` so it isn't investigated twice | agent | tailored |
| code-simplification | simplify code without changing behavior | agent | tailored |
| refactor | assess, then restructure code at method, file or project scope without changing behavior | user | tailored |
| improve-file-structure | assess file placement and plan a behavior-preserving reorganization for `implement` | user | tailored |
| testing-strategy | decide what to test at which level, and find coverage gaps, before writing tests | agent | tailored |
| improve-tests | cut a test suite to the tests that catch real bugs and the shortest run time | user | tailored |
| performance-optimization | measure, then optimize | agent | tailored |
| observability-and-instrumentation | add logs, metrics and traces | agent | tailored |
| deprecation-and-migration | retire old code and migrate its users | agent | tailored |
| tech-debt | find, score and prioritize technical debt into a phased plan beside feature work | agent | tailored |
| **Check, ship and operate** | | | |
| ship | pick the skill for checking a change, getting it merged and released, and running it (router) | user | global |
| qa | run the changed program the way its user would and check each requested behavior | agent | tailored |
| code-review | review the changes since a fixed point against an optional spec, ending on a coded verdict | agent | tailored |
| fix-findings | apply the findings of the most recent review, audit or check in this session | user | global |
| security-scan | scan for vulnerable dependencies, leaked secrets and image or IaC issues, then triage and propose fixes | user | global |
| commit | commit every change on the current branch with a Conventional Commit message, after a secrets scan | user | tailored |
| pr | write a fast-to-review PR body: summary diagram, before/after evidence, merge danger | agent | tailored |
| ship-pr | commit, push, open a PR, repair CI within a fixed budget, squash merge and verify post-merge workflows | user | tailored |
| resolving-merge-conflicts | resolve a stopped merge or rebase from the intent of both sides, then run checks and finish | agent | tailored |
| deploy-checklist | build and check a pre-deploy checklist with rollback triggers for one release | agent | tailored |
| incident-response | triage an incident, post status updates, mitigate, and write a blameless postmortem | agent | tailored |
| standup | turn recent commits, PRs, tickets or notes into a yesterday / today / blockers update | agent | global |
| **Agent setup** | | | |
| agent-setup | pick the skill for improving the agent itself: its skills, instructions, context, prompts and usage (router) | user | global |
| writing-for-agents | write or restructure a skill, AGENTS.md or any doc an agent reads | agent | tailored |
| writing-skills | prove a skill changes agent behavior: baselines, pressure tests, closing loopholes | agent | tailored |
| skill-review | sweep a skill collection for stale steps, missing gotchas, gaps and duplicates | agent | global |
| agents-md-improver | audit agent instruction files against the codebase, or add a session's learnings to them | agent | tailored |
| task-observer | save the user's lasting working preferences as rules in the instruction files | agent | global |
| context-engineering | set up the context an agent works with | agent | tailored |
| retro | review a session and improve the agent's environment | user | tailored |
| diagnosing-sessions | find out, with transcript evidence, why a session went wrong, and report it to whoever maintains the skill or plugin involved | user | tailored |
| optimize-prompt | rewrite a draft prompt for an AI chat into a clearer one, without running it | agent | global |
| budget-run | size a multi-agent or long run to fit the usage budget, and ask first when it's large or weekly usage is ahead of pace | agent | global |
| skill-router | find and load the skills that fit the work now, at the start of a task and whenever its goal, focus or state changes | agent | global |
| **Data** (global) | | | |
| data | pick the skill for a data question, from one query to a shared dashboard (router) | user | global |
| analyze | answer a business question with data, from a quick number to a formal report | agent | global |
| explore-data | profile an unfamiliar table or file: grain, keys, nulls, distributions, quality issues | agent | global |
| sql-queries | write, optimize, translate or debug analytical SQL in the user's dialect | agent | global |
| statistical-analysis | pick and apply statistical methods and keep claims honest: tests, outliers, trends, forecasts | agent | global |
| data-visualization | choose the right chart and build a clear, honest, accessible one in Python | agent | global |
| build-dashboard | build a self-contained interactive HTML dashboard with KPIs, charts, filters and a table | agent | global |
| validate-data | QA an analysis before it's shared and give a ready / caveats / needs-revision verdict | agent | global |
| data-context-extractor | interview analysts and the schema to write or extend a company-specific data-analyst skill | agent | global |
| **Product** (global) | | | |
| product | pick the skill for product work: specs, roadmaps, sprints, research and updates (router) | user | global |
| product-brainstorming | think out loud about product problems, ideas and strategy with a sparring partner | agent | global |
| write-spec | write a PRD with goals, non-goals, user stories, requirements and metrics | agent | global |
| roadmap-update | add, reprioritize or reschedule items on a product roadmap, or build one | agent | global |
| sprint-planning | plan a team sprint with a goal, capacity, a scoped backlog and risks | agent | global |
| synthesize-research | turn interviews, surveys and feedback into ranked, evidence-backed findings | agent | global |
| competitive-brief | write a competitive analysis brief for competitors or a feature area | agent | global |
| metrics-review | review product metrics for trends, a scorecard and recommended actions | agent | global |
| stakeholder-update | write a status update tailored to execs, engineering, partners, customers or the board | agent | global |
| **Customer support** (global) | | | |
| support | pick the skill for customer support: triage, research, replies and knowledge base articles (router) | user | global |
| ticket-triage | categorize, prioritize and route a customer support ticket, with a first reply | agent | global |
| customer-research | research a customer question across sources with attribution and confidence | agent | global |
| draft-response | draft a customer-facing reply tailored to the situation and relationship | agent | global |
| kb-article | draft a searchable knowledge base article from a resolved issue or common question | agent | global |
| **Productivity** (global) | | | |
| productivity | pick the skill for the user's own tasks and working memory (router) | user | global |
| productivity-start | set up TASKS.md, working memory and the dashboard, and learn the user's shorthand | user | global |
| productivity-update | sync tasks from trackers, triage stale ones, and fill memory gaps | user | global |
| task-management | keep the user's personal todos in TASKS.md | agent | global |
| memory-management | decode and remember workplace shorthand in working memory and `memory/` | agent | global |

`implement-spec` and `orchestrate` share [parallel-resources.md](preset/references/parallel-resources.md); in a project, add it along with them.

Claude Code also gets these from `tools/claude/`:
- `claude-handoff`, which starts a background `claude` session from a handoff.
- `usage-review`, which reports where usage went, from this machine's transcripts.
- `upload-diagnostics`, which collects a machine's agent setup, CLI versions with pending updates, and Claude Code usage (aggregates only by default), and adds them as a dated file to an `Agents diagnostics` folder in Google Drive through the claude.ai connector. Run it on another computer (a work laptop, say) so a session anywhere can read the newest file and tune that machine.
- `settings.json` with usage defaults: subagents without a tier run on Sonnet, and compaction starts at 200k tokens. It also registers a status line that shows weekly usage against a pace line that expects use on weekdays (weekend days count 0.2 by default; the weights are learned from how much you use on each weekday) and says whether to use more or less per workday and by how much; and a hook that asks before a workflow or a top-tier subagent while usage is ahead of pace, and before a model switch on a large context. The scripts need Node.js; [levers.md](preset/concepts/usage-budget/levers.md) has the details. Its `skillOverrides` list every skill the agent may start on its own by name only, without its description, except `skill-router` and `dependency-vetting`; the global instructions tell agents to use `skill-router` at the start of each task and whenever its goal, focus or state changes, so they find the skills that fit. That keeps the skill listing small (Claude Code gives it 1% of the context window). Add a new agent-invoked skill there too, in every environment's settings. The installer links this file as `~/.claude/settings.json`, so keep your own Claude Code settings in it. A machine with an environment (see below) gets that environment's `settings.json` instead.

**Environments.** Some machines need their own version of a tool file, such as a work laptop whose Claude Code settings carry work-only permission rules. Put that version in `tools/environments/<env>/<tool>/`, at the same path it has under `tools/<tool>/`, and write the environment's name (one plain word, e.g. `work`) into `~/.agents/local/environment` on that machine. The installers then link the environment's file in place of the default; everything else stays shared. If the name isn't a plain word, or there's no folder for it, they warn and use the defaults. An environment can only replace files that exist by default. Edits Claude Code makes on that machine land in the environment's file, so machines no longer change each other's settings. Its content is committed like everything else: keep secrets, local folder names and absolute local paths out of it. This repo has one: `work`.

### Subagents in the preset

The spec-driven skills dispatch the first group of personas. Their shared contract is in three references: [specs-workflow.md](preset/references/specs-workflow.md) (the `.specs/` layout and file formats), [model-tiers.md](preset/references/model-tiers.md) (picking `fast`, `standard` or `deep` per dispatch) and [judged-iteration.md](preset/references/judged-iteration.md) (scoring, retrying and accepting work). In a project, add those references along with the skills.

The second group are specialists you or a skill can dispatch directly. They follow the domain-driven-design concept and use the preset's skills for details (for example `api-and-interface-design`, `observability-and-instrumentation`, `performance-optimization`). `backend-architect` also checks its design against [ddd-deliverables.md](preset/references/ddd-deliverables.md).

Each subagent sets a default model tier in `model`, picked with [model-tiers.md](preset/references/model-tiers.md): `haiku` for read-only work (code-explorer, researcher, tech-writer), `opus` for backend-security-coder, and `sonnet` for the rest. A dispatch can pass another. Copilot falls back to the session's model when it can't use the name, and the generated Codex agents leave it out.

| Subagent | Writes |
|---|---|
| **Spec-driven workflow** | |
| business-analyst | a task's description and acceptance criteria |
| researcher | a reusable research note in `.specs/research/` |
| code-explorer | a codebase impact analysis in `.specs/analysis/` |
| software-architect | a task's architecture overview |
| tech-lead | the implementation process and one sub-task file per step |
| developer | one step's code and tests; also checks the definition of done |
| tech-writer | one step's documentation |
| code-reviewer | a scored review of one phase, with issues attributed to steps |
| meta-judge | an evaluation specification for one step |
| judge | a scored evaluation of an artifact against a rubric or specification |
| **Specialists** | |
| backend-architect | a backend design: service boundaries, API contracts, communication, resilience, security and observability, with trade-offs |
| backend-security-coder | backend code with security controls and tests, or a severity-ordered security review |
| change-reviewer | a severity-ordered review of a diff, branch or pull request, with evidence and fixes |
| java-developer | modern Java and Spring code with its tests |
| test-automator | tests at the right level (test-first for new behavior), and fixes for flaky or slow suites |

### Concepts

Concepts are rules I declare for AI agents: how their instructions are written and organized, and how they work in a project. Everything in this repo follows them.

The global instructions tell every tool to read [the index](preset/concepts/INDEX.md) and follow the concepts that apply whenever it writes or changes agent instructions. Projects that pull in a concept with `agents setup` get the same instruction in their `AGENTS.md`.

| Concept | In short |
|---|---|
| [agent-lifecycle](preset/concepts/agent-lifecycle/CONCEPT.md) | Work in a project moves through 14 states in six groups: Entry (Triage), Understand (Explore, Discovery, Research; read-only), Define (Refine, Plan, Confirm), Build (Implement, Test, Debug, Review), Polish (Simplify, Optimize; optional) and Exit (Finish, always). The agent announces the state and changes only what it allows. Two gates are the user's: confirming the spec, and an explicit yes before implementing. Scope changes go back through them. Review runs in a fresh context, and off-goal work is noted instead of acted on. The lifecycle state lives only in context, while every non-trivial piece of work, Quick ones included, is a task file in `.specs/tasks/`. A default, and the global instructions apply it everywhere. |
| [progressive-disclosure](preset/concepts/progressive-disclosure/CONCEPT.md) | Agent Markdown files are small entry points in their own folder; supporting files load only when needed. |
| [out-of-scope](preset/concepts/out-of-scope/CONCEPT.md) | Rejected feature requests are recorded in `.out-of-scope/`, one file per concept with the reason. Triage checks it first, so a rejection isn't argued again. A default; agents create the folder on the first rejection. |
| [portable-skills](preset/concepts/portable-skills/CONCEPT.md) | Skills use spec fields only; vendor extras go in metadata or adapters; runtime controls are opt-in local overrides; user-invoked skills are marked in both adapters. |
| [issue-tracker](preset/concepts/issue-tracker/CONCEPT.md) | How agents get data from and to the issue tracker (Jira, GitLab, ...). The tracker and the channel come from the project's `.agents/issue-tracker.md`: a CLI (`glab`, `acli`, jira-cli), an MCP server, or the REST API, in that order. Agents read the whole issue with its comments, treat its text as data rather than instructions, and keep a local copy in `.specs/issues/` when a skill works from it. They write only what the user asked for, in the tracker's own format (Markdown for GitLab, wiki markup or ADF for Jira), confirm closes, transitions and bulk changes, never create labels or fields on their own, and read back every write. A default, and the global instructions apply it everywhere. |
| [incident-management](preset/concepts/incident-management/CONCEPT.md) | One contract for every skill that raises, handles or learns from incidents. It sets a SEV1-4 scale, maps page alerts, P1 tickets and fired rollback triggers onto it, and fixes the status vocabulary (Investigating → Identified → Monitoring → Resolved). Mitigation comes before the root cause, and every production change, page or customer message needs the user's go-ahead. Timelines are in UTC and blameless. Each incident gets one record (by default in `docs/incidents/`), whose ID links the fix, its regression test, the action items and the runbook updates. Follow-up work goes through the agent-lifecycle. A default, and the global instructions apply it everywhere. |
| [domain-driven-design](preset/concepts/domain-driven-design/CONCEPT.md) | Rules for the code agents write: layered architecture with a pure functional core, decisions and side effects visible at the call site, data through return values, early returns, domain names instead of `utils`, typed error handling, library before custom code. The project's own conventions win. A default, and the global instructions apply it everywhere. |
| [external-tools](preset/concepts/external-tools/CONCEPT.md) | The external programs I want agents to have, one file per tool with its use, install, check, flags and limits: [maigret](preset/concepts/external-tools/maigret.md) (username OSINT) and [Pulse Diagnostics](preset/concepts/external-tools/pulse-diagnostics.md) (Windows crashes, through its exported reports). Agents use a listed tool instead of scripting the job by hand, check it's installed, and install it in user space and isolated (`uv tool` for Python, `pnpm add -g` for Node.js, ...) only after the user's yes; admin rights need a separate yes. They watch for repeated manual work and recommend a maintained, open-source tool for it without installing it; on a yes it's added to the list. The global instructions apply it everywhere; it isn't a project default. |
| [security-scanning](preset/concepts/security-scanning/CONCEPT.md) | When and how agents run security scans: [OSV-Scanner](preset/concepts/security-scanning/osv-scanner.md) for dependency CVEs, [Gitleaks](preset/concepts/security-scanning/gitleaks.md) for secrets, [Grype and Syft](preset/concepts/security-scanning/grype.md) for images and SBOMs, [Trivy](preset/concepts/security-scanning/trivy.md) for IaC only (pinned and signature-verified after its March 2026 compromise). Scans run on request, on a schedule, before merging dependency changes, before a release and after a new package is vetted. Agents install a scanner only after a yes, write output to the temp folder, triage by package, exploitation, severity and reachability, fix only after a yes, and never repeat a secret. The scanners stay out of the external-tools list so they load only for a scan; `security-scan` is the entry point. The global instructions point to it; it isn't a project default. |
| [usage-budget](preset/concepts/usage-budget/CONCEPT.md) | Plan usage is a weekly budget, and some of it should be left on the last day. Agents pace against a line that keeps a 10% reserve, give every dispatched agent an explicit model tier, use scripts for deterministic work, keep one task per session and don't switch models on a large context. Before running several agents or a workflow they follow `budget-run`, and ask first when the run is large or usage is ahead of pace. [levers.md](preset/concepts/usage-budget/levers.md) maps each cost driver to the settings and hooks of Claude Code, Codex and Copilot. The global instructions apply it everywhere; it isn't a project default. |

To add a concept, create `preset/concepts/<name>/CONCEPT.md` with `name` and `description` frontmatter, then add a row to `INDEX.md`.

### Checking the preset

Run `agents check` before committing. It fails on:
- a skill or command that breaks the [portable-skills](preset/concepts/portable-skills/CONCEPT.md) rules
- a skill or subagent missing from the tables above, a row for one that no longer exists, an "Invoked by" cell that doesn't match the skill's adapters, or a Kind cell that doesn't match whether the skill has a `GENERATE.md`
- a symbolic link, a binary file or a file over 1 MB under `preset/` or `tools/`

It also warns, without failing, when the uncommitted changes break a rule from this repo's `AGENTS.md`: `lib/common.sh` changed without `install.ps1` (or the reverse), or the installers or `bin/agents` changed without README.md and REQUIREMENTS.md. It also warns when a subagent has no `model`, and notes how many characters of names and descriptions the agent-invoked skills put into every session's skill listing, and how many remain in Claude Code once the `name-only` skills in `tools/claude/settings.json` count with their name only.

After changing the installers, `lib/common.sh` or `bin/agents`, run the smoke tests on every platform you can reach. They work on a copy of the repo with temporary home folders, so your own setup isn't touched:

```bash
bash tests/smoke.sh                                       # Linux / WSL
```

```powershell
powershell -ExecutionPolicy Bypass -File tests\smoke.ps1  # Windows PowerShell 5.1
pwsh -File tests\smoke.ps1                                # PowerShell 7
```

The Windows test runs the install twice, with symlinks and with the copies used without Developer Mode, and drives `agents` through the Git Bash shim.

Before adopting a skill, subagent or command from somewhere else, run `agents audit <path>` on it. It prints every line that installs software, uses the network, mentions credentials, writes or deletes files, needs privileges, is destructive, bypasses permissions, or tells the agent to hide something from the user. It also flags symlinks, binaries and large files. Nothing is run, and an empty report isn't a guarantee of safety.

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

> **Windows:** folders are linked with junctions, which don't need admin. File symlinks need **Developer Mode** (Settings → System → For developers). Without it, files are copied instead and you'll see a warning; run the installer again (or `agents update`) after changes. Copies are listed in `~/.agents/.copies`, so they're refreshed in place and removed like links; a copy you edited is moved to `<name>.bak.<timestamp>` rather than deleted. The `agents` command runs through Git Bash, which comes with Git for Windows. Don't run `install.sh` from Git Bash; use `install.ps1`.

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

**Skills: repo version or global.** In the picker, every tailored skill you select gets a *repo version*: a version of the skill tailored to this repository, which is always preferred over the global one. Skills you don't select stay global.
- Every tailored skill in this repo ships as both a global `SKILL.md` and a `GENERATE.md` recipe.
- For a repo version, `agents` copies the recipe to `.agents/recipes/skills/<name>.md`.
- The agent generates `.agents/skills/<name>/` from it the first time the skill is needed, or when you ask ("generate the repo versions of our skills"). Codex and Copilot read that folder directly.
- `agents sync` then mirrors it to `.claude/skills/<name>/` for Claude Code, applying your Claude overrides.
- Until the repo version exists, the global version is used.
- The generated skill belongs to the project. `agents remove` keeps it and tells you to delete it if you want to go back to the global version.

Precedence differs per tool (Claude Code prefers the global skill, Copilot the project one). So every tailored skill's global `SKILL.md` starts with a "Repo version first" notice that sends the agent to the repo version when there is one, which works the same in all three tools.

A selected *global skill* (marked `(global, copied as is)` in the picker) has no recipe: `agents` copies it unchanged to `.agents/skills/<name>/` and mirrors it to `.claude/skills/<name>/`, so teammates without this preset get it too. It's managed like any other copied item: `agents update` refreshes it and `agents remove` deletes it.

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
| [issue-tracker.md](preset/references/issue-tracker.md) | `.agents/issue-tracker.md` | reading issues or publishing specs and decision tickets: the tracker, the channel, labels, statuses, parent/child issues and blocking. The issue-tracker concept holds the rules and the Jira and GitLab commands. |

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
| `agents check` | validate the preset (see below) |
| `agents audit <path>...` | list review signals in third-party skills or agents before adding them to the preset (see below) |

Add `--dry-run` to `setup`, `add`, `remove` or `sync` to see which items would be copied, removed or skipped, without changing anything.

Files that already exist in the project and weren't added by `agents` are never overwritten, and nothing outside the managed blocks is changed. Hooks are copied to `.agents/hooks/` but not registered: hook configuration differs per tool (`.claude/settings.json`, `.codex/hooks.json`, `.github/hooks/*.json`).

## Update

```bash
agents update
```

Run it anywhere. It:
1. pulls the latest version of this repo (`git pull --rebase --autostash`, so uncommitted edits survive the pull)
2. refreshes your home for all three tools: new items get installed, and anything deleted from the repo is removed
3. re-copies the items of every project on this machine that uses `agents`, from the latest version. Review the changes with `git diff` in each and commit them.
4. names, per project, the items this pull added to the preset that the project doesn't use yet, with the `agents add` command for them.

`agents` keeps the list of projects in `~/.agents/local/projects`, one path per line: `setup`, `add`, `remove` and `sync` add a project while it has a `.agents/preset.txt` and drop it once it hasn't. `update` skips a listed folder that's missing (delete its line if the project is gone) or a checkout without `.agents/preset.txt`, such as another branch; it doesn't drop either. It lists each project once, as its git top level, and rewrites the file in that form, so comments in it aren't kept. Windows and WSL have separate homes, so each keeps its own list. If a project can't be refreshed, `update` goes on with the others and exits with an error at the end.

If the pull hits a conflict, nothing is installed. Resolve the conflict in the repo, then run `agents update` again.

Linked files are live: `~/.claude/settings.json` is the repo's file. When you have uncommitted edits in a file that the pull also changes, bringing the autostash back can conflict and leave conflict markers in it, which breaks the tool until it's fixed. Before updating, compare `git diff --name-only` with `git fetch && git diff --name-only HEAD..@{u}`. For each file in both:
1. Copy it somewhere outside the repo.
2. `git checkout -- <file>`, then `agents update`.
3. Merge your copy into the new version by hand, check it (for JSON, that it parses), and write it back in one step.

With an environment of its own, a machine edits only its own settings file, so this rarely happens.

Without the `agents` command, you can still update with `~/Agents/install.sh --update` (Linux/WSL) or `install.ps1 -Update` (Windows).

## Uninstall

```bash
~/Agents/install.sh --uninstall               # Linux / WSL
```

```powershell
powershell -ExecutionPolicy Bypass -File $HOME\Agents\install.ps1 -Uninstall   # Windows
```

This removes only the links, copies, generated files and shims that come from this repo. To remove the preset from a project, run `agents setup` and choose `none`.
