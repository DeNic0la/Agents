---
name: explore-data
description: Use when meeting a table, dataset or file (CSV, Excel, Parquet, JSON) for the first time, before answering questions with it - to learn its grain, keys, null rates and column distributions, spot quality problems like duplicates, placeholder or impossible values, or decide which dimensions and metrics are worth analyzing. Produces a data profile with flagged issues and suggested next analyses.
---

# Explore Data

## Overview

Profile a dataset before analyzing it: its shape, its quality and its patterns. Ten minutes of profiling prevents an analysis built on a duplicated key or a column that's 40% null.

## When to Use

- A new table or file, or one you haven't used for this kind of question.
- Before writing analytical queries against unfamiliar data.
- Documenting a table for a team.

Not for:

- Answering a specific business question: use the `analyze` skill (after profiling, if the data is new).
- Checking a finished analysis: use the `validate-data` skill.
- Formal significance tests or outlier methods: use the `statistical-analysis` skill.

## Workflow

### 1. Access the data

- **Data warehouse connected:** resolve the table name (schema prefixes; suggest matches if ambiguous), read its metadata (columns, types, descriptions), then run profiling queries. Write them with the `sql-queries` skill.
- **A file:** load it and infer the column types.
- **Neither:** ask for a table name or a file. If the user only describes a schema, give them the profiling queries to run.

For very large tables (100M+ rows), profile a sample and say so. Get exact counts only where they matter.

### 2. Understand the structure

- Row and column counts.
- **Grain:** one row per what?
- **Primary key:** which column(s), and are they actually unique?
- Last update, and how far back the data goes.

Classify each column: identifier, dimension (categorical, for grouping), metric (quantitative), temporal, text, boolean, or structural (JSON, arrays).

### 3. Profile every column

- **All:** null count and rate, distinct count and cardinality ratio, top 5-10 values with frequencies, bottom 5 values (where anomalies hide).
- **Numeric:** min, max, mean, median, standard deviation, p1/p5/p25/p75/p95/p99, zero count, negative count.
- **String:** min/max/average length, empty strings, format patterns, case consistency, leading or trailing whitespace.
- **Date/time:** min and max, nulls, future dates, distribution by month or week, gaps.
- **Boolean:** true, false and null counts, true rate.

### 4. Flag quality issues

- **Nulls:** above 5% warn, above 20% alert.
- **Cardinality surprises:** a `user_id` with 50 distinct values, or a "category" with 10,000.
- **Suspicious values:** negative amounts, future dates in history, placeholders (`N/A`, `TBD`, `test`, `999999`, `-1`).
- **Duplicates** on the natural key.
- **Skew** extreme enough to distort averages.
- **Encoding:** mixed case, trailing whitespace, inconsistent formats ("USA", "US", "us").

Severity levels, consistency and accuracy checks, and how to characterize distributions and time patterns are in [references/quality-and-patterns.md](references/quality-and-patterns.md) (read when grading issues or describing patterns). Flags are heuristics: each is worth a look, not each is a real problem.

### 5. Find relationships and patterns

- Foreign-key candidates that link to other tables.
- Hierarchies (country > state > city).
- Numeric columns that move together (flag |r| > 0.7, and say correlation isn't causation).
- Derived or redundant columns.

### 6. Recommend what to analyze

- The best dimensions for slicing (3-50 distinct values), the key metrics, the time columns for trends, and the join keys.
- 3-5 concrete next analyses, such as "trend of `revenue` by `order_date`, split by `region`" or "investigate the 18% nulls in `country`".

## Output

```
## Data profile: <table>

### Overview
- Rows: 2,340,891
- Columns: 23 (8 dimensions, 6 metrics, 4 dates, 5 IDs)
- Grain: one row per order line; key (order_id, line_no) is unique
- Date range: 2021-03-15 to 2024-01-22

### Columns
<summary table, grouped by type>

### Quality issues
<issue, severity, evidence>

### Recommended next analyses
<numbered list>
```

To write the profile up as lasting table documentation, or to explore a whole unfamiliar warehouse, use [references/schema-documentation.md](references/schema-documentation.md) (read when documenting a table or tracing lineage).

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The column is called `id`, so it's unique." | Check. Duplicate keys are the most common cause of inflated numbers. |
| "Nulls are probably fine." | A 20% null rate in a filter column silently drops a fifth of the data. Measure it. |
| "I'll profile after a first answer." | Then the first answer is built on assumptions. Profile first. |

## Verification

- [ ] Grain and key uniqueness are stated with evidence (the query or count).
- [ ] Every column has a null rate and type classification.
- [ ] Quality issues have a severity and the evidence behind them.
- [ ] Next analyses name real columns.
