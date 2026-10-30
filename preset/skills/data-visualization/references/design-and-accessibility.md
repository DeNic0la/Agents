# Design and accessibility rules

## Color

- **Color encodes data.** It doesn't decorate.
- **Highlight the story.** One bright accent for the key insight, grey for everything else.
- **Sequential data:** a single-hue gradient, light to dark, for ordered values.
- **Diverging data:** two hues with a neutral midpoint, for data with a meaningful center.
- **Categorical data:** distinct hues, at most 6-8.
- **Not red and green alone.** About 8% of men are red-green colorblind. Use blue and orange as the main pair.

## Typography

- **The title states the insight:** "Revenue grew 23% YoY" beats "Revenue by Month".
- **The subtitle adds context:** date range, filters, data source.
- **Axis labels stay readable.** Avoid rotating them 90 degrees. Shorten or wrap instead.
- **Data labels on key points**, not on every bar.
- **Annotations** call out specific points (a launch, an outage).

## Layout

- **Remove chart junk:** gridlines, borders and backgrounds that carry no information.
- **Sort meaningfully:** by value, unless there's a natural order (months, stages).
- **Aspect ratio:** time series wider than tall (2:1 to 3:1). Comparisons can be squarer.
- **White space:** don't cram charts together.

## Accuracy

- **Bar charts start at zero.** Always. A bar from 95 to 100 exaggerates a 5% difference.
- **Line charts may use a non-zero baseline** when the range of variation is what matters.
- **Compared panels share scales.**
- **Show uncertainty:** error bars, confidence intervals or ranges when the data is uncertain.
- **No unmarked axis breaks**, and no more precision than the data supports.

## Accessibility

Color blindness:

- Never rely on color alone to tell series apart. Add line styles (solid, dashed, dotted), markers, pattern fills or direct labels.
- Use a colorblind-safe palette, such as `sns.color_palette("colorblind")`, and check with a simulator (Coblis, Sim Daltonism) when it matters.

Screen readers:

- Give alt text that states the key finding, not just "a chart".
- Offer the data table alongside the chart.

General:

- Enough contrast between data and background.
- Text at least 10pt for labels and 12pt for titles.
- Don't convey information through position alone: add labels.
- Check it still works printed in black and white.

## Checklist before sharing

- [ ] The chart works without color.
- [ ] Text is readable at normal zoom.
- [ ] The title describes the insight.
- [ ] Axes are labeled with units.
- [ ] The legend is clear and doesn't cover data.
- [ ] Data source and date range are noted.
