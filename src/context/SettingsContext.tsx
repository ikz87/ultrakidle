import { createContext, useContext, useState, type ReactNode } from "react";
import { supabase } from "../lib/supabaseClient";

export type GuessboardColumn =
  | "enemy_name"
  | "enemy_type"
  | "weight_class"
  | "health"
  | "level_count"
  | "appearance";

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface UserSettings {
  cellColors: "default" | "colorblind" | "custom";
  showHintIcons: boolean;
  fontFamily: "vcr" | "atkinson";
  guessboardColumns: GuessboardColumn[];
  allowRandomGuess: {
    classic: boolean;
    cybergrind: boolean;
  };
  confirmDialogs: {
    infernoguessr: boolean;
    classic: boolean;
    cybergrind: boolean;
    igCybergrind: boolean;
  };
  persistImageControls: {
    infernoguessr: { gamma: boolean; zoom: boolean };
    igCybergrind: { gamma: boolean; zoom: boolean };
  };
  customColors: {
    correct: RGB;
    partial: RGB;
    incorrect: RGB;
  };
}

export const DEFAULT_SETTINGS: UserSettings = {
  cellColors: "default",
  showHintIcons: false,
  fontFamily: "vcr",
  guessboardColumns: [
    "enemy_name",
    "enemy_type",
    "weight_class",
    "health",
    "level_count",
    "appearance",
  ],
  allowRandomGuess: {
    classic: false,
    cybergrind: false,
  },
  confirmDialogs: {
    infernoguessr: false,
    classic: false,
    cybergrind: false,
    igCybergrind: false,
  },
  persistImageControls: {
    infernoguessr: { gamma: false, zoom: false },
    igCybergrind: { gamma: false, zoom: false },
  },
  customColors: {
    correct: { r: 0.13, g: 0.77, b: 0.37 },
    partial: { r: 0.92, g: 0.68, b: 0.13 },
    incorrect: { r: 0.94, g: 0.27, b: 0.27 },
  },
};

interface SettingsContextType {
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  syncWithDbSettings: (dbSettings: any | null) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

const mergeSettings = (base: UserSettings, patch: any): UserSettings => ({
  ...base,
  ...patch,
  allowRandomGuess: {
    ...base.allowRandomGuess,
    ...(patch?.allowRandomGuess || {}),
  },
  confirmDialogs: {
    ...base.confirmDialogs,
    ...(patch?.confirmDialogs || {}),
  },
  persistImageControls: {
    infernoguessr: {
      ...base.persistImageControls.infernoguessr,
      ...(patch?.persistImageControls?.infernoguessr || {}),
    },
    igCybergrind: {
      ...base.persistImageControls.igCybergrind,
      ...(patch?.persistImageControls?.igCybergrind || {}),
    },
  },
  customColors: {
    ...base.customColors,
    ...(patch?.customColors || {}),
  },
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<UserSettings>(() => {
    const saved = localStorage.getItem("ultrakidle_settings");
    if (saved) {
      try {
        return mergeSettings(DEFAULT_SETTINGS, JSON.parse(saved));
      } catch (e) {}
    }
    const oldColorblind =
      localStorage.getItem("ultrakidle_colorblind_mode") === "true";
    if (oldColorblind) {
      return {
        ...DEFAULT_SETTINGS,
        cellColors: "colorblind",
        showHintIcons: true,
      };
    }
    return DEFAULT_SETTINGS;
  });

  const updateDB = async (s: UserSettings) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        await supabase.from("user_settings").upsert({
          user_id: session.user.id,
          settings: s,
        });
      }
    } catch (e) {
      console.error("Failed to sync settings to DB:", e);
    }
  };

const updateSettings = (newSettings: Partial<UserSettings>) => {
  setSettingsState((prev) => {
    const next = { ...prev, ...newSettings };
    if (newSettings.allowRandomGuess) {
      next.allowRandomGuess = {
        ...prev.allowRandomGuess,
        ...newSettings.allowRandomGuess,
      };
    }
    if (newSettings.confirmDialogs) {
      next.confirmDialogs = {
        ...prev.confirmDialogs,
        ...newSettings.confirmDialogs,
      };
    }
    if (newSettings.persistImageControls) {
      next.persistImageControls = {
        infernoguessr: {
          ...prev.persistImageControls.infernoguessr,
          ...(newSettings.persistImageControls.infernoguessr || {}),
        },
        igCybergrind: {
          ...prev.persistImageControls.igCybergrind,
          ...(newSettings.persistImageControls.igCybergrind || {}),
        },
      };
    }
    if (newSettings.customColors) {
      next.customColors = {
        ...prev.customColors,
        ...newSettings.customColors,
      };
    }

    localStorage.setItem("ultrakidle_settings", JSON.stringify(next));
    updateDB(next);
    return next;
  });
};

  const syncWithDbSettings = (dbSettings: any | null) => {
    const localSaved = localStorage.getItem("ultrakidle_settings");
    const localSettings = localSaved ? JSON.parse(localSaved) : null;

    if (dbSettings) {
      const merged = mergeSettings(DEFAULT_SETTINGS, dbSettings);
      setSettingsState(merged);
      localStorage.setItem("ultrakidle_settings", JSON.stringify(merged));

      if (!localSettings) {
        updateDB(merged);
      }
    } else if (localSettings) {
      const mergedLocal = mergeSettings(DEFAULT_SETTINGS, localSettings);
      updateDB(mergedLocal);
      setSettingsState(mergedLocal);
    } else {
      const oldColorblind =
        localStorage.getItem("ultrakidle_colorblind_mode") === "true";
      const base = oldColorblind
        ? {
            ...DEFAULT_SETTINGS,
            cellColors: "colorblind" as const,
            showHintIcons: true,
          }
        : DEFAULT_SETTINGS;

      updateDB(base);
      setSettingsState(base);
      localStorage.setItem("ultrakidle_settings", JSON.stringify(base));
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        syncWithDbSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
    }
