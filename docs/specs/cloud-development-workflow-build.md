# Build plan: cloud development workflow

How to build what [cloud-development-workflow.md](cloud-development-workflow.md) requires. Status: D1 to D9 decided on 2026-11-16. Nothing is built yet.

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

## Design

- **Three actors.** The owner, the App (agents) and `github-actions[bot]` (dispatcher) are distinct, so checking who set a label (CW-13) is a plain actor check.
- **Sessions are watched by the job that started them.** The Actions job creates the session, waits for it to end, records the cost and applies the state change. This gives failure detection, the retry (CW-16) and the one-session-per-issue lock (an Actions concurrency group) without a relay service.
- **Agents report an outcome; the dispatcher changes the state.** An agent comments, pushes, opens the pull request and merges. State labels are set by the dispatcher from the session's structured result, so every transition is validated in one place.
- **The merge gate is a required status check.** The dispatcher posts `merge-gate` on each pull request: green for `merge:self` when the paths and size confirm it, for `merge:agent` when the review agent approved, for `merge:human` only after the owner's approving review. The App gets no permission to write statuses, change workflows or administer the repo.
- **Dispatcher code always runs from `main`.** Issue events and `pull_request_target` use the default branch, so a pull request can't change the gate that judges it.
- **Machine-readable state lives in hidden markers** in dispatcher comments (the state an issue came from, session cost). Markers count only from the dispatcher's own comments.
- **The dispatcher continues itself** by starting its own workflow for the issue after each session, because label changes made with the Actions token trigger no new run.

## Layout

```
.github/workflows/   ci.yml, dispatch.yml, merge-gate.yml, scout.yml, stop.yml, resume.yml, sync-agents.yml
cloud/settings.json  the settings table from the spec
cloud/dispatcher/    decide/ (pure rules), github/, platform/ (I/O), cli.js
cloud/agents/        one definition per role: triage, refine, plan roles, implement, review, scout
tests/               dispatcher rule tests (node --test)
```

## Phases

Each phase ends with something that can be checked on a test issue. Every change here is `merge:human` by the workflow's own rules, so the owner merges all of it. Phases 1 and 2 need no platform account and cost nothing. Phase 3 is the first that spends money, and every session has its hard limit from then on.

| # | Phase | Delivers | Covers |
|---|---|---|---|
| 0 | Checks and prerequisites | Answers to the questions in the next section; the App, the platform workspace and API key, secrets stored | CW-90, CW-91 |
| 1 | CI, labels, protection | `ci.yml` (`bin/agents check`, both smoke tests, Node tests); a script that creates the labels; a ruleset on `main` requiring a pull request, CI and `merge-gate` | CW-2, CW-66, DoD 2 |
| 2 | Dispatcher rules, dry run | The pure decision core with tests for every state and label rule; a run only comments what it would do. Origin labels, state repair, actor checks, the Definition of Ready check | CW-3, CW-4, CW-10 to CW-14, CW-17, CW-18, CW-40 to CW-42, CW-44 |
| 3 | First session: triage | Platform client, session with a hard cost limit, cost comment, record link, retry; settings file with the "no caps, no start" rule; agent sync on merge to `main`; the triage definition | CW-16, CW-20 to CW-27, CW-80, CW-81, CW-85, CW-100 to CW-103 |
| 4 | Lean refinement and approval | Refine agent, the marked section, questions and the `needs-answer` round trip, approval request | CW-8, CW-30, CW-32 to CW-35, scenario 6 |
| 5 | Implementation and self-merge | Implement agent, one branch and pull request per issue, merge class computed from paths and size, `merge-gate` | CW-50 to CW-55, CW-62, CW-63, scenario 1 |
| 6 | Review | Review agent in a new session, review rounds, the human-class recommendation wording, closing comment | CW-60, CW-61, CW-64, CW-65, CW-67 to CW-69, scenarios 2, 3, 7, 8 |
| 7 | Full route | The plan pipeline as cloud agents, built from the `plan-task` personas | CW-23, CW-31 |
| 8 | Spend controls | `paused` and `budget:extend`, monthly cap, the 80% warning, stop and resume | CW-82 to CW-84, CW-86, CW-87, scenarios 9, 10 |
| 9 | Scout and status issue | Weekly scout with a token that can't push and wide web access; pinned status issue | CW-70 to CW-74, CW-93, scenario 4 |
| 10 | Rejections, security, close-out | `.out-of-scope/` records, the injection scenario, all 12 scenarios run, README and REQUIREMENTS updated, a GitHub guide for the `issue-tracker` concept, 0008 marked built | CW-5 to CW-7, CW-43, CW-92, CW-94, CW-95, scenarios 5, 11, 12 |

## Phase 0: to confirm before building

| Question | If the answer is no |
|---|---|
| Can a session's repository access use an App installation token, which expires after one hour? | Sessions are kept under an hour and continue in a new one, or the identity becomes a second account with a classic token. |
| Does a session load the preset when `install.sh` runs at session start? | Definitions embed the needed skills and personas at sync time. |
| Does the session's result carry its cost, and does the hard limit stop it cleanly? | Cost is read from the usage API after the session. |
| Can the Actions token disable and enable workflows? | The stop switch becomes a repository variable the owner sets. |
| Can a ruleset pin `merge-gate` to GitHub Actions as its source? | The gate moves to a required review by the owner for human-class paths, through CODEOWNERS. |

## What the owner does by hand

- Create the platform workspace and API key, and store the key as a repository secret.
- Create the GitHub App, install it on this repo, and store its key as a repository secret.
- Apply the ruleset on `main` (a script prepares it; applying it needs admin rights).
- Merge every pull request of this build.
