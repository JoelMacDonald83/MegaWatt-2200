
import React, { useState } from 'react';
import type { GameData, SimSaveSlot } from '../types';
import { SaveLoadModal } from './SaveLoadModal';
import { ArchiveBoxIcon } from './icons/ArchiveBoxIcon';
import { FolderOpenIcon } from './icons/FolderOpenIcon';
import { ArrowUturnLeftIcon } from './icons/ArrowUturnLeftIcon';
import { ArrowUturnRightIcon } from './icons/ArrowUturnRightIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { ArrowLeftOnRectangleIcon } from './icons/ArrowLeftOnRectangleIcon';

interface SimulationHeaderProps {
    gameTitle: string;
    onExit: () => void;
    onRestart: () => void;
    onLoad: (saveSlot: SimSaveSlot) => void;
    currentSimState: GameData;
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
}

export const SimulationHeader: React.FC<SimulationHeaderProps> = ({
    gameTitle, onExit, onRestart, onLoad, currentSimState, canUndo, canRedo, onUndo, onRedo
}) => {
    const [isSaveLoadModalOpen, setIsSaveLoadModalOpen] = useState(false);

    const handleSave = (saveName: string) => {
        const now = new Date();
        const newSave: SimSaveSlot = {
            id: String(now.getTime()),
            name: saveName,
            date: now.toISOString(),
            data: currentSimState,
        };
        
        const existingSaves = JSON.parse(localStorage.getItem(`sim_saves_${currentSimState.id}`) || '[]') as SimSaveSlot[];
        localStorage.setItem(`sim_saves_${currentSimState.id}`, JSON.stringify([newSave, ...existingSaves]));
    };

    const handleLoad = (saveSlot: SimSaveSlot) => {
        onLoad(saveSlot);
        setIsSaveLoadModalOpen(false);
    }
    
    return (
        <>
            <header className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center p-3 bg-[var(--bg-panel)]/70 backdrop-blur-sm border-b border-[var(--border-primary)]">
                <div className="flex items-center gap-4">
                    <h1 className="text-[length:var(--font-size-lg)] font-bold text-[var(--text-primary)]">
                        <span className="text-[var(--text-accent-bright)]">Simulating:</span> {gameTitle}
                    </h1>
                    <div className="flex items-center space-x-1 bg-[var(--bg-panel-light)] p-1 rounded-lg">
                        <button onClick={onUndo} disabled={!canUndo} className="p-1.5 text-[var(--text-secondary)] rounded-md transition-colors hover:bg-[var(--bg-hover)] disabled:text-[var(--text-tertiary)] disabled:cursor-not-allowed" title="Undo (Ctrl+Z)">
                            <ArrowUturnLeftIcon className="w-5 h-5"/>
                        </button>
                         <button onClick={onRedo} disabled={!canRedo} className="p-1.5 text-[var(--text-secondary)] rounded-md transition-colors hover:bg-[var(--bg-hover)] disabled:text-[var(--text-tertiary)] disabled:cursor-not-allowed" title="Redo (Ctrl+Y)">
                            <ArrowUturnRightIcon className="w-5 h-5"/>
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsSaveLoadModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 text-[length:var(--font-size-sm)] font-medium rounded-md transition-colors text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]">
                        <ArchiveBoxIcon className="w-5 h-5" /> Save / Load
                    </button>
                     <button onClick={onRestart} className="flex items-center gap-2 px-3 py-1.5 text-[length:var(--font-size-sm)] font-medium rounded-md transition-colors text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]">
                        <ArrowPathIcon className="w-5 h-5" /> Restart
                    </button>
                     <button onClick={onExit} className="flex items-center gap-2 px-3 py-1.5 text-[length:var(--font-size-sm)] font-medium rounded-md transition-colors bg-red-600/20 hover:bg-red-600/40 text-[var(--text-danger)]">
                        <ArrowLeftOnRectangleIcon className="w-5 h-5" /> Exit Simulation
                    </button>
                </div>
            </header>
            {isSaveLoadModalOpen && (
                <SaveLoadModal 
                    gameId={currentSimState.id}
                    isOpen={isSaveLoadModalOpen}
                    onClose={() => setIsSaveLoadModalOpen(false)}
                    onSave={handleSave}
                    onLoad={handleLoad}
                />
            )}
        </>
    );
};