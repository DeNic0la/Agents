# Session sources

How to find and verify a session's transcripts, and how to search the parts that aren't in your context. Read it in step 2 of the retro.

## The evidence script

```sh
node <this skill's folder>/scripts/session-evidence.mjs --host <claude|codex|cursor> --cwd <absolute working directory> [--session <id-or-absolute-path>]...
```

Add one `--session` for each session the user named or the host reports. Without one, the script uses the host's session id from the environment (`CLAUDE_SESSION_ID`, `CODEX_SESSION_ID` or `CODEX_THREAD_ID`, `CURSOR_SESSION_ID`) and reports a gap when there is none. It only reads: it prints one JSON object to stdout with `sessions` (each a source `path` and normalized `user`, `assistant`, `tool-error` and `summary` records with line numbers) and `gaps`. A transcript is accepted only when its recorded working directory is the `--cwd` folder or inside it.

| Host | Verified source |
|---|---|
| Claude Code | `~/.claude/projects/`, or `$CLAUDE_CONFIG_DIR/projects/`, plus `<stem>/subagents/` beside the verified `.jsonl` file |
| Codex | `~/.codex/sessions/`, or `$CODEX_HOME/sessions/` |
| Cursor | The explicit transcript path, then the current session id under the current workspace's `~/.cursor/projects/<workspace-slug>/agent-transcripts/<session-id>/<session-id>.jsonl`, plus only that session's `subagents/*.jsonl` and `compaction/*` |

Other hosts (GitHub Copilot, for example) have no adapter: read the session's logs yourself if the user points you at them, and name the gap.

## Picking the right session

- Identify the session from a host-provided path or session metadata, then verify its working directory and recent user messages.
- Modification time only narrows candidates: another session running at the same time may have written last. After a resume, a transcript's file name can differ from the reported session id.
- Never pick the newest file by itself, scan another Cursor workspace, or query Cursor's `state.vscdb` or `conversation-search.db`.
- Logs the user hands you are valid only when the script can verify their host and workspace.
- If the script fails or reports a gap, review the context you do have, name the exact gap, and don't claim the retrospective is complete.

## Searching what your context lacks

Your context holds at most the current main thread since its last compaction. Dispatch one fresh reader (a subagent with a fresh context window) to search the rest and return only friction excerpts: errors, denials, retries and corrections, each with its source path and line. Give it the normalized records and the source paths. Without subagents, search them yourself.

For Claude Code, this direct query is a valid fallback; it prints failed tool calls as `file:line text`:

```sh
jq -rc 'input_line_number as $n | .message.content? | arrays[] | select(.type=="tool_result" and .is_error==true) | "\(input_filename):\($n) \(.content|tostring|.[0:300])"' <file>...
```

Count repeated mistakes across all sources before step 4 judges whether they recur. Done when every source outside your context has been searched, or the verified session has no compaction and no child transcripts.
