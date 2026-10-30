# Session diagnosis bundle

Session: <session-id>
Harness: <name> <version> (<provenance label>)
Source involved: <skill, plugin or file> <version> (<sha or "not a checkout">; <provenance label>)
Redaction level: skeleton | evidence | full
Built: <ISO timestamp>

Qualify version fields as historical evidence, unverified snapshot, current observation, or unknown. `environment.json` carries the same distinctions for every environment field, with its supporting location.

## What this is

A scrubbed record of a coding-agent session that went wrong. It lets someone who wasn't there decide whether a skill, plugin or instruction file contributed and, if so, what to change. The report states what happened with `path:line` evidence. By design it contains no diagnosis of any source and no proposed fix; that is the reader's job.

## Files

- `report.md`: the diagnosis report (problem statement, verdict, environment, sessions, timeline, findings, involvement, coverage notes).
- `case.md`: the case file the analysts worked from.
- `environment.json`: machine-readable copy of the environment section.
- `timeline.md`: the per-turn timeline.
- `findings/<dimension>.md`: raw analyst findings per dimension.
- `transcripts/<session-id>.md`: a condensed per-turn rendering of each examined session, never the raw transcript. Tool-result bodies by level:

  | Level | Tool-result bodies |
  |---|---|
  | skeleton | replaced by `[tool result: <tool>, <bytes> bytes, exit <code>]` |
  | evidence | kept for cited events, including the commands and results the findings need |
  | full | all kept |

- `scrub-log.md`: every placeholder used and its category, never the original value.

## How to read it

Start with `report.md` §1-2, then §7 (involvement) and the evidence lines it cites, then the matching turns in `transcripts/`. `path:line` references point at the original files on the reporter's machine; the same line numbers appear in the condensed transcripts as `[L<n>]` markers.

## Redaction

Placeholders look like `<EMAIL-1>`, `<PERSON-2>`, `<SECRET-3>`, `<HOST-4>`, `<REPO-5>`, `<ORG-6>` and `<PROPRIETARY-7>`; home paths are rewritten to `~/…`. The same placeholder always refers to the same original value within this bundle.

## Producer instructions

Replace this section with the actual results in the finished bundle.

After scrubbing, check every material finding using only this bundle: resolve its citation to an included transcript or source marker, read the cited command, result or quotation, and verify that it supports the claim. A path and line that exist are not enough. Record specific limitations where the redaction level or withheld content removes support.

Reconcile the report, case, environment, findings, this README and any local issue draft. Refresh the scrub-log counts against the final files, excluding the log itself. Remove stale export statements, and keep bundle preparation separate from archive delivery. Keep a mapping from original anchors to included evidence.

Record the two outcomes separately:

- Privacy audit: CLEAN, or the unresolved misses.
- Evidence support: supported, or limited, with the affected findings and reasons.

If content changes after checking, repeat the affected checks. Present the final log, file list and both outcomes for archive approval. Archive the reviewed files and verify the archive matches them. Record delivery outside the reviewed bundle instead of changing its contents after approval. Scrubbing is not a privacy certification.
