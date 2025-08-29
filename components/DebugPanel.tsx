

import React, { useState, useEffect } from 'react';
import { debugService } from '../services/debugService';
import { TrashIcon } from './icons/TrashIcon';

interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState(debugService.getLogs());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const unsubscribe = debugService.subscribe(() => {
        setLogs([...debugService.getLogs()]);
      });
      return unsubscribe;
    }
  }, [isOpen]);

  const handleCopy = () => {
    const logText = logs.map(log => {
        const dataStr = log.data ? `\n${JSON.stringify(log.data, null, 2)}` : '';
        return `[${log.timestamp}] ${log.message}${dataStr}`;
    }).join('\n\n---\n\n');
    navigator.clipboard.writeText(logText).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleClear = () => {
    debugService.clearLogs();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={`fixed top-0 right-0 h-full bg-[var(--bg-main)]/90 backdrop-blur-sm z-50 transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
      style={{ width: 'clamp(300px, 40vw, 600px)' }}
    >
      <div className="flex flex-col h-full border-l border-[var(--border-primary)]">
        <header className="flex items-center justify-between p-3 border-b border-[var(--border-primary)] flex-shrink-0">
          <h2 className="text-[length:var(--font-size-lg)] font-bold text-[var(--text-accent)]">Debug Log</h2>
          <div className="flex items-center gap-2">
            <button
                onClick={handleCopy}
                className="px-3 py-1 text-[length:var(--font-size-sm)] rounded-md bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-semibold transition-colors"
                >
                {copied ? 'Copied!' : 'Copy Logs'}
            </button>
             <button
                onClick={handleClear}
                title="Clear Logs"
                className="p-2 rounded-md bg-[var(--bg-panel-light)] hover:bg-red-600/50 text-[var(--text-secondary)] hover:text-white font-semibold transition-colors"
                >
                <TrashIcon className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-2xl leading-none" aria-label="Close panel">&times;</button>
          </div>
        </header>
        <main className="flex-grow p-2 overflow-y-auto">
            {logs.length === 0 ? (
                <div className="flex items-center justify-center h-full text-[var(--text-tertiary)]">
                    <p>No log entries yet. Perform an action to see logs.</p>
                </div>
            ) : (
                <ul className="space-y-2">
                    {logs.map((log, index) => (
                        <li key={index} className="p-2 bg-[var(--bg-panel)]/70 rounded-md border border-[var(--border-primary)] text-[length:var(--font-size-xs)] font-mono">
                            <span className="text-[var(--text-accent)] mr-2">{log.timestamp}</span>
                            <span className="text-[var(--text-primary)] font-bold">{log.message}</span>
                             {log.data && (
                                <pre className="text-[var(--text-secondary)] whitespace-pre-wrap break-all bg-[var(--bg-input)] p-2 rounded mt-1 text-[10px] max-h-64 overflow-y-auto">
                                    {JSON.stringify(log.data, null, 2)}
                                </pre>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </main>
      </div>
    </div>
  );
};