
import React from 'react';
import { HelpTooltip } from './HelpTooltip';

export const ToggleSwitch: React.FC<{
  label: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  help?: string;
}> = ({ label, enabled, onChange, help }) => {
  return (
    <div className="flex items-center justify-between">
       <div className="flex items-center gap-2">
            <span className="text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)]">{label}</span>
            {help && <HelpTooltip title={label} content={help} />}
       </div>
      <button
        type="button"
        className={`${
          enabled ? 'bg-[var(--bg-active)]' : 'bg-[var(--bg-panel-light)]'
        } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--border-accent)] focus:ring-offset-2 focus:ring-offset-[var(--bg-main)]`}
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
      >
        <span
          aria-hidden="true"
          className={`${
            enabled ? 'translate-x-5' : 'translate-x-0'
          } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
        />
      </button>
    </div>
  );
};
