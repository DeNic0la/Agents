---
description: Claude Code facts on skill locations, precedence, frontmatter, content lifecycle and supporting files, plus subagent configuration, AskUserQuestion and the PowerShell tool; read before writing or porting a skill or subagent for Claude Code.
---

# Claude Code: Skills, Subagents, Tools

Source: Claude Code docs, checked 2026-10-30. Each section links to the exact doc section.

## Skill locations
- Enterprise: `.claude/skills/<skill-name>/SKILL.md` in the managed settings directory.
- Personal: `~/.claude/skills/<skill-name>/SKILL.md`. Loads in all your projects on this machine, but not in Cowork or cloud sessions.
- Project: `.claude/skills/<skill-name>/SKILL.md`. Loaded from the starting directory and every parent up to the repository root.
- Nested: `<subdir>/.claude/skills/<skill-name>/SKILL.md`. Loads the first time Claude reads or edits a file in that subdirectory (or sooner via `/add-dir`).
- `--add-dir` directories: `.claude/skills/` inside them, for that session only.
- Plugin: `<plugin>/skills/<skill-name>/SKILL.md`, invoked as `/plugin-name:skill-name`.
- Skill folders can be symlinks; a skill reached through several locations loads once. Don't name a folder `synced`; `anthropic-skills` and `anthropic-skills:*` are reserved.
- Live reload: `~/.claude/skills/`, project `.claude/skills/` and `--add-dir` skill folders are watched, so edits apply without a restart. A top-level skills directory created mid-session needs `/reload-skills`.
Source: [Skills › Choose where skills load](https://code.claude.com/docs/en/skills#choose-where-skills-load)

## Skills that share a name
- Enterprise over personal, and personal over project. Example: `/deploy` runs the personal skill instead of the project one.
- Your skill over a bundled skill or a built-in command (local terminal): your skill replaces the command, but not its aliases.
- A skill and a file in `.claude/commands/`: the skill wins.
- Project-root skill and nested skill: both load. `/deploy` runs the root one, `/apps/web:deploy` runs the nested one.
- Plugin skill and any of the above: both load (plugin skills are namespaced).
- In this preset: every tailored skill's global `SKILL.md` has a "Repo version first" notice, because a personal skill (`~/.claude/skills/`) shadows a project skill with the same name.
Source: [Skills › Resolve skills that share a name](https://code.claude.com/docs/en/skills#resolve-skills-that-share-a-name)

## Skill frontmatter
- All fields are optional; only `description` is recommended. Unknown fields are ignored without error. Frontmatter is read only if the opening `---` is the first line.
- `name`: the `/` command name. Defaults to the directory name.
- `description`: what the skill does and when to use it; Claude uses it to decide when to apply the skill. If omitted, the first non-empty body line is used.
- `when_to_use`: extra trigger text appended to `description`. Together they are truncated at 1,536 characters in the skill listing.
- `argument-hint`, `arguments`: autocomplete hint; named positional args for `$name` substitution.
- `disable-model-invocation: true`: Claude can't load the skill automatically, and it can't be preloaded into subagents. `user-invocable: false`: hidden from the `/` menu.
- `allowed-tools`: tools Claude can use without asking during the invoking turn. It does not restrict the tool pool. The grant clears with your next message. Workspace trust doesn't gate it.
- `disallowed-tools`: tools removed from the pool while the skill is active; clears with your next message.
- `model` (accepts `inherit`), `effort` (`low`..`max`): apply to the current turn only.
- `context: fork`: runs the skill in a new subagent of type `agent` (default `general-purpose`; also `Explore`, `Plan` or a custom agent). The subagent gets the skill content as its prompt and not the conversation history. It runs in the background unless `background: false` is set.
- `hooks`, `paths` (globs limiting auto-activation), `shell` (`bash` default or `powershell` for `` !`command` `` blocks).
- `metadata`, `license`, `compatibility`: accepted but not acted on.
- Outside Claude Code (claude.ai uploads, Skills API, `package_skill.py`) only `name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools` are allowed. Any other key is a hard error: `Unexpected key(s) in SKILL.md frontmatter`.
- In this preset: the shared SKILL.md uses the Agent Skills spec fields `name`, `description`, `license`, `compatibility` and `metadata`. `allowed-tools` is a spec field too, but like the other runtime controls (`disallowed-tools`, `context`, `agent`, `model`, `effort`) it is opt-in through user overrides, never a shared default.
Source: [Skills › Frontmatter reference](https://code.claude.com/docs/en/skills#frontmatter-reference), [Using skill frontmatter outside Claude Code](https://code.claude.com/docs/en/skills#using-skill-frontmatter-outside-claude-code), [Run skills in a subagent](https://code.claude.com/docs/en/skills#run-skills-in-a-subagent), [Pre-approve tools for a skill](https://code.claude.com/docs/en/skills#pre-approve-tools-for-a-skill)

## Skill content lifecycle
- On invocation, the rendered `SKILL.md` enters the conversation as one message and stays across later turns. It is not re-read from disk, so write guidance as standing instructions, not one-time steps.
- Persistence covers the instructions, not the permissions: an `allowed-tools` grant clears when you send your next message.
- If Claude re-invokes a skill and the rendered content is identical, only a short "already loaded" note is added. If the content differs (new arguments or dynamic-context output), the full content is appended again.
- Auto-compaction re-attaches the most recent invocation of each skill after the summary, keeping the first 5,000 tokens of each, within a shared 25,000-token budget. The budget is filled from the most recently invoked skill, so older skills can be dropped entirely.
Source: [Skills › Skill content lifecycle](https://code.claude.com/docs/en/skills#skill-content-lifecycle)

## Supporting files
- A skill directory can hold extra files besides `SKILL.md`. Large references, specs and example sets then don't load into context every time the skill runs.
- They are not loaded automatically. Reference each one from `SKILL.md` so Claude knows what it contains and when to load it. Docs are "loaded when needed"; scripts are "executed, not loaded".
- Keep `SKILL.md` under 500 lines and move detailed reference material into separate files.
- Example layout: `my-skill/SKILL.md`, `reference.md`, `examples.md`, `scripts/helper.py`, linked from SKILL.md as `[reference.md](reference.md)`.
- In this preset: per-skill detail lives in `references/*.md` and is linked from SKILL.md, which matches this on-demand model.
Source: [Skills › Add supporting files](https://code.claude.com/docs/en/skills#add-supporting-files)

## Subagent locations and precedence
- When names collide, the higher-priority location wins: 1 managed settings, 2 `--agents` CLI flag (session only, JSON with `prompt` instead of a body), 3 `.claude/agents/` (project), 4 `~/.claude/agents/` (user), 5 plugin `agents/` (lowest).
- Note the order: project subagents beat user subagents. Skills use the opposite order (personal beats project).
- Project and user directories are scanned recursively (for example `agents/review/`). Identity comes only from `name`, not from the path.
- Files are watched. A restart is needed only for the first file in a new `agents` directory, or for agents under `--add-dir`.
- The Markdown body becomes the subagent's system prompt. The subagent gets that prompt plus basic environment details, not the Claude Code system prompt.
- In this preset: subagents are written once in Markdown (frontmatter plus body).
Source: [Sub-agents › Choose the subagent scope](https://code.claude.com/docs/en/sub-agents#choose-the-subagent-scope), [Write subagent files](https://code.claude.com/docs/en/sub-agents#write-subagent-files)

## Subagent frontmatter
- Required: `name` (unique, up to 256 characters, no `:`) and `description` (when to delegate; combined descriptions over 15,000 tokens trigger a startup warning). Multi-word fields are camelCase; misspelled fields are ignored silently.
- `tools`: allowlist (comma string or YAML list); if omitted, all subagent-available tools are inherited. `disallowedTools`: denylist, applied first when both are set. A tool that isn't available to subagents is never granted, even if listed in `tools`.
- `disallowedTools: Bash(git push *)` removes the whole tool. Use `permissions.deny` for command-level blocking. MCP patterns: `mcp__github__*`, `mcp__github`, `mcp__*`.
- `model`: `sonnet`, `opus`, `haiku`, `fable`, a full ID, or `inherit`. Resolution order: per-call `model` parameter, then frontmatter, then `CLAUDE_CODE_SUBAGENT_MODEL`, then the main model. `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1` forces the env model.
- `permissionMode`: `default`, `acceptEdits`, `auto`, `dontAsk`, `bypassPermissions`, `plan`, `manual`. `mcpServers`, `hooks` and `permissionMode` are ignored for plugin subagents.
- `skills`: full skill content injected at startup (preload, not an access limit; the `Skill` tool still works). Skills with `disable-model-invocation: true` can't be preloaded.
- Others: `maxTurns` (result marked partial, can be resumed), `memory` (`user`/`project`/`local`), `background`, `isolation: worktree`, `effort`, `color`, `initialPrompt`, `omitClaudeMd`, `autoCompactWindow`, `experimental.cacheTtl`.
- Always removed from subagents: `AskUserQuestion`, `EnterPlanMode`, `ExitPlanMode` (unless `permissionMode: plan`), `EndConversation`, `ScheduleWakeup`, `WaitForMcpServers`, `Workflow`. Background subagents (the default) keep only a fixed built-in set (`Read`, `Grep`, `Glob`, `Bash`, `Edit`, `Write`, `WebFetch`, ...) plus MCP tools.
- Nesting: up to 3 layers below the main conversation by default. `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=1` turns nesting off. Block a specific agent type with `permissions.deny: ["Agent(Explore)"]`.
- Example:
  ```yaml
  ---
  name: code-reviewer
  description: Reviews code for quality and best practices
  tools: Read, Glob, Grep
  model: sonnet
  ---
  ```
Source: [Sub-agents › Frontmatter reference](https://code.claude.com/docs/en/sub-agents#frontmatter-reference), [Control subagent capabilities](https://code.claude.com/docs/en/sub-agents#control-subagent-capabilities), [Choose a model](https://code.claude.com/docs/en/sub-agents#choose-a-model)

## AskUserQuestion
- Claude uses `AskUserQuestion` to ask multiple-choice questions when it needs a decision or a clarification. You answer by picking an option, or type free text in the `Other` row or the notes field. Free text is relayed with neutral wording so Claude follows it.
- Questions stay open until answered. `askUserQuestionTimeout` (`60s`, `5m`, `10m`; user `settings.json` or `/config`) auto-closes an idle question: options already selected are submitted and Claude proceeds on its own judgment.
- The timer pauses while the terminal window is focused. It never starts in background sessions, screen reader mode or Remote Control. Permission prompts never auto-resolve.
- `AskUserQuestion` is not available inside subagents (see above), so a skill run with `context: fork` can't ask the user questions.
Source: [Tools reference › AskUserQuestion tool behavior](https://code.claude.com/docs/en/tools-reference#askuserquestion-tool-behavior)

## PowerShell tool
- On Windows without Git Bash: enabled automatically. On Windows with Git Bash: on by default for claude.ai/Console accounts; Bedrock, Google Cloud's Agent Platform and Foundry need `CLAUDE_CODE_USE_POWERSHELL_TOOL=1`. `0` turns it off. On Linux, macOS and WSL it is opt-in and needs `pwsh` (7+) on `PATH`.
- Enable it with `{"env": {"CLAUDE_CODE_USE_POWERSHELL_TOOL": "1"}}` in `settings.json` or in the environment.
- Windows auto-detects `pwsh.exe`, falling back to `powershell.exe` (5.1). When enabled, PowerShell is the primary shell; Bash stays available for POSIX scripts if Git Bash is installed.
- Commands are spawned with `-ExecutionPolicy Bypass` at process scope. `CLAUDE_CODE_POWERSHELL_RESPECT_EXECUTION_POLICY=1` makes them respect the machine policy instead.
- On Windows with Git Bash, any Bash deny rule (even scoped, like `Bash(git push *)`) silently turns PowerShell off. Keep it on by setting `CLAUDE_CODE_USE_POWERSHELL_TOOL=1` or adding a `PowerShell(...)` permission rule.
- Hooks inspecting shell commands should match `Bash|PowerShell`. `"defaultShell": "powershell"` routes `!` commands through PowerShell; skill `shell: powershell` runs `` !`command` `` blocks in it (both need the tool enabled).
- Preview limits: PowerShell profiles are not loaded, and sandboxing is not supported on Windows.
Source: [Tools reference › Enable the PowerShell tool](https://code.claude.com/docs/en/tools-reference#enable-the-powershell-tool), [PowerShell tool](https://code.claude.com/docs/en/tools-reference#powershell-tool)
