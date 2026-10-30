# Context Degradation Patterns

Context degrades along a continuum, not all at once, and in five recognizable ways. Naming the pattern tells you the fix.

## The five patterns

### Lost in the middle

Recall follows a U-shape: material at the start and end of context is used reliably, material in the middle markedly less. Part of the cause is the attention the model parks on the first tokens, which leaves less for the middle as context grows.

- **Symptoms:** instructions followed in some runs and not others; constraints from early in a long prompt ignored.
- **Fix:** put critical constraints at the start and the reminders the agent must act on at the end. Use clear headers so structure can be navigated. Shrink the middle: disclose detail behind pointers, or split the work.

```markdown
<CRITICAL_CONSTRAINTS>   ← start: high attention
<DETAILED_GUIDELINES>    ← middle: lower attention, keep it short
<KEY_REMINDERS>          ← end: high attention, right before generation
```

### Poisoning

An error enters context and compounds as later steps reference it. It arrives through tool output taken as ground truth, retrieved documents that are wrong or outdated, or the agent's own summaries and intermediate outputs. A poisoned goal or plan is the worst case: every later decision builds on it.

- **Symptoms:** quality drops on tasks that used to succeed; the wrong tool or parameters; a hallucination that persists after correction.
- **Fix:** remove or replace the poisoned content. Truncate to before it, state the error explicitly and ask for re-evaluation, or restart with clean context and carry over only verified facts.

### Distraction

Irrelevant material competes for attention. The model can't skip what's in context, and it leans on provided material even when its own knowledge is better. The effect is a step, not a slope: a single irrelevant document already hurts.

- **Symptoms:** unfocused responses; irrelevant context used anyway.
- **Fix:** filter for relevance before loading. Structure context so unrelated sections are easy to set aside. Leave material reachable through a tool instead of preloading it.

### Confusion

Material from another task shapes the response: the wrong tool definitions, constraints from a different objective, requirements blended across tasks. It is common when one session switches between task types.

- **Symptoms:** answers to the wrong aspect of the request; tool calls that fit a different task; mixed requirements.
- **Fix:** segment tasks. Give each objective its own context window or subagent, and mark transitions clearly.

### Clash

Several pieces of information are each valid but contradict one another: sources that disagree, an old and a new version both present, viewpoints that are incompatible.

- **Symptoms:** stated uncertainty about conflicting facts; behavior that flips between turns; clarification requested on settled questions.
- **Fix:** surface the conflict with options and ask, set a precedence rule for which source wins, and filter out outdated versions.

## Bigger windows don't fix it

Quality stays stable up to a threshold and then drops fast; the threshold depends on the model and the task, and sits well below the advertised window. Cost and latency grow with every token, even with caching. And one context juggling dozens of independent items hits a consistency bottleneck that more room doesn't solve.

## Reading the signs

| Context use | Typical signs |
|---|---|
| About 50-70% | Occasional missed instructions, less focused answers |
| About 70-85% | Inconsistent runs, earlier instructions "forgotten", quality varies |
| Above 85% | Key constraints ignored, more hallucination, tasks fail |

The percentages are rough; the order of the signs is what to watch for.

## The four buckets

Every mitigation falls into one of four strategies:

- **Write:** save state outside the window (scratchpad files, plans, notes) and keep the active context lean.
- **Select:** pull in only what's relevant, through retrieval, filtering and prioritization.
- **Compress:** keep the information and cut the tokens: summaries, compaction, masking old tool output.
- **Isolate:** split work across subagents or sessions, so no single context grows large enough to degrade. The most aggressive, and often the most effective.
