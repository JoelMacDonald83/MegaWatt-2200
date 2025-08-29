
import React from 'react';
import type { PlayerChoice } from '../../types';
import { PlayIcon } from '../icons/PlayIcon';

interface ActionCardProps {
  choice: PlayerChoice;
  onTrigger: () => void;
}

export const ActionCard: React.FC<ActionCardProps> = ({ choice, onTrigger }) => {
  return (
    <button
      onClick={onTrigger}
      className="relative h-48 rounded-lg flex flex-col justify-end overflow-hidden group border-2 border-dashed border-cyan-400/30 hover:border-cyan-400/80 transition-all duration-300 bg-[var(--bg-panel)]/50"
    >
      {choice.imageBase64 && (
        <div className="absolute inset-0">
          <img src={choice.imageBase64} alt={choice.name} className="w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity duration-300" />
          <div className="absolute inset-0 bg-black/50" />
        </div>
      )}
      <div className="relative z-10 p-4 text-left">
        <div className="absolute top-4 left-4">
             <div className="p-2 bg-cyan-500/20 rounded-full group-hover:bg-cyan-500/40 transition-colors">
                <PlayIcon className="w-5 h-5 text-cyan-300" />
             </div>
        </div>
        <h3 className="font-bold text-lg leading-tight text-cyan-300 group-hover:text-cyan-200 transition-colors">{choice.name}</h3>
        <p className="text-sm text-cyan-400/60 mt-1">Engage Directive</p>
      </div>
    </button>
  );
};
