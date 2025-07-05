export interface ThemeColors {
  background: string;
  surface: string;
  card: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderSecondary: string;
  primary: string;
  primaryHover: string;
  secondary: string;
  secondaryHover: string;
  accent: string;
  accentHover: string;
  success: string;
  warning: string;
  error: string;
  chart: string[];
}

export const lightTheme: ThemeColors = {
  background: '#ffffff',
  surface: '#f9fafb',
  card: '#f3f4f6',
  text: '#111827',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  border: '#e5e7eb',
  borderSecondary: '#d1d5db',
  primary: '#3b82f6',
  primaryHover: '#2563eb',
  secondary: '#a855f7',
  secondaryHover: '#9333ea',
  accent: '#14b8a6',
  accentHover: '#0d9488',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  chart: [
    '#3b82f6', '#a855f7', '#14b8a6', '#22c55e', '#f59e0b',
    '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
  ]
};

export const darkTheme: ThemeColors = {
  background: '#111827',
  surface: '#1f2937',
  card: '#374151',
  text: '#f9fafb',
  textSecondary: '#d1d5db',
  textMuted: '#9ca3af',
  border: '#374151',
  borderSecondary: '#4b5563',
  primary: '#3b82f6',
  primaryHover: '#2563eb',
  secondary: '#a855f7',
  secondaryHover: '#9333ea',
  accent: '#14b8a6',
  accentHover: '#0d9488',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  chart: [
    '#3b82f6', '#a855f7', '#14b8a6', '#22c55e', '#f59e0b',
    '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
  ]
};

export const getTheme = (isDark: boolean = false): ThemeColors => {
  return isDark ? darkTheme : lightTheme;
};

export const getChartColor = (index: number, isDark: boolean = false): string => {
  const theme = getTheme(isDark);
  return theme.chart[index % theme.chart.length];
};

export const getChartColors = (count: number, isDark: boolean = false): string[] => {
  const theme = getTheme(isDark);
  return Array.from({ length: count }, (_, i) => theme.chart[i % theme.chart.length]);
};

export const apexChartTheme = {
  light: {
    background: lightTheme.background,
    foreColor: lightTheme.text,
    gridColor: lightTheme.border,
    borderColor: lightTheme.borderSecondary,
    tooltipBackground: lightTheme.background,
    tooltipForeColor: lightTheme.text,
    colors: lightTheme.chart
  },
  dark: {
    background: darkTheme.background,
    foreColor: darkTheme.text,
    gridColor: darkTheme.border,
    borderColor: darkTheme.borderSecondary,
    tooltipBackground: darkTheme.surface,
    tooltipForeColor: darkTheme.text,
    colors: darkTheme.chart
  }
};

export const getApexChartTheme = (isDark: boolean = false) => {
  return isDark ? apexChartTheme.dark : apexChartTheme.light;
};

export interface ThemeState {
  isDark: boolean;
  colors: ThemeColors;
  apexTheme: typeof apexChartTheme.light;
}

export const createThemeState = (isDark: boolean = false): ThemeState => {
  return {
    isDark,
    colors: getTheme(isDark),
    apexTheme: getApexChartTheme(isDark)
  };
};

// CSS Custom Properties helpers
export const getCSSCustomProperty = (property: string): string => {
  if (typeof window !== 'undefined') {
    return getComputedStyle(document.documentElement).getPropertyValue(property);
  }
  return '';
};

export const setCSSCustomProperty = (property: string, value: string): void => {
  if (typeof window !== 'undefined') {
    document.documentElement.style.setProperty(property, value);
  }
};

// Theme utility classes - use these in your components
export const themeClasses = {
  // Backgrounds
  bg: 'theme-bg',
  surface: 'theme-surface',
  card: 'theme-card',
  
  // Text
  text: 'theme-text',
  textSecondary: 'theme-text-secondary',
  textMuted: 'theme-text-muted',
  
  // Borders
  border: 'theme-border',
  
  // Buttons
  btnPrimary: 'theme-btn-primary',
  btnSecondary: 'theme-btn-secondary',
  btnAccent: 'theme-btn-accent',
  
  // Brand colors
  primary: 'theme-primary',
  secondary: 'theme-secondary',
  accent: 'theme-accent'
};

export const getThemeClass = (className: keyof typeof themeClasses): string => {
  return themeClasses[className];
};