# Context Fundamentals

Context is everything the model can attend to when it generates: system instructions, tool definitions, retrieved documents, message history and tool outputs. The discipline is curating the smallest set of high-signal tokens that gets the outcome you want, and doing it again every time you decide what to pass to the model.

## The anatomy of context

| Component | What it is | What to watch |
|---|---|---|
| System prompt and rules files | Identity, constraints and conventions, loaded at session start and kept throughout | Keep it at the right altitude: concrete enough to steer, not hard-coded brittle logic |
| Tool definitions | Name, description, parameters and return format of each action the agent can take | Descriptions steer tool choice. If a human can't say which tool fits a situation, the agent can't either: consolidate overlapping tools |
| Retrieved documents | Domain knowledge pulled in at runtime | Load just in time from lightweight identifiers (paths, queries, links), not everything up front |
| Message history | The conversation so far, which doubles as the agent's scratchpad for progress and decisions | Grows to dominate long tasks; summarize decisions, drop the back-and-forth |
| Tool outputs | File contents, search results, command output, API responses | Usually the largest share of tokens in an agent trajectory (one study measured about 84%). They stay in context whether or not they still matter |

## Attention is a budget

Attention relates every token to every other token, so each added token thins the attention left for the rest. Models also see far more short sequences than long ones in training, so they are less precise at long range: retrieval and long-range reasoning degrade before the window is full, even when the window technically fits more.

Two consequences:

- **Informativity over exhaustiveness.** A larger window doesn't fix memory problems. Include what matters for the decision at hand, and make the rest reachable on demand.
- **Position matters.** The start and end of context get more attention than the middle. Put stable rules first and the active task material last.

## Loading strategies

- **Just in time.** Keep identifiers in context and load the content when it's needed. A file system gives agents this for free: names hint at purpose, sizes at complexity, timestamps at relevance.
- **Pre-load.** Load stable, always-relevant material up front (rules files, the project map) for speed.
- **Hybrid.** Pre-load what rarely changes and is always needed; let the agent explore for the rest. Fast-changing or task-specific information goes just in time, so it can't go stale in context.
- **Progressive disclosure** applies at every level: skill descriptions before skill bodies, an overview before section files, a summary before the full tool result.

## Design for degradation

Know roughly how much context the task needs, watch usage as the session grows, and set a compaction trigger before quality drops (around 70-80% of the window) rather than at the limit. Assume context will degrade, and build in the summaries, handoffs and subagent boundaries that let work survive it.
