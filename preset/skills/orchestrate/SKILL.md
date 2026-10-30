---
name: orchestrate
description: Work through the issue queue unattended in parallel lanes, with agent workers in Herdr panes and git worktrees.
license: MIT
compatibility: Requires Herdr (terminal panes with agent control) and a Herdr integration for the agent CLI running this skill, git with worktrees, gh for pull requests on GitHub, and Node.js 18.17+ or Bun for scripts/next-issue.mjs. Issues live on GitHub or in a local Markdown tracker.
---

# Orchestrate

> **Repo version first:** if this repository has `.agents/skills/orchestrate/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

You are the orchestrator. You don't write code. You pick issues, drive worker agents of the same kind as you, and check their results. The work runs in LANES parallel lanes: each lane is a Herdr pane beside yours plus its own git worktree, and works one issue at a time. A spec whose tickets are all closed comes first, then bugs, then other tickets. Each ticket runs through up to four worker sessions, each with a fresh context:

1. **T:** the `triage` skill, only for a bug not yet triaged.
2. **A:** the `implement` skill, then QA, review and fixes of what it left.
3. **B:** the `refactor` skill, then the `ship-pr` skill to merge.
4. **C:** the `retro` skill over A and B, reporting candidates without applying them.

A finished spec gets one session **V** that checks the whole spec against the code. Repeat until a stop condition is met. **Never ask the user anything**, through a question tool or otherwise: answer every question and dialog as [references/answer.md](references/answer.md) describes.

**Which skill:** to build one spec on one integration branch with subagents and no Herdr, use `implement-spec`. For one ticket, use `implement`.

## Setup

1. **Herdr.** Run `test "${HERDR_ENV:-}" = 1`; if it fails, say you're not inside Herdr and stop. This run needs the local Herdr socket, GitHub and the checkout's git metadata: confirm the socket with `herdr agent list` and GitHub with the default-branch query in step 5, through the host's permission mechanism. If access is denied, report the exact blocked operation and stop. Run `herdr --skill` and follow its rules. Parse every ID from JSON output. Never close a tab or pane you didn't create.
2. **Names.** PROJECT is the repo folder name (`basename "$(git rev-parse --show-toplevel)"`) made a valid Herdr agent name: lowercase, every character outside `a-z0-9_-` changed to `-`, leading non-letters dropped, at most 20 characters. K is the lowest positive number not used by a live `PROJECT-orch-K` or `PROJECT-work-K-L` agent or an existing `.worktrees/orch-K-L` path (check `herdr agent list`, `git worktree list --porcelain` and the folder). Before any check that can stop, run `herdr agent rename "$HERDR_PANE_ID" PROJECT-orch-K` and `herdr pane report-metadata "$HERDR_PANE_ID" --source orchestrate --display-agent orchestrator`.
3. **Worker kind.** KIND is the agent harness running this skill, as Herdr names it (`herdr agent get "$HERDR_PANE_ID"`, `.result.agent.agent`), or from authoritative session metadata. Require its CLI on the path, its kind in `herdr agent start --help`, and an enabled integration in `herdr integration status`. If anything is missing, report it and stop; never install or upgrade. Every worker uses KIND. Read [references/worker.md](references/worker.md) now.
4. **Tracker.** The issue tracker and triage label vocabulary are in `.agents/issue-tracker.md`. If it's missing, or the tracker is neither GitHub nor a local Markdown tracker, or it names no label for bugs, say so and stop: this skill never generates it, since it can't ask. READY, BUG and TRIAGE are the labels for `ready-for-agent`, bugs and `needs-triage`. For a local tracker, read [references/local.md](references/local.md) now. GitHub hosts the pull requests either way.
5. **Main checkout.** Your working directory is the repo's main checkout and stays on DEFAULT all run; workers work in the lanes' worktrees. DEFAULT is `gh repo view --json defaultBranchRef --jq .defaultBranchRef.name`. Run `git switch DEFAULT && git -c pull.rebase=false pull --ff-only`. The tree must be clean, or stop. If `git check-ignore -q .worktrees/x` fails, add `.worktrees/` to `.git/info/exclude`.
6. **Queue.** LANES is the number in the arguments, or 1. RUN_START is `date -u +%Y-%m-%dT%H:%M:%SZ`. RUN is `bun` if installed, else `node`. QUEUE is `RUN <this skill's folder>/scripts/next-issue.mjs READY BUG TRIAGE`, with `--local <issues folder>` before the labels for a local tracker. Run QUEUE and print its output so the operator sees what will run. A nonzero exit is a failed read, never an empty queue.
7. **Lanes.** Open them (below).

## Lanes

