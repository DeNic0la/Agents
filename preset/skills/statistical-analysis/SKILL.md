---
name: statistical-analysis
description: Use when a data question needs a statistical method or a statistical claim needs checking - describing a skewed distribution, testing whether a difference (A/B test, before/after, segments) is significant, detecting outliers or anomalies, computing correlations, smoothing a trend or making a simple forecast, or interpreting p-values and confidence intervals. Picks the method and keeps the claims honest.
---

# Statistical Analysis

## Overview

Choose the right statistical method for the question, apply it, and report the result with the uncertainty it actually has. The goal isn't sophistication: it's not claiming more than the data supports.

## When to Use

- Summarizing a distribution, especially a skewed one (revenue, durations).
- Deciding whether a difference is real: A/B tests, before/after, segment comparisons.
- Finding outliers or anomalies, in a table or a time series.
- Trends, seasonality, growth rates and simple forecasts.
- Reviewing someone's statistical claim.

This skill supplies methods. The `analyze` skill drives a whole data question, the `explore-data` skill profiles a new dataset, and the `validate-data` skill reviews a finished analysis.

## Workflow

### 1. Describe before testing

For every numeric variable you rely on: shape, center, spread, outliers and natural bounds (zero, 100%). Report mean and median together for business metrics. When they diverge, the data is skewed and the mean alone misleads.

### 2. Match the method to the question

| Question | Method |
|---|---|
| What's typical, and how spread out? | Median and IQR for skewed data, mean and standard deviation for symmetric data, plus key percentiles |
| Is it going up? | Moving average, period-over-period (YoY for seasonal businesses), growth rate |
| What will it be? | Naive, seasonal naive, linear trend or moving-average forecast, always as a range |
| Is this value unusual? | IQR rule (robust), z-score (normal data), deviation from expected for time series |
| Are two groups different? | t-test, z-test for proportions, Mann-Whitney U for skewed data, paired t-test for before/after |
| Three or more groups? | ANOVA |
| Are two categorical variables related? | Chi-squared test |
| Do two metrics move together? | Correlation, with a scatter plot to check it's linear |

Formulas, code and the details of each method are in [references/methods.md](references/methods.md) (read when applying any method above).

### 3. Apply it

- Check the method's assumptions (normality, independence, sample size) before trusting its output.
- Don't remove outliers automatically. Decide whether each is a data error (fix or drop), a genuine extreme (keep it, and use robust statistics), or a different population (analyze it separately). Report what you did and how many records it affected.
- Fix the significance level (usually 0.05) and the comparisons you'll make before looking at the results.

### 4. Report honestly

- **Effect size first:** "Variant B improved conversion by 0.3 percentage points", then the confidence interval, then the p-value.
- **Practical significance:** what the effect means in revenue, users or time. A large sample makes trivial differences "significant".
- **Uncertainty as ranges:** "10K-12K signups next month", not "11,234".
- **Sample size limits:** "with 200 observations per group, we can't detect effects smaller than X".
- **Causal language only with causal evidence.** "Users of feature X retain 30% better", not "feature X causes 30% better retention".

Before stating any conclusion, check it against the traps in [references/pitfalls.md](references/pitfalls.md) (read before presenting a correlation, a segment comparison or a test result): confounding and reverse causation, multiple comparisons, Simpson's paradox, survivorship bias, ecological fallacy and false precision.

Escalate to a data scientist for non-linear trends, several overlapping seasonalities, strong external drivers, or forecasts that drive resource allocation.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "p < 0.05, so it's real and it matters." | Significance says the difference is probably not chance. It says nothing about whether it's big enough to matter. Report the effect size. |
| "I checked a few segments and this one is significant." | Test 20 segments at 0.05 and one will "win" by chance. Say how many you tested, or correct for it. |
| "These outliers are noise, drop them." | Outliers are often the story (enterprise customers, fraud, a broken tracker). Investigate first. |
| "The forecast is 11,234." | That precision is fake. Give a range. |

## Verification

- [ ] The distribution was described before any test.
- [ ] The method fits the data type, the number of groups and the distribution.
- [ ] Results include effect size and a confidence interval or range, not only a p-value.
- [ ] Outlier handling and the number of tests run are reported.
- [ ] No causal claim without causal evidence.
