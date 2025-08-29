

import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  show: boolean;
  duration?: number;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, show, duration = 3000, onClose }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  return (
    <div
      aria-live="assertive"
      className={`fixed bottom-5 right-5 z-50 transition-all duration-300 ease-in-out ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5 pointer-events-none'
      }`}
    >
      <div className="bg-green-600/90 backdrop-blur-sm text-white font-semibold py-3 px-5 rounded-lg shadow-lg border border-green-500 flex items-center text-[length:var(--font-size-sm)]">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 mr-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        {message}
      </div>
    </div>
  );
};