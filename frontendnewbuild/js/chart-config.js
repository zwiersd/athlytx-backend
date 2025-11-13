/**
 * Athlytx Elite Chart Configuration
 *
 * Complete Chart.js utility library for the Athlytx Elite fitness analytics platform.
 * Provides dark theme optimized chart defaults, color palettes, and template functions
 * for consistent, professional data visualization across the application.
 *
 * @module chart-config
 * @requires Chart.js 4.4.0+
 *
 * @example
 * // Import the configuration
 * import { createLineChartConfig, chartColors, createGradient } from './chart-config.js';
 *
 * // Create a training load chart
 * const ctx = document.getElementById('myChart').getContext('2d');
 * const chart = new Chart(ctx, createLineChartConfig({
 *   data: {
 *     labels: ['Week 1', 'Week 2', 'Week 3'],
 *     datasets: [{
 *       label: 'CTL',
 *       data: [45, 48, 52],
 *       borderColor: chartColors.primary[0],
 *       backgroundColor: createGradient(ctx, chartColors.primary[0], 'transparent')
 *     }]
 *   }
 * }));
 */

// ============================================================================
// COLOR PALETTES
// ============================================================================

/**
 * Comprehensive color palettes for all chart types
 * Optimized for dark theme with proper contrast and accessibility
 */
export const chartColors = {
  /**
   * Primary brand colors - Use for main data series
   */
  primary: [
    '#667eea', // Primary brand purple
    '#5a67d8', // Primary dark
    '#8b9cf5', // Primary light
  ],

  /**
   * Heart rate zone colors - Standard 5-zone training system
   */
  zones: [
    '#34c759', // Zone 1 - Recovery (Green)
    '#0a84ff', // Zone 2 - Endurance (Blue)
    '#ff9f0a', // Zone 3 - Tempo (Orange)
    '#ff6d28', // Zone 4 - Threshold (Deep Orange)
    '#ff453a', // Zone 5 - Anaerobic (Red)
  ],

  /**
   * Status colors - For training status, readiness, etc.
   */
  status: {
    fresh: '#34c759',      // Ready to train
    optimal: '#30d5c8',    // Good condition
    fatigued: '#ff9f0a',   // Need recovery
    overtrained: '#ff453a', // High fatigue
  },

  /**
   * Multi-line chart colors - For multiple data series
   */
  multiline: [
    '#4299e1', // Blue
    '#9f7aea', // Purple
    '#ed64a6', // Pink
    '#f6ad55', // Orange
    '#68d391', // Green
    '#4fd1c5', // Teal
    '#fc8181', // Red
    '#b794f4', // Violet
  ],

  /**
   * Gradient configurations for area fills
   */
  gradients: {
    primary: {
      start: 'rgba(102, 126, 234, 0.5)',
      end: 'rgba(102, 126, 234, 0.0)',
    },
    success: {
      start: 'rgba(52, 199, 89, 0.5)',
      end: 'rgba(52, 199, 89, 0.0)',
    },
    warning: {
      start: 'rgba(255, 159, 10, 0.5)',
      end: 'rgba(255, 159, 10, 0.0)',
    },
    danger: {
      start: 'rgba(255, 69, 58, 0.5)',
      end: 'rgba(255, 69, 58, 0.0)',
    },
  },

  /**
   * Dark theme specific colors
   */
  dark: {
    text: '#e0e0e0',        // Primary text
    textSecondary: '#a0a0a0', // Secondary text
    grid: 'rgba(255, 255, 255, 0.08)', // Grid lines
    gridBorder: 'rgba(255, 255, 255, 0.1)', // Axis borders
    tooltipBg: 'rgba(26, 32, 44, 0.95)', // Tooltip background
    tooltipBorder: '#667eea', // Tooltip border
  },
};

// ============================================================================
// GLOBAL CHART DEFAULTS
// ============================================================================

/**
 * Default configuration applied to all Chart.js charts
 * Optimized for dark theme with Apple-inspired aesthetics
 */
