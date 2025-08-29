
import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from './Modal';
import { SimSaveSlot } from '../types';
import { TrashIcon } from './icons/TrashIcon';

interface SaveLoadModalProps {
    gameId: string;
    isOpen: boolean;
    onClose: () => void;
    onSave: (saveName: string) => void;
    onLoad: (saveSlot: SimSaveSlot) => void;
}

export const SaveLoadModal: React.FC<SaveLoadModalProps> = ({ gameId, isOpen, onClose, onSave, onLoad }) => {
    const [saveName, setSaveName] = useState('');
    const [saves, setSaves] = useState<SimSaveSlot[]>([]);

    useEffect(() => {
        if (isOpen) {
            const storedSaves = JSON.parse(localStorage.getItem(`sim_saves_${gameId}`) || '[]') as SimSaveSlot[];
            setSaves(storedSaves);
            const defaultName = `Save ${storedSaves.length + 1}`;
            setSaveName(defaultName);
        }
    }, [isOpen, gameId]);

    const handleSave = () => {
        if (saveName.trim()) {
            onSave(saveName.trim());
            onClose();
        }
    };
    
    const handleDelete = (saveId: string) => {
        const newSaves = saves.filter(s => s.id !== saveId);
        setSaves(newSaves);
        localStorage.setItem(`sim_saves_${gameId}`, JSON.stringify(newSaves));
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Save / Load Simulation">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Save Section */}
                <div className="bg-[var(--bg-panel-light)]/50 p-4 rounded-lg border border-[var(--border-primary)]">
                    <h3 className="text-lg font-bold text-[var(--text-accent)] mb-4">Save Current State</h3>
                    <div className="flex flex-col gap-2">
                        <label htmlFor="save-name" className="text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)]">Save Name</label>
                        <input
                            id="save-name"
                            type="text"
                            value={saveName}
                            onChange={(e) => setSaveName(e.target.value)}
                            className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2"
                        />
                        <button
                            onClick={handleSave}
                            disabled={!saveName.trim()}
                            className="w-full bg-[var(--bg-active)] hover:opacity-90 disabled:bg-[var(--bg-panel-light)] text-[var(--text-on-accent)] font-bold py-2 px-4 rounded-md mt-2 transition-colors"
                        >
                            Save Game
                        </button>
                    </div>
                </div>
                {/* Load Section */}
                <div className="bg-[var(--bg-panel-light)]/50 p-4 rounded-lg border border-[var(--border-primary)]">
                    <h3 className="text-lg font-bold text-[var(--text-accent)] mb-4">Load Saved State</h3>
                    <div className="max-h-80 overflow-y-auto pr-2 space-y-2">
                        {saves.length > 0 ? saves.map(save => (
                            <div key={save.id} className="group bg-[var(--bg-input)] p-2 rounded-md flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-[var(--text-primary)]">{save.name}</p>
                                    <p className="text-[length:var(--font-size-xs)] text-[var(--text-tertiary)]">{new Date(save.date).toLocaleString()}</p>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleDelete(save.id)} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-danger)]"><TrashIcon className="w-4 h-4" /></button>
                                    <button onClick={() => onLoad(save)} className="bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-semibold py-1 px-3 rounded text-sm">Load</button>
                                </div>
                            </div>
                        )) : (
                            <p className="text-[var(--text-secondary)] text-center py-8">No save files for this game yet.</p>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};
