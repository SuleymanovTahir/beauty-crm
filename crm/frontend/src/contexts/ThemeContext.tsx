// /frontend/src/contexts/ThemeContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
        // root.classList.add(`theme-${colorTheme}`); // This line is now handled inside the if/else for clarity

        if (colorTheme === 'custom') {
            root.classList.add('theme-custom');
            const mainColor = customColors.colors[customColors.colors.length - 1] || '#3b82f6';
            
            // Set standard Shadcn primary values natively for Tailwind V4
            root.style.setProperty('--primary', mainColor);
            root.style.setProperty('--brand-primary', mainColor);

            const gradientColorsStr = customColors.colors.join(', ');
            root.style.setProperty('--brand-gradient', `linear-gradient(${customColors.angle}, ${gradientColorsStr})`);
            
            const shadowColor = `${mainColor}40`; // 25% opacity for shadow
            root.style.setProperty('--brand-shadow', `0 10px 15px -3px ${shadowColor}`);
            
            const lightColor = `${mainColor}1a`; // 10% opacity for light background
            root.style.setProperty('--brand-light', lightColor);
        } else {
            root.classList.add(`theme-${colorTheme}`);
            
            // Set primary Shadcn injection for standard themes to ensure bg-primary works correctly
            const defaultColors: Record<string, string> = {
                pink: '#ec4899',
                blue: '#0ea5e9',
                purple: '#a855f7',
                emerald: '#10b981',
                orange: '#f97316',
                amber: '#f59e0b',
            };
            const themeHex = defaultColors[colorTheme] || defaultColors.pink;
            root.style.setProperty('--primary', themeHex);
            
            // Standard CSS classes will handle the rest via tracking .theme-* 
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
        // For the icon: sepia converts all colors to one base, then hue-rotate for uniform single color
        const iconSepiaDeg = hue - 50;
        root.style.setProperty('--logo-icon-filter', `sepia(1) saturate(2.5) hue-rotate(${iconSepiaDeg}deg) brightness(0.9)`);

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

    const getSvgGradient = () => {
        if (colorTheme === 'custom') {
            const colors = customColors.colors || ['#3b82f6', '#d946ef'];
            return { colors, angle: customColors.angle || '135deg' };
        }
        const defaultGradients: Record<string, string[]> = {
            pink: ['#3b82f6', '#d946ef', '#f43f5e'],
            blue: ['#1e40af', '#0ea5e9', '#38bdf8'],
            purple: ['#9333ea', '#a855f7', '#c084fc'],
            emerald: ['#059669', '#10b981', '#34d399'],
            orange: ['#ea580c', '#f97316', '#fb923c'],
            amber: ['#d97706', '#f59e0b', '#fbbf24'],
        };
        return { colors: defaultGradients[colorTheme] || defaultGradients.pink, angle: '135deg' };
    };

    const gradientData = getSvgGradient();
    let x1 = '0%', y1 = '0%', x2 = '100%', y2 = '100%';
    if (gradientData.angle.includes('90')) { x2 = '100%'; y2 = '0%'; }
    else if (gradientData.angle.includes('180')) { x2 = '0%'; y2 = '100%'; }
    else if (gradientData.angle.includes('45')) { y1 = '100%'; x2 = '100%'; y2 = '0%'; }
    void x1; void y1; void x2; void y2;

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
