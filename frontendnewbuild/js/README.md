# Athlytx Elite Chart Configuration

Complete Chart.js utility library for the Athlytx Elite fitness analytics platform. Provides dark theme optimized chart defaults, color palettes, and template functions for consistent, professional data visualization.

## Features

- **Dark Theme Optimized** - Light colors on dark backgrounds with glass morphism effects
- **Apple Aesthetic** - Clean, minimal, professional design language
- **Pre-configured Templates** - Line, bar, and doughnut chart templates ready to use
- **Comprehensive Color Palettes** - Brand colors, HR zones, status indicators, and multi-line series
- **Utility Functions** - Gradients, formatters, aggregators, and more
- **Fully Documented** - JSDoc comments for all exports with examples

## Installation

Simply include Chart.js 4.4.0+ and import the configuration:

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script type="module">
  import { createLineChartConfig, chartColors } from './js/chart-config.js';
  // Your chart code here
</script>
```

## Quick Start

### Line Chart (Time Series)

```javascript
import { createLineChartConfig, chartColors, createGradient } from './chart-config.js';

const ctx = document.getElementById('myChart').getContext('2d');
const chart = new Chart(ctx, createLineChartConfig({
  data: {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [{
      label: 'Training Load',
      data: [45, 48, 52, 50],
      borderColor: chartColors.primary[0],
      backgroundColor: createGradient(ctx,
        chartColors.gradients.primary.start,
        chartColors.gradients.primary.end
      ),
      fill: true,
    }]
  },
  showPoints: true,
  yAxisLabel: 'Load Score',
}));
```

### Bar Chart (Comparisons)

```javascript
import { createBarChartConfig, chartColors } from './chart-config.js';

const chart = new Chart(ctx, createBarChartConfig({
  data: {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [{
      label: 'Training Minutes',
      data: [420, 480, 450, 510],
      backgroundColor: chartColors.primary[0],
    }]
  },
  borderRadius: 12,
  yAxisLabel: 'Minutes',
}));
```

### Doughnut Chart (Distributions)

```javascript
import { createDoughnutChartConfig, chartColors } from './chart-config.js';

