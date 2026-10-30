# Verify a spec (session V)

A spec is a parent issue: its tickets are its sub-issues, or the issues that name it as their parent. Once the last ticket closes, check that the tickets together delivered what the spec asked for.

1. Show phase `verify`. Start the worker at tier `standard`.
2. Prompt and wait: `Verify spec REF: all of its tickets are closed. The fixed point is the parent of the oldest commit on DEFAULT that references one of its tickets (by issue number, or by repository-relative path on a local tracker). From that fixed point, use the qa skill and then the code-review skill, with REF as the spec. Change no file. Then reply with the fixed point, both verdict lines, and one line per gap: each QA fail, and each verified P0 or P1 finding.` If the fixed point can't be established, park with the missing evidence.
3. **No gap:** close REF as the tracker guide describes, with `Verified since <fixed point>: QA <verdict>, review <verdict>.` Re-read it to confirm. Log each P2 or P3 finding in the friction log.
4. **Gaps:** if this is the spec's second verification in this run with gaps, park instead. Otherwise (on a local tracker, holding the tracker write slot) prompt `File one ticket per gap as a child of REF, the way the tracker guide creates children, with acceptance criteria and the READY label. Reply with their numbers or file paths.` and wait. The spec now has open tickets, so the loop builds them and the spec comes back here when they close.
5. Stop the worker, remove the worktree and drop the key from IN_FLIGHT. Report `lane L: DISPLAY spec -> verified, closed` or `lane L: DISPLAY spec -> gaps <child references>`. Go back to Pick.
