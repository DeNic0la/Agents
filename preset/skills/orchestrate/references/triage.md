# Triage a bug (session T)

1. Show phase `triage`. Start the worker at tier `standard`.
2. Prompt and wait: `skill:triage REF. I am away: where you would ask me, decide with the option you recommend. The goal is an agent brief and the READY label, unless the evidence says otherwise.` Its questions go through Answer a question (`answer.md`): give a clear answer yourself, and use `what-would-you-do` when the choice isn't clear.
3. Read REF as the tracker guide describes and check its state and labels:
   - **Open with READY:** stop the worker (its session stays in SESSIONS for the retro) and go on to Implement.
   - **Still TRIAGE:** park the lane.
   - **Anything else** (closed, needs-info, ready-for-human, wontfix): log `DISPLAY triaged as <label or closed>`, stop the worker, remove the worktree, drop the key from IN_FLIGHT and go back to Pick.
