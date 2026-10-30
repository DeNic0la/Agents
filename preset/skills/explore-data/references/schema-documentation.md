# Documenting tables and exploring a warehouse

## Table documentation template

```markdown
## Table: [schema.table_name]

**Description**: [What this table represents]
**Grain**: [One row per ...]
**Primary key**: [column(s)]
**Row count**: [approximate, with date]
**Update frequency**: [real-time / hourly / daily / weekly]
**Owner**: [team or person responsible]

### Key columns

| Column | Type | Description | Example values | Notes |
|--------|------|-------------|----------------|-------|
| user_id | STRING | Unique user identifier | "usr_abc123" | FK to users.id |
| event_type | STRING | Type of event | "click", "view", "purchase" | 15 distinct values |
| revenue | DECIMAL | Transaction revenue in USD | 29.99, 149.00 | Null for non-purchase events |
| created_at | TIMESTAMP | When the event occurred | 2024-01-15 14:23:01 | Partitioned on this column |

### Relationships
- Joins to `users` on `user_id`
- Joins to `products` on `product_id`
- Parent of `event_details` (1:many on event_id)

### Known issues
- [Data quality issues and gotchas for analysts]

### Common query patterns
- [Typical uses of this table]
```

To capture this kind of knowledge for a whole warehouse as a reusable skill, use the `data-context-extractor` skill.

## Schema discovery queries

PostgreSQL shown. Other warehouses have equivalents in `INFORMATION_SCHEMA` or `SHOW` commands (see the `sql-queries` skill).

```sql
-- Tables in a schema
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Columns of a table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'my_table'
ORDER BY ordinal_position;

-- Table sizes
SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
```

Row counts: run `SELECT COUNT(*)` per table, or read the warehouse's table statistics for an estimate.

## Lineage in an unfamiliar warehouse

1. Start from the output tables: what reports and dashboards read.
2. Trace upstream: which tables feed them?
3. Identify the raw, staging and mart layers.
4. Map the transformation chain from raw data to analytical tables.
5. Note where data is enriched, filtered or aggregated, since that's where definitions change.
