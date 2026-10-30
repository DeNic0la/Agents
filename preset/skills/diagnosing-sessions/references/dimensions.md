# Analysis dimensions

Each analyst does one section, using the record meanings and extraction commands in the case file.

## Skill timeline

Build the per-turn record of skill and plugin use, then look for gaps.

1. List the human prompts with line numbers and timestamps.
2. List every explicit skill invocation, active-skill attribution, or read of a file named `SKILL.md`, with the line, the skill name and the human turn.
3. List every plugin, subagent type, MCP server and hook used, with where.
4. For each human turn, compare the request with the `description` of each installed skill (the skill folders are listed in the case file). Report:
   - each skill invoked, with the request before it (group by skill when there are many);
   - a turn whose request matches a skill's description with no invocation in that turn (quote the request and the description that matched);
   - a skill invoked one or more turns after the matching request (late).

Don't say whether a missed or late trigger was wrong. Report the match and the absence; the reader decides.

## Plan adherence

Recover the plan the session agreed to, then map each step to what happened. "Plan" means any agreed course of action, not git commits.

1. Find the agreed plan: a plan agreed in chat (assistant text before a human "yes", "ok" or "go ahead"), or a spec or plan file written during the session (under `docs/`, `plans/`, `specs/`, or any file the human named). A todo-list record or a numbered checklist in assistant text also counts. Quote each step with its `path:line`.
2. Mark structural events between the plan and its execution: compactions, resumes, aborted turns and subagent dispatches. Drift right after one of these is a separate finding.
3. For each plan step, find the tool calls and text that carried it out, or establish that none did. Report:
   - steps skipped (quote the step);
   - steps done out of order (line numbers show the order);
   - steps silently changed: the execution differs from the step and the assistant never said so (quote both);
   - steps invented: work no plan step covers;
   - drift right after a structural event (cite the event and the first divergent action).
4. If there is no recoverable plan, that is the only finding, with the lines you checked.

## Repeated work

1. Extract every tool call as `(line, turn, tool, key)`. The key is the file path for reads, edits and writes, and the full command for shell calls. For subagent dispatches it's the description plus the first 80 characters of the prompt, and for searches it's the query.
2. Group by `(tool, key)` and report groups at or over the threshold:

   | Category | Threshold | Exempt |
   |---|---|---|
   | reads, searches | 3 | |
   | edits | 2 | |
   | shell commands | 2 | status checks and test runs (`git status`, `ls`, `pwd`, test runners) |
   | subagent dispatches | 2 with the same description | |

3. For each group, check what changed between repetitions: a write to that file, a compaction, a human correction. A re-read after an edit is not a finding. A re-read after a compaction is a finding attributed to the compaction. A re-read with nothing in between is a finding on its own.
4. Look for re-derived decisions: assistant text that reaches a conclusion already stated earlier (same file, design choice or command). Quote both places.
5. One finding per group, with the first and last line numbers and the count.

## Stumbles

Find every point where the session stopped moving forward:

- tool results marked as errors, non-zero exits, or failure records;
- failed shell commands ("command not found", "No such file");
- retries: the same call re-issued in the same turn after an error;
- reverted edits: an edit undone by a later edit, or `git checkout`, `git restore`, `git revert` or `git reset` on a file the session touched;
- backtracking in assistant text ("actually", "let me instead", "that was wrong", "I misread");
- human corrections: a prompt that contradicts or corrects the assistant's previous action;
- permission denials, hook failures, API errors, rate limits, aborted turns, and context overflow or compaction mid-task.

For each, report the line, the turn, what failed, and what happened next: recovered in the same turn, recovered later at line N, or never recovered. Group identical repeated failures into one finding with a count.

## Quality evidence

Judge the process against its own claims. This is not a code review; don't evaluate the code.

1. **Tests:** every test run, using the project's runner named in its instruction files or the usual runners, with its result line. Report failed runs and what the assistant did next.
2. **Claims:** assistant text claiming done, fixed, passing, verified, works or complete. Look back in the same turn for a tool result that shows it. Report claims with no supporting result.
3. **Commits:** every `git commit` and its message, compared with the tool calls before it. Report messages claiming work no tool call did, and work the plan said to commit that never was.
4. **Review feedback:** where a reviewer (human or subagent) raised points, find the response. Report points acknowledged but not acted on, and points dismissed without a reason.
5. **Acceptance criteria:** if the problem statement or the plan states criteria, report each as met, not met or not checked, with the evidence line.

## Request conflicts

1. List every human prompt with line and turn, and the instructions in it (imperatives, constraints, "don't", "always", "never", "only", scope statements).
2. Report:
   - two human instructions that can't both be followed (quote both), and what the assistant did;
   - a human instruction that conflicts with a loaded instruction file (`AGENTS.md`, `CLAUDE.md`, `copilot-instructions.md` or the harness's equivalent; paths are in the case file), quoting both;
   - a human instruction to skip, ignore or override a step, skill or rule, and what happened afterwards;
   - a clarifying question the assistant asked, and the answer, when the answer changed scope.
3. Don't judge whether the user was right. Report the conflict and how the assistant resolved it.

## Cost and time

1. **Tokens:** use only the usage records and counter meanings in the case file. State whether each counter is incremental or cumulative before totalling; difference cumulative values, and never turn a missing observation into zero. Report the five turns with the largest supported totals, and the total per associated session.
2. **Wall-clock:** use the timestamp fields and event boundaries in the case file. Report the five longest turns, and any gap over ten minutes between consecutive events. Say whether it was idle, waiting on a subagent, or waiting on the user only when the records show it.
3. **Largest tool results:** the ten largest, with their tool and turn. Measure records before extracting bounded content.
4. **Compactions:** count and locate them, with the before and after counters when available and what the session was doing when each fired. Mark unsupported fields absent.
5. **Associated sessions:** count them, with usage, duration and the dispatching turn for each.
6. Report the turns, subagents, tools or repeats that dominate the totals, with numbers. Don't speculate about why a turn was expensive beyond what the transcript shows.
