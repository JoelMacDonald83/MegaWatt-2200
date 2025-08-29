

import React from 'react';
import { HelpTooltip } from '../HelpTooltip';

export const StyleSelect: React.FC<{label: string, value: string | undefined, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, children: React.ReactNode, wrapperClassName?: string, disabled?: boolean, help?: string}> = ({label, value, onChange, children, wrapperClassName, disabled, help}) => (
    <div className={wrapperClassName}>
        <div className="flex items-center gap-2 mb-1">
            <label className="block text-[length:var(--font-size-xs)] font-medium text-[var(--text-secondary)]">{label}</label>
            {help && <HelpTooltip title={label} content={help} />}
        </div>
        <select value={value} onChange={onChange} disabled={disabled} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2 focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)] text-[length:var(--font-size-sm)] disabled:bg-[var(--bg-panel-light)] disabled:text-[var(--text-tertiary)] disabled:cursor-not-allowed">
            {children}
        </select>
    </div>
);

export const StyleNumberInput: React.FC<{label: string, value: number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, step?: number, min?: number, wrapperClassName?: string, help?: string}> = ({label, value, onChange, step=0.1, min=0, wrapperClassName, help}) => (
    <div className={wrapperClassName}>
        <div className="flex items-center gap-2 mb-1">
            <label className="block text-[length:var(--font-size-xs)] font-medium text-[var(--text-secondary)]">{label}</label>
            {help && <HelpTooltip title={label} content={help} />}
        </div>
        <input type="number" value={value} onChange={onChange} step={step} min={min} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2 focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)] text-[length:var(--font-size-sm)]" />
    </div>
);

export const StyleRadio: React.FC<{label: string, name: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, options: {value: string, label: string}[], help?: string}> = ({label, name, value, onChange, options, help}) => (
    <div>
        <div className="flex items-center gap-2 mb-1">
            <label className="block text-[length:var(--font-size-xs)] font-medium text-[var(--text-secondary)]">{label}</label>
            {help && <HelpTooltip title={label} content={help} />}
        </div>
        <div className="flex items-center space-x-2 bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-1">
            {options.map(opt => (
                <label key={opt.value} className={`flex-1 text-center text-[length:var(--font-size-sm)] px-2 py-1 rounded-md cursor-pointer transition-colors ${value === opt.value ? 'bg-[var(--bg-active)] text-[var(--text-on-accent)]' : 'hover:bg-[var(--bg-hover)]'}`}>
                    <input type="radio" name={name} value={opt.value} checked={value === opt.value} onChange={onChange} className="sr-only" />
                    {opt.label}
                </label>
            ))}
        </div>
    </div>
);