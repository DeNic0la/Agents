---
name: schema-design
description: Designs or reviews relational and warehouse schemas - tables, keys, types, constraints, indexes, partitioning and audit columns - for PostgreSQL, MySQL, Snowflake, BigQuery or DuckDB, and delivers them as a migration with the trade-offs explained. Use when creating or changing tables, writing a schema migration, modelling a new entity in the database, reviewing a schema or migration, or when a table has outgrown its design (slow queries, missing constraints, growth past millions of rows).
license: MIT
---

# Schema Design

## Overview

A schema that works on a laptop can fail at production scale or let bad data in. This skill designs tables from how they're written and read, makes the database enforce what it can, and explains every choice. The result is a migration in the project's own tool, not a loose `CREATE TABLE`.

## When to Use

- New tables or columns, a new entity, a schema migration.
- Reviewing a schema or migration someone else wrote.
- A table that is slow, lets bad rows in, or is growing past what its design handles.

Not for analytical queries on an existing schema (`sql-queries`), profiling an unknown table (`explore-data`), or naming the domain itself (`domain-modeling`). Moving existing data or retiring old tables safely is `deprecation-and-migration`.

## Workflow

### 1. Look before asking

Find out what the project already does:

- the engine and version (connection config, `docker-compose`, CI services, the ORM dialect)
- how schema changes ship: the migration tool (Flyway, Liquibase, Alembic, Prisma, Rails, Django, EF, plain SQL files) and its naming
- the existing conventions: table and column naming, key type, timestamp type, soft deletes, audit columns, enums
- the domain's terms (`GLOSSARY.md` or ADRs, if they exist); table and column names follow them

The project's conventions win over the defaults below. Note where they differ and why, but don't change existing tables unasked.

### 2. Settle what you couldn't find

Ask only what the project doesn't answer, in one message:

- **Access patterns:** which queries read this table, filtered and sorted by what, and how often.
- **Write pattern:** single-row transactional, bulk loads or streaming; updates, or append-only.
- **Scale:** expected rows in two years (thousands, millions, billions).
- **Retention:** forever, or archived or deleted after a period. Personal data needs a deletion path.

### 3. Design

Apply the principles below, then read the section for your engine in [references/engines.md](references/engines.md): what it enforces and how it indexes differs a lot. Common shapes (users, events, history, audit log) are in [references/patterns.md](references/patterns.md); read it when the table matches one.

**Keys**
- A surrogate primary key: 64-bit integer identity (`BIGINT GENERATED ALWAYS AS IDENTITY` in PostgreSQL) or a UUID when IDs are created outside the database or must not be guessable (prefer UUIDv7 for index locality).
- The business key (email, external ID, order number) gets a `UNIQUE` constraint. That constraint already creates an index; don't add a second one.

**Types**
- The narrowest type that holds every valid value: `numeric`/`DECIMAL` for money (never float), a timezone-aware timestamp for moments in time, `date` for calendar dates, `boolean` for flags.
- Semi-structured data (`jsonb`, `VARIANT`, `JSON`) only for data you don't filter or join on regularly. Promote a field you query to a column.

**Constraints**
- `NOT NULL` by default; every nullable column has a reason.
- `CHECK` for ranges and allowed values, foreign keys for references. Where the engine doesn't enforce them (Snowflake, BigQuery), declare them for documentation and enforce them in the load pipeline with tests.

**Indexes** (row stores: PostgreSQL, MySQL)
- One index per real query pattern, not per column. A composite index serves queries on its leading columns: put equality columns first, then range or sort columns (`(user_id, created_at DESC)`).
- Index foreign key columns that are joined on or that parents are deleted by. PostgreSQL doesn't do it for you; MySQL InnoDB does.
- Low-cardinality columns (status, flags) rarely deserve their own index; use them in a composite or a partial index (`WHERE status = 'active'`).
- Every index slows writes. On a write-heavy table, justify each one.

**Partitioning and clustering**
- Only for large tables with a natural time or tenant key in most queries: roughly tens of millions of rows in PostgreSQL, multi-terabyte in Snowflake, and in BigQuery whenever queries filter by date (it cuts cost). Below that, an index does the job with less complexity.

**Audit and lifecycle**
- `created_at` and `updated_at` on every mutable entity table. `updated_at` doesn't update itself: add a trigger or make sure the ORM sets it.
- Soft delete (`deleted_at`) only when the product needs restore or history; it complicates every unique constraint and query. Otherwise delete, or move rows to an archive table.

### 4. Deliver

1. Write the change as a migration in the project's tool and naming, reversible where the tool supports it.
2. Comment the non-obvious choices in the migration or the table comments: why this key, why this index, why this column is denormalized.
3. Summarize for the user: the tables, the main query each index serves, the trade-offs you made, and what would need to change at 10x scale.
4. On a table that already holds data, check that the migration is safe: adding a `NOT NULL` column without a default, building an index without `CONCURRENTLY` (PostgreSQL) or changing a type can lock or rewrite a large table. Split risky changes into steps (add nullable, backfill, then constrain).

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The application validates it." | Every other writer (scripts, imports, a second service, a hotfix) skips the application. The database is the last line. |
| "Index every column just in case." | Unused indexes cost writes and storage and confuse the planner. Index the queries you know. |
| "We'll add constraints later." | Later means cleaning bad rows first. Adding them on day one is free. |
| "INT is enough for IDs." | Changing a key type on a large table is a painful migration. BIGINT costs four bytes. |
| "Partition it now, it'll get big." | Partitioning a small table adds constraints and planning overhead for no gain. Wait for the size and the access pattern. |

## Red Flags

- An index duplicating a `UNIQUE` or primary key constraint.
- Foreign keys without an index on a large child table (PostgreSQL).
- Floats for money, timestamps without time zone for events, `VARCHAR(255)` everywhere without thought.
- Nullable columns with no stated reason.
- `CHECK` and `FOREIGN KEY` relied on in Snowflake or BigQuery, where they aren't enforced.
- A migration that rewrites or locks a large table in one step.
- Names that differ from the domain's terms, or abbreviations (`usr_id`, `uid`) next to full names.

## Verification

- [ ] The engine, migration tool and conventions came from the project, or the user confirmed them.
- [ ] Every index maps to a named query pattern, and none duplicates a constraint.
- [ ] Every nullable column and every denormalized column has a stated reason.
- [ ] Constraints the engine doesn't enforce have a pipeline check named.
- [ ] The migration runs, up and down, against a local or scratch database when one is available. Otherwise say it wasn't run.
- [ ] For the main queries, `EXPLAIN` uses the intended index or partition pruning (when a database with data is available).
- [ ] The migration is safe on a table of the expected size, or split into steps.
