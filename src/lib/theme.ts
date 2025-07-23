const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export const getChartColor = (index: number) =>
  CHART_COLORS[index % CHART_COLORS.length];
export const getChartColors = (count: number) =>
  Array.from({ length: count }, (_, i) => getChartColor(i));
