// /frontend/src/contexts/ThemeContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';
type ColorTheme = 'pink' | 'blue' | 'purple' | 'emerald' | 'orange' | 'amber' | 'custom';

interface ThemeContextType {
    theme: Theme;
    colorTheme: ColorTheme;
    customColors: { start: string, end: string };
    toggleTheme: () => void;
    setColorTheme: (color: ColorTheme) => void;
    setCustomColors: (colors: { start: string, end: string }) => void;
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

    const [customColors, setCustomColorsState] = useState<{start: string, end: string}>(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('customColors') || '{}');
            return {
                start: saved.start || '#3b82f6',
                end: saved.end || '#d946ef'
            };
        } catch {
            return { start: '#3b82f6', end: '#d946ef' };
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
            root.style.setProperty('--brand-primary', customColors.end);
            root.style.setProperty('--brand-gradient', `linear-gradient(135deg, ${customColors.start} 0%, ${customColors.end} 100%)`);
            // Hex color + 4D for approx 30% opacity
            const hexDropAlpha = customColors.end.length === 7 ? customColors.end + '4D' : customColors.end;
            root.style.setProperty('--brand-shadow', `0 10px 15px -3px ${hexDropAlpha}`);
            root.style.setProperty('--brand-light', `color-mix(in srgb, ${customColors.end} 12%, transparent)`);
        } else {
            root.style.removeProperty('--brand-primary');
            root.style.removeProperty('--brand-gradient');
            root.style.removeProperty('--brand-shadow');
            root.style.removeProperty('--brand-light');
        }

        // Update favicon dynamically
        const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
        const appleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
        const hasSpecificIcon = ['pink', 'blue'].includes(colorTheme);
        const iconPath = hasSpecificIcon ? `/logo/logo-icon-${colorTheme}.png` : `/logo/logo-icon.png`;
        
        if (favicon) favicon.href = iconPath;
        if (appleIcon) appleIcon.href = iconPath;
        
    }, [theme, colorTheme, customColors]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    const setColorTheme = (color: ColorTheme) => {
        setColorThemeState(color);
    };

    const setCustomColors = (colors: { start: string, end: string }) => {
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
