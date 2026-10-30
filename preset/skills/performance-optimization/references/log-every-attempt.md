# Log every attempt, including the reverted ones

Reverted work leaves no trace in git history, which is exactly why the same dead idea gets tried again next quarter. Keep a short ledger so a discarded idea stays discarded:

| Idea | Baseline → Result | Verdict | Why |
|---|---|---|---|
| Memoize the row component | INP 240ms → 235ms | reverted | Inside noise (±15ms). Rows weren't the bottleneck. |
| Virtualize the list | INP 240ms → 90ms | kept | Long tasks gone from the trace. |
| Preconnect to the API origin | LCP 2.8s → 2.8s | reverted | Already same-origin. |

A section in the PR description or a `PERF.md` in the repo both work. What matters is that the next person (or the next agent) reads it before proposing an experiment, and doesn't re-run one that already failed.
