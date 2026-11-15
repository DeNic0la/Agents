---
name: sql-queries
description: Use when writing or fixing SQL for analysis - turning a data need described in words into a query, building multi-CTE queries with joins, window functions or aggregations, optimizing a slow query on a large or partitioned table, translating between dialects, or debugging a failing query. Covers Snowflake, BigQuery, PostgreSQL, Redshift, Databricks and others.
---

# SQL Queries

## Overview

Write SQL that is correct first, then fast, then readable, in the dialect the user actually runs. Most wrong answers from SQL aren't syntax errors: they're joins that multiply rows, filters in the wrong place and partial periods.

## When to Use

- Any analytical query: from a one-line count to a cohort or funnel analysis.
- Optimizing, translating or debugging an existing query.

Not for application database code (ORM queries, migrations, schema design; for schemas use `schema-design`).

If the project or the user's skills include a company-specific data skill (such as `<company>-data-analyst`, made with the `data-context-extractor` skill), follow its entity definitions, standard filters and metric formulas.

## Workflow

### 1. Understand the request

Identify the output columns, filters (time range, segments, statuses), aggregations, joins, ordering and any top-N limit. If the metric definition is ambiguous ("active user", "revenue"), ask, or state the definition you used.

### 2. Know the dialect

If it isn't known yet, ask: PostgreSQL, Snowflake, BigQuery, Redshift, Databricks, MySQL, SQL Server, DuckDB, SQLite or another. Remember it for the rest of the session. Syntax and performance notes per dialect are in [references/dialects.md](references/dialects.md) (read the section for the dialect in use when writing dialect-specific functions or tuning performance).

### 3. Discover the schema

If a data warehouse is connected: find the relevant tables, check column names and types, look for partition or clustering keys, and check for views or materialized views that already do part of the work. Otherwise, ask for the table definitions instead of guessing column names.

### 4. Write the query

**Structure:**

- CTEs for queries with several logical steps: one CTE per step, named for what it holds (`daily_signups`, `active_users`).
- Each major clause on its own line, consistent indentation, meaningful aliases (not `a`, `b`, `c`).
- Comments for the "why" of non-obvious logic.

**Correctness:**

- Know each join's cardinality. If a join can be one-to-many, count `DISTINCT` keys or aggregate before joining.
- Use the join type you mean: `LEFT JOIN` keeps unmatched rows, and a `WHERE` on the right table turns it back into an inner join (put that condition in `ON`).
- Guard every division: `x / NULLIF(y, 0)`, or the dialect's safe division.
- Exclude incomplete periods, or label them.
- Be explicit about time zones when truncating timestamps to dates.

**Performance:**

- No `SELECT *` outside exploration: list the columns (on BigQuery it's also what you pay for).
- Filter early, and always on partition columns when they exist.
- Prefer `EXISTS` over `IN` for large subqueries, and window functions or joins over correlated subqueries.
- Use `LIMIT` and sampling while exploring.

Ready-made patterns for window functions, multi-step CTEs, cohort retention, funnels and deduplication are in [references/patterns.md](references/patterns.md) (read when the query needs one of them).

### 5. Present it

1. The complete query in a `sql` code block.
2. A short explanation of each CTE or section.
3. Performance notes when relevant: partition use, expected cost, likely bottlenecks.
4. How to adapt it: another time range, grain or filter. Say if it's parameterized or safe to re-run.

### 6. Run it, if you can

If a data warehouse is connected, offer to run it, then sanity-check the result: row count, nulls, magnitude. Otherwise the query is ready to paste.

## Debugging a failing query

1. **Syntax error:** check dialect-specific syntax (`ILIKE` doesn't exist in BigQuery; `SAFE_DIVIDE` exists only there).
2. **Column not found:** check names against the schema, including case sensitivity (quoted identifiers in PostgreSQL, unquoted uppercase in Snowflake).
3. **Type mismatch:** cast explicitly (`CAST(col AS DATE)`, `col::DATE`).
4. **Division by zero:** `NULLIF(denominator, 0)` or the dialect's safe division.
5. **Ambiguous column:** qualify every column with its table alias in joins.
6. **GROUP BY error:** every non-aggregated column belongs in `GROUP BY`.
7. **Runs, but the numbers are wrong:** compare row counts before and after each join, and check each filter on its own.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The join key looks unique." | Check it: `SELECT key, COUNT(*) ... HAVING COUNT(*) > 1`. Join explosion inflates sums silently. |
| "`SELECT *` is fine for now." | It ends up in the final query and scans every column. List what you need. |
| "I'll guess the column names and fix errors as they come." | Guessed names that happen to exist give wrong answers without errors. Read the schema. |

## Verification

- [ ] The query runs in the target dialect (or was checked against its syntax notes).
- [ ] Join cardinality is known, and counts were checked after joins that could multiply rows.
- [ ] Divisions are guarded, and partial periods are excluded or labeled.
- [ ] The explanation states the metric definitions used.