export const chartDefaults = {
  // Responsive configuration
  responsive: true,
  maintainAspectRatio: false,

  // Interaction configuration
  interaction: {
    mode: 'index',
    intersect: false,
  },

  // Animation configuration
  animation: {
    duration: 750,
    easing: 'easeInOutQuart',
  },

  // Plugin configuration
  plugins: {
    // Legend configuration
    legend: {
      display: true,
      position: 'top',
      align: 'end',
      labels: {
        color: chartColors.dark.text,
        font: {
          family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Segoe UI", sans-serif',
          size: 12,
          weight: '500',
        },
        padding: 15,
        usePointStyle: true,
        pointStyle: 'circle',
        boxWidth: 8,
        boxHeight: 8,
      },
    },

    // Tooltip configuration - Glass morphism style
    tooltip: {
      enabled: true,
      backgroundColor: chartColors.dark.tooltipBg,
      titleColor: '#ffffff',
      bodyColor: chartColors.dark.text,
      borderColor: chartColors.dark.tooltipBorder,
      borderWidth: 1,
      cornerRadius: 8,
      padding: 12,
      boxPadding: 6,
      usePointStyle: true,
      font: {
        family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Segoe UI", sans-serif',
        size: 13,
      },
      titleFont: {
        family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Segoe UI", sans-serif',
        size: 13,
        weight: '600',
      },
      bodyFont: {
        family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Segoe UI", sans-serif',
        size: 12,
      },
      displayColors: true,
      callbacks: {
        // Default label formatter - can be overridden per chart
        label: function(context) {
          let label = context.dataset.label || '';
          if (label) {
            label += ': ';
          }
          if (context.parsed.y !== null) {
            label += context.parsed.y.toLocaleString();
          }
          return label;
        }
      }
    },
  },

  // Scales configuration - Dark theme optimized
  scales: {
    x: {
      ticks: {
        color: chartColors.dark.textSecondary,
        font: {
          family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Segoe UI", sans-serif',
          size: 11,
          weight: '500',
        },
        padding: 8,
      },
      grid: {
        display: true,
        color: chartColors.dark.grid,
        drawBorder: false,
        drawTicks: false,
      },
      border: {
        display: false,
      },
    },
    y: {
      beginAtZero: true,
      ticks: {
        color: chartColors.dark.textSecondary,
        font: {
          family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Segoe UI", sans-serif',
          size: 11,
          weight: '500',
        },
        padding: 8,
      },
      grid: {
        display: true,
        color: chartColors.dark.grid,
        drawBorder: false,
        drawTicks: false,
      },
      border: {
        display: false,
      },
    },
  },
};

// ============================================================================
// CHART TEMPLATE FUNCTIONS
// ============================================================================

/**
 * Creates a complete Chart.js configuration for line charts
 * Perfect for time series data, trends, and multi-series comparisons
 *
 * @param {Object} options - Configuration options
 * @param {Object} options.data - Chart.js data object (required)
 * @param {string} [options.title] - Chart title
 * @param {boolean} [options.showLegend=true] - Show/hide legend
 * @param {boolean} [options.showPoints=false] - Show/hide data points
 * @param {number} [options.tension=0.4] - Line curve tension (0-1)
 * @param {number} [options.borderWidth=3] - Line thickness in pixels
 * @param {boolean} [options.fill=false] - Fill area under line
 * @param {boolean} [options.stacked=false] - Stack multiple datasets
 * @param {string} [options.yAxisLabel] - Y-axis label
 * @param {Function} [options.tooltipCallback] - Custom tooltip formatter
 * @returns {Object} Complete Chart.js configuration object
 *
 * @example
 * const config = createLineChartConfig({
 *   data: {
 *     labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
 *     datasets: [{
 *       label: 'Training Load',
 *       data: [45, 52, 48, 55, 50],
 *       borderColor: chartColors.primary[0],
 *     }]
 *   },
 *   title: 'Weekly Training Load',
 *   showPoints: true,
 * });
 */
