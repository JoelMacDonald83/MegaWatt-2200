
import React from 'react';

interface AutosavePromptProps {
  onConfirm: () => void;
  onDismiss: () => void;
}

export const AutosavePrompt: React.FC<AutosavePromptProps> = ({ onConfirm, onDismiss }) => {
  return (
    <div
      aria-live="assertive"
      className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg"
    >
      <div className="bg-[var(--bg-panel)] backdrop-blur-sm text-white font-semibold py-3 px-5 rounded-lg shadow-xl border border-[var(--border-primary)] flex items-center justify-between text-[length:var(--font-size-sm)]">
        <div className="flex-grow">
          <p className="font-bold text-[var(--text-accent)]">Autosave Found</p>
          <p className="text-sm text-[var(--text-secondary)] font-normal">An unsaved session was found. Do you want to restore it?</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            <button onClick={onConfirm} className="px-4 py-1 rounded-md bg-[var(--bg-active)] hover:opacity-90 text-[var(--text-on-accent)] font-semibold transition-colors text-sm">
                Restore
            </button>
            <button onClick={onDismiss} className="p-2 rounded-md hover:bg-white/10" aria-label="Dismiss">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
      </div>
    </div>
  );
};
