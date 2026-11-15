---
name: upload-diagnostics
description: Collect this machine's agent setup, CLI versions and Claude Code usage, and upload them to Google Drive as this machine's latest diagnostics.
argument-hint: "Machine label (default: the computer name), e.g. work"
disable-model-invocation: true
---

Collect diagnostics about this machine's AI agent setup and usage and add them to Google Drive, so a session on any machine can read them and tune this one. Each run adds a dated file: the newest is the current state, and older ones show the trend.

1. **Collect.** Run `node "<this skill's folder>/scripts/collect-diagnostics.js" --label "<label>"`, with the label from the argument (default: the computer name). It writes `agents-diagnostics-<label>-<date>.md` to the OS temp folder and prints its path, its size and a sha256 file reference for the upload. Without Node.js, say so, collect by hand what the script would (OS; versions of claude, codex, copilot, gh, git, node, python, pwsh; whether `~/.claude/CLAUDE.md` and `~/.agents/` exist) and write the same file.
2. **Check it before it leaves the machine.** Read the file. It must contain no secrets (tokens, keys, passwords, cookies, private URLs). By default the script writes aggregates only, with no project names, session titles or file contents. `--detail` adds project names and session titles; use it only when the user asks. Work computers often have rules about copying data to personal storage: on a work machine, if the user hasn't said this Drive is fine, ask before uploading.
3. **Upload** with the claude.ai Google Drive connector (load its tools with ToolSearch, such as `mcp__claude_ai_Google_Drive__search_files` and `mcp__claude_ai_Google_Drive__create_file`):
   1. Find the folder: `search_files` with the query `title = 'Agents diagnostics' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`. If there's none, create it with `create_file`: title `Agents diagnostics`, `contentMimeType` `application/vnd.google-apps.folder`.
   2. Create the report in it with `create_file`: the file name as `title`, the folder's id as `parentId`, `contentMimeType` `text/markdown`, `disableConversionToGoogleType` true, and `base64Content` set to the sha256 file reference the script printed. The app then reads the file itself, so the report doesn't pass through the conversation. If the reference is rejected, pass the file's text as `textContent` instead.
   The connector can't replace a file's content, so every run adds a file. Don't delete the older ones.
4. **Report** the file's link and three lines: the preset's install state, the CLIs with pending updates, and the biggest usage driver.

Without a Google Drive connector: leave the file in the temp folder, give the user its path, and tell them they can connect Google Drive in claude.ai (Settings, Connectors) and run this again, or upload the file by hand.

To read a machine's diagnostics from another machine: `search_files` with `title contains 'agents-diagnostics-<label>'`, ordered by `modifiedTime desc`, then read the newest file.
