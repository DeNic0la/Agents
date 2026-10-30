# Verification Workflows for Multi-Agent Work

Checks that use fresh subagents to catch context degradation before it compounds. Give each checker a focused, single-purpose prompt and a structured output format, put checks at natural checkpoints rather than every turn, and scale the check to the stakes: light for routine work, heavy before anything other agents or people build on.

## Hallucination check

Use after an agent produces factual claims that will be committed, published or fed to the next agent.

1. **Extract claims.** A subagent lists every factual claim in the output, one per line, tagged by kind:

   ```
   [PATH]   /src/auth/login.ts exists
   [CODE]   validateCredentials() returns a boolean
   [FACT]   JWT tokens expire after 24 hours by default
   [METRIC] the function is O(n)
   ```

2. **Verify claims** in groups. A verifier checks each against the code, docs or the web and returns `STATUS: VERIFIED | FALSE | UNVERIFIABLE`, `EVIDENCE`, and `CONFIDENCE: HIGH | MEDIUM | LOW`.
3. **Score the risk:** `risk = (false × 2 + unverifiable) / total claims`.
4. **Decide:** below 0.1, proceed. From 0.1 to 0.3, review the flagged claims before proceeding. Above 0.3, regenerate: list the false and unverifiable claims with their evidence, and require the agent to verify each claim with tools before stating it, to say "I cannot verify…" instead of asserting, and to cite the file, line or source.

## Instruction-compliance check (lost in the middle)

Use when a long prompt, skill or subagent definition is followed inconsistently, or before relying on a new one.

1. **List the critical instructions** the prompt requires, numbered.
2. **Run the same prompt 3-5 times** on one representative task that exercises all of them, in independent runs.
3. **Check each run** with a fresh verifier that receives the prompt, the instruction list and that run's output, and marks each instruction `FOLLOWED | VIOLATED | NOT_APPLICABLE` with a quote as evidence.
4. **Aggregate** per instruction: `compliance = followed / applicable runs`. 100% is reliable; 80% or more is mostly reliable; 50-80% is at risk (the typical lost-in-the-middle signal); below 50% is frequently ignored.
5. **Fix the at-risk instructions:** move them to the start or end, turn a buried list into a numbered checklist with a "before finishing, confirm items 1-3" line at the end, or split the prompt so the middle shrinks. Re-run to confirm.

## Error propagation trace

Use when a chain of agents produced a wrong result and you need to know where it came from.

1. **Record each agent's output** in the chain.
2. **List the errors** in the final output with location and severity.
3. **Trace each error backward.** For each agent, from last to first: is the error in its output? Was it in its input? In the output but not the input means the agent introduced it; in both means it propagated it, from context or from tool output.
4. **Measure:** per agent, errors introduced, propagated and caught.
5. **Add an error boundary** after the agents that introduce errors: a verifier that checks for their typical mistakes. Fix or regenerate on failure, and only then hand off to the next agent.

## Relevance scoring of a prompt

Use when a prompt, rules file or skill feels bloated and you're unsure what to cut.

1. **Split the prompt** into 3-15 coherent parts (each header or tagged section is a part; don't split mid-thought).
2. **Score the parts in parallel** against one task description. Each scorer returns a 0-10 score and how often the agent would use the part (`ALWAYS` to `NEVER`):
   - 8-10 essential: the task fails or goes wrong without it.
   - 5-7 helpful: improves quality, not required.
   - 2-4 marginal: rarely relevant.
   - 0-1 distractor: competes for attention and adds nothing.
3. **Act on parts below the threshold:** remove them, move a buried useful line into the part it belongs to, or condense. The default threshold is 5; use 3 when the budget is tight and 7 for critical prompts.

## Session health check

Use in long sessions (roughly 20 turns and up), or before a critical decision.

Every 10 turns or so, a fresh checker reviews the recent turns against the symptoms of the five degradation patterns:

- **Lost in the middle:** early instructions missed, information requested that was already given.
- **Poisoning:** the same error repeating, wrong facts treated as true, hallucinations that survive correction.
- **Distraction:** unfocused answers, irrelevant context used, quality dropping on tasks that used to work.
- **Confusion:** requirements from different tasks mixed, wrong tool for an obvious task.
- **Clash:** uncertainty about conflicting information, inconsistent behavior between turns.

It returns `HEALTH: HEALTHY | DEGRADED | CRITICAL` with the symptoms seen. On degraded or critical, write the essential state to a file (scope, decisions, status, next step, verification results) and continue in a fresh session that starts from that file.
