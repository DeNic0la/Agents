# Template for the generated SKILL.md

Replace every `[PLACEHOLDER]`. Remove sections that don't apply. Keep `SKILL.md` under about 150 lines: what every query needs (dialect, entities, terms, standard filters) stays here, and per-table and per-metric detail goes in the reference files.

Frontmatter rules: only `name` and `description`. `name` equals the folder name (lowercase, digits and single hyphens). The description leads with when to use the skill, stays under 1024 characters, and doesn't summarize the steps. No `allowed-tools`, `model` or other runtime controls.

````markdown
---
name: [company]-data-analyst
description: Use when answering any question about [COMPANY] data in [WAREHOUSE_TYPE], such as [PRIMARY_USE_CASE_1], [PRIMARY_USE_CASE_2] or [PRIMARY_USE_CASE_3], or when writing SQL against [COMPANY]'s tables. Gives the entity definitions, standard filters, metric formulas and query patterns specific to [COMPANY].
---

# [COMPANY] Data Analysis

## SQL dialect: [WAREHOUSE_TYPE]

[PASTE THE MATCHING SECTION FROM sql-dialects.md]

## Entities

When someone says one of these terms, find out which entity they mean before querying.

**"[AMBIGUOUS_TERM]" can mean:**
- **[ENTITY_1]**: [DEFINITION] (`[TABLE]`.`[ID_FIELD]`)
- **[ENTITY_2]**: [DEFINITION] (`[TABLE]`.`[ID_FIELD]`)

**Relationships:**
- [ENTITY_1] → [ENTITY_2]: [1:1 / 1:many] (join on `[JOIN_KEY]`)

## Terminology

| Term | Definition | Notes |
|------|------------|-------|
| [TERM] | [DEFINITION] | [GOTCHA] |
| [ACRONYM] | [FULL_NAME]: [EXPLANATION] | |

## Standard filters

Always apply these unless the user explicitly asks otherwise:

```sql
WHERE [TEST_FLAG_COLUMN] = FALSE
  AND [INTERNAL_FLAG_COLUMN] = FALSE
  AND [STATUS_COLUMN] != '[EXCLUDED_STATUS]'
```

Override when: [SCENARIO]: include [NORMALLY_EXCLUDED] when [CONDITION].

## Data freshness

| Table | Refreshes | Typical lag |
|-------|-----------|-------------|
| [TABLE] | [FREQUENCY] | [LAG] |

Check with `SELECT MAX([DATE_COLUMN]) FROM [TABLE]` before reporting on recent periods.

## Common mistakes

- **[MISTAKE]**: [WHY IT'S WRONG] → [CORRECT APPROACH]
- Filter on `[PARTITION_COLUMN]` first to limit the data scanned. Prefer `[AGGREGATED_TABLE]` over `[RAW_TABLE]` when it has what you need.
- If `[TABLE]` gives a permission error: [WORKAROUND]. For PII-restricted columns: [ALTERNATIVE].

## Knowledge base

- [references/entities.md](references/entities.md): read when joining across entities or resolving which ID to use.
- [references/metrics.md](references/metrics.md): read before calculating any KPI: exact formulas, sources and caveats.
- [references/[domain].md](references/[domain].md): read when querying [DOMAIN] tables ([BRIEF_DESCRIPTION]).
````

## Customization notes

1. **Fill every placeholder.** The packaging script rejects `[PLACEHOLDER]` and `[COMPANY]`.
2. **Be specific.** Real column names and values beat generic advice.
3. **Use real examples.** Sample queries use actual tables and columns and run as written.
4. **Keep it scannable.** Tables and code blocks over prose.
5. **Move detail out.** If a section grows past a screen, move it to a reference file and leave a "read when" line.