Lane L (1 to LANES) has a pane, a worker named `PROJECT-work-K-L` and a worktree WT at `<repo root>/.worktrees/orch-K-L`, inside the repo so the harness's folder trust carries over. Run every git command about a lane's work as `git -C WT`. IN_FLIGHT is the set of issue keys the lanes hold, parked lanes included. REF is `#N` on GitHub or the issue file's absolute path locally; DISPLAY is `#N` or the repo-relative path. Use REF in worker prompts and DISPLAY in phase names and reports.

- **Open the lanes** once, as shell panes stacked in one column right of yours, equal heights. Lane 1: `herdr pane split "$HERDR_PANE_ID" --direction right --no-focus --cwd "$PWD"`. Lane L > 1: `herdr pane split <lane L-1's pane> --direction down --ratio R --no-focus --cwd "$PWD"`, R = 1/(LANES-L+2). Save each `.result.pane.pane_id`.
- **Create the worktree** on branch B: `git fetch origin && git worktree add -b B WT origin/DEFAULT`, or `--detach` with no branch. Don't copy `.env*` files. Workers try checks and previews without credentials; supply environment values only when a required operation needs them and the user's existing authorization allows it, otherwise park with the exact requirement.
- **Remove the worktree:** stop any live worker and confirm its process exited, then `git worktree remove WT`. Delete each local branch of the lane only after its PR is confirmed merged and its head matches the recorded PR head. A worker that hasn't exited, or a worktree with changes, parks the lane.
- **Park the lane:** stop driving it, ignore its notifications, and leave its pane, worker and worktree as they are. Its issue stays in IN_FLIGHT. Release the ship slot if it holds it (a failed post-merge workflow keeps the merge hold). Notify the operator (`PROJECT lane L needs you`, with the reason) and log the reason. Other lanes go on.

## Run the lanes

Run Pick for lanes 1 to LANES in order, so lane 1 takes the first issue. Then act on whichever lane's background wait notifies you, take that lane to its next wait, and wait again. Before running lanes concurrently, read `.agents/references/parallel-resources.md` (or `~/.agents/references/parallel-resources.md`): keep resource ownership with lane state and pass the assignment on every worker launch.

- A lane whose Pick finds nothing goes idle. Whenever an issue closes or a lane goes back to Pick, run Pick for every idle lane too: a closed issue can unblock others.
- **Ship slot:** one lane at a time runs from Sync through CI recovery, post-merge verification and Close out; others wait at Sync. A failed or blocked default-branch workflow sets a **merge hold**: other lanes may work through Refactor, but start no new issue and don't Sync or merge until it clears. If recovery parks, stop once every other busy lane reaches that boundary.
- When every lane is idle or parked, stop.

## Loop

