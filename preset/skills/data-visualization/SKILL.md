---
name: data-visualization
description: Use when turning data (query results, a DataFrame, a CSV, pasted numbers) into a chart, choosing the right chart type for a trend, comparison, distribution or composition, making a figure for a report or presentation, or needing an interactive chart with hover and zoom. Produces clear, accurate, accessible charts in Python (matplotlib, seaborn, plotly).
---

# Data Visualization

## Overview

Pick the chart that fits the question, build it in Python, and make it honest and readable: the title states the insight, the axes don't mislead, and it works without color.

## When to Use

- One chart or a small grid of charts from data.
- Choosing a chart type, or reviewing whether a chart misleads.

For several charts with filters in one shareable HTML file, use the `build-dashboard` skill.

## Workflow

### 1. Understand the request

- **Data:** query results, pasted data, a CSV or Excel file, or data from earlier in the conversation. If it still needs querying, use the `sql-queries` skill.
- **Chart type:** requested, or yours to recommend.
- **Purpose:** exploration, presentation, report or dashboard component.
- **Audience:** technical team, executives, external readers.

### 2. Load and prepare the data

Load it into a pandas DataFrame. Fix types (dates as dates, numbers as numbers), decide how to handle nulls, and sort or aggregate to the grain the chart needs.

### 3. Choose the chart

| What you're showing | Best chart | Alternatives |
|---|---|---|
| Trend over time | Line | Area (cumulative or composition) |
| Comparison across categories | Vertical bar | Horizontal bar (many categories), lollipop |
| Ranking | Horizontal bar | Dot plot, slope chart (two periods) |
| Part-to-whole | Stacked bar | Treemap (hierarchical), waffle |
| Composition over time | Stacked area | 100% stacked bar (proportions) |
| Distribution | Histogram | Box plot (compare groups), violin, strip plot |
| Correlation, 2 variables | Scatter | Bubble (third variable as size) |
| Correlation, many variables | Correlation heatmap | Pair plot |
| Geographic pattern | Choropleth | Bubble map, hex map |
| Flow or process | Sankey | Funnel (sequential stages) |
| Performance vs. target | Bullet chart | Gauge (single KPI only) |
| Many series or segments | Small multiples | Separate charts |

Avoid:

- **Pie and donut charts**, except for fewer than 6 parts where a rough comparison is enough. People compare angles badly. Use bars.
- **3D charts.** Always. They distort and add nothing.
- **Dual axes**, unless both axes are clearly labeled. They suggest correlations that aren't there.
- **Stacked bars with many segments.** The middle segments can't be compared. Use small multiples or grouped bars.

If you recommended the chart type, say why in one sentence.

### 4. Build it

Default to matplotlib with seaborn for static charts. Use plotly when the user wants interactivity (hover, zoom) or an HTML output. Code for the setup, common chart types, number formatting and plotly is in [references/python-patterns.md](references/python-patterns.md) (read when writing the chart code).

Every chart needs:

- a title that states the insight ("Revenue grew 23% YoY", not "Revenue by Month"), with a subtitle for date range, filters and source when they matter,
- labeled axes with units, and numbers formatted for people (`45.2%`, `$1.2M`, `2.3K`),
- bars starting at zero, and consistent scales across panels that are compared,
- categories sorted by value unless they have a natural order (months, funnel stages),
- color that encodes data: one accent for the point of the chart, grey for context, a colorblind-safe palette,
- no chart junk: drop the top and right spines, heavy gridlines and backgrounds.

The full design and accessibility rules are in [references/design-and-accessibility.md](references/design-and-accessibility.md) (read when the chart is for presentation or publication, or when reviewing a chart).

### 5. Save and present

1. Save it with a descriptive name (`revenue_trend_2024.png`, 150 dpi; `.html` for plotly).
2. Show the chart and give the code, so it can be modified.
3. Add a one-line alt text stating the key finding, for reports and docs.
4. Suggest one or two useful variations: a different grouping, time range or chart type.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The y-axis starting at 95 makes the change visible." | On a bar chart it makes a 5% difference look like 5x. Start bars at zero, or use a line chart. |
| "Everyone can see the colors." | About 8% of men are red-green colorblind. Add line styles, markers or direct labels. |
| "A pie chart is what they asked for." | Fine for 2-5 parts. Beyond that, offer a bar chart and say why. |

## Verification

- [ ] The title states the insight, and the axes are labeled with units.
- [ ] Nothing misleads: bars start at zero, compared panels share scales, no 3D.
- [ ] The chart reads without color.
- [ ] The file is saved and the code is shared.
