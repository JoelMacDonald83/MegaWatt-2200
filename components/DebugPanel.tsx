
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
      className={`fixed top-0 right-0 h-full bg-gray-950/90 backdrop-blur-sm z-50 transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
      style={{ width: 'clamp(300px, 40vw, 600px)' }}
    >
      <div className="flex flex-col h-full border-l border-gray-700">
        <header className="flex items-center justify-between p-3 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-bold text-cyan-300">Debug Log</h2>
          <div className="flex items-center gap-2">
            <button
                onClick={handleCopy}
                className="px-3 py-1 text-sm rounded-md bg-gray-700 hover:bg-gray-600 text-white font-semibold transition-colors"
                >
                {copied ? 'Copied!' : 'Copy Logs'}
            </button>
             <button
                onClick={handleClear}
                title="Clear Logs"
                className="p-2 rounded-md bg-gray-700 hover:bg-red-600/50 text-gray-300 hover:text-white font-semibold transition-colors"
                >
                <TrashIcon className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none" aria-label="Close panel">&times;</button>
          </div>
        </header>
        <main className="flex-grow p-2 overflow-y-auto">
            {logs.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-600">
                    <p>No log entries yet. Perform an action to see logs.</p>
                </div>
            ) : (
                <ul className="space-y-2">
                    {logs.map((log, index) => (
                        <li key={index} className="p-2 bg-gray-800/70 rounded-md border border-gray-700 text-xs font-mono">
                            <span className="text-cyan-400 mr-2">{log.timestamp}</span>
                            <span className="text-gray-200 font-bold">{log.message}</span>
                             {log.data && (
                                <pre className="text-gray-400 whitespace-pre-wrap break-all bg-gray-900 p-2 rounded mt-1 text-[10px] max-h-64 overflow-y-auto">
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