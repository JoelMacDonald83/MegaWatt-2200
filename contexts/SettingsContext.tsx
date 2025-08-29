import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { EditorSettings, EditorTheme, EditorFontSize } from '../types';

const defaultSettings: EditorSettings = {
  theme: 'dark',
  fontSize: 'medium',
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
      return storedSettings ? JSON.parse(storedSettings) : defaultSettings;
    } catch (error) {
      console.error('Failed to load settings from localStorage', error);
      return defaultSettings;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('phoenixEditorSettings', JSON.stringify(settings));
      
      // Update body classes
      document.body.classList.remove('theme-dark', 'theme-light', 'theme-high-contrast');
      document.body.classList.add(`theme-${settings.theme}`);

      document.body.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');
      document.body.classList.add(`font-size-${settings.fontSize}`);

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
