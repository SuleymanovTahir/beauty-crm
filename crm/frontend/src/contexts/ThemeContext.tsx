// /frontend/src/contexts/ThemeContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import i18n from '../i18n'; // Assuming i18n is initialized in src/i18n.ts

const hexToHsl = (hex: string): [number, number, number] => {
  let r = 0, g = 0, b = 0;
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) {
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
      r = parseInt(hex.substring(1, 3), 16);
      g = parseInt(hex.substring(3, 5), 16);
      b = parseInt(hex.substring(5, 7), 16);
    }
  }
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
};

export type Theme = 'light' | 'dark';
export type ColorTheme = 'pink' | 'blue' | 'purple' | 'emerald' | 'orange' | 'amber' | 'custom';

export interface CustomThemeColors {
    colors: string[];
    angle: string;
}

interface ThemeContextType {
    theme: Theme;
    colorTheme: ColorTheme;
    customColors: CustomThemeColors;
    toggleTheme: () => void;
    setColorTheme: (color: ColorTheme) => void;
    setCustomColors: (colors: CustomThemeColors) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<Theme>(() => {
        const saved = localStorage.getItem('theme');
        return (saved === 'light' || saved === 'dark') ? saved : 'light';
    });

    const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
        const saved = localStorage.getItem('colorTheme') as ColorTheme;
        const validThemes: ColorTheme[] = ['pink', 'blue', 'purple', 'emerald', 'orange', 'amber', 'custom'];
        return validThemes.includes(saved) ? saved : 'pink';
    });

    const [customColors, setCustomColorsState] = useState<CustomThemeColors>(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('customColors') || '{}');
            if (saved && Array.isArray(saved.colors)) {
                return { colors: saved.colors, angle: saved.angle || '135deg' };
            } else if (saved && saved.start && saved.end) {
                // Migration from { start, end }
                return { colors: [saved.start, saved.end], angle: '135deg' };
            }
            return { colors: ['#3b82f6', '#d946ef'], angle: '135deg' };
        } catch {
            return { colors: ['#3b82f6', '#d946ef'], angle: '135deg' };
        }
    });

    useEffect(() => {
        localStorage.setItem('theme', theme);
        localStorage.setItem('colorTheme', colorTheme);
        localStorage.setItem('customColors', JSON.stringify(customColors));

        // Apply theme classes to document root
        const root = document.documentElement;
        root.classList.remove('light', 'dark', 'theme-pink', 'theme-blue', 'theme-purple', 'theme-emerald', 'theme-orange', 'theme-amber', 'theme-custom');
        root.classList.add(theme);
        root.classList.add(`theme-${colorTheme}`);

        if (colorTheme === 'custom') {
            const gradientColorsStr = customColors.colors.join(', ');
            const mainColor = customColors.colors[customColors.colors.length - 1] || '#3b82f6';
            
            root.style.setProperty('--brand-primary', mainColor);
            root.style.setProperty('--brand-gradient', `linear-gradient(${customColors.angle}, ${gradientColorsStr})`);
            
            // Hex color + 4D for approx 30% opacity
            const hexDropAlpha = mainColor.length === 7 ? mainColor + '4D' : mainColor;
            root.style.setProperty('--brand-shadow', `0 10px 15px -3px ${hexDropAlpha}`);
            root.style.setProperty('--brand-light', `color-mix(in srgb, ${mainColor} 12%, transparent)`);
        } else {
            root.style.removeProperty('--brand-primary');
            root.style.removeProperty('--brand-gradient');
            root.style.removeProperty('--brand-shadow');
            root.style.removeProperty('--brand-light');
        }

        // Dynamically color the Favicon using Canvas
        const determineFaviconColor = () => {
            if (colorTheme === 'custom') {
                return customColors.colors[customColors.colors.length - 1] || '#3b82f6';
            }
            const defaultThemeColors: Record<string, string> = {
                pink: '#ec4899',
                blue: '#3b82f6',
                purple: '#a855f7',
                emerald: '#10b981',
                orange: '#f97316',
                amber: '#f59e0b',
            };
            return defaultThemeColors[colorTheme] || '#ec4899';
        };

        const faviconMainColor = determineFaviconColor();
        const [hue] = hexToHsl(faviconMainColor);
        const hueDiff = hue - 330; // 330 is approx hue of original pink logo
        root.style.setProperty('--logo-filter', `hue-rotate(${hueDiff}deg)`);

        const updateFavicon = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const img = new Image();
            img.src = '/logo/logo-icon-pink.svg';
            img.onload = () => {
                const aspect = img.naturalWidth / img.naturalHeight;
                let w = 128, h = 128;
                if (aspect > 1) {
                    h = 128 / aspect;
                } else {
                    w = 128 * aspect;
                }
                const x = (128 - w) / 2;
                const y = (128 - h) / 2;

                ctx.filter = `hue-rotate(${hueDiff}deg)`;
                ctx.drawImage(img, x, y, w, h);
                
                const dataUrl = canvas.toDataURL('image/png');
                const link = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
                const apple = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
                
                if (link) {
                    link.type = 'image/png';
                    link.href = dataUrl;
                }
                if (apple) {
                    apple.href = dataUrl;
                }
            };
        };

        updateFavicon();
        
    }, [theme, colorTheme, customColors]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    const setColorTheme = (color: ColorTheme) => {
        setColorThemeState(color);
    };

    const setCustomColors = (colors: CustomThemeColors) => {
        setCustomColorsState(colors);
    }

    return (
        <ThemeContext.Provider value={{ theme, colorTheme, customColors, toggleTheme, setColorTheme, setCustomColors }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
