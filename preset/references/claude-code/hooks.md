---
description: Claude Code hooks reference (events, matchers, exit codes, JSON output, Windows/PowerShell execution, settings.json for format/notify/protect/test hooks); read before writing or registering a Claude Code hook.
---

# Claude Code Hooks

Source: Claude Code docs, checked 2026-10-30. Each section links to the exact doc section.

## Hook lifecycle and events
- Three levels in settings: event key (e.g. `PreToolUse`) -> matcher group (`"matcher"`) -> handler array (`"hooks"`). All events are siblings inside one top-level `"hooks"` object.
- Cadences: per session `SessionStart`/`SessionEnd`; per turn `UserPromptSubmit`, `Stop`, `StopFailure`; per tool call `PreToolUse`/`PostToolUse` (skipped for `EndConversation`).
- Other events: `Setup`, `UserPromptExpansion`, `PermissionRequest`, `PermissionDenied`, `PostToolUseFailure`, `PostToolBatch`, `Notification`, `MessageDisplay`, `SubagentStart`, `SubagentStop`, `TaskCreated`, `TaskCompleted`, `TeammateIdle`, `InstructionsLoaded`, `ConfigChange`, `CwdChanged`, `DirectoryAdded`, `FileChanged`, `WorktreeCreate`, `WorktreeRemove`, `PreCompact`, `PostCompact`, `PreModelSwitch`, `PostModelSwitch`, `Elicitation`, `ElicitationResult`.
- Handler `type`: `command` (stdin JSON), `http` (POST body), `mcp_tool`, `prompt` (single-turn LLM), `agent` (experimental, tool-using subagent).
- Matching hooks run in parallel; an identical handler defined in several settings files runs once.
- Common input fields: `session_id`, `prompt_id`, `transcript_path`, `cwd`, `scratchpad_dir`, `permission_mode` (`default`/`plan`/`acceptEdits`/`auto`/`dontAsk`/`bypassPermissions`), `effort.level`, `hook_event_name`. Tool events add `tool_name`, `tool_input`.
- Env vars on spawned process: `CLAUDE_PROJECT_DIR`, `CLAUDE_PLUGIN_ROOT`, `CLAUDE_PLUGIN_DATA`; `CLAUDE_CODE_REMOTE="true"` in remote web environments.
- Locations: `~/.claude/settings.json` (all projects), `.claude/settings.json` (committed), `.claude/settings.local.json`, managed policy, plugin `hooks/hooks.json`, skill/subagent frontmatter. `"disableAllHooks": true` disables (not managed hooks). `/hooks` browses them.
Source: [Hooks reference › Hook lifecycle](https://code.claude.com/docs/en/hooks#hook-lifecycle)

## Matchers and handler fields
- `"*"`, `""` or omitted = all; letters/digits/`_`/`-` with `|` or `,` = exact names (`Edit|Write`); any other character = JavaScript regex (`mcp__memory__.*`). Case-sensitive.
- Matcher field per event: tool name (tool events); `startup|resume|clear|compact|fork` (`SessionStart`); notification type (`Notification`); agent type (`SubagentStart/Stop`); `manual|auto` (`PreCompact/PostCompact`); MCP server name (`Elicitation`, `ElicitationResult`); canonical target model (`PreModelSwitch/PostModelSwitch`).
- `if`: one permission rule, e.g. `"Bash(git *)"`, `"Edit(*.ts)"`; only on `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest`, `PermissionDenied` (elsewhere the hook never runs). No `&&`/lists.
- Common fields: `type`, `if`, `timeout` (seconds), `statusMessage`, `once` (skill frontmatter only).
- Command fields: `command`, `args` (exec form), `async`, `asyncRewake`, `shell` (`"bash"`|`"powershell"`), `onFailure` (`"continue"`|`"block"`, v2.1.295+).
- Default timeouts: 600s `command`/`http`/`mcp_tool` (30s on `UserPromptSubmit`, `PreModelSwitch`, `PostModelSwitch`; 10s on `MessageDisplay`); 30s `prompt`; 60s `agent`; `SessionEnd` shares a 1.5s budget (raised to a longer per-hook `timeout`, max 60s).
Source: [Hooks reference › Hook handler fields](https://code.claude.com/docs/en/hooks#hook-handler-fields)

## Exit codes and JSON output
- Exit 0: no objection (does not approve a `PreToolUse` call; normal permission flow applies). Stdout added to context for `UserPromptSubmit`, `UserPromptExpansion`, `SessionStart`, `PostModelSwitch`.
- Exit 2: block; stderr is the reason. Blockable: `PreToolUse`, `UserPromptSubmit`, `UserPromptExpansion`, `Stop`, `SubagentStop`, `TeammateIdle`, `TaskCreated`, `TaskCompleted`, `ConfigChange`, `PostToolBatch`, `PreCompact`, `PreModelSwitch`, `Elicitation`, `ElicitationResult`, `WorktreeCreate/Remove` (any non-zero fails). Not blockable: `PermissionRequest` (use `decision` object), `PostToolUse` (stderr to Claude), `Notification` (ignored), `SessionStart` (stderr to user).
- Other codes (e.g. 1): non-blocking error, action proceeds, unless `onFailure: "block"`. Use `exit 2` for enforcement.
- Structured: exit 0 and print one JSON object. Universal: `continue`, `stopReason`, `systemMessage`. `PreToolUse`: `hookSpecificOutput.permissionDecision` (`allow`/`deny`/`ask`/`defer`), `permissionDecisionReason`, `updatedInput`. `PostToolUse`/`SessionStart`: `additionalContext`. `Stop`/`SubagentStop`/`UserPromptSubmit`/`PostToolUse`: top-level `"decision": "block"` + `reason`.
- A hook `"deny"` holds in every permission mode, including `bypassPermissions`; a hook `"allow"` cannot override settings deny rules.
Source: [Hooks reference › Exit code 2 behavior per event](https://code.claude.com/docs/en/hooks#exit-code-2-behavior-per-event)

## Windows, PowerShell and exec form
- Shell form (no `args`): command runs via `sh -c` on macOS/Linux, Git Bash on Windows, PowerShell when Git Bash isn't installed. `shell` overrides; ignored when `args` is set.
- Exec form (`args` present, even `[]`): `command` resolved on `PATH` and spawned with no shell; placeholders substituted as plain strings. Recommended when the command references a path placeholder.
- Windows exec form needs a real executable (`.exe`); `.cmd`/`.bat` shims (npx, eslint in `node_modules/.bin`) need shell form, or call `node` with the script path in `args`.
- `"shell": "powershell"` auto-detects `pwsh.exe`, falls back to `powershell.exe` (5.1); does not need `CLAUDE_CODE_USE_POWERSHELL_TOOL`.
- PowerShell paths: use `${CLAUDE_PROJECT_DIR}` or `$env:CLAUDE_PROJECT_DIR` inside double quotes; bare `$CLAUDE_PROJECT_DIR` resolves to `$null`. Example: `"command": "& \"$env:CLAUDE_PROJECT_DIR\\.claude\\hooks\\check.ps1\""`.
- Without Git Bash, a failing/timed-out `PreToolUse`/`PermissionRequest` command hook blocks the call ("blocking because Git Bash wasn't found"); only exit 0 or 2 count. Fixes: install Git for Windows or set `CLAUDE_CODE_GIT_BASH_PATH`; add `onFailure`; set `"shell": "powershell"` for PowerShell guard hooks.
- A shell-form `command` that is only a quoted path makes PowerShell print it instead of running ("PowerShell started no program"); prefix `&` with `"shell": "powershell"`, or use exec form.
- Match `Bash|PowerShell` for shell-command guards: on Windows without Git Bash the Bash tool is not registered, so a `Bash`-only matcher never fires.
- Git Bash may source your profile (e.g. `BASH_ENV`); profile output on stdout corrupts hook JSON.
- WSL: the notification example needs `powershell.exe` on `PATH` via Windows interop.
- In this preset: hook scripts live in `preset/hooks/` and install to `~/.agents/hooks/`; Claude Code on Windows runs shell-form hooks through Git Bash, so write POSIX sh/bash, normalize `\` to `/` in paths, and register per tool (Claude: `settings.json`). Prefer exec form or quoted `"$HOME/.agents/hooks/x.sh"` paths.
Source: [Hooks reference › Exec form and shell form](https://code.claude.com/docs/en/hooks#exec-form-and-shell-form), [› Failed hooks on Windows without Git Bash](https://code.claude.com/docs/en/hooks#failed-hooks-on-windows-without-git-bash), [› Windows PowerShell tool](https://code.claude.com/docs/en/hooks#windows-powershell-tool), [› PowerShell](https://code.claude.com/docs/en/hooks#powershell)

## Limitations
- Command hooks talk only via stdout, stderr, exit codes; they can't trigger `/` commands or tool calls. `additionalContext` arrives as a system reminder.
- `PostToolUse` can't undo the tool action. `Stop` fires on every response end, not on user interrupts; API errors fire `StopFailure`.
- Multiple `PreToolUse` hooks returning `updatedInput` for the same tool are not merged; avoid.
- `PermissionRequest` hooks still run in `-p` mode outside `dontAsk`; undecided calls are denied.
- Debug: `claude --debug` writes `~/.claude/debug/<session-id>.txt`; test a script by piping sample JSON and checking `echo $?`. "command not found": use absolute paths or `${CLAUDE_PROJECT_DIR}`.
Source: [Automate actions with hooks › Limitations](https://code.claude.com/docs/en/hooks-guide#limitations)

## Limits on skill hooks
- Skill frontmatter hooks register only once the skill is invoked; `/hooks` won't list them before that.
- `strictPluginOnlyCustomization` (managed) locks hooks to plugins, bundled skills and managed-directory skills; user settings hooks don't run either. Check `/status` for `Enterprise managed settings`.
- v2.1.304+: per source (project, personal skills folder, each plugin) max 1,024 hooks and 16,384 matcher characters per session (a matcher counts once per hook under it). Over the limit, the skill registers none of its hooks; debug log says `registers none of its hooks`.
Source: [Hooks reference › Limits on skill hooks](https://code.claude.com/docs/en/hooks#limits-on-skill-hooks)

## Elicitation and ElicitationResult
- `Elicitation`: MCP server requests user input; matcher = MCP server name. Input: `mcp_server_name`, `message`, optional `mode` (`form`/`url`), `url`, `elicitation_id`, `requested_schema`.
- Output: exit 0 with `hookSpecificOutput.action` = `accept` (+ `content` keyed by schema properties), `decline`, or `cancel`; no output = show dialog. Exit 2 or top-level `"decision": "block"` declines. A decline from any hook wins. `reason`, `systemMessage`, `continue` are discarded.
- `ElicitationResult`: after the user responds; input adds `action`, optional `content`. Return `action` + full replacement `content` to change values; `decline` blocks. Runs on decline/cancel too, so check input `action == "accept"` before returning `accept`. Skipped when an `Elicitation` hook answered.
Source: [Hooks reference › Elicitation](https://code.claude.com/docs/en/hooks#elicitation)

## PreModelSwitch
- v2.1.251+. Fires for user/client-requested switches (`/model`, picker, `/config`, fast mode, SDK `set_model`); not for automatic fallback or resume restore (those reach `PostModelSwitch` only).
- Matcher: canonical target model name (aliases resolve; `[1m]` ignored), e.g. `claude-opus-4-6|claude-opus-5` or `.*opus.*`. Unknown canonical name -> every hook runs, so also check `to_model`.
- Input: `from_model`, `to_model`, `requested_model`, `source` (`command`/`picker`/`sdk`), `context_tokens`, `prompt_cache_warm`, `cache_ttl`, `estimated_cache_write_usd`, `pricing`.
- Exit 2 or `"decision": "block"` cancels. `permissionDecision`: `allow`/`deny`/`ask` (no `defer`/`updatedInput`/`additionalContext`); precedence `deny` > `ask` > `allow`; `ask` only works for interactive `/model`. Timeout (30s default) blocks the switch.
- Example (Windows exec form): `"command": "powershell.exe", "args": ["-NoProfile","-ExecutionPolicy","Bypass","-File","${CLAUDE_PROJECT_DIR}/.claude/hooks/block-opus-46.ps1"]`; script reads `[Console]::In.ReadToEnd() | ConvertFrom-Json`, writes to `[Console]::Error`, `exit 2`.
Source: [Hooks reference › PreModelSwitch](https://code.claude.com/docs/en/hooks#premodelswitch)

## Auto-format code after edits
- `PostToolUse` + `Edit|Write`, in project `.claude/settings.json`; requires `jq`. Silent on success. For files rewritten by `Bash`, use a `FileChanged` hook.
```json
{ "hooks": { "PostToolUse": [ { "matcher": "Edit|Write", "hooks": [
  { "type": "command", "command": "jq -r '.tool_input.file_path' | xargs npx prettier --write" } ] } ] } }
```
Source: [Automate actions with hooks › Auto-format code after edits](https://code.claude.com/docs/en/hooks-guide#auto-format-code-after-edits)

## Get notified when Claude needs input
- `Notification` event in `~/.claude/settings.json`; `"matcher": ""` = all types. Types: `permission_prompt`, `idle_prompt` (~60s idle), `auth_success`, `elicitation_dialog`, `elicitation_url_dialog`, `elicitation_complete`, `elicitation_response`, `agent_needs_input`, `agent_completed`, `quota_auto_resume_*`, `plugin_notification`.
- Commands per OS (each in `{"type":"command","command":...}` under `"Notification": [{"matcher":"","hooks":[...]}]`):
  - macOS: `osascript -e 'display notification \"Claude Code needs your attention\" with title \"Claude Code\"'` (Script Editor needs notification permission)
  - Linux: `notify-send 'Claude Code' 'Claude Code needs your attention'` (needs a notification daemon; `libnotify-bin`)
  - Windows: `powershell.exe -Command \"[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms'); [System.Windows.Forms.MessageBox]::Show('Claude Code needs your attention', 'Claude Code')\"` (a dialog, may open behind the terminal; under WSL needs `powershell.exe` via interop)
```json
{ "hooks": { "Notification": [ { "matcher": "", "hooks": [
  { "type": "command", "command": "notify-send 'Claude Code' 'Claude Code needs your attention'" } ] } ] } }
```
Source: [Automate actions with hooks › Get notified when Claude needs input](https://code.claude.com/docs/en/hooks-guide#get-notified-when-claude-needs-input)

## Block edits to protected files
- Script `.claude/hooks/protect-files.sh`: reads stdin, `jq -r '.tool_input.file_path // empty'`, normalizes Windows separators with `FILE_PATH="${FILE_PATH//\\//}"`, checks patterns `.env`, `package-lock.json`, `.git/`; on match prints `Blocked: ...` to stderr and `exit 2`, else `exit 0`.
- macOS/Linux: `chmod +x` the script (hook scripts must be executable).
```json
{ "hooks": { "PreToolUse": [ { "matcher": "Edit|Write", "hooks": [
  { "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/protect-files.sh" } ] } ] } }
```
Source: [Automate actions with hooks › Block edits to protected files](https://code.claude.com/docs/en/hooks-guide#block-edits-to-protected-files)

## Run tests after file changes
- `"async": true` (command hooks only) runs in background; cannot block or decide; `timeout` not enforced; output (`additionalContext`, `systemMessage`) delivered next turn; killed at teardown in `-p` mode. `asyncRewake` wakes Claude on exit 2.
- Script `.claude/hooks/run-tests-async.sh` (`chmod +x`): exits 0 unless `file_path` ends `.ts`/`.js`; runs `npm test 2>&1`; prints `jq -nc --arg msg "$MSG" '{hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: $msg}}'`.
```json
{ "hooks": { "PostToolUse": [ { "matcher": "Write|Edit", "hooks": [
  { "type": "command", "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/run-tests-async.sh",
    "args": [], "async": true } ] } ] } }
```
Source: [Hooks reference › Run tests after file changes](https://code.claude.com/docs/en/hooks#run-tests-after-file-changes)
