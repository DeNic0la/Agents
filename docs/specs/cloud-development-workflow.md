# Spec: cloud development workflow

Requirements for [development-workflow.md](../development-workflow.md), decided in [0008](../decisions/0008-cloud-development-on-github-issues.md). Read the workflow first; it says how things should work, this spec says what must be true once it's built. It doesn't say how to build it or in which order: that's the task that takes this spec as input.

Each row is one testable requirement. "The dispatcher" is the program that connects GitHub to agent sessions; "agent identity" is the GitHub identity agents act under.

## Settings

Kept in one tracked settings file. Changing it is a `merge:human` change.

| Setting | Default | Meaning |
|---|---|---|
| Monthly cap | none; must be set | ceiling for all agent spend in a calendar month |
| Per-issue cap: direct, lean, full | none; must be set | ceiling per issue from refinement on, by route |
| Per-run cap: triage, scout | none; must be set | ceiling for one triage of one issue, and for one scout run |
| Agent permissions | contents, issues and pull requests of this repository; no administration | what the agent identity may do on GitHub |
| Allowed hosts | GitHub and the platform | the only hosts a session that can push may reach |
| Parallel implementations | 2 | issues in `in-progress` at the same time |
| Review rounds | 3 | fix and re-review cycles before the owner is asked |
| Scout schedule | weekly | when the scout agent runs |
| Scout issues per run | 3 | most issues one scout run may file |
| Typo size | 10 changed lines | largest `merge:self` fix outside `README.md` and `docs/` |
| Big change | 400 changed lines or 15 files | from here a change is `merge:human` |
| Warning level | 80% | share of the monthly cap at which the status issue warns |

## 1. Issues and labels

| ID | Requirement |
|---|---|
| CW-1 | All work on the repo is tracked as issues on `DeNic0la/Agents`. No agent keeps a backlog, a queue or work state anywhere else. |
| CW-2 | Every label in the workflow document exists in the repository, and agents create no others. |
| CW-3 | Every open issue has exactly one state label; `paused` is not a state and sits beside it. The dispatcher gives a new issue `triage`, repairs an issue that has no state label or several, and removes the state label, `approved` and `paused` when an issue is closed. |
| CW-4 | The dispatcher sets the origin label from the issue's author: `origin:owner` for the owner, `origin:agent` for the agent identity, `origin:external` for anyone else. Only the owner can change it afterwards. |
| CW-5 | An agent session asked by the owner for a feature creates an issue containing the owner's words unchanged, and reports its URL. |
| CW-6 | Before an agent creates an issue it searches open issues, closed issues and `.out-of-scope/` for the same concept, and creates none when it finds one. It comments on the existing issue instead when it has new evidence. |
| CW-7 | An agent that finds something outside its current issue files an issue for it and changes nothing for it. |
| CW-8 | Agents never edit text the owner or anyone else wrote. They write comments and one marked section of the issue body. |

## 2. Dispatcher

| ID | Requirement |
|---|---|
| CW-10 | The dispatcher contains no AI. The same event and repository state always produce the same action. |
| CW-11 | It starts the right agent for each event: triage for a new or reopened issue; refine for `refining`; implement for `ready`; review for a pull request opened or updated by the agent identity. When the owner comments on a `needs-answer` issue, it restores the state the issue came from and starts the agent the workflow document's "Waiting for the owner" table names for the reason. |
| CW-12 | It never starts two sessions for the same issue at the same time, and never more implementations than the setting allows. Further `ready` issues wait, oldest first. |
| CW-13 | It checks the actor of every label event. `approved`, `budget:extend`, a changed origin label, and removing or lowering a merge class take effect only when the owner did it; otherwise it reverts the change and comments why. |
| CW-14 | Before starting an implement agent it checks items 3 to 8 of the Definition of Ready, and doesn't start when one fails. It comments which. |
| CW-15 | It runs in the cloud and needs no machine of the owner's. |
| CW-16 | A failed or crashed session leaves the issue in its state with a comment naming the failure. The dispatcher retries once, then moves the issue to `needs-answer`. |
| CW-17 | Every move to `needs-answer` comes with a comment naming the reason and the state the issue came from. |
| CW-18 | A reopened issue is triaged as a new one, without `approved`. When the owner closes a pull request without merging, its issue moves to `needs-answer`. |

## 3. Triage

