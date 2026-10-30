# Quality assessment and pattern discovery

## Completeness

Grade each column:

| Non-null | Grade | Action |
|---|---|---|
| over 99% | Complete | none |
| 95-99% | Mostly complete | investigate the nulls |
| 80-95% | Incomplete | find out why, and whether it matters for the question |
| under 80% | Sparse | may not be usable without imputation |

## Consistency

- **Format:** the same concept written differently ("USA", "US", "United States", "us").
- **Type:** numbers stored as strings, dates in several formats.
- **Referential integrity:** foreign keys with no matching parent row.
- **Business rules:** negative quantities, end dates before start dates, percentages over 100.
- **Cross-column:** status = "completed" but `completed_at` is null.

## Accuracy red flags

- **Placeholders:** 0, -1, 999999, "N/A", "TBD", "test", "xxx".
- **Defaults:** one value with a suspiciously high frequency.
- **Stale data:** `updated_at` shows no recent changes in a live system.
- **Impossible values:** ages over 150, dates far in the future, negative durations.
- **Round-number bias:** values all ending in 0 or 5 suggest estimates, not measurements.

## Timeliness

- When was the table last updated, and how often should it be?
- Is there a lag between event time and load time?
- Are there gaps in the time series?

## Distribution shapes

- **Normal:** mean close to median, bell-shaped.
- **Right-skewed:** a long tail of high values (revenue, session length). Report the median.
- **Left-skewed:** a long tail of low values (less common).
- **Bimodal:** two peaks, often two populations mixed together. Segment them.
- **Power law:** a few huge values, many small ones (user activity).
- **Uniform:** roughly equal frequency everywhere. Often synthetic or random.

## Time patterns

- **Trend:** sustained movement up or down.
- **Seasonality:** repeating weekly, monthly, quarterly or yearly cycles.
- **Day-of-week effects:** weekday versus weekend.
- **Holiday effects:** dips or spikes around known dates.
- **Change points:** sudden shifts in level or trend, often a tracking or definition change.
- **Anomalies:** single points that break the pattern.

## Segments

- Look at categorical columns with 3-20 distinct values.
- Compare metric distributions across their values.
- Note segments that behave very differently, and whether a segment hides sub-segments.

## Correlations

- Compute the correlation matrix for the metric columns.
- Flag |r| > 0.7 for a closer look.
- Check for non-linear relationships the correlation coefficient misses.
- Say explicitly that correlation doesn't mean causation.
