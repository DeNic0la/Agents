---
name: validate-data
description: Use before an analysis, report, query result or chart is shared or used for a decision - when asked to QA, sanity-check, review or spot-check an analysis, verify that a SQL query's results look right, or judge whether the conclusions are supported by the data. Reviews methodology, calculations, bias and presentation, and gives a ready / ready-with-caveats / needs-revision verdict.
---

# Validate Data

## Overview

Review an existing analysis the way a skeptical stakeholder would, before it reaches them. The output is a verdict, the issues behind it, and the caveats that must travel with the numbers.

## When to Use

- Before a stakeholder presentation, an exec email or a decision based on the numbers.
- When a result looks surprising (too good, too round, too big a change).
- When asked to review someone else's analysis, query or chart.

The input can be a report or document, a notebook or spreadsheet, SQL with its results, charts with their data, or a description of method and findings.

Not for producing the analysis (use the `analyze` skill) or profiling raw data (use the `explore-data` skill). To check a specific statistical claim in depth, use the `statistical-analysis` skill.

## Workflow

### 1. Review the methodology

- **Question:** does the analysis answer the question that was asked? Could it be read another way?
- **Data:** are these the right tables and time range?
- **Population:** is it defined correctly, with no unintended exclusions?
- **Metrics:** clearly defined, consistent, and matching how stakeholders understand them?
- **Comparisons:** fair? Same period lengths, comparable cohorts and contexts?

### 2. Run the QA checklist

Work through [references/qa-checklist.md](references/qa-checklist.md) (read now): data quality, calculations, reasonableness and presentation.

### 3. Check for pitfalls

Check the analysis against [references/pitfalls.md](references/pitfalls.md) (read now): join explosion, survivorship bias, partial-period comparisons, shifting denominators, averages of averages, time zone mismatches, selection bias, and the sanity checks and red flags.

### 4. Recompute what you can

- Recalculate a few key numbers independently, ideally a different way than the original.
- Check that subtotals sum to totals and percentages to about 100% where they should.
- Confirm YoY and MoM comparisons use the right base periods.
- Confirm the same filters apply to every metric.
- If a data warehouse is connected, rerun the queries or spot-check single records.

### 5. Review the charts

Bars start at zero, compared charts share scales, titles describe what's actually shown, nothing is truncated or 3D. Could a quick reader be misled? The `data-visualization` skill has the full rules.

### 6. Judge the conclusions

- Supported by the data shown?
- Alternative explanations acknowledged?
- Uncertainty stated, and confidence matching the evidence?
- Recommendations following from the findings?

### 7. Give the verdict

- **Ready to share:** sound methodology, calculations verified, caveats noted. Minor suggestions only.
- **Share with caveats:** largely correct, but with limitations stakeholders must hear. List those caveats.
- **Needs revision:** errors, methodological problems or missing analyses. List the required changes, most important first.

If the analysis can't be reproduced from what was shared, recommend documenting it with [references/documentation.md](references/documentation.md) (read when suggesting how to document an analysis).

## Output

```
## Validation report

### Verdict: Ready to share | Share with caveats | Needs revision

### Methodology
<findings on approach, data selection, definitions>

### Issues
1. [High/Medium/Low] <issue and its impact on the conclusion>

### Calculation spot-checks
- <metric>: verified | discrepancy: <expected vs. found>

### Charts
<issues, or "none found">

### Suggested improvements
1. <improvement and why it matters>

### Caveats stakeholders must hear
- <caveat>
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The numbers came from SQL, so they're right." | SQL runs fine on a join that doubles every row. Recompute something independently. |
| "It's a quick analysis, no need to validate." | Quick analyses get forwarded too. A one-minute sanity check protects the author's credibility. |
| "The result confirms what we expected." | That's a red flag, not a pass. Results that fit the hypothesis perfectly deserve a closer look. |

## Verification

- [ ] At least one key number was recomputed independently.
- [ ] Every issue has a severity and its impact on the conclusion.
- [ ] The verdict matches the issues found (a High issue means "Needs revision" or an explicit caveat).
- [ ] Required caveats are written so they can be pasted to stakeholders.
