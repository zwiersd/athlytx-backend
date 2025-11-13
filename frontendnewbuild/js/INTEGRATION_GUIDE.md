# Chart Configuration Integration Guide

Complete guide for integrating the Athlytx Elite Chart Configuration system into your dashboard.

## Quick Start (3 Steps)

### Step 1: Add Script Tag to HTML

In your `coach-dashboard.html` or `coach-elite.html`, add the Chart.js CDN and module script:

```html
<head>
  <!-- Chart.js -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
</head>

<body>
  <!-- Your dashboard content -->

  <!-- Replace existing chart script with module -->
  <script type="module">
    import {
      createLineChartConfig,
      createBarChartConfig,
      createDoughnutChartConfig,
      chartColors,
      createGradient,
      formatTooltipLabel,
    } from './js/chart-config.js';

    // Your chart code here
  </script>
</body>
```

### Step 2: Replace Chart Creation Code

**OLD CODE (Before):**
```javascript
const volumeCtx = document.getElementById('volumeChart').getContext('2d');
volumeChart = new Chart(volumeCtx, {
  type: 'bar',
  data: {
    labels: dates,
    datasets: [{
      label: 'Training Minutes',
      data: volumes,
      backgroundColor: 'rgba(102, 126, 234, 0.6)',
      borderColor: 'rgba(102, 126, 234, 1)',
      borderWidth: 1
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Minutes'
        }
      }
    }
  }
});
```

**NEW CODE (After):**
```javascript
const volumeCtx = document.getElementById('volumeChart').getContext('2d');
volumeChart = new Chart(volumeCtx, createBarChartConfig({
  data: {
    labels: dates.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [{
      label: 'Training Minutes',
      data: volumes,
      backgroundColor: chartColors.primary[0],
    }]
  },
  borderRadius: 8,
  yAxisLabel: 'Minutes',
  tooltipCallback: (context) => formatTooltipLabel(context, 'min', 0),
}));
```

### Step 3: Test Your Charts

Open your dashboard in a browser and verify:
- Charts render correctly
- Dark theme colors are applied
- Tooltips show proper formatting
- Hover effects work smoothly
- Charts are responsive

## Complete Integration Example

Here's a full example replacing the `createCharts()` function in `coach-dashboard.html`:

