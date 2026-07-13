import { useCallback, useMemo, useState } from "react";
import { AppSettings } from "../types/task";
import { getSettings, saveSettings } from "../utils/storage";

export const useSettings = () => {
  const [settings, setSettingsState] = useState<AppSettings>(() => getSettings());

  const setSettings = useCallback((next: AppSettings) => {
    saveSettings(next);
    setSettingsState(next);
  }, []);

  const updateSettings = useCallback(
    (patch: Partial<AppSettings>) => {
      setSettings({ ...settings, ...patch });
    },
    [setSettings, settings],
  );

  return useMemo(
    () => ({
      settings,
      setSettings,
      updateSettings,
    }),
    [setSettings, settings, updateSettings],
  );
};
