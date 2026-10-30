---
name: build-dashboard
description: Use when the user wants an interactive dashboard as a single HTML file, such as an executive overview with KPI cards, query results turned into a shareable report, a team monitoring snapshot, or several charts with filters that open in a browser. Builds a self-contained, offline-capable file with Chart.js charts, filters and a sortable table.
---

# Build Dashboard

## Overview

Build one self-contained HTML file with KPI cards, charts, filters and a detail table. It opens directly in a browser: no server, and the data is embedded in the file. It's a point-in-time snapshot. For live, always-current dashboards, recommend the team's BI tool instead.

## When to Use

- Several metrics and charts that belong together, with filters across all of them.
- A shareable report someone can open by double-clicking a file.

Not for a single chart (use the `data-visualization` skill) or a one-off answer to a question (use the `analyze` skill).

## Workflow

### 1. Pin down the requirements

- **Purpose:** executive overview, operational monitoring, deep dive or team reporting.
- **Audience:** who reads it and what they decide with it.
- **Key metrics:** the 2-4 numbers that matter most.
- **Dimensions:** what readers should be able to filter or slice by.
- **Data source:** a live query, pasted data, a CSV file, or none yet.

### 2. Get the data

- **Data warehouse connected:** query it (the `sql-queries` skill) and embed the results as JSON.
- **Pasted or uploaded data:** parse and clean it, then embed it as JSON.
- **Only a description:** generate a realistic sample dataset that matches the described schema. Label the dashboard visibly as sample data, and explain how to swap in real data.

Check the data size against [references/performance.md](references/performance.md) before embedding. Above about 1,000 rows, pre-aggregate.

### 3. Lay it out

```
+--------------------------------------------------+
|  Title                                 [Filters] |
+------------+------------+------------+-----------+
|  KPI card  |  KPI card  |  KPI card  |  KPI card |
+------------+------------+------------+-----------+
|   Primary chart (largest)  |   Secondary chart   |
+----------------------------+---------------------+
|   Detail table (sortable, scrollable)            |
+--------------------------------------------------+
```

Adapt it to the content: 2-4 KPI cards, 1-3 charts, an optional detail table, and filters in the header (or a sidebar when there are many).

### 4. Build the file

Start from [assets/template.html](assets/template.html). It has the page structure, the CSS (color tokens, cards, filters, table, responsive and print styles), the number formatter, the KPI renderer and an HTML-escape helper. Fill in:

- the embedded data (`DATA`) and the "data as of" date,
- KPI cards and their change versus the prior period,
- charts: pick the type by what it shows, using [references/chart-patterns.md](references/chart-patterns.md) (read when writing any chart code),
- filters and the sortable table, using [references/interactivity.md](references/interactivity.md) (read when adding filters, date ranges, sorting or pagination).

Chart type by purpose: line for trends over time, bar for comparing categories (horizontal for more than 8), doughnut for composition with fewer than 6 parts, stacked bar for composition over time, bar plus line for volume with a rate on top. Apply the design rules of the `data-visualization` skill: titles state the insight, bars start at zero, color encodes data.

Every filter must update every KPI, chart and the table together. Escape any text from the data before putting it into HTML.

### 5. Save, open and check

1. Save it with a descriptive name, such as `sales_dashboard.html`.
2. Open it in a browser and confirm it renders: every chart draws, every filter changes the numbers, sorting works, and there are no console errors.
3. Tell the user how to update the data and what's easy to customize (colors, dark mode, layout).

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll embed all the raw rows, the browser can aggregate." | Past about 10,000 rows the file gets slow and heavy. Pre-aggregate before embedding. |
| "The sample data is obviously fake." | Not to a reader skimming a screenshot. Label it on the dashboard itself. |
| "It looked right when I wrote it." | Charts silently fail to draw on a typo. Open the file and click through every filter. |

## Verification

- [ ] The file opens offline apart from the Chart.js CDN scripts, with the data embedded.
- [ ] KPIs, charts and table all respond to every filter.
- [ ] Sample data, if any, is labeled on the dashboard.
- [ ] The "data as of" date is shown.
