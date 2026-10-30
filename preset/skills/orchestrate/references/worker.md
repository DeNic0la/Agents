# Driving a worker

Below, PANE, WORKER and WT are the current lane's.

## Skill prompts

The loop writes prompts as `skill:<name> <arguments>`. That's notation: before sending, translate it into the way a user invokes that skill in KIND's CLI, keeping every argument. Several of these skills are user-invoked, so a worker can't start them on its own from a plain request. Verify once at setup that each skill the loop uses (`triage`, `implement`, `qa`, `code-review`, `fix-findings`, `commit`, `refactor`, `resolving-merge-conflicts`, `ship-pr`, `retro`, `what-would-you-do`) resolves to this preset's skill in the worker; a missing or conflicting same-named skill parks the lane. Never substitute a built-in command with the same name.

Shell-quote prompts, paths and values, so the invocation reaches the worker literally. Native commands such as `/exit` keep their spelling.

## Model tiers

Each session runs at a tier from the model-tiers reference (`.agents/references/model-tiers.md`, or under `~/.agents/references/`):

| Session | Phases | Tier |
|---|---|---|
| V | verify | `deep` |
| T | triage | `deep` |
| A | implement, QA restart | `standard` |
| A | review restart, fix | `deep` |
| B | refactor, ship | `deep` |
| C | retro | `deep` |

Map the tier to a model of KIND and pass it with the CLI's own model option. When you don't know the option or the model, leave it out and log that the harness default was inherited. Never guess a model from a provider name.

## Lifecycle

- **Start:** run `herdr pane run PANE "cd WT"` (WT shell-quoted), then `herdr agent start "$WORKER" --kind "$KIND" --pane "$PANE" -- <model option for the tier>`, then `herdr pane report-metadata PANE --source orchestrate --display-agent "worker L"`. Add no auto-approval, resume or continue flags. If the start returns `agent_pane_busy` or says the name is in use, wait three seconds and retry, up to five times. If it returns `agent_not_ready`, answer the visible startup dialog.
- **Stop:** read `herdr agent get WORKER` `.result.agent.agent_session` and keep every reported session ID or absolute transcript path in SESSIONS, for the retro. Capture the evidence you need, then `herdr agent prompt WORKER "/exit"`. The pane and transcripts remain.
- **Restart:** stop the worker, confirm its process exited, then start a fresh one. Never resume the old session.
- **Show phase P:** set the lane's phase to `DISPLAY P` and run `herdr tab rename "$HERDR_TAB_ID" "<each busy lane's phase, joined by ' | '>"`.

## Prompt and wait

Send every prompt with `herdr agent prompt WORKER '<prompt>' --wait` and no `--timeout`, as a background command, so other lanes go on meanwhile. When it returns, run `herdr agent wait WORKER --until idle --until done --until blocked` in the background and let it notify you.

- `done` can come between two turns while subagents still run: run `sleep 15` and `herdr agent get WORKER`; if it's `working`, wait again.
- `blocked`: answer the dialog (`answer.md`) and wait again.

## Read the reply

Check the state with `herdr agent get WORKER`. While it's working, blocked or unknown, read with `herdr agent read WORKER --source visible --lines <n>`; read history with `--source recent-unwrapped` only once it's idle or done. If a history read returns `agent_not_idle`, read `--source visible` and go on; that doesn't park the lane.

After the worker's first completed turn, require a Herdr-reported session reference (an ID, or an absolute path); a missing one parks the lane with the exact gap. If the pane doesn't show the reply, read a reported transcript path directly. Otherwise ask the idle worker to write its last reply to a temporary file and return the path.

## The status question

Ask the worker, don't guess from scrollback:

```bash
herdr agent prompt WORKER "Reply with exactly five lines and nothing else. Line 1: BUSY=<yes if a background task or subagent you started is still running, else no>. Line 2: QA=<the verdict line of the last QA pass in this session, or NONE if none ran>. Line 3: REVIEW=<the verdict line of the code-review you ran in this session, or NONE if you did not run it>. Line 4: UNFIXED=<the code, or file:line if it has no code, of each verified finding and each QA fail that is still open: not fixed, and not settled by an answer to your question, or NONE>. Line 5: QUESTION=<a question you asked the user in this session that has no answer yet, or NONE>." --wait
herdr agent read WORKER --source recent-unwrapped --lines 40
```

A fresh worker's `NONE` means that session has no result; it doesn't erase an earlier result or its open findings. Request the full QA and review reports when a handoff gives only verdicts.

## Notify the operator

Send a desktop notification with what the OS offers, passing title and body as separate arguments so quotes in a reason can't break the command:

- macOS: `osascript -e 'on run argv' -e 'display notification (item 2 of argv) with title (item 1 of argv) sound name "Glass"' -e 'end run' "TITLE" "BODY"`
- Linux: `notify-send "TITLE" "BODY"`
- Otherwise, or if that fails: print the title and body in your pane and go on.
