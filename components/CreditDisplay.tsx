
import React, { useState } from 'react';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { Modal } from './Modal';
import { ImageCredit } from '../types';

interface CreditDisplayProps {
  credit: ImageCredit;
  className?: string;
}

export const CreditDisplay: React.FC<CreditDisplayProps> = ({ credit, className }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!credit.artistName && !credit.sourceUrl && !credit.socialsUrl) {
    return null;
  }

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setIsModalOpen(true); }}
        className={`absolute z-20 p-1 bg-black/50 text-white/70 hover:text-white rounded-full transition-colors ${className}`}
        aria-label="View image credits"
      >
        <InformationCircleIcon className="w-5 h-5" />
      </button>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Image Credits">
        <div className="space-y-4">
          {credit.artistName && (
            <div>
              <p className="font-semibold text-[var(--text-secondary)]">Artist</p>
              <p className="text-[var(--text-primary)]">{credit.artistName}</p>
            </div>
          )}
          {credit.sourceUrl && (
            <div>
              <p className="font-semibold text-[var(--text-secondary)]">Source</p>
              <a href={credit.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--text-accent)] hover:underline break-all">
                {credit.sourceUrl}
              </a>
            </div>
          )}
          {credit.socialsUrl && (
            <div>
              <p className="font-semibold text-[var(--text-secondary)]">Socials / Portfolio</p>
              <a href={credit.socialsUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--text-accent)] hover:underline break-all">
                {credit.socialsUrl}
              </a>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};
