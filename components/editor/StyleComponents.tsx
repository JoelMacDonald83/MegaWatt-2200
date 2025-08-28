
import React from 'react';

export const StyleSelect: React.FC<{label: string, value: string | undefined, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, children: React.ReactNode, wrapperClassName?: string, disabled?: boolean}> = ({label, value, onChange, children, wrapperClassName, disabled}) => (
    <div className={wrapperClassName}>
        <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
        <select value={value} onChange={onChange} disabled={disabled} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed">
            {children}
        </select>
    </div>
);

export const StyleNumberInput: React.FC<{label: string, value: number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, step?: number, min?: number, wrapperClassName?: string}> = ({label, value, onChange, step=0.1, min=0, wrapperClassName}) => (
    <div className={wrapperClassName}>
        <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
        <input type="number" value={value} onChange={onChange} step={step} min={min} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm" />
    </div>
);

export const StyleRadio: React.FC<{label: string, name: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, options: {value: string, label: string}[]}> = ({label, name, value, onChange, options}) => (
    <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
        <div className="flex items-center space-x-2 bg-gray-900 border border-gray-600 rounded-md p-1">
            {options.map(opt => (
                <label key={opt.value} className={`flex-1 text-center text-sm px-2 py-1 rounded-md cursor-pointer transition-colors ${value === opt.value ? 'bg-cyan-600 text-white' : 'hover:bg-gray-700'}`}>
                    <input type="radio" name={name} value={opt.value} checked={value === opt.value} onChange={onChange} className="sr-only" />
                    {opt.label}
                </label>
            ))}
        </div>
    </div>
);