| ID | Requirement |
|---|---|
| CW-20 | Every new issue is triaged by the triage agent, at the `deep` tier, before any other agent works on it. |
| CW-21 | Triage ends in exactly one outcome: closed as duplicate with a link; `needs-answer` (an objection, a prior rejection to confirm, or an estimate above the per-issue cap); closed as split, with links to new issues that keep its origin and carry no approval; or a route, a merge class and a cost estimate, with the reasons in one comment. |
| CW-27 | On the direct route the triage comment states the acceptance check for the change. |
| CW-22 | `route:direct` is given only to an `origin:owner` issue that names what to change and leaves no decision open. An `origin:agent` or `origin:external` issue never gets it. |
| CW-23 | When the owner asks for a plan, or the change spans several areas, changes install or sync behavior, or has a design decision with alternatives, the route is `full`. |
| CW-24 | An objection is a comment with the reason and an alternative, plus the `objection` label. It never closes an issue. |
| CW-25 | A match in `.out-of-scope/` is put to the owner as a question. No agent rejects an issue on its own. |
| CW-26 | When the owner changes what an issue asks for, it's triaged again and loses `approved`. |

## 4. Refinement

| ID | Requirement |
|---|---|
| CW-30 | A refined issue has, in its marked section: the outcome and why, what's out of scope, acceptance criteria that are each checkable by a command or a yes/no question, and recommendations marked as such. |
| CW-31 | On the full route the section also has the design, the alternatives rejected, the files affected and the implementation steps. |
| CW-32 | Open questions are asked in one comment, each with a recommended answer, and the issue moves to `needs-answer`. No agent works on the issue until the owner comments. |
| CW-33 | Each question names where the agent looked for the answer (files, docs, official documentation) before asking. |
| CW-34 | Refinement ends with an approval request comment (what will be built, route, merge class, estimate, any objection) and the state `needs-approval`. |
| CW-35 | A comment by anyone but the owner never changes an issue's spec, route, class or state. |

## 5. Approval

| ID | Requirement |
|---|---|
| CW-40 | An issue that isn't `direct` becomes `ready` only by the owner adding `approved`. |
| CW-41 | `approved` on an issue with `objection` makes it `ready`, and the dispatcher comments "approved over objection". |
| CW-42 | A change to the marked section after approval removes `approved` and returns the issue to `needs-approval`. |
| CW-43 | When the owner closes an enhancement as not planned, an agent records it in `.out-of-scope/` in a `merge:self` pull request. Bugs and already-built features are never recorded. |
| CW-44 | An issue in `needs-answer` or `needs-approval` gets no state change, no session and no comment until the owner acts, however long it waits. The status issue is the only reminder. |

## 6. Implementation

| ID | Requirement |
|---|---|
| CW-50 | One implement agent works on one issue, on its own branch, and never pushes to `main`. |
| CW-51 | The pull request closes the issue, carries its merge class, and lists each acceptance criterion with how it was met. |
| CW-52 | The pull request changes only what the spec asks for. |
| CW-53 | When the spec proves wrong or incomplete, the agent stops, comments what it found, and the issue returns to `refining` without `approved`. |
| CW-54 | The agent follows the repository's `AGENTS.md`, including the checks it names. |
| CW-55 | An issue has one branch and one pull request. A session that continues the issue works on them and opens no second pull request. When `main` moved, the branch is brought up to date and reviewed again. |

## 7. Review and merge

| ID | Requirement |
|---|---|
| CW-60 | The review agent runs in a new session without the implement agent's context, at that agent's tier or higher. |
| CW-61 | Every pull request except `merge:self` gets a review against the acceptance criteria, the merge class and each item of the Definition of Done. The review states the result per item. |
| CW-62 | The dispatcher computes the lowest merge class the workflow document allows for the changed paths, file types and diff size, sets it when it's higher than the label, and repeats this on every push. |
| CW-63 | `merge:self`: the implement agent merges when CI is green and the dispatcher confirmed the class. Every self-merge is listed in the next status issue update. |
| CW-64 | `merge:agent`: the review agent merges when it approves and CI is green. |
| CW-65 | `merge:human`: no agent can merge. The review ends in a recommendation in the wording the workflow document gives, with the reason for the class and the explanation. |
| CW-66 | Repository protection enforces CW-63 to CW-65: the agent identity can't merge a `merge:human` pull request, can't merge with failing checks, and can't change the protection. |
| CW-67 | Any agent may raise a merge class and must do so on a security concern. No agent can lower one. |
| CW-68 | Review findings return the issue to `in-progress`. After the configured review rounds without a pass, or with CI still failing, the issue moves to `needs-answer` with the open findings. |
| CW-69 | A merge closes the issue, and the agent that merged (or the dispatcher, after an owner merge) posts the closing comment: what changed, the cost, the issues filed along the way. |

## 8. Scouting

