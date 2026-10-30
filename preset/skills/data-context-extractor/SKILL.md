---
name: data-context-extractor
description: Use when an analyst wants the agent to understand their company's own data warehouse ("create a data context skill", "set up data analysis for our warehouse", "generate a data skill for <company>"), or wants to extend such a skill ("add context about <domain>", "the data skill needs more about <topic>", "update it with these metrics/tables/terms"). Interviews the analyst and the schema, then writes or updates a company-specific data-analyst skill.
---

# Data Context Extractor

## Overview

Generic data skills don't know that "customer" means three different tables here, that test orders must always be filtered out, or how ARR is calculated. That knowledge sits in analysts' heads. This skill extracts it and writes it down as a company-specific skill, `<company>-data-analyst`, which the other data skills (`analyze`, `sql-queries`, `explore-data`) then benefit from.

It has two modes:

- **Bootstrap:** create the skill from scratch.
- **Iteration:** add a domain or fix gaps in an existing one.

## Where the generated skill goes

Ask the user, and default to the project:

- **Project:** `.agents/skills/<company>-data-analyst/`, then run `agents sync` so every tool picks it up.
- **Personal:** the user's global skills folder.
- **To share as a file:** package it afterwards with `python scripts/package_data_skill.py <skill-folder> [output-dir]`. It validates the skill and writes `<name>.zip`.

The generated skill follows the same rules as this preset's skills: frontmatter with `name` and `description` only (no runtime controls such as `allowed-tools` or `model`), `name` equal to the folder name, a description that leads with when to use it, a lean `SKILL.md`, and reference files one level deep, each linked with a line saying when to read it.

## Bootstrap mode

### 1. Connect and discover

1. Ask which warehouse they use: BigQuery, Snowflake, PostgreSQL/Redshift, Databricks, MySQL or another.
2. If a data warehouse is connected, use it to list schemas and tables. Otherwise ask the user to paste schema listings (`INFORMATION_SCHEMA` output, DDL or table docs).
3. Ask which 3-5 tables analysts query most, and pull their schemas.

Discovery queries:

```sql
-- BigQuery
SELECT schema_name FROM INFORMATION_SCHEMA.SCHEMATA;
SELECT table_name FROM `project.dataset.INFORMATION_SCHEMA.TABLES`;
-- Snowflake
SHOW SCHEMAS IN DATABASE my_database;
SHOW TABLES IN SCHEMA my_schema;
-- PostgreSQL / Redshift
SELECT table_schema, table_name FROM information_schema.tables ORDER BY 1, 2;
```

### 2. Ask the core questions

Ask conversationally, one or two at a time, not as a list.

- **Entities (most important):** "When people here say 'user' or 'customer', what exactly do they mean? Are there several kinds?" Listen for distinct entities (user, account, organization), how they relate (1:1, 1:many) and which IDs link them.
- **Identifiers:** "What's the main ID for a customer? Are there several IDs for the same thing?" Listen for primary versus business keys, and legacy ID systems.
- **Key metrics:** "Which 2-3 metrics do people ask about most, and how is each calculated?" Get exact formulas, source columns and time conventions (trailing 7 days, calendar month).
- **Data hygiene:** "What should always be filtered out? Test data, fraud, internal users?" Get the standard `WHERE` clauses, flag columns and excluded values.
- **Gotchas:** "What mistakes do new analysts make with this data?" Listen for confusing column names, time zones, null quirks, history versus current-state tables.

### 3. Write the skill

```
<company>-data-analyst/
├── SKILL.md
└── references/
    ├── entities.md      # entity definitions and relationships
    ├── metrics.md       # metric definitions and formulas
    └── <domain>.md      # one file per data domain: tables, queries, gotchas
```

- `SKILL.md`: follow [references/skill-template.md](references/skill-template.md) (read when writing the generated `SKILL.md`).
- Dialect notes: copy the matching section of [references/sql-dialects.md](references/sql-dialects.md) (read when writing the dialect section).
- Domain files: follow [references/domain-template.md](references/domain-template.md) (read when writing `entities.md`, `metrics.md` or a domain file).
- For a finished example, see [references/example-output.md](references/example-output.md) (read when unsure what good output looks like).

### 4. Check and deliver

Run the quality checklist below, show the skill to the user for approval, then install or package it as agreed. Summarize what was captured and what's still missing.

## Iteration mode

1. **Load the skill.** Find it in the project or the user's skills folder, or ask for the folder or zip. Read `SKILL.md` and its reference files.
2. **Find the gap.** Ask: "Which domain or topic needs more context? Which queries are failing or giving wrong results?" Typical gaps: a new domain (marketing, finance, product), a missing metric, an undocumented join, new terminology.
3. **Discover.** Explore that domain's tables, then ask: which tables are used for it, what its key metrics are, and what filters or gotchas apply.
4. **Update.** Write or extend `references/<domain>.md` from the domain template, and add a line for it to the generated `SKILL.md`'s knowledge-base list, saying when to read it.
5. **Deliver** as in bootstrap step 4.

## What each reference file must contain

- **Tables:** full location, what it contains and when to use it, primary key, refresh frequency, key columns (name, type, description, notes), joins to other tables, 2-3 sample queries.
- **Metrics:** name, plain-English definition, exact formula with column references, source tables, caveats and exclusions.
- **Entities:** name, business meaning, primary table, ID fields, relationships, standard filters.

## Quality checklist

- [ ] Frontmatter has only `name` and `description`; `name` matches the folder; the description says when to use the skill.
- [ ] Entity disambiguation is clear.
- [ ] Key terminology is defined.
- [ ] Standard filters and exclusions are written as copy-paste SQL.
- [ ] Each domain has 2-3 sample queries with real table and column names, in the right dialect.
- [ ] Every reference file is linked from `SKILL.md` with a "read when" line.
- [ ] No `[PLACEHOLDER]` text is left.
- [ ] Nothing secret went in: no credentials, connection strings or personal data from sample rows.
