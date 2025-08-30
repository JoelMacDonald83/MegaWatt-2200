
import React from 'react';
import { Modal } from './Modal';
import { useSettings } from '../contexts/SettingsContext';
import { EditorTheme, EditorFontSize } from '../types';
import { ToggleSwitch } from './ToggleSwitch';

const StyleRadio: React.FC<{
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: {value: string, label: string}[];
}> = ({label, name, value, onChange, options}) => (
    <div>
        <label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)]">{label}</label>
        <div className="flex items-center space-x-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-md p-1 mt-1">
            {options.map(opt => (
                <label key={opt.value} className={`flex-1 text-center text-[length:var(--font-size-sm)] px-2 py-1 rounded-md cursor-pointer transition-colors ${value === opt.value ? 'bg-[var(--bg-active)] text-[var(--text-on-accent)]' : 'hover:bg-[var(--bg-hover)]'}`}>
                    <input type="radio" name={name} value={opt.value} checked={value === opt.value} onChange={(e) => onChange(e.target.value)} className="sr-only" />
                    {opt.label}
                </label>
            ))}
        </div>
    </div>
);

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, setSettings } = useSettings();

  const handleThemeChange = (theme: string) => {
    setSettings({ ...settings, theme: theme as EditorTheme });
  };
  
  const handleFontSizeChange = (fontSize: string) => {
    setSettings({ ...settings, fontSize: fontSize as EditorFontSize });
  };

  const handleUiScaleChange = (scale: number) => {
    setSettings({ ...settings, uiScale: scale });
  };
  
  const handleAutosaveFileChange = (enabled: boolean) => {
    setSettings({ ...settings, autosaveFileDownloadEnabled: enabled });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editor Settings">
        <div className="space-y-6">
            <StyleRadio
                label="Color Theme"
                name="theme"
                value={settings.theme}
                onChange={handleThemeChange}
                options={[
                    { value: 'dark', label: 'Dark' },
                    { value: 'light', label: 'Light' },
                    { value: 'high-contrast', label: 'High Contrast' },
                ]}
            />
            <StyleRadio
                label="Font Size"
                name="fontSize"
                value={settings.fontSize}
                onChange={handleFontSizeChange}
                options={[
                    { value: 'small', label: 'Small' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'large', label: 'Large' },
                ]}
            />
             <div>
                <label htmlFor="ui-scale-slider" className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)]">
                    UI Scale: <span className="font-bold text-[var(--text-primary)]">{(settings.uiScale * 100).toFixed(0)}%</span>
                </label>
                <input
                    id="ui-scale-slider"
                    type="range"
                    min="0.8"
                    max="2"
                    step="0.05"
                    value={settings.uiScale}
                    onChange={(e) => handleUiScaleChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-[var(--bg-input)] rounded-lg appearance-none cursor-pointer accent-[var(--bg-active)] mt-2"
                />
            </div>
            <div className="pt-6 border-t border-[var(--border-primary)]">
                <ToggleSwitch
                    label="Enable Autosave File Download"
                    enabled={!!settings.autosaveFileDownloadEnabled}
                    onChange={handleAutosaveFileChange}
                    help="When enabled, the app will automatically download a backup file of your project shortly after you make changes. This can be useful, but may also fill up your Downloads folder."
                />
            </div>
        </div>
    </Modal>
  );
};