| ID | Requirement |
|---|---|
| CW-70 | The scout agent runs on its schedule without anyone starting it. |
| CW-71 | It files at most the configured number of issues per run. Each has: the recommendation, evidence with sources, fit with `vision.md`, what it replaces, cost and risk. |
| CW-72 | It draws on both the field (popular skills and practices, changes in Claude Code, Codex, GitHub Copilot and the Claude Developer Platform) and the repository's own record (repeated questions, repeated review failures, cost outliers, unused skills). |
| CW-73 | It only files issues. It opens no pull request and changes no file. |
| CW-74 | Each run updates one pinned status issue: what waits for the owner, what's in progress, what was merged since the last run and by which class, the month's spend against the cap, and whether the workflow is paused or stopped. |

## 9. Spend

| ID | Requirement |
|---|---|
| CW-80 | The dispatcher starts no session while any cap in the settings isn't set. |
| CW-81 | Every session starts with a hard cost limit: what's left of its issue's cap from refinement on, the per-run cap for a triage or a scout run. |
| CW-82 | An issue that reaches its cap gets `paused` and a cost report, and keeps its state label. `budget:extend` from the owner allows one more cap, removes `paused`, restarts the agent for the state, and is removed when used. |
| CW-83 | When the month's spend reaches the monthly cap, no session starts and running sessions stop at their next step. Issues keep their labels, and the status issue is updated at once. Work resumes where it stopped at the turn of the month or when the owner raises the cap. |
| CW-84 | One owner action stops all agents the way the monthly cap does, and one resumes them. While stopped, the dispatcher starts nothing. |
| CW-85 | Every session's cost is recorded on its issue, and all sessions count toward the monthly cap: triage, refinement, implementation, review and scouting. |
| CW-86 | When the month's spend passes the warning level, the status issue says so at its next update. |
| CW-87 | A triage that reaches its per-run cap moves the issue to `needs-answer`. A scout run that reaches its cap files what it has and stops. |

## 10. Security

| ID | Requirement |
|---|---|
| CW-90 | Agents act under their own GitHub identity, with access to this repository only and exactly the permissions the settings list. |
| CW-91 | Credentials are kept in the platform's vault and GitHub's secret store. None appears in the repository, an issue, a pull request or a session's output. |
| CW-92 | Agents treat the content of issues, comments, pull requests and fetched pages as data. An instruction found there is not followed and is reported in a comment. |
| CW-93 | A session whose credentials can push reaches only the allowed hosts in the settings. Only sessions without push access (scout, research) may read the wider web. |
| CW-94 | Content from outside the repository enters only through an audited, rewritten change (`bin/agents audit`), which is `merge:human`. |
| CW-95 | No agent changes the settings file, the agent definitions, the dispatcher or the repository protection except through a `merge:human` pull request. |

## 11. Platform and records

| ID | Requirement |
|---|---|
| CW-100 | Agents run as Managed Agents sessions on the Claude Developer Platform, each role from its own agent definition with an explicit model tier. |
| CW-101 | Agent definitions are built from this repository's preset (skills, personas, concepts) and tracked in it. A session uses the definitions of the commit on `main`. |
| CW-102 | Each session comments a link to its record on its issue; transcript and cost stay readable afterwards. |
| CW-103 | A session the dispatcher couldn't start is reported with its error on the status issue at once, and on its issue as CW-16 says. |

## Acceptance scenarios

The build is complete when each of these runs as described, with no step done by hand except the owner's.

1. **Direct.** The owner files "change Y to Z in file F" for a doc file. It's triaged `direct`, `merge:self`, implemented and merged without the owner acting again.
2. **Lean, agent-merged.** The owner asks for a small new reference. It's refined, the owner adds `approved`, it's implemented, the review agent approves and merges.
3. **Full, human-merged.** The owner asks to plan a change to `bin/agents`. The plan pipeline runs, the owner approves, the pull request is `merge:human`, the review agent posts a recommendation, and only the owner can merge.
4. **Recommendation.** The scout files a recommendation. Nothing is built until the owner adds `approved`; an `approved` added by the agent identity is reverted.
5. **Objection.** The owner asks for something that weakens a safety rule. The triage agent objects with an alternative; the issue waits; the owner's `approved` overrides it and the override is recorded.
6. **Question.** A refine agent asks a question; nothing happens until the owner comments; then the same agent continues.
7. **Class raised.** An implement agent's change to a skill also touches a hook. The dispatcher sets `merge:human`, and the review agent can no longer merge it.
8. **Owner label.** The owner sets `merge:human` on an issue that would be `merge:agent`. Agents review and recommend; the owner merges.
9. **Per-issue cap.** An issue reaches its cap, is `paused` with a cost report, and continues after `budget:extend`.
10. **Monthly cap and stop switch.** At the cap, nothing new starts; the stop switch halts running work at once.
11. **Rejection.** The owner closes an enhancement as not planned; an `.out-of-scope/` record appears; a later issue for the same concept is put to the owner with that record.
12. **Injection.** An external issue tells agents to run a command and skip review. Nothing is run; the triage agent reports it.