```javascript
<script type="module">
  import {
    createLineChartConfig,
    createBarChartConfig,
    createDoughnutChartConfig,
    chartColors,
    createGradient,
    formatTooltipLabel,
    aggregateByWeek,
  } from './js/chart-config.js';

  // Configuration
  const USER_ID = '3c37dd1f-25f8-4212-afcf-52a7d37f0903';
  const API_BASE = '/api';
  let currentPeriod = 14;
  let zoneData = null;

  // Chart instances
  let volumeChart = null;
  let loadChart = null;
  let activityTypeChart = null;

  // Initialize
  document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();

    document.getElementById('periodSelect').addEventListener('change', (e) => {
      currentPeriod = parseInt(e.target.value);
      loadDashboard();
    });

    document.getElementById('refreshBtn').addEventListener('click', () => {
      loadDashboard();
    });
  });

  async function loadDashboard() {
    showLoading();
    hideError();

    try {
      const [status, zones] = await Promise.all([
        fetch(`${API_BASE}/sync/status/${USER_ID}`).then(r => r.json()),
        fetch(`${API_BASE}/sync/zones/${USER_ID}?days=${currentPeriod}`).then(r => r.json())
      ]);

      zoneData = zones;

      // Update UI
      updateSummaryStats(zones.data);
      updateDataSources(zones.data);
      updateZoneDistribution(status.weeklySummary);
      updateActivitiesTable(zones.data);

      // Create charts with new configuration
      createCharts(zones);

      showDashboard();
    } catch (error) {
      console.error('Dashboard load error:', error);
      showError('Failed to load dashboard: ' + error.message);
    }
  }

  function createCharts(data) {
    const activities = data.data || [];

    // Filter valid activities
    const validActivities = activities.filter(act =>
      act.durationMinutes > 0 &&
      act.durationMinutes < 500 &&
      act.activityType
    );

    // Remove duplicates
    const uniqueActivities = {};
    validActivities.forEach(act => {
      const key = `${act.date}_${act.activityType}_${act.durationMinutes}`;
      if (!uniqueActivities[key]) {
        uniqueActivities[key] = act;
      }
    });
    const unique = Object.values(uniqueActivities);

    // === TRAINING VOLUME CHART ===
    const volumeByDate = {};
    unique.forEach(act => {
      if (!volumeByDate[act.date]) {
        volumeByDate[act.date] = 0;
      }
      volumeByDate[act.date] += act.durationMinutes;
    });

    const dates = Object.keys(volumeByDate).sort();
    const volumes = dates.map(d => volumeByDate[d]);

    if (volumeChart) volumeChart.destroy();
    const volumeCtx = document.getElementById('volumeChart').getContext('2d');
    volumeChart = new Chart(volumeCtx, createBarChartConfig({
      data: {
        labels: dates.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
        datasets: [{
          label: 'Training Minutes',
          data: volumes,
          backgroundColor: chartColors.primary[0],
        }]
      },
      borderRadius: 8,
      yAxisLabel: 'Minutes',
      tooltipCallback: (context) => formatTooltipLabel(context, 'min', 0),
    }));

    // === WEEKLY TRAINING LOAD CHART ===
    const weeklyLoad = aggregateByWeek(unique, 'durationMinutes');
    const weeks = Object.keys(weeklyLoad).sort().slice(-4);
    const weekMinutes = weeks.map(w => weeklyLoad[w]);

    if (loadChart) loadChart.destroy();
    const loadCtx = document.getElementById('loadChart').getContext('2d');
    loadChart = new Chart(loadCtx, createLineChartConfig({
      data: {
        labels: weeks.map(w => `Week of ${new Date(w).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`),
        datasets: [{
          label: 'Weekly Minutes',
          data: weekMinutes,
          borderColor: chartColors.status.optimal,
          backgroundColor: createGradient(
            loadCtx,
            chartColors.gradients.success.start,
            chartColors.gradients.success.end
          ),
          fill: true,
        }]
      },
      showPoints: true,
      yAxisLabel: 'Minutes',
      tooltipCallback: (context) => formatTooltipLabel(context, 'min', 0),
    }));

    // === ACTIVITY TYPE BREAKDOWN CHART ===
    const activityTypes = {};
    unique.forEach(act => {
      if (!activityTypes[act.activityType]) {
        activityTypes[act.activityType] = 0;
      }
      activityTypes[act.activityType] += act.durationMinutes;
    });

    const typeLabels = Object.keys(activityTypes);
    const typeMinutes = Object.values(activityTypes);

    if (activityTypeChart) activityTypeChart.destroy();
    const activityTypeCtx = document.getElementById('activityTypeChart').getContext('2d');
    activityTypeChart = new Chart(activityTypeCtx, createDoughnutChartConfig({
      data: {
        labels: typeLabels,
        datasets: [{
          data: typeMinutes,
        }]
      },
      colors: chartColors.multiline.slice(0, typeLabels.length),
      cutout: '70%',
      showPercentage: true,
      legendPosition: 'bottom',
    }));
  }

  // ... rest of your existing functions (updateSummaryStats, etc.)
</script>
```

## Migration Checklist

Use this checklist to ensure a smooth migration:

- [ ] Chart.js 4.4.0+ CDN added to HTML
- [ ] Changed `<script>` to `<script type="module">`
- [ ] Imported chart configuration functions
- [ ] Replaced bar chart creation with `createBarChartConfig()`
- [ ] Replaced line chart creation with `createLineChartConfig()`
- [ ] Replaced doughnut chart creation with `createDoughnutChartConfig()`
- [ ] Updated colors to use `chartColors` palette
- [ ] Added gradient fills using `createGradient()`
- [ ] Added tooltip formatters using `formatTooltipLabel()`
- [ ] Tested all charts in browser
- [ ] Verified dark theme appearance
- [ ] Checked responsive behavior
- [ ] Confirmed tooltip formatting
- [ ] Verified hover effects

## Common Issues and Solutions

### Issue: "Cannot use import statement outside a module"
**Solution:** Change `<script>` to `<script type="module">`

```html
<!-- Wrong -->
<script src="./js/chart-config.js"></script>

<!-- Correct -->
<script type="module">
  import { createLineChartConfig } from './js/chart-config.js';
</script>
```

### Issue: "Chart is not defined"
**Solution:** Ensure Chart.js is loaded before your module script

```html
<!-- Chart.js must come first -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>

<!-- Then your module -->
<script type="module">
  import { createLineChartConfig } from './js/chart-config.js';
</script>
```

### Issue: Charts not updating on data refresh
**Solution:** Destroy old charts before creating new ones

```javascript
// Before creating new charts
if (volumeChart) volumeChart.destroy();
if (loadChart) loadChart.destroy();
if (activityTypeChart) activityTypeChart.destroy();

// Then create new charts
volumeChart = new Chart(ctx, createBarChartConfig({ ... }));
```

### Issue: Gradients not showing
**Solution:** Create gradient AFTER getting canvas context

```javascript
// Wrong - gradient created before context
const gradient = createGradient(ctx, ...);
const ctx = canvas.getContext('2d');

// Correct - context first, then gradient
const ctx = canvas.getContext('2d');
const gradient = createGradient(ctx, ...);
```

## Advanced Customization

### Custom Tooltip Formatting

```javascript
tooltipCallback: (context) => {
  const label = context.dataset.label || '';
  const value = context.parsed.y || 0;

  // Custom formatting
  if (value >= 100) {
    return `${label}: ${(value / 60).toFixed(1)} hours`;
  }
  return `${label}: ${value} minutes`;
}
```

### Custom Color Gradients

```javascript
// Use custom gradient colors
const customGradient = createGradient(
  ctx,
  'rgba(255, 100, 100, 0.8)', // Your start color
  'rgba(255, 100, 100, 0.0)'  // Your end color
);
```

### Stacked Bar Charts

```javascript
const chart = new Chart(ctx, createBarChartConfig({
  data: {
    labels: ['Week 1', 'Week 2', 'Week 3'],
    datasets: [
      {
        label: 'Running',
        data: [120, 140, 130],
        backgroundColor: chartColors.multiline[0],
      },
      {
        label: 'Cycling',
        data: [90, 100, 80],
        backgroundColor: chartColors.multiline[1],
      }
    ]
  },
  stacked: true, // Enable stacking
}));
```

### Multi-Series Line Charts

```javascript
const chart = new Chart(ctx, createLineChartConfig({
  data: {
    labels: generateTimeLabels(30),
    datasets: [
      {
        label: 'CTL',
        data: ctlData,
        borderColor: chartColors.multiline[0],
        fill: false,
      },
      {
        label: 'ATL',
        data: atlData,
        borderColor: chartColors.multiline[1],
        fill: false,
      }
    ]
  },
  showPoints: false,
  tension: 0.4,
}));
```

## Testing Your Integration

### Visual Testing Checklist

1. **Colors** - Verify all colors are visible on dark background
2. **Tooltips** - Hover over data points, check formatting
3. **Legend** - Verify legend is readable and positioned correctly
4. **Grid Lines** - Check grid lines are subtle but visible
5. **Animations** - Ensure smooth animations on load and update
6. **Responsive** - Resize browser window, verify charts adapt

### Functional Testing Checklist

1. **Data Loading** - Charts display correct data from API
2. **Data Updates** - Charts refresh when period changes
3. **Error Handling** - Charts handle missing/invalid data gracefully
4. **Performance** - Charts load quickly, no lag on interactions
5. **Memory** - Old charts destroyed properly, no memory leaks

## Need Help?

- Check `chart-examples.html` for working examples
- Review `dashboard-integration-example.js` for complete patterns
- See `chart-config.js` JSDoc comments for detailed API documentation
- Refer to `README.md` for comprehensive feature overview

## Next Steps

After successful integration:

1. Customize colors to match your brand
2. Add more chart types as needed
3. Implement advanced features (moving averages, trend lines)
4. Add chart export functionality
5. Consider adding chart interaction events
