# Statistical methods

## Descriptive statistics

### Central tendency

| Situation | Use | Why |
|---|---|---|
| Symmetric, no outliers | Mean | Most efficient estimator |
| Skewed | Median | Robust to outliers |
| Categorical or ordinal | Mode | The only option for non-numeric data |
| Highly skewed with outliers (revenue per user) | Median and mean | The gap between them shows the skew |

### Spread

- **Standard deviation:** typical distance from the mean. For roughly normal data.
- **Interquartile range (IQR):** p75 minus p25. Robust to outliers. For skewed data.
- **Coefficient of variation:** standard deviation / mean. Compares variability across metrics on different scales.
- **Range:** max minus min. Sensitive to outliers, but a quick sense of extent.

### Percentiles

```
p1   floor of typical values
p5   low end of normal
p25  first quartile
p50  median (the typical user)
p75  third quartile
p90  top 10% / power users
p95  high end of normal
p99  top 1% / extremes
```

Example: "The median session lasts 4.2 minutes, but the top 10% of users spend over 22 minutes, pulling the mean up to 7.8."

### Describing a distribution

Shape (normal, right- or left-skewed, bimodal, uniform, heavy-tailed), center (mean and median, and the gap), spread (standard deviation or IQR), outliers (how many, how extreme), and bounds (a floor at zero, a ceiling at 100%).

## Trends and forecasting

### Smoothing

```python
# 7-day moving average: daily data with weekly seasonality
df['ma_7d'] = df['metric'].rolling(window=7, min_periods=1).mean()

# 28-day moving average: smooths weekly and monthly patterns
df['ma_28d'] = df['metric'].rolling(window=28, min_periods=1).mean()
```

### Period comparisons

- Week-over-week: same day last week.
- Month-over-month: same month before.
- Year-over-year: the standard for seasonal businesses.
- Same day last year: a specific calendar day.

### Growth rates

```
Simple growth: (current - previous) / previous
CAGR:          (ending / beginning) ^ (1 / years) - 1
Log growth:    ln(current / previous)   -- better for volatile series
```

### Seasonality

1. Plot the raw series first.
2. Average by day of week: is there a weekly pattern?
3. Average by month of year: is there an annual cycle?
4. Compare like with like (YoY, same period), so trend isn't confused with season.

### Simple forecasts

- **Naive:** tomorrow equals today. The baseline every other method must beat.
- **Seasonal naive:** tomorrow equals the same day last week or year.
- **Linear trend:** a fitted line. Only for clearly linear series.
- **Moving average:** the trailing average as the forecast.

Always give a range, and say what it rests on: "10K-12K signups next month, based on the 3-month trend."

## Outliers and anomalies

### Detection

```python
# Z-score: for roughly normal data
z_scores = (df['value'] - df['value'].mean()) / df['value'].std()
outliers = df[abs(z_scores) > 3]

# IQR rule: robust for non-normal data
q1 = df['value'].quantile(0.25)
q3 = df['value'].quantile(0.75)
iqr = q3 - q1
outliers = df[(df['value'] < q1 - 1.5 * iqr) | (df['value'] > q3 + 1.5 * iqr)]

# Percentile cut: the simplest
outliers = df[(df['value'] < df['value'].quantile(0.01)) |
              (df['value'] > df['value'].quantile(0.99))]
```

### Handling

1. **Investigate:** data error, genuine extreme, or a different population?
2. **Data errors:** fix or remove (negative ages, timestamps in 1970).
3. **Genuine extremes:** keep them, and prefer robust statistics (median).
4. **Different population:** segment it out and analyze it separately (enterprise versus SMB).

Report it: "We excluded 47 records (0.3%) with transactions over $50K: bulk enterprise orders, analyzed separately."

### Time series anomalies

1. Compute the expected value (moving average, or the same period last year).
2. Compute the deviation from it.
3. Flag deviations beyond 2-3 standard deviations of the residuals.
4. Tell point anomalies (one odd value) from change points (a sustained shift).

## Hypothesis testing

### Framework

1. **Null hypothesis (H0):** no difference.
2. **Alternative (H1):** a difference.
3. **Significance level (alpha):** usually 0.05, fixed before looking.
4. **Compute** the test statistic and p-value.
5. **Interpret:** if p < alpha, reject H0. That's evidence of a difference, not proof, and says nothing about its size.

### Choosing a test

| Scenario | Test | When |
|---|---|---|
| Two group means | Independent t-test | Roughly normal data, two groups |
| Two proportions | z-test for proportions | Conversion rates, binary outcomes |
| Paired measurements | Paired t-test | Before/after on the same entities |
| Three or more means | ANOVA | Several segments or variants |
| Two groups, non-normal | Mann-Whitney U | Skewed metrics, ordinal data |
| Two categorical variables | Chi-squared | Association between categories |

In Python, `scipy.stats` has all of these (`ttest_ind`, `ttest_rel`, `mannwhitneyu`, `f_oneway`, `chi2_contingency`); `statsmodels` has `proportions_ztest`.

### Effect size and practical significance

Always report:

- **Effect size:** how big the difference is, in the metric's own units.
- **Confidence interval:** the range of plausible true effects.
- **Business impact:** what it means in revenue, users or time.

### Sample size

- Small samples give unreliable results, even with small p-values.
- For proportions, aim for at least 30 events per group as a bare minimum.
- Detecting small effects (a 1-point conversion change) can need thousands of observations per group.
- If the sample is small, say what it can and can't detect.
