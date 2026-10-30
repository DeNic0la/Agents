# Python chart patterns

Each pattern assumes a pandas DataFrame `df`. Adjust column names, titles and file names.

## Setup and style

```python
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import seaborn as sns
import pandas as pd
import numpy as np

plt.style.use('seaborn-v0_8-whitegrid')
plt.rcParams.update({
    'figure.figsize': (10, 6),
    'figure.dpi': 150,
    'font.size': 11,
    'axes.titlesize': 14,
    'axes.titleweight': 'bold',
    'axes.labelsize': 11,
    'xtick.labelsize': 10,
    'ytick.labelsize': 10,
    'legend.fontsize': 10,
    'figure.titlesize': 16,
})

# Colorblind-friendly palettes
PALETTE_CATEGORICAL = ['#4C72B0', '#DD8452', '#55A868', '#C44E52', '#8172B3', '#937860']
PALETTE_SEQUENTIAL = 'YlOrRd'
PALETTE_DIVERGING = 'RdBu_r'
```

For presentations, raise `font.size` to 14 and the title size to 18.

## Line chart (time series)

```python
fig, ax = plt.subplots(figsize=(10, 6))

line_styles = ['-', '--', ':', '-.']
for i, (label, group) in enumerate(df.groupby('category')):
    ax.plot(group['date'], group['value'], label=label, linewidth=2,
            linestyle=line_styles[i % len(line_styles)])

ax.set_title('Metric Trend by Category')
ax.set_xlabel('Date')
ax.set_ylabel('Value')
ax.legend(loc='upper left', frameon=True)
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
fig.autofmt_xdate()

plt.tight_layout()
plt.savefig('trend_chart.png', dpi=150, bbox_inches='tight')
```

## Bar chart (comparison, ranked)

```python
fig, ax = plt.subplots(figsize=(10, 6))

df_sorted = df.sort_values('metric', ascending=True)
bars = ax.barh(df_sorted['category'], df_sorted['metric'], color=PALETTE_CATEGORICAL[0])

for bar in bars:
    width = bar.get_width()
    ax.text(width, bar.get_y() + bar.get_height() / 2, f' {width:,.0f}',
            ha='left', va='center', fontsize=10)

ax.set_title('Metric by Category (Ranked)')
ax.set_xlabel('Metric Value')
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)

plt.tight_layout()
plt.savefig('bar_chart.png', dpi=150, bbox_inches='tight')
```

To highlight one bar, color it with the accent and the rest grey: `color=['#C44E52' if c == key else '#BBBBBB' for c in df_sorted['category']]`.

## Histogram (distribution)

```python
fig, ax = plt.subplots(figsize=(10, 6))

ax.hist(df['value'], bins=30, color=PALETTE_CATEGORICAL[0], edgecolor='white', alpha=0.8)

mean_val = df['value'].mean()
median_val = df['value'].median()
ax.axvline(mean_val, color='#C44E52', linestyle='--', linewidth=1.5, label=f'Mean: {mean_val:,.1f}')
ax.axvline(median_val, color='#55A868', linestyle=':', linewidth=1.5, label=f'Median: {median_val:,.1f}')

ax.set_title('Distribution of Values')
ax.set_xlabel('Value')
ax.set_ylabel('Frequency')
ax.legend()
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)

plt.tight_layout()
plt.savefig('histogram.png', dpi=150, bbox_inches='tight')
```

## Heatmap

```python
fig, ax = plt.subplots(figsize=(10, 8))

pivot = df.pivot_table(index='row_dim', columns='col_dim', values='metric', aggfunc='sum')
sns.heatmap(pivot, annot=True, fmt=',.0f', cmap='YlOrRd',
            linewidths=0.5, ax=ax, cbar_kws={'label': 'Metric Value'})

ax.set_title('Metric by Row and Column Dimension')
ax.set_xlabel('Column Dimension')
ax.set_ylabel('Row Dimension')

plt.tight_layout()
plt.savefig('heatmap.png', dpi=150, bbox_inches='tight')
```

## Small multiples

```python
categories = df['category'].unique()
n_cats = len(categories)
n_cols = min(3, n_cats)
n_rows = (n_cats + n_cols - 1) // n_cols

fig, axes = plt.subplots(n_rows, n_cols, figsize=(5 * n_cols, 4 * n_rows),
                         sharex=True, sharey=True, squeeze=False)
axes = axes.flatten()

for i, cat in enumerate(categories):
    ax = axes[i]
    subset = df[df['category'] == cat]
    ax.plot(subset['date'], subset['value'], color=PALETTE_CATEGORICAL[i % len(PALETTE_CATEGORICAL)])
    ax.set_title(cat, fontsize=12)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)

for j in range(n_cats, len(axes)):
    axes[j].set_visible(False)

fig.suptitle('Trends by Category', fontsize=14, fontweight='bold', y=1.02)
plt.tight_layout()
plt.savefig('small_multiples.png', dpi=150, bbox_inches='tight')
```

`sharey=True` keeps the scales consistent, so the panels can be compared.

## Number formatting

```python
def format_number(val, format_type='number'):
    """Format numbers for chart labels."""
    if format_type == 'percent':
        return f'{val:.1f}%'
    prefix = '$' if format_type == 'currency' else ''
    for threshold, suffix in ((1e9, 'B'), (1e6, 'M'), (1e3, 'K')):
        if abs(val) >= threshold:
            return f'{prefix}{val / threshold:.1f}{suffix}'
    return f'{prefix}{val:,.0f}'

ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, p: format_number(x, 'currency')))
```

## Interactive charts with plotly

```python
import plotly.express as px

fig = px.line(df, x='date', y='value', color='category',
              title='Interactive Metric Trend',
              labels={'value': 'Metric Value', 'date': 'Date'})
fig.update_layout(hovermode='x unified')
fig.write_html('interactive_chart.html')

fig = px.scatter(df, x='metric_a', y='metric_b', color='category',
                 size='size_metric', hover_data=['name', 'detail_field'],
                 title='Correlation Analysis')
fig.write_html('scatter.html')
```
