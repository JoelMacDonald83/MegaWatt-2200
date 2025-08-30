
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { EditorSettings, EditorTheme, EditorFontSize } from '../types';

const defaultSettings: EditorSettings = {
  theme: 'high-contrast',
  fontSize: 'large',
  uiScale: 1,
  autosaveFileDownloadEnabled: false,
};

const SettingsContext = createContext<{
  settings: EditorSettings;
  setSettings: (settings: EditorSettings) => void;
}>({
  settings: defaultSettings,
  setSettings: () => {},
});

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<EditorSettings>(() => {
    try {
      const storedSettings = localStorage.getItem('phoenixEditorSettings');
      // Merge stored settings with defaults to handle new settings being added
      const loaded = storedSettings ? JSON.parse(storedSettings) : {};
      return { ...defaultSettings, ...loaded };
    } catch (error) {
      console.error('Failed to load settings from localStorage', error);
      return defaultSettings;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('phoenixEditorSettings', JSON.stringify(settings));
      
      // Update body classes for theme and font presets
      document.body.classList.remove('theme-dark', 'theme-light', 'theme-high-contrast');
      document.body.classList.add(`theme-${settings.theme}`);

      document.body.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');
      document.body.classList.add(`font-size-${settings.fontSize}`);

      // Set the root font size to scale all rem units
      const baseFontSize = 16;
      document.documentElement.style.fontSize = `${baseFontSize * settings.uiScale}px`;

    } catch (error) {
      console.error('Failed to save settings to localStorage', error);
    }
  }, [settings]);

  const value = useMemo(() => ({ settings, setSettings }), [settings]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
