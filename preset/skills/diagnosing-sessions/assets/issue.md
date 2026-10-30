Title: <skill or symptom>: <one-line observable> (<harness>)

- [x] I searched existing issues and this is not a duplicate (searched: <query terms>; closest: <#n title, or "none">)

## Who's filing this report?

<model and harness of this session>, filing on behalf of <how the user wants to be named, or "the user">, who asked: "<their request from this session that led to the diagnosis or the issue, scrubbed>"

## Human-authored summary (under 200 words)

<The user's own words on what went wrong and what should have happened, pasted as written. Ask for them; a placeholder here means the issue isn't ready to file. If they run long, ask them to trim rather than editing their words.>

## Environment

| Field | Value | Provenance and supporting evidence |
|---|---|---|
| Source involved and version | <skill, plugin or file> (<version or sha, or "not a checkout">) | <historical evidence / unverified snapshot / current observation / unknown>; <location> |
| Harness and version | <harness> <version> | <label>; <location> |
| Models | <model ids seen> | <label>; <location> |
| Other plugins and skills installed | <list> | <label>; <location> |
| OS and shell | <os version>, <shell> | <label>; <location> |

## Does it happen without this source?

- [ ] Confirmed the problem doesn't occur without <source> installed

How that was checked: <"Not tried", or what the user ran without it and what happened, with the transcript path if there is one. Tick the box only when a transcript shows the problem didn't recur.>

The evidence below shows involvement; it doesn't establish cause.

## What happened?

<Problem statement, then the triage verdict, with `path:line` citations rewritten as `transcript line <n>`.>

## Steps to reproduce

1. <first human prompt, scrubbed>
2. <the turns leading to the problem, one line each>
3. <the observable>

## Expected behavior

<from the problem statement>

## Actual behavior

<from the triage verdict>

## Transcript

Session id(s): <ids>. Local archive: <path, redaction level <level> | none built>. Attached bundle: <attach only after approval>. Involvement per the diagnosis report: <possible | likely>, with evidence at <transcript lines>. This report doesn't propose a fix.

---
Filed with the `diagnosing-sessions` skill. The filing model and harness are under "Who's filing"; the diagnosed session's environment is in the Environment table.
