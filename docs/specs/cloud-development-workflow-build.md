# Build plan: cloud development workflow

How to build what [cloud-development-workflow.md](cloud-development-workflow.md) requires. Status: D1 to D9 decided on 2026-11-16. D11 onward are the build's best guesses from 2026-11-16, open to the owner's veto. Phases 0 to 2 are built and wait for the owner's merge and manual steps; see [Status](#status).

## Decisions for the owner

Edit the `Answer:` lines. Each one is pre-filled with the recommendation; leave it to accept, change it to decide otherwise, or write a question.

### D1. Spend caps

Recommendation: $100 a month; per issue $2 (direct), $8 (lean), $25 (full); $1 per triage; $5 per scout run.

- Monthly cap — Answer: $100
- Per issue, direct — Answer: $2
- Per issue, lean — Answer: $8
- Per issue, full — Answer: $25
- Per triage — Answer: $1
- Per scout run — Answer: $5
- Owner's note: accepted as a start. They look rather high and get adjusted once real costs are known.
- The amounts live only in `cloud/settings.json`. The spec keeps "no default; must be set".

### D2. Is the repository public or private?

Public means Actions minutes are free, but strangers can open issues that each cost one triage. Private means 2,000 free Actions minutes a month, which a month of implementations could pass.

- Answer: public, stays public. Issues from strangers are ignored until the owner tells the agents what to do with them.
- Confirmed: an `origin:external` issue gets `needs-answer` and one dispatcher comment, and no session starts. When the owner comments, it's triaged as the workflow document says (CW-19, scenario 13).
- Owner's answer of 2026-11-17: make it public; the owner changes the visibility (D63).
- Found while building: the repository is **private** today (an anonymous `GET /repos/DeNic0la/Agents` returns 404). Until it's public, or the account has GitHub Pro, the ruleset on `main` isn't enforced (Phase 0, Q5), strangers can't open issues, and every Actions minute counts against the 2,000, a Windows minute as two. Making it public is the owner's act; the build doesn't change visibility.

### D3. Dispatcher runtime

Recommendation: GitHub Actions workflows that call a Node program in `cloud/dispatcher/`, with no dependencies. It runs next to GitHub, needs no extra hosting, and the repo already runs Node tests.

- Answer: yes

### D4. Agent identity

Recommendation: a GitHub App installed only on this repo. It has scoped permissions, short-lived tokens, and a bot actor the dispatcher can tell from the owner. A second user account can't use a fine-grained token on a personally owned repo.

- Answer: yes

### D5. Dispatcher shape

Recommendation: level-triggered. Every run reads one issue's full state and decides the next action, so lost events, the stop switch, the turn of the month and label repairs are all the same "reconcile" run.

- Answer: yes

### D6. Stop switch

Recommendation: a `stop` workflow started by hand disables the dispatcher workflows and interrupts running sessions; `resume` re-enables them and reconciles all open issues.

- Answer: yes

### D7. Workflow files are never changed by cloud agents

The App can't push changes under `.github/workflows/` without a permission that would let it rewrite its own gates. Recommendation: issues about CI are built by the owner or a local session.

- Answer: yes

### D8. Add `cloud/` and `.github/` to the `merge:human` paths in the workflow document

- Answer: yes

### D9. How the build itself is tracked

Recommendation: this file is the plan; one GitHub issue per phase, built in local sessions until the workflow can build itself.

- Answer: yes

### D10. Anything else

- Notes:

### D11 onward: found while building

A review of the workflow document and the spec before phase 0 found contradictions (C) and requirements that can't be tested as written (U). Each line is the build's best guess, already applied where a built phase needs it. Change an `Answer:` to veto; the build follows it from the next phase on.