1. **Pick.** If the operator asked to pause, the lane goes idle. Otherwise run QUEUE in the main checkout; each line is `key<TAB>title<TAB>spec|ready|triage`. Take the first key not in IN_FLIGHT, or go idle. Add it to IN_FLIGHT, set REF and DISPLAY, say `lane L: DISPLAY title`, and empty SESSIONS. Create the worktree: detached for a `spec`; otherwise on `fix/N-<slug>` for a BUG and `feat/N-<slug>` for others (N the issue number, slug the title in kebab case, at most 40 characters). For `spec`, follow [references/spec.md](references/spec.md). For `triage`, follow [references/triage.md](references/triage.md) first.
2. **Implement (A).** Show phase `implement`, start the worker at tier `standard`, and prompt `skill:implement REF` plus: `Complete implementation and QA, then stop before code-review. The orchestrator runs code-review and fixes in a fresh session.` Wait. If `git -C WT log --oneline origin/DEFAULT..HEAD` is empty, ask the status question (step 3); answer an open QUESTION and check again; otherwise report what the worker said and park.
3. **Check.** Ask the status question in [references/worker.md](references/worker.md) instead of guessing from scrollback, and keep the latest QA and review reports with their checked commits in lane state. Reuse an earlier result only if the diff since its checked commit is empty or a completed follow-up covers it. BUSY=yes: ask again every 60 seconds, park after 30 minutes. QUESTION: answer it. QA=NONE: if every commit subject since DEFAULT is `refactor`, QA is `skipped, refactor only`; otherwise show `qa`, restart the worker and prompt `skill:qa origin/DEFAULT REF`. REVIEW=NONE: show `review`, restart at the review tier, prompt `skill:code-review origin/DEFAULT REF`. Ask the status question after each.
4. **Fix.** If UNFIXED isn't NONE, show `fix` and prompt `skill:fix-findings <UNFIXED>` with the prior reports, their checked commits and the instruction to follow the follow-up verification section of the `implement` skill. Ask the status question again and answer any question. A finding settled with no edit counts as fixed. Anything still open parks the lane. Then prompt `skill:commit` so the tree is clean.
5. **Refactor (B).** Show `refactor`, restart the worker at tier `standard`, prompt `skill:refactor the changes on this branch since origin/DEFAULT`. If `git -C WT status --porcelain` prints anything, prompt `skill:commit`.
6. **Sync.** Wait for the ship slot. Show `sync` and run `git -C WT fetch origin && git -C WT rebase origin/DEFAULT`. On conflicts, log them and prompt `skill:resolving-merge-conflicts`; if a rebase is still in progress or the tree isn't clean afterwards, park. Resolved code hasn't been QA'd: prompt `skill:qa origin/DEFAULT REF` and ask the status question; a fail parks. That QA line replaces the earlier one.
7. **Ship.** Show `ship`. First re-run follow-up QA and review where Refactor or Sync changed their coverage. Prompt `skill:ship-pr QA of this branch stands: <QA line>` with the QA and review reports, checked commits, resource assignment and any existing shipping record. Let it finish the CI recovery of `ship-pr`, follow-up PRs and post-merge verification included; a failed check there is progress, not a park. Show `repair` while recovery runs, keep its record and budget across sessions, and set the merge hold as soon as a post-merge workflow fails. Confirm each merge yourself with `gh pr view <url> --json state,mergedAt,mergeCommit` and the CI outcomes with `gh`. Go on only when every PR is MERGED and the post-merge workflows at the latest merge succeeded (or none apply); clear the merge hold only with that evidence. Park when recovery stops unresolved or a push or merge is refused.
8. **Close out.** Read REF; if still open, close it with `Merged in <PR URL>.` as the tracker guide describes. Stop the worker and confirm it exited. In the main checkout, `git -c pull.rebase=false pull --ff-only`; the tree must be clean. Remove the worktree, release the ship slot, and create a detached worktree for the retro.
9. **Retro (C).** Show `retro`, start the worker at tier `standard`, prompt `skill:retro the sessions <SESSIONS>. Report candidates only. Leave this repository and external sources unchanged; don't apply candidates, create checks, file issues or open a PR.` Log each candidate. Stop the worker; if `git -C WT status --porcelain` isn't empty, park; otherwise remove the worktree.
10. **Report.** Drop the key from IN_FLIGHT. Log issues filed since RUN_START (`gh issue list --state all --search "created:>=RUN_START" --json number,title`, or new files in the local tracker) as `filed DISPLAY title`; the next Pick takes new bugs first. Print `lane L: DISPLAY -> <PR URLs>, merged, post-merge CI <outcome>, QA <verdict>, review <verdict>, lessons <none or N candidates>`. Go back to Pick.

## Operator

- **Pause:** the operator can type into your pane. "Pause" or "stop" means every busy lane finishes its issue through Report and none picks a new one; then stop. "Stop now" means stop at once.
- **Friction log:** keep a list across issues, each entry with lane and issue: every dialog and question you answered (phase, choice), every wait that returned `timeout` or `agent_prompt_stalled`, every restart outside Refactor and Retro, rebase conflicts, parked lanes and reasons, retro candidates, triage outcomes other than READY, and issues filed during the run. Print it when you stop.
- **On stop:** notify the operator once, then print the reason and the friction log. Title `PROJECT done` with `<n> issues merged, <n> filed` when no lane parked; otherwise `PROJECT needs you` with each parked lane, its issue and reason.

## Stop conditions

Park a lane when: triage left a bug untriaged; a spec found gaps on its second verification; `implement` made no commits; a question stays open after three answer rounds or a dialog after two; the worker asks for an unsafe action; findings stay open after `fix-findings`; a rebase stays unfinished or its QA fails; CI recovery stops unresolved; a push or merge is refused; the retro changed files; a worktree with changes refuses removal; or a herdr, gh or git command about the lane fails outside a handled recovery.

Stop the run when every lane is idle or parked, or the operator paused. Stop at once when a Setup step or a herdr command about the run itself fails. On stop, close the panes of idle lanes and leave parked lanes' panes and worktrees open for inspection.

## Rules

- One issue per lane; a lane starts its next issue only after its issue merged and its retro reported.
- One lane at a time holds the ship slot.
- Never remove a worktree this run didn't create.
- If a wait returns `timeout` or `agent_prompt_stalled`, read the pane first: the prompt may have landed.

## Supporting files

- [references/worker.md](references/worker.md): read at setup: starting, prompting, waiting for and reading workers, model tiers, the status question, notifications.
- [references/answer.md](references/answer.md): read when a worker is blocked on a dialog or has an open question.
- [references/local.md](references/local.md): read at setup when the tracker is local Markdown.
- [references/spec.md](references/spec.md): read when Pick returns a `spec`.
- [references/triage.md](references/triage.md): read when Pick returns a `triage` bug.
- `.agents/references/parallel-resources.md` (or `~/.agents/references/parallel-resources.md`): read before running lanes concurrently.
