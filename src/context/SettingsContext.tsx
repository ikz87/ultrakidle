import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface SettingsContextType {
    colorblindMode: boolean;
    toggleColorblindMode: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [colorblindMode, setColorblindMode] = useState<boolean>(() => {
        const saved = localStorage.getItem('ultrakidle_colorblind_mode');
        return saved === 'true';
    });

    useEffect(() => {
        localStorage.setItem('ultrakidle_colorblind_mode', String(colorblindMode));
    }, [colorblindMode]);

    const toggleColorblindMode = () => {
        setColorblindMode(prev => !prev);
    };

    return (
        <SettingsContext.Provider value={{ colorblindMode, toggleColorblindMode }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