| # | Finding | Resolution | Answer |
|---|---|---|---|
| D11 | C1: CW-13 comments on a revert, CW-44 allows no comment while an issue waits | CW-44 means no reminder and no work. Revert and repair comments (CW-3, CW-13) are allowed on a waiting issue. | yes |
| D12 | C2: who gets a review session | Only pull requests the agent identity opened. The owner's own pull requests are the owner's. | yes |
| D13 | C3: split issues "keep the original's origin", but the App authors them | Origin always comes from the author. A split issue says "Split from #N" and needs approval like any agent issue. CW-21 and the workflow document change. | yes |
| D14 | C4: may the owner change the origin in any direction? | Yes, any change by the owner counts (CW-4). | yes |
| D15 | C5: the stop switch "at once" or "at the next step" | The stop switch interrupts running sessions at once. The monthly cap is enforced through each session's hard limit (D25). | yes |
| D16 | C6: who records "approved over objection" | The dispatcher comments it and removes `objection` when the owner's `approved` overrides it. | yes |
| D17 | C7: the owner can't approve their own pull request, so `merge:human` could never pass for this build | `merge:human` stays blocked by a separate required `owner-merge` check; only the owner may bypass it. Authorship is not authorization. The dispatcher never merges a pull request the owner opened; the owner merges it. | yes |
| D18 | C8: the review agent can't approve a pull request the same App opened | The review agent's verdict is the review session's structured result, recorded by the dispatcher in a marker; `merge-gate` reads the marker. | yes |
| D19 | C9: scenario 13 and CW-19 were in no phase | Both are in phase 2; phase 10 runs all 13 scenarios. | yes |
| D20 | C10: `docs/specs/` and this file fell under `merge:self` | `docs/specs/` is `merge:agent`; this build plan is `merge:human`. | yes |
| D21 | U1: which of several state labels stays | The state the dispatcher last recorded; without a record, the earliest in life order. | yes |
| D22 | U2: "oldest first" and what counts against the slot limit | Lowest issue number first. `in-progress` and `in-review` hold a slot, as do `needs-answer` issues whose recorded return state is `in-progress` or `in-review`; only a start from `ready` waits, and a `paused` issue takes no place in the queue (D47). | yes |
| D23 | U3: Definition of Ready items 5 to 7 have no label | Triage's result (checked, estimate) is a dispatcher record. Dependencies are GitHub's "blocked by" relations or `Depends on #N` lines in the marked section. | yes |
| D24 | U4: what "changes what an issue asks for" means | The issue body outside the marked section changes. Title edits don't count. | yes |
| D25 | U5: "stop at their next step" can't be observed | Every hard limit is also bounded by what's left of the month, less what running sessions may still spend. | yes |
| D26 | U6: nothing stops agents creating labels | GitHub doesn't record who created a label, and Issues write lets the App create them. The dispatcher removes a label outside `cloud/labels.json` from any issue the agent identity added it to, and comments why (phase 3). | yes |
| D27 | U7: scout cost "on its issue", but a scout run has no issue | Scout cost goes on the status issue. | yes |
| D28 | U8: which owner actions end a wait | A comment by the owner resumes a waiting issue. The owner's label changes, edits and closing act as themselves (approve, re-triage, drop). | yes |
| D29 | U9: `approved` before a spec exists | `approved` counts in `needs-approval` and on an issue held by an objection (D45), and stays while the spec it approved is unchanged (D44). Elsewhere the dispatcher removes it and says when to approve. | yes |
| D30 | U10: an owner comment on `needs-approval` | It sends the issue back to `refining` for a revised spec. `approved`, when present too, wins. | yes |
| D31 | U11: who sets state labels | Only the dispatcher and the owner. An agent's state-label change is reverted; agents report and the dispatcher acts. The owner's change is accepted, and the Definition of Ready still applies before implementation. | yes |
| D32 | U12: several route or merge labels | The highest merge class and the route with the most process stay. | yes |
| D33 | U13: closing left `budget:extend` and the route | Closing also removes `budget:extend`; reopening also removes the route. The merge class stays. | yes |
| D34 | U14: the settings had no owner and agent login | `cloud/settings.json` has `owner` and `agentLogin`; the spec's settings table has both rows. | yes |
| D35 | U15: agents couldn't read CI results | Agent permissions add read-only Checks, Commit statuses and Actions, plus the mandatory Metadata. | yes |
| D36 | CW-22 by repair | `route:direct` on an issue that isn't `origin:owner` becomes `route:lean`. | yes |
| D37 | An external issue edited while it waits | Not re-triaged while it waits; the owner's comment triages the text as it is then. | yes |
| D38 | Issues the dispatcher opens (the status issue, phase 9) | The rules leave them alone. | yes |
| D39 | Dry run | A dry run writes neither labels nor records. It posts one comment per distinct plan, deduplicated by a hash marker, and posts nothing when there is nothing to do. Live mode is refused until phase 3 adds the platform client; since phase 3 it needs owner steps 4 and 5 (step 8). | yes |
| D40 | Definition of Ready failures | Commented once per distinct set of failing items, not on every event. | yes |
| D41 | Which issue a pull request belongs to | The issue its body closes ("Closes #N" and GitHub's synonyms). | yes |
| D42 | No scheduled reconcile in phase 2 | A reconcile of all open issues is started by hand (`dispatch`, Run workflow, empty issue). A schedule comes with phase 3, when a lost session matters. | yes |
| D43 | Order of the owner's setup | The App with Contents write is installed only after the ruleset on `main` is enforced, so no agent can ever push to `main` directly. Check with `gh api repos/DeNic0la/Agents/rules/branches/main`: while it returns an empty list, nothing protects `main`. | yes |
| D44 | An approval given in `needs-approval`, then a wait | An approval stays while the spec it approved is unchanged; the dispatcher records the spec's digest with it. When the issue later waits in `needs-answer`, `approved` stays; when the spec changes, the dispatcher removes it and says so. An `approved` added before any approval was due is removed (D29). | best guess |
| D45 | CW-41 on an issue that isn't `direct` | The owner's `approved` overrides an objection on any route: `objection` is removed and "approved over objection" commented. A `direct` issue is then `ready`; any other goes back to the agent that objected (`triage` or `refining`), and the spec it writes still needs the owner's `approved` in `needs-approval`. | best guess |
| D46 | CW-13 when an agent changes a guarded label twice | Each guarded label is set back to what the last change by the owner or the dispatcher left, not by undoing only the last change: an agent adding and then removing `approved` neither leaves an approval the owner never gave nor removes one the owner gave. For merge classes a raise by anyone counts (CW-67). | best guess |
| D47 | CW-12 for a resumed implementation, and several issues in one run | A dispatcher run first moves every issue's state, then hands out the free implementation slots, lowest issue number first. An issue the owner's answer sends back to `in-progress` waits for a free slot like a start from `ready`, and waits in `ready` meanwhile. A `paused` issue takes no slot. | best guess |
| D48 | An external issue edited after the owner let it in | The author's edit removes `approved` and sends the issue to `needs-answer` for the owner, whose comment triages the text as it is then (D37). An outsider's edit never starts a session by itself. | best guess |
| D49 | Two `dispatch` runs at once | All `dispatch` runs share one concurrency group, so two runs never hand out the same slot. A newer pending run replaces an older one, so every run also reconciles the open issues changed in the last 30 minutes, every `ready` issue, and closed issues that still carry labels to clean. | best guess |
| D50 | `merge-gate` on reviews | A `pull_request_review` run uses the pull request's own copy of the workflow, so a pull request could change its gate. `review-relay` runs on reviews with no permissions and no code; `merge-gate` runs on its `workflow_run` and on `pull_request_target`, both from the default branch. The status belongs to a commit: it's green only when every open pull request at that commit passes. Reviews reach the gate only once both files are on `main`. | best guess |
| D51 | The Claude GitHub App (`claude[bot]`, `anthropics/claude-code-action`), which the owner installed | It's the owner's interactive assistant: it answers the owner's `@claude` mentions and reviews the owner's pull requests, billed to the owner's subscription. It isn't the agent identity (step 5) and doesn't run the cloud sessions, which keep the workspace key and its cap (D1, D4). The rules treat it like any other actor: its comments end no wait and its label changes are reverted. It holds Contents write while `main` is unprotected, against D43's order, so its workflows run only for the owner. | best guess |
| D52 | Who writes to GitHub for a session | The session gets the App installation token only as its `github_repository` resource, for git: it clones and pushes to `cloud/issue-<N>`. It gets no GitHub tool. Its comments, the issues it files, the marked section, the pull request and the merge are made by the dispatcher job with an installation token of the agent identity, from the session's `agent-result` block (`cloud/agents/README.md`). So the agent identity is still their author (CW-13), and every action is checked in one place: the outcomes a role may report, at most 3 filed issues (CW-7), the merge class it may raise but not lower (CW-67). The token would also work against `api.github.com`, which is an allowed host (CW-93): the dispatcher's reverts (D31, D46) and the merge gate are the enforcement, not the token's absence. | best guess |
| D53 | How a session runs next to GitHub | Each session is a run of `session` (`.github/workflows/session.yml`), which the dispatcher starts with `workflow_dispatch`, the one event its token may trigger. The run is named `session #<issue> <role>`, starts the platform session, watches it until it ends or `platform.sessionTimeoutMinutes` passes (then interrupts it), applies the result and starts a `dispatch` run for the issue. The job's limit of 345 minutes stays under the Actions limit of 6 hours. Rejected: waiting in the `dispatch` job, which would hold the one concurrency group (D49) for hours; a platform webhook, which the docs don't offer. | best guess |
| D54 | Is a session running? | When the issue's `session` record is set and a `session` run for it is queued or running, or was requested less than 10 minutes ago (GitHub may not list it yet). A record with no run means the run ended without reporting: CW-16 counts it as a failure, so the agent starts once more, then the issue goes to `needs-answer`. | best guess |
| D55 | Where a session's hard limit comes from | From the dispatcher's `session` record on the issue, written when it starts the run, never from the run's inputs: a run started by hand can't raise it. A run whose issue no longer calls for its role (closed, another state, no record), or that finds `CLOUD_STOPPED` on, ends without starting anything and clears a `session` record of its role, so D54 doesn't count it as lost. | best guess |
| D56 | The one-request overshoot (Phase 0, Q3) | The limit passed to the platform is the hard limit less `platform.requestMarginUsd` in `cloud/settings.json`, $0.15 to start. | best guess |
| D57 | What triage cost counts against | The month and the issue's total, shown in the cost line. Not the issue's cap: triage has its own per-run cap, and the issue's cap pays for refining, implementing and reviewing. | best guess |
| D58 | CW-91 for a session's output | Before anything reaches GitHub, the job replaces with `[redacted]` every token it minted and anything shaped like a GitHub token, a Claude key or a private key, in the agent's text and in error messages. | best guess |
| D59 | How triage closes an issue | `duplicate` closes it as not planned and says "Duplicate of #N". `split` opens the 2 to 5 issues as the agent identity, then closes it as completed and links them; if any could not be opened, the issue goes to `needs-answer` instead. An outcome whose phase isn't built yet goes to `needs-answer` saying the dispatcher can't act on it yet. | best guess |
| D60 | `sync-agents` before the key exists | In `dry-run` mode it prints a notice and succeeds, so merging phase 3 before step 4 leaves no red run; in `live` mode it fails. | best guess |
| D61 | A session that doesn't start | A missing agent or environment, or a platform error before the session exists, is a failed session (CW-16): the comment says it didn't start and why, and it counts toward the one retry. | best guess |
| D62 | D42's schedule | `dispatch` also runs every hour and reconciles all open issues, so a lost session (D54) is found within an hour. While the repository is private that's about 720 Actions minutes a month; public repositories don't pay for minutes. | best guess |
| D63 | Owner's answers of 2026-11-17 | Sessions run on Managed Agents with the workspace key (D1, D4), not on the owner's subscription or `claude-code-action`. The repository is to become public, and the owner changes the visibility (D2). | yes |

## Design

- **Three actors.** The owner, the App (agents) and `github-actions[bot]` (dispatcher) are distinct, so checking who set a label (CW-13) is a plain actor check.
- **Sessions are watched by the job that started them.** The Actions job creates the session, waits for it to end, records the cost and applies the state change. This gives failure detection, the retry (CW-16) and the one-session-per-issue lock (an Actions concurrency group) without a relay service. The job also renews the App token in the session before its hour runs out (Phase 0, Q1).
- **Agents report an outcome; the dispatcher acts on it.** A session pushes its branch and ends with a structured result. The dispatcher job posts the comments, opens the pull request and merges as the agent identity (D52), and sets the state labels itself, so every transition is validated in one place.
- **The merge gate is a required status check.** The dispatcher posts `merge-gate` on each pull request: green for `merge:self` when the paths and size confirm it, and for `merge:agent` when the review agent approved (D18). A separate required `owner-merge` check stays blocking for `merge:human`; the ruleset lets only the owner bypass it. An owner-authored pull request does not change either gate (D17). The App gets no permission to write statuses, change workflows or administer the repo.
- **Dispatcher code always runs from `main`.** Issue events and `pull_request_target` use the default branch, so a pull request can't change the gate that judges it.
- **Machine-readable state lives in hidden markers** in dispatcher comments (the state an issue came from, the triage result, the approved spec's digest, session cost). Markers count only from the dispatcher's own comments.
- **The dispatcher continues itself** by starting its own workflow for the issue after each session, because label changes made with the Actions token trigger no new run.
- **Agents get the preset at sync time.** A session loads skills only from `.claude/skills/` at the repo root or from uploaded skills (Phase 0, Q2), so the agent sync uploads the skills each definition needs.

## Layout

```
.github/workflows/   ci.yml, dispatch.yml, merge-gate.yml, labels.yml, scout.yml, stop.yml, resume.yml, sync-agents.yml
cloud/settings.json  the settings table from the spec
cloud/labels.json    the labels of the workflow document; sync-labels.js applies them
cloud/ruleset-main.json  the ruleset on main, applied by the owner
cloud/dispatcher/    decide/ (pure rules), github/, platform/ (I/O), cli.js, merge-gate.js
cloud/agents/        one definition per role: triage, refine, plan roles, implement, review, scout
tests/cloud-*.test.js  dispatcher tests (node --test)
```

## Phases

Each phase ends with something that can be checked on a test issue. Every change here is `merge:human` by the workflow's own rules, so the owner merges all of it. Phases 1 and 2 need no platform account and cost nothing. Phase 3 is the first that spends money, and every session has its hard limit from then on.

| # | Phase | Delivers | Covers |
|---|---|---|---|
| 0 | Checks and prerequisites | Answers to the questions in the next section; the App, the platform workspace and API key, secrets stored | CW-90, CW-91 |
| 1 | CI, labels, protection | `ci.yml` (`bin/agents check`, both smoke tests, Node tests); a script that creates the labels; a ruleset on `main` requiring a pull request, CI and `merge-gate` | CW-2, CW-66, DoD 2 |
| 2 | Dispatcher rules, dry run | The pure decision core with tests for every state and label rule; a run only comments what it would do. Origin labels, state repair, actor checks, the Definition of Ready check, external issues | CW-3, CW-4, CW-10 to CW-14, CW-17 to CW-19, CW-40 to CW-42, CW-44, scenario 13 |
| 3 | First session: triage | Platform client, session with a hard cost limit, cost comment, record link, retry; settings file with the "no caps, no start" rule; agent sync on merge to `main`; the triage definition | CW-16, CW-20 to CW-27, CW-80, CW-81, CW-85, CW-100 to CW-103 |
| 4 | Lean refinement and approval | Refine agent, the marked section, questions and the `needs-answer` round trip, approval request | CW-8, CW-30, CW-32 to CW-35, scenario 6 |
| 5 | Implementation and self-merge | Implement agent, one branch and pull request per issue, merge class computed from paths and size, `merge-gate` | CW-50 to CW-55, CW-62, CW-63, scenario 1 |
| 6 | Review | Review agent in a new session, review rounds, the human-class recommendation wording, closing comment | CW-60, CW-61, CW-64, CW-65, CW-67 to CW-69, scenarios 2, 3, 7, 8 |
| 7 | Full route | The plan pipeline as cloud agents, built from the `plan-task` personas | CW-23, CW-31 |
| 8 | Spend controls | `paused` and `budget:extend`, monthly cap, the 80% warning, stop and resume | CW-82 to CW-84, CW-86, CW-87, scenarios 9, 10 |
| 9 | Scout and status issue | Weekly scout with a token that can't push and wide web access; pinned status issue | CW-70 to CW-74, CW-93, scenario 4 |
| 10 | Rejections, security, close-out | `.out-of-scope/` records, the injection scenario, all 13 scenarios run, README and REQUIREMENTS updated, a GitHub guide for the `issue-tracker` concept, 0008 marked built | CW-5 to CW-7, CW-43, CW-92, CW-94, CW-95, scenarios 5, 11, 12 |

## Status

| # | State | How to verify |
|---|---|---|
| 0 | Answered (next section). The owner's steps are open. | The steps in [What the owner does by hand](#what-the-owner-does-by-hand) are done; Settings, Secrets and variables, Actions lists `ANTHROPIC_API_KEY`, `AGENT_APP_PRIVATE_KEY` and the variable `AGENT_APP_ID`. |
| 1 | Built, not merged. | Locally: `node --test "tests/*.test.js"`. After the merge: the `ci` check runs on a pull request with a Linux job and two Windows jobs; Actions, `labels`, Run workflow creates the labels (a second run changes nothing); the ruleset is applied and a pull request can't merge before `ci` and `merge-gate` are green. |
| 2 | Built, not merged; review fixes D44 to D50 applied. | Locally: `node --test "tests/*.test.js"` (the test names carry the CW and D numbers). After the merge, approving a pull request starts `review-relay` and then `merge-gate`. After the merge: open a test issue; within a minute the `dispatch` run comments "Dry run. The dispatcher would: add `origin:owner`, `triage` … start the triage agent with a hard limit of $1.00"; comment on it, and no second identical comment appears. |
| 3 | Built, not merged, not run live. Also D26 (labels the agent invents are removed) and D53 to D62. CW-103's report on the status issue comes with phase 9, CW-85's monthly total with phase 8; the issue gets both now. | Locally: `node --test "tests/*.test.js"`. After the merge and owner steps 4 to 8: the `sync-agents` run lists the environments, skills and agents it created; a test issue starts a run `session #<N> triage`, then gets the triage comment from the agent identity and a dispatcher comment with the session link and its cost. |
| 4 to 10 | Not started. | |

Phase 3's first live run confirms what the docs leave open; each is named once in the code, so a fix is one line:

- The event type of the agent's messages, `agent.message` (`cloud/dispatcher/platform/session.js`).
- An App installation token as a `github_repository` resource's `authorization_token` (Q1).
- The skill upload's form fields `files[]` and `display_title`, the path `/v1/skills/{id}/versions`, the tool set `agent_toolset_20260401` and the environment networking `unrestricted` for the web environment (`cloud/dispatcher/platform/client.js`, `sync.js`). If the skills listing doesn't return `display_title`, every sync uploads the skills again.

## Phase 0: to confirm before building

Answered from the official docs on 2026-11-16. Sources: Managed Agents docs at `https://platform.claude.com/docs/en/managed-agents/` (pages `github`, `skills`, `environments`, `budgets`, `session-operations`, `session-observability`, `reference`), and GitHub docs at `https://docs.github.com/en/` (pages named per answer). "Unconfirmed" means the docs don't say; the named phase tests it first.

| Question | Answer | If the answer is no |
|---|---|---|
| Q1. Can a session's repository access use an App installation token, which expires after one hour? | **Partly.** A session's `github_repository` resource takes an `authorization_token` string; the docs show personal tokens only, so an installation token is unconfirmed until phase 3's first session. A running session's token can be replaced with `POST /v1/sessions/{id}/resources/{resource_id}` (Managed Agents, `github`). Installation tokens last one hour (GitHub, "Generating an installation access token for a GitHub App"). Applied: the job that watches a session renews the token every 50 minutes. | Sessions are kept under an hour and continue in a new one, or the identity becomes a second account with a classic token. |
| Q2. Does a session load the preset when `install.sh` runs at session start? | **No.** There is no setup command on an environment or session, and skills load only from `.claude/skills/<name>/SKILL.md` at the repo root, found once at session start, or from skills uploaded with `POST /v1/skills` and attached to the agent (Managed Agents, `skills`, `environments`). Loading `AGENTS.md` or `CLAUDE.md` isn't documented, so it's assumed not to happen. | Applied: definitions embed the needed instructions, and the agent sync uploads the skills each one needs. |
| Q3. Does the session's result carry its cost, and does the hard limit stop it cleanly? | **Yes.** The session's `usage.list_cost` carries the cost, and a `session.usage` event precedes every idle. A session created with `budget: {type: "limit", max_list_cost}` goes idle with `stop_reason: budget_reached` at the limit; it's checked between model requests, so it can overshoot by one request (Managed Agents, `budgets`, `session-observability`). Applied: the hard limit passed to the platform is the cap less a margin of one request. | Cost is read from the usage API after the session. |
| Q4. Can the Actions token disable and enable workflows? | **Probably.** `PUT /repos/{owner}/{repo}/actions/workflows/{id}/disable` and `/enable` need Actions write (GitHub REST, "Workflows"; "Permissions required for GitHub Apps"), and a workflow can grant `actions: write` to its token. That the token may call them is unconfirmed until phase 8's first `stop`. Applied as well: the dispatcher starts nothing while the repository variable `CLOUD_STOPPED` is `true`, so the variable is the fallback and already works. | The stop switch becomes a repository variable the owner sets. |
| Q5. Can a ruleset pin `merge-gate` to GitHub Actions as its source? | **Yes, where rulesets are enforced.** A required status check takes an `integration_id` (GitHub REST, "Rules"); GitHub Actions is app id 15368 (`GET /apps/github-actions`). But rulesets and branch protection aren't enforced on a private repository of a GitHub Free account (GitHub, "About rulesets", and the repository's rules page), and this repository is private today (D2). The CODEOWNERS fallback has the same limit. | Applied: nothing protects `main` until the repository is public or on Pro. The owner merges by hand meanwhile, and the App isn't installed until then (D43). |

## What the owner does by hand

In this order. None of it is needed before merging phases 1 to 3; steps 4 to 6 are needed before step 8, which turns the sessions on.

1. **Merge phase 1 and phase 2.** Each is a pull request from a `cloud-build/` branch; read and merge them.
2. **Make the repository public** (Settings, General, Danger Zone, Change visibility), as D2 decided, or confirm the account has GitHub Pro. Without one of them the ruleset in step 3 isn't enforced.
3. **Labels and ruleset.**
   - Actions, `labels`, Run workflow. It creates exactly the labels in `cloud/labels.json` and deletes none; run it again after a change to that file.
   - Apply the ruleset on `main`: Settings, Rules, Rulesets, New ruleset, Import a ruleset, choose `cloud/ruleset-main.json`. Or, with the GitHub CLI: `gh api -X POST repos/DeNic0la/Agents/rulesets --input cloud/ruleset-main.json`.
   - Confirm the ruleset is Active, targets `main`, requires pull requests, `ci` and `merge-gate`, and grants the agent App no bypass. Open a small test pull request and, using an actor without bypass permissions, verify that merging is blocked while either required check is missing or failing; then verify it becomes possible when both pass. If a check stays "Expected" although its run is green, investigate the required context name and integration ID rather than changing the source to "any source".
4. **Platform workspace and key.** In the Claude Console (`platform.claude.com`), create a workspace `agents-cloud`, set its monthly spend limit to the monthly cap in `cloud/settings.json` as a second ceiling, and create an API key in it named `agents-dispatcher`. Store it as the repository secret `ANTHROPIC_API_KEY` (Settings, Secrets and variables, Actions, New repository secret). Paste it nowhere else.
5. **The GitHub App** (Settings of your account, Developer settings, GitHub Apps, New GitHub App):
   - Name `denic0la-agents`. If the name is taken, choose another and change `agentLogin` in `cloud/settings.json` to `<slug>[bot]`.
   - Homepage: the repository's URL. Webhook: untick Active.
   - Repository permissions: Contents, Issues and Pull requests read and write; Checks, Commit statuses and Actions read-only; Metadata read-only (set automatically). Nothing else: no Workflows, no Administration, no account permissions.
   - Where can it be installed: only on this account. Create it.
   - Note the App ID and store it as the repository variable `AGENT_APP_ID` (Settings, Secrets and variables, Actions, Variables).
   - Generate a private key. Paste the whole `.pem` file into the repository secret `AGENT_APP_PRIVATE_KEY`, then delete the file. Don't keep it in a synced folder.
   - Install App, only select repositories, `Agents`.
   - The Claude GitHub App (`/install-github-app`, acting as `claude[bot]`) is a different App and doesn't do this step (D51).
6. **Stop switch, ready to use.** Settings, Secrets and variables, Actions, Variables: create `CLOUD_STOPPED` with the value `false`. Setting it to `true` stops all starts.
7. **Sync the agents.** After phase 3 is merged and step 4 is done: Actions, `sync-agents`, Run workflow. It also runs on every merge to `main` that changes `cloud/agents/`, `preset/skills/`, `preset/agents/` or `cloud/settings.json`. Its log lists the environments `agents-repo` and `agents-web`, the skills it uploaded and the agents `agents-<role>` it created or updated. If it fails on a request, copy the error into the next session: the platform's field names it uses are unconfirmed (Status, phase 3).
8. **Go live.** In a pull request, set `"mode": "live"` in `cloud/settings.json` and merge it. From then on a new issue starts a run `session #<N> triage`. The `dispatch` job fails with a list of what's missing while step 4 or 5 isn't done. Back to `"dry-run"`, or `CLOUD_STOPPED` set to `true`, stops new sessions; a running one ends at its hard limit or time limit.
