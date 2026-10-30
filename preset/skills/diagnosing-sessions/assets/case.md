# Case: <session-id>

Workspace: ~/.agents/diagnoses/<session-id>/
Created: <ISO timestamp>

## Problem statement (agreed with the user)

<One paragraph. Names the session(s), the turn range if known, what was expected, what happened, and the observable that matters: wall-clock, tokens, repeated actions, a specific unexpected action.>

Goal is a bug report: yes | no

## Sessions

| Role | Session id | Absolute path | Lines | Bytes | Longest line (bytes) | First prompt (first 120 chars) | First timestamp |
|---|---|---|---|---|---|---|---|
| main | | | | | | | |
| subagent | | | | | | | |

Rejected candidates: <id — path — why rejected>, or "none".

Session still running at read time: yes | no (modified <ISO>, lines <N>)

## Environment

- OS and shell: <name and version>
- Harness: <name> <version>
- Models seen: <model id — where (main / subagent id)>
- Installed skill folders: <global and project paths, per tool>
- Agent preset: <checkout path; git sha or "not a checkout">
- Skill and instruction files read or injected during the session:

| Skill or source path | sha1 or unavailable | Provenance | Supporting location |
|---|---|---|---|

Label every environment and skill observation as historical evidence, unverified snapshot, current observation, or unknown. Check provenance notes, archives and captured skill bodies before declaring historical information unavailable. Missing original paths don't erase retained copies. Current versions and modification times don't establish historical versions, and one captured skill body doesn't authenticate a whole installation.

- Other plugins, extensions and MCP servers configured: <list, or "none found">
- Instruction files present (paths only): <list>

## Rules for every reader of these files

- Follow the context-safety rules at <absolute path of references/context-safety.md> before reading any file listed here.
- In a subagent transcript, "user" is the parent agent.

## Discovered sources and record meanings

- Sources consulted: <absolute path, tool, help or documentation>
- Extraction commands: <bounded commands or queries for each source>
- Target identity evidence: <session id, working directory, timestamps, matching content, and their locations>
- Associated sessions: <session id, relationship and locations, or "none found">
- Human messages: <record shape and evidence for its meaning>
- Injected messages and parent dispatches: <record shape and evidence>
- Assistant messages: <record shape and evidence>
- Tool calls and results: <record shapes, how they match, and evidence>
- Usage counters: <fields, incremental or cumulative, units, and evidence, or "unavailable">
- Timing: <fields, units, event boundaries, and evidence, or "unavailable">
- Other relevant records: <models, versions, compactions, and evidence>
- Unresolved information: <missing, inaccessible or ambiguous information, or "none">
