

import React from 'react';

interface ToastProps {
  message: string;
  show: boolean;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, show, onClose }) => {
  return (
    <div
      aria-live="assertive"
      className={`fixed top-[70px] left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-in-out w-full max-w-md ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-5 pointer-events-none'
      }`}
    >
      <div className="bg-green-600/90 backdrop-blur-sm text-white font-semibold py-3 px-5 rounded-lg shadow-lg border border-green-500 flex items-center justify-between text-[length:var(--font-size-sm)]">
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 mr-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          {message}
        </div>
        <button onClick={onClose} className="ml-4 p-1 rounded-full hover:bg-white/20" aria-label="Dismiss">
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
        </button>
      </div>
    </div>
  );
};