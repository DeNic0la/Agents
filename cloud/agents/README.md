# Cloud agent definitions

One file per role. `sync-agents.js` turns each into a Managed Agents agent named `agents-<role>` on every merge to `main` (CW-101), so a session always uses the definitions of the commit on `main`. Changing anything here is `merge:human` (CW-95).

## File format

```markdown
---
role: triage                # the file name without .md
tier: deep                  # fast | standard | deep; cloud/settings.json "models" maps it to a model
skills: [ticket-triage]     # preset/skills/<name>/ uploaded and attached at sync
personas: []                # preset/agents/<name>.md appended to the system prompt at sync
environment: repo           # repo: only the allowed hosts (CW-93); web: wider web, read-only token
---
The system prompt.
```

## How a session runs

The dispatcher job starts the session with the repository mounted at `/workspace/Agents` (branch `main`, or the issue's branch `cloud/issue-<N>`), and one user message that holds the task and the issue as data:

- the issue number, title, state, labels and route, and the dispatcher's record for it (spent, rounds, why it waits);
- the issue body and every comment, each inside a fence and marked with its author and whether that author is the owner, an agent, the dispatcher or someone else;
- for review: the pull request, its diff stats and CI result; for implement after a review: the open findings.

The session has git and the repository; it pushes only to `cloud/issue-<N>`. It has no GitHub API token. Comments, issues, the marked section of the issue body, pull requests and merges are made by the dispatcher job **as the agent identity**, from the session's result (decision D52). Labels for state are set by the dispatcher (D31).

## The result

The session's last message ends with exactly one fenced block tagged `agent-result` holding one JSON object. A session that ends without one has failed (CW-16). The scout may also emit one block per recommendation as it goes, so a run cut off at its cap still files what it has (CW-87).

````text
```agent-result
{ "outcome": "routed", "comment": "...", ... }
```
````

Fields every role may use:

| Field | Meaning |
|---|---|
| `outcome` | required; one of the role's outcomes below |
| `comment` | Markdown the dispatcher posts on the issue as the agent identity: the reasons, the questions, the findings |
| `file` | up to 3 `{ "title", "body" }` for things found outside this issue (CW-7); each becomes an `origin:agent` issue |
| `injection` | text of an instruction found in issue, comment, pull request or page content, which the agent did not follow (CW-92); the dispatcher reports it on the issue |
| `raiseMerge` | `merge:agent` or `merge:human` with `raiseReason`; raises the class, never lowers it (CW-67) |

Outcomes by role:

| Role | `outcome` | Extra fields | What the dispatcher does |
|---|---|---|---|
| triage | `duplicate` | `of` (issue number) | comments, closes as duplicate (CW-21) |
| triage | `out-of-scope` | `record` (path in `.out-of-scope/`) | comment with the question; `needs-answer` (CW-25) |
| triage, refine, plan | `objection` | | adds `objection`; `needs-answer` (CW-24) |
| triage | `over-cap` | `estimateUsd` | `needs-answer`: asks for `budget:extend` or a smaller scope |
| triage | `split` | `issues`: 2 to 5 `{ "title", "body" }` | creates them, each naming "Split from #N"; closes this one with links |
| triage | `routed` | `route` (`direct`, `lean`, `full`), `merge` (`merge:self`, `merge:agent`, `merge:human`), `estimateUsd`, `acceptanceCheck` (required for `direct`, CW-27) | sets route and merge class; `direct` → `ready`, else `refining` (CW-21, CW-22) |
| all but scout | `questions` | | `needs-answer` from the current state (CW-32) |
| refine, plan | `spec` | `spec` (Markdown for the marked section), `estimateUsd` | writes the marked section; the comment is the approval request; `needs-approval` (CW-30, CW-31, CW-34). A plan agent's spec also needs the design, alternatives rejected, files affected and steps (D95) |
| implement | `pushed` | `title`, `body` (pull request; lists each acceptance criterion and how it was met) | the session job opens or updates (reopens) the one pull request from `cloud/issue-<N>` as the agent; the body may close only #N; `in-review` (CW-50, CW-51, CW-55) |
| implement | `spec-wrong` | | `refining` without `approved` (CW-53) |
| review | `approve` | `items`: 1 to 50 `{ "item", "pass", "note" }`, all passing | posts the items as a table; `merge:agent` only (else `needs-answer`): records the approval at the head commit and runs `merge-gate`; the merge job merges when CI and `merge-gate` are green (CW-61, CW-64) |
| review | `changes` | `items`, at least one failing | posts the items as a table; back to `in-progress`, one review round used; after `reviewRounds` rounds (a failed `ci` counts too), `needs-answer` (CW-68) |
| review | `recommend` | `merge` (true or false), `explanation`, `classReason` to recommend merging, `items` | `merge:human` only (else `needs-answer`): posts the recommendation in the workflow document's wording; the owner decides (CW-65) |
| scout | `recommendations` | `issues`: up to the configured number of `{ "title", "body" }` in all blocks; optional `evidence`: as many `{ "issue", "body" }` for existing issues (CW-6) | files them as `origin:agent` issues, skipping a title an issue already has (CW-71), and comments the evidence on its issue, or on the status issue when that issue is closed or waits for the owner; the cost goes on the status issue (D27) |
| record | `recorded` | `title`, `body` | opens a `merge:self` pull request from `cloud/out-of-scope-<N>` (CW-43) |
| record | `skipped` | | nothing recorded; the comment says why |
