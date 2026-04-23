import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export const CURRENT_VERSION = '1.2.0-experimental';
const POLL_INTERVAL = 5 * 60 * 1000; // 5 min

interface VersionContextType {
    updateAvailable: boolean;
    setUpdateAvailable: (available: boolean) => void;
    checkForUpdate: () => Promise<void>;
}

const VersionContext = createContext<VersionContextType | undefined>(undefined);

export function VersionProvider({ children }: { children: ReactNode }) {
    const [updateAvailable, setUpdateAvailable] = useState(false);

    async function checkForUpdate() {
        try {
            const res = await fetch("/version.json", { cache: "no-store" });
            const { version } = await res.json();
            if (version !== CURRENT_VERSION) {
                setUpdateAvailable(true);
            }
        } catch {
            // ignore fetch errors
        }
    }

    useEffect(() => {
        checkForUpdate();
        const interval = setInterval(checkForUpdate, POLL_INTERVAL); // 5 min poll

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                checkForUpdate();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            clearInterval(interval);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, []);

    return (
        <VersionContext.Provider value={{ updateAvailable, setUpdateAvailable, checkForUpdate }}>
            {children}
        </VersionContext.Provider>
    );
}

export function useVersion() {
    const context = useContext(VersionContext);
    if (context === undefined) {
        throw new Error('useVersion must be used within a VersionProvider');
    }
    return context;
}
