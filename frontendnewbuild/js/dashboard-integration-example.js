/**
 * Dashboard Integration Example
 *
 * This file demonstrates how to integrate the chart-config.js utilities
 * into the existing Athlytx Elite coach dashboard.
 *
 * Replace the chart creation code in coach-dashboard.html or coach-elite.html
 * with these improved versions that use the configuration library.
 */

import {
  createLineChartConfig,
  createBarChartConfig,
  createDoughnutChartConfig,
  chartColors,
  createGradient,
  formatTooltipLabel,
  generateTimeLabels,
  aggregateByWeek,
  calculateZonePercentages,
} from './chart-config.js';

// ============================================================================
// GLOBAL CHART INSTANCES
// ============================================================================

let volumeChart = null;
let loadChart = null;
let activityTypeChart = null;
let zoneDistributionChart = null;

// ============================================================================
// CHART CREATION FUNCTIONS
// ============================================================================

/**
 * Creates the training volume over time chart
 * Shows daily or weekly training minutes as bars
 */
export function createVolumeChart(activities, canvasId = 'volumeChart') {
  // Destroy existing chart
  if (volumeChart) {
    volumeChart.destroy();
  }

  // Filter and deduplicate activities
  const validActivities = activities.filter(act =>
    act.durationMinutes > 0 &&
    act.durationMinutes < 500 &&
    act.activityType
  );

  const uniqueActivities = {};
  validActivities.forEach(act => {
    const key = `${act.date}_${act.activityType}_${act.durationMinutes}`;
    if (!uniqueActivities[key]) {
      uniqueActivities[key] = act;
    }
  });

  const unique = Object.values(uniqueActivities);

  // Group by date
  const volumeByDate = {};
  unique.forEach(act => {
    if (!volumeByDate[act.date]) {
      volumeByDate[act.date] = 0;
    }
    volumeByDate[act.date] += act.durationMinutes;
  });

  const dates = Object.keys(volumeByDate).sort();
  const volumes = dates.map(d => volumeByDate[d]);

  // Create chart
  const ctx = document.getElementById(canvasId).getContext('2d');
  volumeChart = new Chart(ctx, createBarChartConfig({
    data: {
      labels: dates.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      datasets: [{
        label: 'Training Minutes',
        data: volumes,
        backgroundColor: chartColors.primary[0],
        hoverBackgroundColor: chartColors.primary[1],
      }]
    },
    borderRadius: 8,
    yAxisLabel: 'Minutes',
    tooltipCallback: (context) => formatTooltipLabel(context, 'min', 0),
  }));

  return volumeChart;
}

/**
 * Creates the weekly training load trend chart
 * Shows CTL (Chronic Training Load) as a line with gradient fill
 */
