import React, { useState } from 'react';
import { Modal } from './Modal';
import { QuestionMarkCircleIcon } from './icons/QuestionMarkCircleIcon';

interface HelpTooltipProps {
  title: string;
  content: React.ReactNode;
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({ title, content }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(true); }}
        className="inline-flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-accent)] transition-colors"
        aria-label={`Help for ${title}`}
      >
        <QuestionMarkCircleIcon className="w-4 h-4" />
      </button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={title}
      >
        <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">
          {content}
        </div>
      </Modal>
    </>
  );
};