export function createLineChartConfig(options = {}) {
  const {
    data,
    title,
    showLegend = true,
    showPoints = false,
    tension = 0.4,
    borderWidth = 3,
    fill = false,
    stacked = false,
    yAxisLabel,
    tooltipCallback,
  } = options;

  // Apply default styling to datasets
  if (data && data.datasets) {
    data.datasets = data.datasets.map((dataset, index) => ({
      tension,
      borderWidth,
      fill,
      pointRadius: showPoints ? 4 : 0,
      pointHoverRadius: 6,
      pointBackgroundColor: dataset.borderColor || chartColors.multiline[index % chartColors.multiline.length],
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      pointHoverBackgroundColor: '#ffffff',
      pointHoverBorderColor: dataset.borderColor || chartColors.multiline[index % chartColors.multiline.length],
      pointHoverBorderWidth: 2,
      ...dataset,
    }));
  }

  const config = {
    type: 'line',
    data,
    options: {
      ...chartDefaults,
      plugins: {
        ...chartDefaults.plugins,
        legend: {
          ...chartDefaults.plugins.legend,
          display: showLegend,
        },
        title: title ? {
          display: true,
          text: title,
          color: chartColors.dark.text,
          font: {
            family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Segoe UI", sans-serif',
            size: 16,
            weight: '600',
          },
          padding: {
            bottom: 20,
          },
        } : undefined,
        tooltip: tooltipCallback ? {
          ...chartDefaults.plugins.tooltip,
          callbacks: {
            ...chartDefaults.plugins.tooltip.callbacks,
            label: tooltipCallback,
          },
        } : chartDefaults.plugins.tooltip,
      },
      scales: {
        x: {
          ...chartDefaults.scales.x,
          stacked,
        },
        y: {
          ...chartDefaults.scales.y,
          stacked,
          title: yAxisLabel ? {
            display: true,
            text: yAxisLabel,
            color: chartColors.dark.text,
            font: {
              family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Segoe UI", sans-serif',
              size: 12,
              weight: '600',
            },
          } : undefined,
        },
      },
    },
  };

  return config;
}

/**
 * Creates a complete Chart.js configuration for bar charts
 * Ideal for comparing values, showing distributions, and category data
 *
 * @param {Object} options - Configuration options
 * @param {Object} options.data - Chart.js data object (required)
 * @param {string} [options.title] - Chart title
 * @param {boolean} [options.showLegend=true] - Show/hide legend
 * @param {boolean} [options.horizontal=false] - Horizontal bar chart
 * @param {boolean} [options.stacked=false] - Stack multiple datasets
 * @param {number} [options.borderRadius=8] - Bar corner radius in pixels
 * @param {number} [options.maxBarThickness=60] - Maximum bar width in pixels
 * @param {string} [options.yAxisLabel] - Y-axis label
 * @param {Function} [options.tooltipCallback] - Custom tooltip formatter
 * @returns {Object} Complete Chart.js configuration object
 *
 * @example
 * const config = createBarChartConfig({
 *   data: {
 *     labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
 *     datasets: [{
 *       label: 'Training Volume',
 *       data: [420, 480, 450, 510],
 *       backgroundColor: chartColors.primary[0],
 *     }]
 *   },
 *   title: 'Monthly Training Volume',
 *   borderRadius: 12,
 * });
 */
export function createBarChartConfig(options = {}) {
  const {
    data,
    title,
    showLegend = true,
    horizontal = false,
    stacked = false,
    borderRadius = 8,
    maxBarThickness = 60,
    yAxisLabel,
    tooltipCallback,
  } = options;

  // Apply default styling to datasets
  if (data && data.datasets) {
    data.datasets = data.datasets.map((dataset, index) => ({
      borderRadius,
      maxBarThickness,
      borderWidth: 0,
      backgroundColor: dataset.backgroundColor || chartColors.multiline[index % chartColors.multiline.length],
      hoverBackgroundColor: dataset.hoverBackgroundColor || dataset.backgroundColor || chartColors.multiline[index % chartColors.multiline.length],
      ...dataset,
    }));
  }

  const indexAxis = horizontal ? 'y' : 'x';

  const config = {
    type: 'bar',
    data,
    options: {
      ...chartDefaults,
      indexAxis,
      plugins: {
        ...chartDefaults.plugins,
        legend: {
          ...chartDefaults.plugins.legend,
          display: showLegend,
        },
        title: title ? {
          display: true,
          text: title,
          color: chartColors.dark.text,
          font: {
            family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Segoe UI", sans-serif',
            size: 16,
            weight: '600',
          },
          padding: {
            bottom: 20,
          },
        } : undefined,
        tooltip: tooltipCallback ? {
          ...chartDefaults.plugins.tooltip,
          callbacks: {
            ...chartDefaults.plugins.tooltip.callbacks,
            label: tooltipCallback,
          },
        } : chartDefaults.plugins.tooltip,
      },
      scales: {
        x: {
          ...chartDefaults.scales.x,
          stacked,
        },
        y: {
          ...chartDefaults.scales.y,
          stacked,
          title: yAxisLabel ? {
            display: true,
            text: yAxisLabel,
            color: chartColors.dark.text,
            font: {
              family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Segoe UI", sans-serif',
              size: 12,
              weight: '600',
            },
          } : undefined,
        },
      },
    },
  };

  return config;
}

