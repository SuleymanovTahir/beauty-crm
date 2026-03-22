// /frontend/src/contexts/ThemeContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';
type ColorTheme = 'pink' | 'blue' | 'purple' | 'emerald' | 'orange' | 'amber';

interface ThemeContextType {
    theme: Theme;
    colorTheme: ColorTheme;
    toggleTheme: () => void;
    setColorTheme: (color: ColorTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<Theme>(() => {
        const saved = localStorage.getItem('theme');
        return (saved === 'light' || saved === 'dark') ? saved : 'light';
    });

    const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
        const saved = localStorage.getItem('colorTheme') as ColorTheme;
        const validThemes: ColorTheme[] = ['pink', 'blue', 'purple', 'emerald', 'orange', 'amber'];
        return validThemes.includes(saved) ? saved : 'pink';
    });

    useEffect(() => {
        localStorage.setItem('theme', theme);
        localStorage.setItem('colorTheme', colorTheme);

        // Apply theme classes to document root
        const root = document.documentElement;
        root.classList.remove('light', 'dark', 'theme-pink', 'theme-blue', 'theme-purple', 'theme-emerald', 'theme-orange', 'theme-amber');
        root.classList.add(theme);
        root.classList.add(`theme-${colorTheme}`);

        // Update favicon dynamically
        const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
        const appleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
        const hasSpecificIcon = ['pink', 'blue'].includes(colorTheme);
        const iconPath = hasSpecificIcon ? `/logo/logo-icon-${colorTheme}.png` : `/logo/logo-icon.png`;
        
        if (favicon) favicon.href = iconPath;
        if (appleIcon) appleIcon.href = iconPath;
        
    }, [theme, colorTheme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    const setColorTheme = (color: ColorTheme) => {
        setColorThemeState(color);
    };

    return (
        <ThemeContext.Provider value={{ theme, colorTheme, toggleTheme, setColorTheme }}>
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
