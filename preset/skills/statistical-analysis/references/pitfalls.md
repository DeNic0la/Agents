# When to be careful with statistical claims

## Correlation isn't causation

For every correlation, consider:

- **Reverse causation:** maybe B causes A.
- **Confounding:** maybe C causes both.
- **Coincidence:** with enough variables, spurious correlations are guaranteed.

You can say: "Users who use feature X have 30% higher retention."
You can't say without more evidence: "Feature X causes 30% higher retention."

## Multiple comparisons

Test many hypotheses and some will be "significant" by chance. Testing 20 metrics at p = 0.05 gives about one false positive.

- If you looked at many segments before finding one that differs, say so.
- Correct for it (Bonferroni: divide alpha by the number of tests), or report how many tests you ran.

## Simpson's paradox

A trend in aggregated data can reverse inside every segment. Example: overall conversion rises while it falls in every segment, because the mix shifted toward a higher-converting segment. Check that the conclusion holds within the key segments.

## Survivorship bias

You only see the entities that survived into the dataset. Active users exclude the churned ones; successful companies exclude the failures. Ask: who is missing, and would including them change the conclusion?

## Ecological fallacy

Group-level patterns don't necessarily hold for individuals. "Countries with higher X have higher Y" doesn't mean "people with higher X have higher Y".

## False precision

"Churn will be 4.73% next quarter" claims more certainty than any forecast has. Prefer ranges ("4-6%, based on the last four quarters") and round honestly ("about 5%").
