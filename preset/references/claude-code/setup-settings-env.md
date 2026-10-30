---
description: Claude Code install on Windows/WSL, auto-update controls, example settings.json files, and the key environment variables (config dir, Git Bash, effort, compaction, model, telemetry, proxy, scrub); read before editing settings.json or install scripts.
---

# Claude Code: Setup, Settings and Environment Variables

Source: Claude Code docs, checked 2026-10-30. Each section links to the exact doc section.

## Windows: native vs WSL
- Native Windows: run `irm https://claude.ai/install.ps1 | iex` (PowerShell) or `curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd` (CMD). No Administrator needed. Sandboxing is not supported.
- Git for Windows is optional; it provides Git Bash, which the Bash tool and Monitor tool need. Without it, shell commands run through the PowerShell tool.
- If Claude Code can't find Git Bash, set `CLAUDE_CODE_GIT_BASH_PATH` in the `env` block of settings.json (example below).
- With Git for Windows installed, the PowerShell tool is available alongside Bash (on by default for claude.ai and Console accounts; `CLAUDE_CODE_USE_POWERSHELL_TOOL=1` enables it on Bedrock/Agent Platform/Foundry, `0` turns it off).
- WSL: open the distribution and run the Linux installer `curl -fsSL https://claude.ai/install.sh | bash`. Install and launch `claude` inside the WSL terminal, not from PowerShell or CMD. WSL 2 supports sandboxing; WSL 1 does not. WSL setups do not need Git for Windows.
- Example:
  ```json
  { "env": { "CLAUDE_CODE_GIT_BASH_PATH": "C:\\Program Files\\Git\\bin\\bash.exe" } }
  ```
