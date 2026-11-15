# Engines

Read the section for the engine in use. Check the engine's docs for the version the project runs before relying on a version-specific feature.

## Contents

- [PostgreSQL](#postgresql)
- [MySQL (InnoDB)](#mysql-innodb)
- [Snowflake](#snowflake)
- [BigQuery](#bigquery)
- [DuckDB](#duckdb)

## PostgreSQL

- **Keys:** `BIGINT GENERATED ALWAYS AS IDENTITY` (preferred over `BIGSERIAL`), or `uuid` (v7 where available).
- **Types:** `timestamptz` for moments, `text` with a `CHECK (length(...) <= n)` or `varchar(n)` when a limit is a business rule, `numeric(p, s)` for money, `jsonb` with a GIN index when you query inside it.
- **Enforces:** `NOT NULL`, `CHECK`, `UNIQUE`, primary and foreign keys, exclusion constraints.
- **Indexes:** B-tree by default. Foreign keys are **not** indexed automatically. Partial indexes (`WHERE status = 'active'`), expression indexes (`lower(email)`), `INCLUDE` columns for index-only scans, GIN for `jsonb`/arrays/full text, BRIN for huge append-only tables ordered by time.
- **Derived columns:** `GENERATED ALWAYS AS (...) STORED`.
- **Partitioning:** declarative range, list or hash. A primary key or unique constraint on a partitioned table must include the partition key. Create future partitions ahead of time (a job or `pg_partman`).
- **Safe migrations:** `CREATE INDEX CONCURRENTLY`; add constraints `NOT VALID`, then `VALIDATE CONSTRAINT`; a column with a constant default doesn't rewrite the table (11+), a volatile default does.
- **`updated_at`:** a `BEFORE UPDATE` trigger, or the ORM.

## MySQL (InnoDB)

- **Keys:** `BIGINT UNSIGNED AUTO_INCREMENT`. The primary key is the clustered index: a random UUID key fragments it, so store UUIDs as `BINARY(16)` in time-ordered form, or keep an integer key.
- **Types:** `DATETIME(6)` stored in UTC, or `TIMESTAMP` (limited to 2038); `DECIMAL(p, s)` for money; `utf8mb4` for text.
- **Enforces:** `NOT NULL`, `UNIQUE`, keys, foreign keys; `CHECK` from 8.0.16.
- **Indexes:** foreign keys get an index automatically. Composite and prefix indexes; functional indexes from 8.0.13.
- **`updated_at`:** `ON UPDATE CURRENT_TIMESTAMP`.
- **Safe migrations:** check which `ALTER TABLE` operations run `ALGORITHM=INSTANT` or `INPLACE`; use an online schema change tool (gh-ost, pt-online-schema-change) for large tables otherwise.

## Snowflake

- **Keys:** `NUMBER` with `IDENTITY`/`AUTOINCREMENT` or a sequence, or a natural or hashed key from the source.
- **Types:** `TIMESTAMP_TZ` or `TIMESTAMP_LTZ` for moments (`TIMESTAMP_NTZ` only for wall-clock values), `NUMBER(p, s)` for money, `VARIANT` for semi-structured data.
- **Enforces:** only `NOT NULL`. Primary, unique and foreign keys are informational: declare them (tools and the optimizer can use them), and test them in the pipeline (dbt tests, for example). Standard tables have no `CHECK` and no indexes.
- **Performance:** micro-partitions are automatic. Add a clustering key only for multi-terabyte tables whose queries filter on the same columns; it costs credits to maintain. Search optimization service for selective point lookups.
- **Modelling:** wide, denormalized tables are cheap; joins of large fact tables are not.

## BigQuery

- **Keys:** no auto-increment. Use the source's key, `GENERATE_UUID()`, or a hash of the business key.
- **Types:** `TIMESTAMP` for moments, `DATE` for days, `NUMERIC`/`BIGNUMERIC` for money, `STRUCT` and `ARRAY` (nested and repeated fields) for hierarchies instead of child tables.
- **Enforces:** only `NOT NULL` (`REQUIRED`). Primary and foreign keys must be declared `NOT ENFORCED`. No `CHECK`, no secondary indexes (search indexes exist for text lookup).
- **Partitioning:** by a `DATE`/`TIMESTAMP` column, ingestion time or an integer range. Set `require_partition_filter = TRUE` on large tables so a query can't scan everything by accident. Mind the per-table partition limit when choosing daily partitions.
- **Clustering:** up to four columns, in order of filter frequency; it's free and helps filters and joins.
- **Cost:** queries are billed by bytes scanned, so partitioning, clustering and selecting only the needed columns directly cut cost.

## DuckDB

- **Use:** embedded, in-process analytics on a single machine, often over Parquet or CSV files.
- **Enforces:** `NOT NULL`, `CHECK`, primary keys and `UNIQUE` (through ART indexes), foreign keys with limits (check the docs for the version).
- **Indexes:** zone maps are automatic and handle most analytical filters. Explicit ART indexes help only selective point lookups, and they slow bulk loads.
- **Partitioning:** no partitioned tables. Partition the files instead (Hive-style `COPY ... (PARTITION_BY ...)`) and read them with `read_parquet(..., hive_partitioning = true)`.
- **Inspect:** `DESCRIBE table` or `PRAGMA table_info('table')`.
