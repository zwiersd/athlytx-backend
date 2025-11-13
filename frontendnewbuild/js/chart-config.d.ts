/**
 * TypeScript type definitions for Athlytx Elite Chart Configuration
 * @module chart-config
 */

import { Chart, ChartConfiguration, ChartOptions, TooltipItem } from 'chart.js';

// ============================================================================
// COLOR PALETTES
// ============================================================================

export interface ChartColors {
  primary: [string, string, string];
  zones: [string, string, string, string, string];
  status: {
    fresh: string;
    optimal: string;
    fatigued: string;
    overtrained: string;
  };
  multiline: string[];
  gradients: {
    primary: { start: string; end: string };
    success: { start: string; end: string };
    warning: { start: string; end: string };
    danger: { start: string; end: string };
  };
  dark: {
    text: string;
    textSecondary: string;
    grid: string;
    gridBorder: string;
    tooltipBg: string;
    tooltipBorder: string;
  };
}

export const chartColors: ChartColors;

// ============================================================================
// CHART DEFAULTS
// ============================================================================

export const chartDefaults: ChartOptions;

// ============================================================================
// CHART CONFIGURATION OPTIONS
// ============================================================================

export interface LineChartOptions {
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      borderColor?: string;
      backgroundColor?: string | CanvasGradient;
      fill?: boolean;
      [key: string]: any;
    }>;
  };
  title?: string;
  showLegend?: boolean;
  showPoints?: boolean;
  tension?: number;
  borderWidth?: number;
  fill?: boolean;
  stacked?: boolean;
  yAxisLabel?: string;
  tooltipCallback?: (context: TooltipItem<'line'>) => string;
}

export interface BarChartOptions {
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      hoverBackgroundColor?: string | string[];
      [key: string]: any;
    }>;
  };
  title?: string;
  showLegend?: boolean;
  horizontal?: boolean;
  stacked?: boolean;
  borderRadius?: number;
  maxBarThickness?: number;
  yAxisLabel?: string;
  tooltipCallback?: (context: TooltipItem<'bar'>) => string;
}

export interface DoughnutChartOptions {
  data: {
    labels: string[];
    datasets: Array<{
      data: number[];
      backgroundColor?: string[];
      [key: string]: any;
    }>;
  };
  title?: string;
  showLegend?: boolean;
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
  cutout?: string | number;
  spacing?: number;
  borderWidth?: number;
  showPercentage?: boolean;
  colors?: string[];
  tooltipCallback?: (context: TooltipItem<'doughnut'>) => string;
}

// ============================================================================
// CHART TEMPLATE FUNCTIONS
// ============================================================================

export function createLineChartConfig(options: LineChartOptions): ChartConfiguration<'line'>;
export function createBarChartConfig(options: BarChartOptions): ChartConfiguration<'bar'>;
export function createDoughnutChartConfig(options: DoughnutChartOptions): ChartConfiguration<'doughnut'>;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function createGradient(
  ctx: CanvasRenderingContext2D,
  colorStart: string,
  colorEnd: string,
  height?: number
): CanvasGradient;

export function createRadialGradient(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  colorStart: string,
  colorEnd: string
): CanvasGradient;

export function formatTooltipLabel(
  context: TooltipItem<any>,
  unit?: string,
  decimals?: number
): string;

export function generateTimeLabels(
  days: number,
  endDate?: Date,
  format?: 'short' | 'long' | 'iso'
): string[];

export function generateWeekLabels(
  weeks: number,
  endDate?: Date
): string[];

export interface ActivityData {
  date: string;
  [key: string]: any;
}

export function aggregateByWeek(
  data: ActivityData[],
  valueKey: string
): Record<string, number>;

export function calculateMovingAverage(
  data: number[],
  window?: number
): number[];

export interface ZoneMinutes {
  zone1: number;
  zone2: number;
  zone3: number;
  zone4: number;
  zone5: number;
}

export interface ZonePercentages {
  zone1: number;
  zone2: number;
  zone3: number;
  zone4: number;
  zone5: number;
}

export function calculateZonePercentages(zones: ZoneMinutes): ZonePercentages;

export function applyDarkTheme(chart: Chart): void;

export function destroyAllCharts(charts: Chart[]): void;

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

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