/**
 * Creates a complete Chart.js configuration for doughnut/pie charts
 * Perfect for showing proportions, distributions, and percentage breakdowns
 *
 * @param {Object} options - Configuration options
 * @param {Object} options.data - Chart.js data object (required)
 * @param {string} [options.title] - Chart title
 * @param {boolean} [options.showLegend=true] - Show/hide legend
 * @param {string} [options.legendPosition='bottom'] - Legend position
 * @param {number} [options.cutout='75%'] - Donut hole size (use 0 for pie chart)
 * @param {number} [options.spacing=4] - Space between segments in pixels
 * @param {number} [options.borderWidth=0] - Segment border width
 * @param {boolean} [options.showPercentage=true] - Show percentages in tooltips
 * @param {string[]} [options.colors] - Custom color array
 * @param {Function} [options.tooltipCallback] - Custom tooltip formatter
 * @returns {Object} Complete Chart.js configuration object
 *
 * @example
 * const config = createDoughnutChartConfig({
 *   data: {
 *     labels: ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5'],
 *     datasets: [{
 *       data: [120, 180, 90, 45, 15],
 *     }]
 *   },
 *   title: 'Heart Rate Zone Distribution',
 *   colors: chartColors.zones,
 * });
 */
export function createDoughnutChartConfig(options = {}) {
  const {
    data,
    title,
    showLegend = true,
    legendPosition = 'bottom',
    cutout = '75%',
    spacing = 4,
    borderWidth = 0,
    showPercentage = true,
    colors,
    tooltipCallback,
  } = options;

  // Apply default styling to datasets
  if (data && data.datasets) {
    data.datasets = data.datasets.map((dataset) => ({
      backgroundColor: colors || dataset.backgroundColor || chartColors.zones,
      borderColor: 'transparent',
      borderWidth,
      spacing,
      hoverBorderWidth: 2,
      hoverBorderColor: '#ffffff',
      hoverOffset: 8,
      ...dataset,
    }));
  }

  const config = {
    type: 'doughnut',
    data,
    options: {
      ...chartDefaults,
      cutout,
      plugins: {
        ...chartDefaults.plugins,
        legend: {
          ...chartDefaults.plugins.legend,
          display: showLegend,
          position: legendPosition,
          align: legendPosition === 'bottom' ? 'center' : 'end',
        },
        title: title ? {
          display: true,
          text: title,
          color: chartColors.dark.text,
          font: {
            family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Segoe UI", sans-serif',
            size: 16,
            weight: '600',
          },
          padding: {
            bottom: 20,
          },
        } : undefined,
        tooltip: tooltipCallback ? {
          ...chartDefaults.plugins.tooltip,
          callbacks: {
            ...chartDefaults.plugins.tooltip.callbacks,
            label: tooltipCallback,
          },
        } : {
          ...chartDefaults.plugins.tooltip,
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed || 0;

              if (showPercentage) {
                // Calculate percentage
                const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${value.toLocaleString()} (${percentage}%)`;
              }

              return `${label}: ${value.toLocaleString()}`;
            }
          }
        },
      },
      // Remove scales for doughnut charts
      scales: undefined,
    },
  };

  return config;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Creates a linear gradient for Chart.js canvas context
 * Useful for area fills under line charts
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {string} colorStart - Starting color (top)
 * @param {string} colorEnd - Ending color (bottom)
 * @param {number} [height=400] - Gradient height in pixels
 * @returns {CanvasGradient} Canvas gradient object
 *
 * @example
 * const gradient = createGradient(
 *   ctx,
 *   'rgba(102, 126, 234, 0.5)',
 *   'rgba(102, 126, 234, 0.0)'
 * );
 */
export function createGradient(ctx, colorStart, colorEnd, height = 400) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, colorStart);
  gradient.addColorStop(1, colorEnd);
  return gradient;
}

/**
 * Creates a radial gradient for doughnut/pie chart backgrounds
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {number} centerX - Center X coordinate
 * @param {number} centerY - Center Y coordinate
 * @param {number} radius - Gradient radius
 * @param {string} colorStart - Center color
 * @param {string} colorEnd - Edge color
 * @returns {CanvasGradient} Canvas gradient object
 */
export function createRadialGradient(ctx, centerX, centerY, radius, colorStart, colorEnd) {
  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  gradient.addColorStop(0, colorStart);
  gradient.addColorStop(1, colorEnd);
  return gradient;
}

/**
 * Formats tooltip labels with proper units and number formatting
 *
 * @param {Object} context - Chart.js tooltip context
 * @param {string} [unit=''] - Unit to append (bpm, km, cal, min, etc.)
 * @param {number} [decimals=0] - Number of decimal places
 * @returns {string} Formatted label string
 *
 * @example
 * tooltipCallback: (context) => formatTooltipLabel(context, 'bpm', 0)
 */
export function formatTooltipLabel(context, unit = '', decimals = 0) {
  let label = context.dataset.label || '';

  if (label) {
    label += ': ';
  }

  if (context.parsed.y !== null) {
    const value = typeof context.parsed.y === 'number'
      ? context.parsed.y
      : context.parsed;

    const formatted = decimals > 0
      ? value.toFixed(decimals)
      : Math.round(value).toLocaleString();

    label += unit ? `${formatted} ${unit}` : formatted;
  }

  return label;
}

/**
 * Generates time-based labels for charts
 * Useful for creating consistent date/time labels
 *
 * @param {number} days - Number of days to generate labels for
 * @param {Date} [endDate=new Date()] - End date (defaults to today)
 * @param {string} [format='short'] - Format type: 'short' (MM/DD), 'long' (Jan 1), 'iso' (YYYY-MM-DD)
 * @returns {string[]} Array of formatted date labels
 *
 * @example
 * const labels = generateTimeLabels(7); // Last 7 days
 * // ['11/06', '11/07', '11/08', '11/09', '11/10', '11/11', '11/12']
 */
export function generateTimeLabels(days, endDate = new Date(), format = 'short') {
  const labels = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(endDate);
    date.setDate(date.getDate() - i);

    let label;
    switch (format) {
      case 'long':
        label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        break;
      case 'iso':
        label = date.toISOString().split('T')[0];
        break;
      case 'short':
      default:
        label = date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
        break;
    }

    labels.push(label);
  }

  return labels;
}

/**
 * Generates week labels for weekly aggregated data
 *
 * @param {number} weeks - Number of weeks to generate
 * @param {Date} [endDate=new Date()] - End date
 * @returns {string[]} Array of week labels
 *
 * @example
 * const labels = generateWeekLabels(4);
 * // ['Week of 10/16', 'Week of 10/23', 'Week of 10/30', 'Week of 11/06']
 */
export function generateWeekLabels(weeks, endDate = new Date()) {
  const labels = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const date = new Date(endDate);
    date.setDate(date.getDate() - (i * 7));

    // Get Monday of the week
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));

    const label = `Week of ${monday.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })}`;
    labels.push(label);
  }

  return labels;
}

/**
 * Aggregates daily data into weekly buckets
 * Useful for creating weekly summary charts
 *
 * @param {Array} data - Array of data objects with 'date' property
 * @param {string} valueKey - Key to sum (e.g., 'duration', 'distance')
 * @returns {Object} Object with week keys and aggregated values
 *
 * @example
 * const weeklyData = aggregateByWeek(activities, 'durationMinutes');
 * // { '2024-11-06': 420, '2024-10-30': 380, ... }
 */
export function aggregateByWeek(data, valueKey) {
  const weekly = {};

  data.forEach(item => {
    const date = new Date(item.date);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    const weekKey = monday.toISOString().split('T')[0];

    if (!weekly[weekKey]) {
      weekly[weekKey] = 0;
    }

    weekly[weekKey] += item[valueKey] || 0;
  });

  return weekly;
}

/**
 * Calculates moving average for smoothing time series data
 *
 * @param {number[]} data - Array of numeric values
 * @param {number} [window=7] - Moving average window size
 * @returns {number[]} Array of smoothed values
 *
 * @example
 * const smoothed = calculateMovingAverage([45, 48, 52, 50, 55], 3);
 * // [45, 48.33, 50, 52.33, 52.5]
 */
export function calculateMovingAverage(data, window = 7) {
  const result = [];

  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - Math.floor(window / 2));
    const end = Math.min(data.length, i + Math.ceil(window / 2));
    const subset = data.slice(start, end);
    const avg = subset.reduce((sum, val) => sum + val, 0) / subset.length;
    result.push(avg);
  }

  return result;
}

/**
 * Converts heart rate zone minutes to percentages
 *
 * @param {Object} zones - Object with zone1-zone5 minute values
 * @returns {Object} Object with zone percentages
 *
 * @example
 * const percentages = calculateZonePercentages({
 *   zone1: 120, zone2: 180, zone3: 90, zone4: 45, zone5: 15
 * });
 * // { zone1: 26.7, zone2: 40.0, zone3: 20.0, zone4: 10.0, zone5: 3.3 }
 */
export function calculateZonePercentages(zones) {
  const total = (zones.zone1 || 0) + (zones.zone2 || 0) + (zones.zone3 || 0) +
                (zones.zone4 || 0) + (zones.zone5 || 0);

  if (total === 0) {
    return { zone1: 0, zone2: 0, zone3: 0, zone4: 0, zone5: 0 };
  }

  return {
    zone1: parseFloat(((zones.zone1 || 0) / total * 100).toFixed(1)),
    zone2: parseFloat(((zones.zone2 || 0) / total * 100).toFixed(1)),
    zone3: parseFloat(((zones.zone3 || 0) / total * 100).toFixed(1)),
    zone4: parseFloat(((zones.zone4 || 0) / total * 100).toFixed(1)),
    zone5: parseFloat(((zones.zone5 || 0) / total * 100).toFixed(1)),
  };
}

/**
 * Applies dark theme to an existing chart instance
 * Useful for updating charts dynamically when theme changes
 *
 * @param {Chart} chart - Chart.js instance
 */
export function applyDarkTheme(chart) {
  if (!chart || !chart.options) return;

  // Update plugin colors
  if (chart.options.plugins) {
    if (chart.options.plugins.legend) {
      chart.options.plugins.legend.labels.color = chartColors.dark.text;
    }
    if (chart.options.plugins.title) {
      chart.options.plugins.title.color = chartColors.dark.text;
    }
    if (chart.options.plugins.tooltip) {
      chart.options.plugins.tooltip.backgroundColor = chartColors.dark.tooltipBg;
      chart.options.plugins.tooltip.borderColor = chartColors.dark.tooltipBorder;
    }
  }

  // Update scale colors
  if (chart.options.scales) {
    Object.keys(chart.options.scales).forEach(scaleKey => {
      const scale = chart.options.scales[scaleKey];
      if (scale.ticks) {
        scale.ticks.color = chartColors.dark.textSecondary;
      }
      if (scale.grid) {
        scale.grid.color = chartColors.dark.grid;
      }
      if (scale.title) {
        scale.title.color = chartColors.dark.text;
      }
    });
  }

  chart.update();
}

/**
 * Destroys all chart instances on a page
 * Useful for cleanup before recreating charts
 *
 * @param {Chart[]} charts - Array of Chart.js instances
 */
export function destroyAllCharts(charts) {
  charts.forEach(chart => {
    if (chart && typeof chart.destroy === 'function') {
      chart.destroy();
    }
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

// Export all for convenient destructuring
export default {
  chartColors,
  chartDefaults,
  createLineChartConfig,
  createBarChartConfig,
  createDoughnutChartConfig,
  createGradient,
  createRadialGradient,
  formatTooltipLabel,
  generateTimeLabels,
  generateWeekLabels,
  aggregateByWeek,
  calculateMovingAverage,
  calculateZonePercentages,
  applyDarkTheme,
  destroyAllCharts,
};
