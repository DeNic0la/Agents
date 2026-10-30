# Filters and tables

Patterns for the dashboard's filters and detail table. They use `escapeHtml` and `formatValue` from `assets/template.html`, and the `dashboard` instance it creates.

## Dropdown filter

```html
<div class="filter-group">
    <label for="filter-region">Region</label>
    <select id="filter-region" onchange="dashboard.applyFilters()">
        <option value="all">All Regions</option>
    </select>
</div>
```

```javascript
function populateFilter(selectId, data, field) {
    const select = document.getElementById(selectId);
    const values = [...new Set(data.map(d => d[field]))].sort();
    values.forEach(val => {
        const option = document.createElement('option');
        option.value = val;
        option.textContent = val;
        select.appendChild(option);
    });
}

function getFilterValue(selectId) {
    const val = document.getElementById(selectId).value;
    return val === 'all' ? null : val;
}
```

## Date range filter

```html
<div class="filter-group">
    <label>Date Range</label>
    <input type="date" id="filter-date-start" onchange="dashboard.applyFilters()">
    <span>to</span>
    <input type="date" id="filter-date-end" onchange="dashboard.applyFilters()">
</div>
```

Compare ISO date strings (`YYYY-MM-DD`) directly. `new Date('2024-01-15')` parses as UTC midnight and can shift a day in the viewer's time zone.

## Combined filter logic

Replace `applyFilters` in the `Dashboard` class:

```javascript
applyFilters() {
    const region = getFilterValue('filter-region');
    const category = getFilterValue('filter-category');
    const startDate = document.getElementById('filter-date-start').value;
    const endDate = document.getElementById('filter-date-end').value;

    this.filteredData = this.rawData.filter(row => {
        if (region && row.region !== region) return false;
        if (category && row.category !== category) return false;
        if (startDate && row.date < startDate) return false;
        if (endDate && row.date > endDate) return false;
        return true;
    });

    this.renderKPIs();
    this.updateCharts();
    this.renderTable();
}
```

When the data is pre-aggregated, filters can only slice by the dimensions kept in the aggregate. Decide the filters before aggregating.

## Sortable table

```javascript
function renderTable(containerId, data, columns) {
    const container = document.getElementById(containerId);
    let sortCol = null;
    let sortDir = 'desc';

    function render(rows) {
        let html = '<table class="data-table"><thead><tr>';
        columns.forEach(col => {
            const arrow = sortCol === col.field ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';
            html += `<th data-field="${escapeHtml(col.field)}">${escapeHtml(col.label)}${arrow}</th>`;
        });
        html += '</tr></thead><tbody>';
        rows.forEach(row => {
            html += '<tr>';
            columns.forEach(col => {
                const value = col.format ? formatValue(row[col.field], col.format) : row[col.field];
                html += `<td>${escapeHtml(value)}</td>`;
            });
            html += '</tr>';
        });
        html += '</tbody></table>';
        container.innerHTML = html;

        container.querySelectorAll('th').forEach(th => {
            th.addEventListener('click', () => sortBy(th.dataset.field));
        });
    }

    function sortBy(field) {
        if (sortCol === field) {
            sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        } else {
            sortCol = field;
            sortDir = 'desc';
        }
        const sorted = [...data].sort((a, b) => {
            const cmp = a[field] < b[field] ? -1 : a[field] > b[field] ? 1 : 0;
            return sortDir === 'asc' ? cmp : -cmp;
        });
        render(sorted);
    }

    render(data);
}
```

Call it from the `Dashboard.renderTable` method with `this.filteredData`.

## Pagination

Show at most 100-200 rows at once. For more, page the table:

```javascript
function renderTablePage(data, page, pageSize = 50) {
    const start = page * pageSize;
    const end = Math.min(start + pageSize, data.length);
    const pageData = data.slice(start, end);
    // Render pageData, then show "Showing 1-50 of 2,340" with previous/next buttons.
}
```
