---
name: analyze
description: Use when the user asks a business question that data should answer, from a single number ("how many signups last week?") to what's driving a trend or drop, a segment comparison over time, or a formal data report for stakeholders. Gets the data, analyzes it and presents a validated answer at the right depth.
---

# Analyze

## Overview

Answer a data question at the depth it needs: a quick answer, a full analysis or a formal report. The answer is only as good as the data behind it, so every result is sanity-checked before it's shown.

## When to Use

- A concrete question about metrics, trends, segments or causes of a change.
- A request for a data report or business review.

Not for:

- Getting to know an unfamiliar table or file first: use the `explore-data` skill.
- Choosing or interpreting a statistical method (significance, outliers, forecasts): use the `statistical-analysis` skill alongside this one.
- Reviewing an analysis that already exists: use the `validate-data` skill.

## Workflow

### 1. Understand the question

Decide:

- **Depth.** Quick answer (one metric, simple filter, a lookup), full analysis (several dimensions, trends, comparisons, "what's driving X?") or formal report (methodology, caveats, recommendations).
- **Data needed.** Tables, metrics, dimensions and time range.
- **Output.** A number, a table, a chart, a narrative, or a mix.

If the time range, segment or metric definition is ambiguous and changes the answer, ask before querying.

### 2. Get the data

If a data warehouse is connected:

1. Explore the schema to find the relevant tables and columns.
2. Write the queries with the `sql-queries` skill, run them and read the results.
3. If a query fails, fix it (column names, table references, dialect syntax) and retry.
4. If the results look unexpected, run sanity checks before going further.

Otherwise, ask the user to paste query results, share a CSV or Excel file, or describe the schema so you can write queries for them to run.

### 3. Analyze

- Calculate the metrics, aggregations and comparisons the question needs.
- Look for patterns, trends, outliers and anomalies.
- Compare across dimensions: time periods, segments, categories.
- Break a complex question into sub-questions and answer each.
- For significance, outliers or forecasts, apply the `statistical-analysis` skill.

### 4. Validate before presenting

- **Row counts:** does the number of records make sense?
- **Nulls:** are unexpected nulls skewing the result?
- **Magnitude:** are the numbers in a plausible range?
- **Continuity:** do time series have unexpected gaps?
- **Aggregation:** do subtotals sum to totals?

Investigate anything that fails, and carry what you can't resolve into the caveats. For a formal report, run the full `validate-data` review before handing it over.

### 5. Present

- **Quick answer:** the answer first, with the context needed to read it, and the query used.
- **Full analysis:** the key finding first, then supporting tables or charts, the method and caveats, and follow-up questions worth asking.
- **Formal report:** executive summary, methodology and data sources, detailed findings with evidence, caveats and data-quality notes, recommendations and next steps.

### 6. Visualize where it helps

When a chart says it faster than a table, use the `data-visualization` skill. For several charts with filters in one shareable file, use the `build-dashboard` skill.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The query ran, so the number is right." | A query that runs can still double-count through a join or drop rows through a filter. Check row counts and magnitude first. |
| "It's just a quick lookup, no caveats needed." | If the data has a known gap or partial period, a one-line caveat is the difference between an answer and a wrong answer. |
| "I'll show all the numbers and let them interpret." | Lead with the finding. A wall of tables isn't an answer. |

## Verification

- [ ] The answer matches the depth the question needed.
- [ ] The validation checks in step 4 were run, and anything unresolved is stated as a caveat.
- [ ] The queries or data sources used are shown, so the result can be reproduced.