export function createLoadChart(activities, canvasId = 'loadChart') {
  // Destroy existing chart
  if (loadChart) {
    loadChart.destroy();
  }

  // Filter and deduplicate
  const validActivities = activities.filter(act =>
    act.durationMinutes > 0 &&
    act.durationMinutes < 500 &&
    act.activityType
  );

  const uniqueActivities = {};
  validActivities.forEach(act => {
    const key = `${act.date}_${act.activityType}_${act.durationMinutes}`;
    if (!uniqueActivities[key]) {
      uniqueActivities[key] = act;
    }
  });

  const unique = Object.values(uniqueActivities);

  // Aggregate by week
  const weeklyLoad = aggregateByWeek(unique, 'durationMinutes');
  const weeks = Object.keys(weeklyLoad).sort().slice(-4);
  const weekMinutes = weeks.map(w => weeklyLoad[w]);

  // Create chart
  const ctx = document.getElementById(canvasId).getContext('2d');
  loadChart = new Chart(ctx, createLineChartConfig({
    data: {
      labels: weeks.map(w => `Week of ${new Date(w).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`),
      datasets: [{
        label: 'Weekly Minutes',
        data: weekMinutes,
        borderColor: chartColors.status.optimal,
        backgroundColor: createGradient(
          ctx,
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

  return loadChart;
}

/**
 * Creates the activity type breakdown doughnut chart
 * Shows distribution of training time across activity types
 */
export function createActivityTypeChart(activities, canvasId = 'activityTypeChart') {
  // Destroy existing chart
  if (activityTypeChart) {
    activityTypeChart.destroy();
  }

  // Filter and deduplicate
  const validActivities = activities.filter(act =>
    act.durationMinutes > 0 &&
    act.durationMinutes < 500 &&
    act.activityType
  );

  const uniqueActivities = {};
  validActivities.forEach(act => {
    const key = `${act.date}_${act.activityType}_${act.durationMinutes}`;
    if (!uniqueActivities[key]) {
      uniqueActivities[key] = act;
    }
  });

  const unique = Object.values(uniqueActivities);

  // Group by activity type
  const activityTypes = {};
  unique.forEach(act => {
    if (!activityTypes[act.activityType]) {
      activityTypes[act.activityType] = 0;
    }
    activityTypes[act.activityType] += act.durationMinutes;
  });

  const typeLabels = Object.keys(activityTypes);
  const typeMinutes = Object.values(activityTypes);

  // Create chart
  const ctx = document.getElementById(canvasId).getContext('2d');
  activityTypeChart = new Chart(ctx, createDoughnutChartConfig({
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

  return activityTypeChart;
}

/**
 * Creates the heart rate zone distribution doughnut chart
 * Shows time spent in each HR zone
 */
export function createZoneDistributionChart(weeklySummary, canvasId = 'zoneDistributionChart') {
  // Destroy existing chart
  if (zoneDistributionChart) {
    zoneDistributionChart.destroy();
  }

  const zoneData = [
    weeklySummary.totalZone1Minutes || 0,
    weeklySummary.totalZone2Minutes || 0,
    weeklySummary.totalZone3Minutes || 0,
    weeklySummary.totalZone4Minutes || 0,
    weeklySummary.totalZone5Minutes || 0,
  ];

  const ctx = document.getElementById(canvasId).getContext('2d');
  zoneDistributionChart = new Chart(ctx, createDoughnutChartConfig({
    data: {
      labels: [
        'Zone 1 - Recovery',
        'Zone 2 - Endurance',
        'Zone 3 - Tempo',
        'Zone 4 - Threshold',
        'Zone 5 - Anaerobic'
      ],
      datasets: [{
        data: zoneData,
      }]
    },
    colors: chartColors.zones,
    cutout: '75%',
    showPercentage: true,
    legendPosition: 'right',
    tooltipCallback: (context) => {
      const label = context.label || '';
      const value = context.parsed || 0;
      const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
      const percentage = ((value / total) * 100).toFixed(1);
      return `${label}: ${value} min (${percentage}%)`;
    },
  }));

  return zoneDistributionChart;
}

/**
 * Creates a multi-series training metrics chart
 * Shows CTL, ATL, and TSB on the same chart
 */
export function createTrainingMetricsChart(metricsData, canvasId = 'trainingMetricsChart') {
  const ctx = document.getElementById(canvasId).getContext('2d');

  return new Chart(ctx, createLineChartConfig({
    data: {
      labels: metricsData.labels,
      datasets: [
        {
          label: 'CTL (Fitness)',
          data: metricsData.ctl,
          borderColor: chartColors.multiline[0],
          backgroundColor: createGradient(
            ctx,
            'rgba(66, 153, 225, 0.2)',
            'rgba(66, 153, 225, 0.0)'
          ),
          fill: true,
        },
        {
          label: 'ATL (Fatigue)',
          data: metricsData.atl,
          borderColor: chartColors.multiline[1],
          backgroundColor: createGradient(
            ctx,
            'rgba(159, 122, 234, 0.2)',
            'rgba(159, 122, 234, 0.0)'
          ),
          fill: true,
        },
        {
          label: 'TSB (Form)',
          data: metricsData.tsb,
          borderColor: chartColors.multiline[2],
          backgroundColor: createGradient(
            ctx,
            'rgba(237, 100, 166, 0.2)',
            'rgba(237, 100, 166, 0.0)'
          ),
          fill: true,
        }
      ]
    },
    showPoints: false,
    tension: 0.4,
    yAxisLabel: 'Training Load',
    tooltipCallback: (context) => formatTooltipLabel(context, 'pts', 0),
  }));
}

/**
 * Creates a heart rate trends chart
 * Shows average and max HR over time
 */
export function createHeartRateTrendsChart(activities, canvasId = 'hrTrendsChart') {
  // Filter and prepare data
  const validActivities = activities.filter(act =>
    act.durationMinutes > 0 &&
    act.hr &&
    act.hr.avg &&
    act.hr.max
  ).sort((a, b) => new Date(a.date) - new Date(b.date));

  const dates = validActivities.map(act =>
    new Date(act.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  );
  const avgHR = validActivities.map(act => act.hr.avg);
  const maxHR = validActivities.map(act => act.hr.max);

  const ctx = document.getElementById(canvasId).getContext('2d');

  return new Chart(ctx, createLineChartConfig({
    data: {
      labels: dates,
      datasets: [
        {
          label: 'Average HR',
          data: avgHR,
          borderColor: chartColors.multiline[4],
          backgroundColor: createGradient(
            ctx,
            'rgba(104, 211, 145, 0.2)',
            'rgba(104, 211, 145, 0.0)'
          ),
          fill: true,
        },
        {
          label: 'Max HR',
          data: maxHR,
          borderColor: chartColors.zones[4],
          backgroundColor: createGradient(
            ctx,
            'rgba(255, 69, 58, 0.2)',
            'rgba(255, 69, 58, 0.0)'
          ),
          fill: true,
        }
      ]
    },
    showPoints: true,
    yAxisLabel: 'Heart Rate (bpm)',
    tooltipCallback: (context) => formatTooltipLabel(context, 'bpm', 0),
  }));
}

// ============================================================================
// DASHBOARD INTEGRATION HELPER
// ============================================================================

/**
 * Main function to create all dashboard charts
 * Call this from your dashboard's loadDashboard() function
 */
export function createAllDashboardCharts(data) {
  const { activities, weeklySummary, metricsData } = data;

  // Create all charts
  const charts = {
    volume: createVolumeChart(activities),
    load: createLoadChart(activities),
    activityType: createActivityTypeChart(activities),
  };

  // Create zone distribution if weekly summary is available
  if (weeklySummary) {
    charts.zones = createZoneDistributionChart(weeklySummary);
  }

  // Create training metrics if data is available
  if (metricsData) {
    charts.metrics = createTrainingMetricsChart(metricsData);
  }

  return charts;
}

/**
 * Cleanup function to destroy all charts
 * Call this before recreating charts or when unmounting
 */
export function destroyAllDashboardCharts() {
  if (volumeChart) volumeChart.destroy();
  if (loadChart) loadChart.destroy();
  if (activityTypeChart) activityTypeChart.destroy();
  if (zoneDistributionChart) zoneDistributionChart.destroy();
}

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

/*
// In your coach-dashboard.html or coach-elite.html, replace the createCharts function:

import {
  createVolumeChart,
  createLoadChart,
  createActivityTypeChart,
  createAllDashboardCharts,
  destroyAllDashboardCharts
} from './js/dashboard-integration-example.js';

async function loadDashboard() {
  showLoading();
  hideError();

  try {
    // Load data
    const [status, zones] = await Promise.all([
      fetch(`${API_BASE}/sync/status/${USER_ID}`).then(r => r.json()),
      fetch(`${API_BASE}/sync/zones/${USER_ID}?days=${currentPeriod}`).then(r => r.json())
    ]);

    // Update UI elements
    updateSummaryStats(zones.data);
    updateDataSources(zones.data);
    updateZoneDistribution(status.weeklySummary);
    updateActivitiesTable(zones.data);

    // Destroy old charts
    destroyAllDashboardCharts();

    // Create new charts with the improved configuration
    createAllDashboardCharts({
      activities: zones.data,
      weeklySummary: status.weeklySummary,
    });

    showDashboard();
  } catch (error) {
    console.error('Dashboard load error:', error);
    showError('Failed to load dashboard: ' + error.message);
  }
}
*/
