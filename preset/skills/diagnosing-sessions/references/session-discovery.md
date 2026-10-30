# Discover the session history

Resolve the session the user named with the tools and information available in this environment. Your knowledge can suggest where to look; verify the result against the actual history.

Use the harness's own session tools, its configured storage, local help, documentation, or bounded filesystem inspection. Measure files before reading their content (see the context-safety rules). Inspect archives or indexes when the environment points to them. A usable path the user supplied needs no further search.

## Known locations

Starting points only. Formats and paths change between versions, so confirm each one on disk.

- **Claude Code:** `~/.claude/projects/<working directory, separators replaced by ->/<session-id>.jsonl`, with subagent transcripts in a folder named after the session.
- **Codex:** `$CODEX_HOME/sessions/<yyyy>/<mm>/<dd>/rollout-<timestamp>-<id>.jsonl`, where `CODEX_HOME` defaults to `~/.codex`.
- **GitHub Copilot:** in VS Code, chat sessions are stored per workspace under VS Code's `workspaceStorage/<hash>/`. The Copilot CLI keeps its sessions under `~/.copilot/`.
- On Windows, `~` is `%USERPROFILE%`. Record each path in the form the harness itself uses.

## Confirm identity

Confirm identity with the session id, working directory, timestamps and matching conversation content. Recency alone is not confirmation. Tell the requested session apart from its children and from unrelated candidates. When the evidence can't tell them apart, ask the user for the missing identifying fact.

For each filesystem source, get its full absolute path from the environment, with `~` and variables expanded. Use that same path in the case file and in what you tell the user.

## Establish record meanings

From observed records or documentation, establish what the investigation needs:

- which records are human messages, and which are injected messages, tool results or a parent agent's dispatch
- how tool calls match their results
- what the usage counters mean (incremental or cumulative, units) before you total anything
- timestamp fields and event boundaries, and which records mark compactions

Don't infer a format from another harness, and don't turn a missing field into a zero.

## Record it

Write into the case file the exact sources, the field meanings, the extraction commands, where the supporting records are, associated sessions, rejected candidates, and anything unresolved. Later readers use that record instead of repeating discovery. If the history is missing, inaccessible or ambiguous, state the specific limitation and ask the user for the missing path, export or identifying detail.
