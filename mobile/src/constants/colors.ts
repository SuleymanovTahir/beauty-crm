export const Colors = {
  light: {
    primary: '#E91E63',
    primaryLight: '#F8BBD9',
    primaryDark: '#C2185B',
    secondary: '#9C27B0',
    background: '#FFFFFF',
    surface: '#F5F5F5',
    text: '#212121',
    textSecondary: '#757575',
    border: '#E0E0E0',
    error: '#F44336',
    success: '#4CAF50',
    warning: '#FF9800',
    info: '#2196F3',
  },
  dark: {
    primary: '#F48FB1',
    primaryLight: '#F8BBD9',
    primaryDark: '#E91E63',
    secondary: '#CE93D8',
    background: '#121212',
    surface: '#1E1E1E',
    text: '#FFFFFF',
    textSecondary: '#B0B0B0',
    border: '#333333',
    error: '#EF5350',
    success: '#66BB6A',
    warning: '#FFA726',
    info: '#42A5F5',
  },
};

export type ColorScheme = typeof Colors.light;