- In this preset: Windows and WSL each have their own `~/.claude` and are installed separately (run `install.ps1` on Windows, `install.sh` inside WSL).
- In this preset: the `agents` command on Windows runs through Git Bash and respects `CLAUDE_CODE_GIT_BASH_PATH`.
Source: [Advanced setup › Install on native Windows](https://code.claude.com/docs/en/setup#install-on-native-windows), [Advanced setup › Install in WSL](https://code.claude.com/docs/en/setup#install-in-wsl)

## Verify and uninstall
- `claude --version` prints e.g. `2.1.211 (Claude Code)`. `claude doctor` prints read-only install and settings diagnostics (settings-file validation errors, last update attempt) without starting a session.
- Config to remove for a full uninstall: `~/.claude`, `~/.claude.json`, project `.claude/` and `.mcp.json`. On Windows: `$env:USERPROFILE\.claude` and `$env:USERPROFILE\.claude.json`. Native binary lives in `~/.local/bin/claude(.exe)` and `~/.local/share/claude`.
- The VS Code extension, JetBrains plugin, and Desktop app also write to `~/.claude/` and recreate it.
Source: [Advanced setup › Verify your installation](https://code.claude.com/docs/en/setup#verify-your-installation), [Advanced setup › Remove configuration files](https://code.claude.com/docs/en/setup#remove-configuration-files)

## Auto-updates
- Native installs check on startup and periodically; updates download in the background and take effect on next start. `claude update` applies one immediately.
- macOS/Linux launcher: `~/.local/bin/claude` symlinks into `~/.local/share/claude/versions/`. A custom launcher is left in place; remove it and run `claude update` to hand control back.
- Homebrew, WinGet, apt, dnf, apk do not auto-update. Upgrade with `brew upgrade claude-code` / `winget upgrade Anthropic.ClaudeCode`. `CLAUDE_CODE_PACKAGE_MANAGER_AUTO_UPDATE=1` makes Claude Code run the Homebrew/WinGet upgrade in the background (WinGet may fail while running because Windows locks the exe).
- npm: `npm install -g @anthropic-ai/claude-code` (Node.js 22+); never `sudo`; upgrade with `npm install -g @anthropic-ai/claude-code@latest`, not `npm update -g`.
Source: [Advanced setup › Auto-updates](https://code.claude.com/docs/en/setup#auto-updates)

## Release channel, version floor, disabling updates
- `autoUpdatesChannel`: `"latest"` (default) or `"stable"` (about one week old, skips releases with major regressions). Also via `/config` → **Auto-update channel**. Homebrew picks channel by cask (`claude-code` = stable, `claude-code@latest` = latest).
- Installer channel/version: `bash -s stable`, `bash -s 2.1.89`; PowerShell `& ([scriptblock]::Create((irm https://claude.ai/install.ps1))) stable`. The install-time channel becomes the auto-update default.
- `minimumVersion`: floor that auto-update and `claude update` won't go below (prevents downgrade on switching to stable). In managed settings it is org-wide and can't be overridden. `requiredMinimumVersion` / `requiredMaximumVersion` (managed) make Claude Code refuse to start outside a range.
- `DISABLE_AUTOUPDATER=1` stops only the background check (`claude update`/`claude install` still work); `claude doctor` then shows `disabled (set by env: DISABLE_AUTOUPDATER)`. `DISABLE_UPDATES=1` blocks all update paths.
- Example:
  ```json
  { "autoUpdatesChannel": "stable", "minimumVersion": "2.1.100", "env": { "DISABLE_AUTOUPDATER": "1" } }
  ```
Source: [Advanced setup › Configure release channel](https://code.claude.com/docs/en/setup#configure-release-channel), [Pin a minimum version](https://code.claude.com/docs/en/setup#pin-a-minimum-version), [Disable auto-updates](https://code.claude.com/docs/en/setup#disable-auto-updates)

## Example: personal settings (`~/.claude/settings.json`)
- Applies to every project. Settings files accept no comments (valid JSON only).
- Keys shown: `model`, `modelSettings` (per-model `effortLevel`; `/effort` saves a level per model, `--effort` sets one per session), `editorMode` (`"vim"`), `theme`, `statusLine` (`type: "command"`, `command`, `padding`), `spinnerTipsEnabled`, `preferredNotifChannel` (`"terminal_bell"`), `permissions.allow`, `autoUpdatesChannel`, `cleanupPeriodDays` (deletes transcripts/local session data older than N days).
- Example:
  ```json
  {
    "model": "claude-sonnet-5",
    "modelSettings": { "claude-sonnet-5": { "effortLevel": "xhigh" } },
    "permissions": { "allow": ["Bash(git diff *)", "Read(~/.zshrc)"] },
    "autoUpdatesChannel": "stable",
    "cleanupPeriodDays": 20
  }
  ```
- In this preset: `tools/claude/settings.json` is linked to `~/.claude/settings.json` (or `$CLAUDE_CONFIG_DIR/settings.json`), so it is the user-scope file above.
Source: [Example settings files › Your own settings](https://code.claude.com/docs/en/settings-example#your-own-settings)

## Example: team settings (`.claude/settings.json`, committed)
- Keys shown: `permissions.allow` / `ask` / `deny`, `hooks.PreToolUse` (command `${CLAUDE_PROJECT_DIR}/.claude/hooks/block-rm.sh`), `extraKnownMarketplaces`, `enabledPlugins` (`"name@marketplace": true`), `sandbox` (`enabled`, `filesystem.allowWrite`, `network.allowedDomains`), `plansDirectory`.
- Allow rules and `extraKnownMarketplaces` take effect only after each person trusts that folder itself; deny and ask rules always apply.
- OpenTelemetry exporter variables are ignored in repository settings (except values that turn telemetry off); put them in managed or `~/.claude/settings.json`.
- Rules match command/path as written: `Bash(git push *)` doesn't match `git -C . push`; `Read(./.env)` doesn't stop `grep -r` over the directory unless the sandbox is enabled (sandbox adds `Read` deny paths).
- Cloud sessions with one repository read the committed file too.
Source: [Example settings files › A team's shared settings](https://code.claude.com/docs/en/settings-example#a-teams-shared-settings)

## Example: managed settings (`managed-settings.json`)
- Deployed as a file, via MDM, or server-managed settings; one file applies to every machine/account it reaches (no per-group policy in server-managed yet).
- Keys shown: `forceLoginMethod`, `forceLoginOrgUUID`, `availableModels` + `enforceAvailableModels`, `permissions.deny`, `permissions.disableBypassPermissionsMode: "disable"`, `allowManagedPermissionRulesOnly`, `allowedMcpServers` (match by `serverUrl`) + `allowManagedMcpServersOnly`, `strictKnownMarketplaces`, `sandbox.failIfUnavailable`, `sandbox.allowUnsandboxedCommands: false`, `sandbox.network.allowManagedDomainsOnly`, `requiredMinimumVersion`, `cleanupPeriodDays`, `companyAnnouncements`.
Source: [Example settings files › An organization's managed settings](https://code.claude.com/docs/en/settings-example#an-organizations-managed-settings)

## Setting environment variables
- Shell: `export VAR=...` (macOS/Linux/WSL; persist in `~/.bashrc`/`~/.zshrc`), `$env:VAR = "..."` (PowerShell; persist with `[Environment]::SetEnvironmentVariable("VAR", "...", "User")`), `set VAR=...` / `setx VAR "..."` (CMD). Shell vars are read at startup only.
- Settings: `env` key in settings.json; applies however `claude` is launched. Saved changes are reapplied to a running session (startup-only features like OpenTelemetry keep old values); removing a var takes effect on next launch.
- Values are copied as written, not shell-expanded: `~` and `$HOME` stay literal. Use absolute paths, e.g. `"CLAUDE_CONFIG_DIR": "/home/you/.claude-work"`.
- Scope: `~/.claude/settings.json` (you, all projects), `.claude/settings.json` (team, committed), `.claude/settings.local.json` (you, this project, gitignored when Claude Code writes it), managed settings (organization).
Source: [Environment variables › Set environment variables](https://code.claude.com/docs/en/env-vars#set-environment-variables)

## Precedence
- Same variable in shell and settings `env`: the settings value applies in most sessions (written over the inherited value).
- Between settings files, `env` follows settings precedence (managed overrides user/project). Project and local settings can't set some variables, e.g. `CLAUDE_CONFIG_DIR` and OpenTelemetry exporter variables.
- A settings file can't unset a variable; set it to `""` to neutralize it (e.g. `"CLAUDE_CODE_USE_VERTEX": ""`); subprocesses still inherit the empty value.
- `ANTHROPIC_MODEL` beats the `model` setting; `--model` and `/model` beat `ANTHROPIC_MODEL`. `CLAUDE_CODE_EFFORT_LEVEL` beats `--effort` and `/effort`.
Source: [Environment variables › Precedence](https://code.claude.com/docs/en/env-vars#precedence)

## Key variables: config, shell, platform
- `CLAUDE_CONFIG_DIR`: overrides config dir (default `~/.claude`); all settings, session history, plugins live under it. Use for multiple accounts (`alias claude-work='CLAUDE_CONFIG_DIR=~/.claude-work claude'`). Set in shell, user, or managed settings; ignored in project/local settings.
- `CLAUDE_CODE_GIT_BASH_PATH`: Windows only; path to `bash.exe`. If the path doesn't exist or the file isn't named `bash.exe`/`sh.exe`/`bash`/`sh`, it is ignored and Git Bash is auto-detected (warning visible with `--debug`; before v2.1.219 Claude Code exited instead).
- `CLAUDE_CODE_USE_POWERSHELL_TOOL`: Windows without Git Bash: on automatically, `0` disables. Linux/macOS/WSL: `1` enables, needs `pwsh` on `PATH`.
- `CLAUDE_CODE_SHELL`: path to a `bash` or `zsh` binary for the Bash tool; otherwise auto-detects from `$SHELL`, then `PATH`.
- `CLAUDE_CODE_TMPDIR`: internal temp dir (appends `/claude/` on Windows); ignored in project/local settings.
- `CLAUDE_ENV_FILE`: script sourced before each Bash command (persist venv/conda activation).
- `BASH_DEFAULT_TIMEOUT_MS` (default 120000) / `BASH_MAX_TIMEOUT_MS` (default 600000): Bash/PowerShell tool timeouts. `MCP_TIMEOUT`: MCP server startup (default 30000).
- `CLAUDE_CODE_SIMPLE=1`: minimal prompt, only Bash/read/edit tools, no auto-discovery of hooks/skills/CLAUDE.md etc.; same as `--bare`.
Source: [Environment variables › Variables](https://code.claude.com/docs/en/env-vars#variables)

## Key variables: model, effort, thinking, compaction
- `ANTHROPIC_MODEL`; `ANTHROPIC_DEFAULT_OPUS_MODEL` / `_SONNET_MODEL` / `_HAIKU_MODEL` (what aliases resolve to; haiku also used for background work); `CLAUDE_CODE_SUBAGENT_MODEL` (default for subagents/teammates/workflow agents without another model; an agent definition's `model` and the spawn-time model win; `inherit` = unset).
- `CLAUDE_CODE_EFFORT_LEVEL`: `low`/`medium`/`high`/`xhigh`/`max`; beats `--effort`, `/effort`, `modelSettings`, `effortLevel`; `maxEffortLevel` cap still applies; `auto`/`unset` sends no effort.
- `MAX_THINKING_TOKENS`: fixed thinking budget; `0` disables thinking on the Anthropic API (not on Opus 5.5, Sonnet 5.5, Haiku 5.5, Fable). Positive values are ignored on adaptive-reasoning models unless `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING=1` (only affects Opus/Sonnet 4.6).
- `CLAUDE_CODE_MAX_OUTPUT_TOKENS`: max output tokens; raising it shrinks the effective context before auto-compaction.
- `DISABLE_AUTO_COMPACT=1`: no automatic or idle compaction (`/compact` still works; overrides `autoCompactEnabled`). `DISABLE_COMPACT=1`: disables all compaction including `/compact`.
- `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`: 1-100, can only lower the trigger percentage. `CLAUDE_CODE_AUTO_COMPACT_WINDOW`: window `100000`-`1000000` tokens.
Source: [Environment variables › Variables](https://code.claude.com/docs/en/env-vars#variables)

## Key variables: auth, network, telemetry
- `ANTHROPIC_API_KEY`: sent as `X-Api-Key`; overrides subscription login (always in `-p`; interactive asks once). `ANTHROPIC_BASE_URL`: route via proxy/gateway (disables Remote Control for non-`api.anthropic.com` hosts).
- `HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY`: standard proxy settings.
- `DISABLE_TELEMETRY`, `DISABLE_ERROR_REPORTING`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`: any non-empty value opts out, including `0`/`false`; unset to re-enable. Nonessential-traffic also disables auto-updates, `/feedback`, release notes, and feature-flag fetching (so Remote Control is unavailable); `DISABLE_TELEMETRY` also disables feature-flag fetching.
- `CLAUDE_CODE_ENABLE_TELEMETRY=1`: enables OpenTelemetry; required before OTel exporters. Ignored in project/local settings, as are `OTEL_LOG_USER_PROMPTS` etc. (except off values).
Source: [Environment variables › Variables](https://code.claude.com/docs/en/env-vars#variables)

## Subprocess environment scrub
- `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB=1` strips credentials from Bash commands, hooks, and stdio MCP servers; Claude Code keeps them for its own API calls. Detects by name or value shape; use alongside permission rules.
- Removed: `ANTHROPIC_API_KEY`, `AWS_SECRET_ACCESS_KEY`, credential-looking names (`NPM_TOKEN`, `DB_PASSWORD`), password-bearing values (`DATABASE_URL`), and `CLAUDE_CONFIG_DIR`. `PIP_INDEX_URL`/`NPM_CONFIG_REGISTRY` keep the URL minus user/password.
- Kept: `GITHUB_TOKEN`, `GH_TOKEN`, `GH_ENTERPRISE_TOKEN`, `GITHUB_ENTERPRISE_TOKEN`, `HTTP_PROXY`, `HTTPS_PROXY` (incl. credentials), `GIT_CONFIG_COUNT`/`GIT_CONFIG_KEY_<n>`/`GIT_CONFIG_VALUE_<n>`, non-credential-looking secrets.
- On Linux, Bash subprocesses run in an isolated PID namespace (`ps`, `pgrep`, `kill` can't see host processes).
- In this preset: installers respect `CLAUDE_CONFIG_DIR`, but with the scrub on, commands run from inside a session (Bash tool, hooks) do not receive it.
Source: [Environment variables › What the subprocess environment scrub removes](https://code.claude.com/docs/en/env-vars#what-the-subprocess-environment-scrub-removes)
