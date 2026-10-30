# Session diagnosis: <session-id>

Report path: ~/.agents/diagnoses/<session-id>/report.md
Written: <ISO timestamp>

## 1. Problem statement (required)

<Copied from the case file.>

## 2. Triage verdict (required)

<What the evidence shows happened around the reported problem. Prose, with `path:line` after every claim. State confidence (high / medium / low) and what would raise it. No statement about what any skill, plugin or instruction file should do.>

## 3. Environment (required)

- OS and shell:
- Harness and version:
- Models seen:
- Installed skill folders and agent preset version:
- Skill and instruction files read or injected (sha1 table from the case file):
- Other plugins, extensions, MCP servers:
- Instruction files present (paths only):

Label every field and skill observation as historical evidence, unverified snapshot, current observation, or unknown, with its supporting location.

## 4. Sessions examined (required)

| Role | Session id | Absolute path | Lines | Bytes |
|---|---|---|---|---|

Rejected candidates: <id — path — why>, or "none".

## 5. Timeline (required)

One row per human-typed prompt. Events lists skills invoked, subagents dispatched, compactions, errors, resumes and aborts.

| Turn | Line | Time | Request (one line) | Events |
|---|---|---|---|---|

## 6. Findings (required, one subsection per dimension)

Each finding:

```
- finding: <one sentence>
  evidence: <path:line> — "<short quote>"
  turns: <first>–<last>
  confidence: high | medium | low
```

A dimension with nothing to report says `none found — checked: <what was checked>`.

### 6.1 Skill timeline
### 6.2 Plan adherence
### 6.3 Repeated work
### 6.4 Stumbles
### 6.5 Quality evidence
### 6.6 Request conflicts
### 6.7 Cost and time
### 6.8 Plugins, MCP servers and hooks used

## 7. Instruction involvement (required)

One row per skill, plugin or instruction file that shaped the session.

| Source | Maintainer | Involvement | Evidence lines |
|---|---|---|---|
| <skill, plugin or file path> | <this preset / this project / third party: repo> | not indicated / possible / likely | <path:line list> |

This section states involvement only. It doesn't name a defect or propose a change.

## 8. Coverage notes (required)

- Not read: <ranges, files, and why>
- Harness features unavailable: <list or none>
- Session was in progress at read time: yes / no
- For the user to double-check: <list or none>

## 9. Similar sessions (only when requested)

| Session id | Path | Date | Harness | Matched | Did not match |
|---|---|---|---|---|---|
