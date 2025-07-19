const CHART_COLORS = [
  "#3b82f6",
  "#a855f7",
  "#14b8a6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#84cc16",
  "#f97316",
];

export const getChartColor = (index: number) =>
  CHART_COLORS[index % CHART_COLORS.length];
export const getChartColors = (count: number) =>
  Array.from({ length: count }, (_, i) => getChartColor(i));
export const themeClasses = {
  bg: "theme-bg",
  surface: "theme-surface",
  card: "theme-card",
  text: "theme-text",
  textSecondary: "theme-text-secondary",
  border: "theme-border",
  btnPrimary: "theme-btn-primary",
};