const chart = new Chart(ctx, createDoughnutChartConfig({
  data: {
    labels: ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5'],
    datasets: [{
      data: [120, 180, 90, 45, 15],
    }]
  },
  colors: chartColors.zones,
  cutout: '75%',
  showPercentage: true,
}));
```

## Color Palettes

### Brand Colors
```javascript
chartColors.primary[0]  // #667eea (Primary brand purple)
chartColors.primary[1]  // #5a67d8 (Primary dark)
chartColors.primary[2]  // #8b9cf5 (Primary light)
```

### Heart Rate Zones
```javascript
chartColors.zones[0]  // #34c759 (Zone 1 - Recovery)
chartColors.zones[1]  // #0a84ff (Zone 2 - Endurance)
chartColors.zones[2]  // #ff9f0a (Zone 3 - Tempo)
chartColors.zones[3]  // #ff6d28 (Zone 4 - Threshold)
chartColors.zones[4]  // #ff453a (Zone 5 - Anaerobic)
```

### Training Status
```javascript
chartColors.status.fresh       // #34c759 (Ready to train)
chartColors.status.optimal     // #30d5c8 (Good condition)
chartColors.status.fatigued    // #ff9f0a (Need recovery)
chartColors.status.overtrained // #ff453a (High fatigue)
```

### Multi-line Series
```javascript
chartColors.multiline[0]  // #4299e1 (Blue)
chartColors.multiline[1]  // #9f7aea (Purple)
chartColors.multiline[2]  // #ed64a6 (Pink)
// ... 5 more colors
```

## API Reference

### Chart Templates

#### `createLineChartConfig(options)`
Creates a line chart configuration for time series data.

**Options:**
- `data` (required) - Chart.js data object
- `title` - Chart title
- `showLegend` - Show/hide legend (default: true)
- `showPoints` - Show/hide data points (default: false)
- `tension` - Line curve tension 0-1 (default: 0.4)
- `borderWidth` - Line thickness in pixels (default: 3)
- `fill` - Fill area under line (default: false)
- `stacked` - Stack multiple datasets (default: false)
- `yAxisLabel` - Y-axis label
- `tooltipCallback` - Custom tooltip formatter

#### `createBarChartConfig(options)`
Creates a bar chart configuration for comparisons.

**Options:**
- `data` (required) - Chart.js data object
- `title` - Chart title
- `showLegend` - Show/hide legend (default: true)
- `horizontal` - Horizontal bars (default: false)
- `stacked` - Stack multiple datasets (default: false)
- `borderRadius` - Bar corner radius (default: 8)
- `maxBarThickness` - Maximum bar width (default: 60)
- `yAxisLabel` - Y-axis label
- `tooltipCallback` - Custom tooltip formatter

#### `createDoughnutChartConfig(options)`
Creates a doughnut/pie chart configuration.

**Options:**
- `data` (required) - Chart.js data object
- `title` - Chart title
- `showLegend` - Show/hide legend (default: true)
- `legendPosition` - Legend position (default: 'bottom')
- `cutout` - Donut hole size (default: '75%')
- `spacing` - Space between segments (default: 4)
- `borderWidth` - Segment border width (default: 0)
- `showPercentage` - Show percentages in tooltips (default: true)
- `colors` - Custom color array
- `tooltipCallback` - Custom tooltip formatter

### Utility Functions

#### `createGradient(ctx, colorStart, colorEnd, height)`
Creates a linear gradient for area fills.

```javascript
const gradient = createGradient(ctx,
  'rgba(102, 126, 234, 0.5)',
  'rgba(102, 126, 234, 0.0)',
  400
);
```

#### `formatTooltipLabel(context, unit, decimals)`
Formats tooltip labels with units and proper number formatting.

```javascript
tooltipCallback: (context) => formatTooltipLabel(context, 'bpm', 0)
```

#### `generateTimeLabels(days, endDate, format)`
Generates date labels for time series charts.

```javascript
const labels = generateTimeLabels(7);  // Last 7 days
// ['11/06', '11/07', '11/08', '11/09', '11/10', '11/11', '11/12']
```

#### `generateWeekLabels(weeks, endDate)`
Generates week labels for weekly aggregated data.

```javascript
const labels = generateWeekLabels(4);
// ['Week of 10/16', 'Week of 10/23', 'Week of 10/30', 'Week of 11/06']
```

#### `aggregateByWeek(data, valueKey)`
Aggregates daily data into weekly buckets.

```javascript
const weeklyData = aggregateByWeek(activities, 'durationMinutes');
// { '2024-11-06': 420, '2024-10-30': 380, ... }
```

#### `calculateMovingAverage(data, window)`
Calculates moving average for smoothing data.

```javascript
const smoothed = calculateMovingAverage([45, 48, 52, 50, 55], 3);
// [45, 48.33, 50, 52.33, 52.5]
```

#### `calculateZonePercentages(zones)`
Converts HR zone minutes to percentages.

```javascript
const percentages = calculateZonePercentages({
  zone1: 120, zone2: 180, zone3: 90, zone4: 45, zone5: 15
});
// { zone1: 26.7, zone2: 40.0, zone3: 20.0, zone4: 10.0, zone5: 3.3 }
```

#### `applyDarkTheme(chart)`
Applies dark theme to an existing chart instance.

```javascript
applyDarkTheme(myChart);
```

#### `destroyAllCharts(charts)`
Destroys multiple chart instances for cleanup.

```javascript
destroyAllCharts([chart1, chart2, chart3]);
```

## Examples

See `chart-examples.html` for live examples of all chart types and configurations.

Open the file in a browser to view:
- Training Load Trend (Line Chart)
- Heart Rate Zone Distribution (Doughnut Chart)
- Weekly Training Volume (Bar Chart)
- Multi-Series Training Metrics (CTL/ATL/TSB)
- Activity Type Breakdown (Bar Chart)
- Recovery Status Trend (Line Chart)

## Design Principles

1. **Dark Theme First** - All defaults optimized for dark backgrounds
2. **Apple Aesthetic** - SF Pro font, clean lines, minimal style
3. **Data Clarity** - High contrast, readable labels, clear legends
4. **Consistent** - Unified look across all chart types
5. **Flexible** - Easy to customize per use case
6. **Performance** - Optimized animations and rendering

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Dependencies

- Chart.js 4.4.0 or higher

## License

Part of the Athlytx Elite platform.

## Support

For questions or issues, contact the development team.
