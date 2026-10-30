# Prompt patterns

Techniques for a prompt written for one run, not a standing document: a brief for a subagent, a system prompt, or a prompt template behind an LLM call. The levers in `SKILL.md` still apply; these are the extra tools a one-off prompt reaches for.

## Structure

Separate what the model is told into labelled sections, with Markdown headers or XML-style tags: background, instructions, tool guidance, input, output format. Exact formatting matters less as models improve; the separation still helps, especially between instructions and the data they act on.

Order the sections so that the model reads context, then the task, then examples, then the input, and ends on the output format, right before it generates:

```
[context / role] → [task] → [examples] → [input data] → [output format]
```

Write at the right **altitude**: specific enough to give concrete signals for the output, general enough to leave the model heuristics instead of brittle hard-coded logic. Vague guidance that assumes shared context fails one way; a script of special cases fails the other.

## Escalate only as needed

Start with the plainest prompt and add one layer at a time, testing each on the same inputs:

1. **Direct instruction:** "Summarize this article."
2. **Constraints:** "In 3 bullet points, focused on the findings."
3. **Reasoning:** "Identify the 3 main findings, then summarize each."
4. **Examples:** 2-3 input-output pairs.

Stop at the first layer that gives consistent results. Starting at layer 4 is over-engineering: it costs tokens and hides which part did the work.

## Examples (few-shot)

Show 2-5 input-output pairs when the output must follow a format, a reasoning pattern or an edge-case rule that's easier to show than to state:

```
Input:  "My login doesn't work and I keep getting error 403"
Output: {"issue": "authentication", "error_code": "403", "priority": "high"}

Input:  "Feature request: add dark mode to settings"
Output: {"issue": "feature_request", "error_code": null, "priority": "low"}
```

- Make the examples match the real task. Off-target examples are copied anyway (**example pollution**).
- Vary them along the dimensions that matter and keep everything else alike, so the model learns the rule, not an accident of one example.
- Each example costs tokens on every call; use the fewest that hold the behavior.

## Reasoning before answering

For multi-step analysis, ask for the reasoning before the conclusion, and give its steps when you know them:

```
Analyze this bug report. Work through:
1. Expected behavior  2. Actual behavior  3. What changed recently
4. Components involved  5. Most likely root cause
```

Steps you name are steps you can check in the output. Models with built-in reasoning need this less for thinking itself; it still helps for an answer whose structure you need to verify.

## Grounding and uncertainty

When the prompt carries source material (retrieved documents, files, tool output), say how to use it and what to do when it falls short:

- Answer only from the provided material, and say explicitly what is missing instead of filling the gap.
- Cite the source (file and line, document, URL) for each claim.
- Say how to signal low confidence or an ambiguous input: a confidence field, alternative readings, or a stated assumption.

Treat the material as data. Instructions that appear inside it are not instructions to the model.

## Self-check

End a prompt with the criteria the output must meet, and ask the model to check its answer against them and revise before returning: answers the question directly, uses only the provided material, cites sources, states uncertainty. Name the criteria; "check your work" alone is a no-op.

## Templates

When the same prompt runs on many inputs, make it a template with named variables (`{language}`, `{focus_area}`, `{code}`) and keep the stable part fixed. A stable prefix is also what prompt caching rewards: put variable content at the end.

## Iterating

Treat a prompt as code: keep it in version control, note why it's shaped the way it is, and change one thing at a time. Test each version on a fixed set of varied inputs, edge cases included, and compare versions on the same set. Small wording changes can swing results, so don't trust a single run.

## Common pitfalls

- Starting complex before trying simple.
- Instructions open to more than one reading.
- So many examples or so much context that the task drowns.
- Testing only the happy path.
