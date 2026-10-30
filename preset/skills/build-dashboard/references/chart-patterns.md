# Chart.js patterns

Functions to paste into the dashboard script. They use `COLORS` and `formatValue` from `assets/template.html`. Each canvas sits in a `.chart-container`, which has a fixed height because the charts set `maintainAspectRatio: false`.

```html
<div class="chart-container">
    <h3 class="chart-title">Revenue grew 23% this year</h3>
    <canvas id="revenue-chart"></canvas>
</div>
```

## Line chart (trends over time)

```javascript
function createLineChart(canvasId, labels, datasets, format = 'number') {
    const ctx = document.getElementById(canvasId).getContext('2d');
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets.map((ds, i) => ({
                label: ds.label,
                data: ds.data,
                borderColor: COLORS[i % COLORS.length],
                backgroundColor: COLORS[i % COLORS.length] + '20',
                borderWidth: 2,
                fill: ds.fill || false,
                tension: 0.3,
                pointRadius: 3,
                pointHoverRadius: 6,
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top', labels: { usePointStyle: true, padding: 20 } },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.dataset.label}: ${formatValue(context.parsed.y, format)}`
                    }
                }
            },
            scales: {
                x: { grid: { display: false } },
                y: {
                    beginAtZero: true,
                    ticks: { callback: (value) => formatValue(value, format) }
                }
            }
        }
    });
}
```

## Bar chart (comparing categories)

Switches to horizontal bars when there are more than 8 categories.

```javascript
function createBarChart(canvasId, labels, data, options = {}) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    const isHorizontal = options.horizontal || labels.length > 8;
    const format = options.format || 'number';
    const valueTicks = { callback: (value) => formatValue(value, format) };

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: options.label || 'Value',
                data: data,
                backgroundColor: options.colors || COLORS.map(c => c + 'CC'),
                borderColor: options.colors || COLORS,
                borderWidth: 1,
                borderRadius: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: isHorizontal ? 'y' : 'x',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => formatValue(context.parsed[isHorizontal ? 'x' : 'y'], format)
                    }
                }
            },
            scales: {
                x: { beginAtZero: true, grid: { display: isHorizontal }, ticks: isHorizontal ? valueTicks : {} },
                y: { beginAtZero: !isHorizontal, grid: { display: !isHorizontal }, ticks: isHorizontal ? {} : valueTicks }
            }
        }
    });
}
```

## Doughnut chart (composition, fewer than 6 parts)

```javascript
function createDoughnutChart(canvasId, labels, data) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: COLORS.map(c => c + 'CC'),
                borderColor: '#ffffff',
                borderWidth: 2,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: { position: 'right', labels: { usePointStyle: true, padding: 15 } },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: ${formatValue(context.parsed, 'number')} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}
```

## Stacked bar and bar plus line

- **Stacked bar** (composition over time): use `createBarChart`'s options with several datasets and set `scales.x.stacked = true` and `scales.y.stacked = true`.
- **Bar plus line** (volume with a rate on top): one dataset with `type: 'bar'` on axis `y`, one with `type: 'line'` on a second axis `y1` (`position: 'right'`, `grid: { drawOnChartArea: false }`). Label both axes clearly: dual axes can suggest a correlation that isn't there.

## Updating charts when filters change

Create each chart once, then update its data in place. Don't destroy and recreate charts on every filter change.

```javascript
function updateChart(chart, newLabels, newData) {
    chart.data.labels = newLabels;
    if (Array.isArray(newData[0])) {
        // Several datasets
        newData.forEach((data, i) => { chart.data.datasets[i].data = data; });
    } else {
        chart.data.datasets[0].data = newData;
    }
    chart.update('none'); // no animation, instant update
}
```
