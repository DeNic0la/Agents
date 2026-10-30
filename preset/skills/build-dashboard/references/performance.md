# Performance with larger datasets

## How much to embed

| Rows | Approach |
|---|---|
| under 1,000 | Embed directly. Full interactivity. |
| 1,000 - 10,000 | Embed, but pre-aggregate the chart data. |
| 10,000 - 100,000 | Pre-aggregate before embedding. Embed only the aggregates. |
| over 100,000 | Not suited to a client-side dashboard. Recommend a BI tool, or paginate. |

## Pre-aggregate before embedding

```javascript
// Don't: embed 50,000 raw rows and aggregate in the browser.
const RAW_DATA = [/* 50,000 rows */];

// Do: aggregate in the query or in Python first, then embed the results.
const CHART_DATA = {
    monthly_revenue: [
        { month: '2024-01', revenue: 150000, orders: 1200 },
        { month: '2024-02', revenue: 165000, orders: 1350 },
        // 12 rows instead of 50,000
    ],
    top_products: [
        { product: 'Widget A', revenue: 45000 },
        // 10 rows
    ],
    kpis: { total_revenue: 1980000, total_orders: 15600, avg_order_value: 127 }
};
```

Keep every dimension a filter needs in the aggregate (for example monthly revenue by region, not just by month).

## Charts

- Line charts: under 500 points per series. Downsample otherwise.
- Bar charts: under 50 categories.
- Scatter plots: at most 1,000 points. Sample larger sets.
- With many charts, turn off animation: `animation: false`.
- On filter changes, call `chart.update('none')` instead of `chart.update()`.

## DOM

- Show 100-200 table rows at most. Paginate beyond that.
- Batch chart updates in one `requestAnimationFrame`.
- Update only the elements that changed. Don't rebuild the whole page on a filter change.
