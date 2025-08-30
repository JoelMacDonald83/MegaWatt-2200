

import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../components/Modal';
import { GameData, ChoiceOutcome, ChoiceOutcomeCreateEntity, ChoiceOutcomeUpdateEntity, Template } from '../../types';
import { StyleSelect } from '../../components/editor/StyleComponents';
import { debugService } from '../../services/debugService';
import { HelpTooltip } from '../../components/HelpTooltip';

interface OutcomeEditorProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (outcome: ChoiceOutcome) => void;
    gameData: GameData;
    initialOutcome: ChoiceOutcome | null;
    isDynamicContext?: boolean;
}

const BLANK_CREATE_OUTCOME: Omit<ChoiceOutcomeCreateEntity, 'type'> = {
    templateId: '',
    name: '',
    attributeValues: {},
};

const BLANK_UPDATE_OUTCOME: Omit<ChoiceOutcomeUpdateEntity, 'type'> = {
    targetEntityId: '',
    attributeId: '',
    value: '',
};

export const OutcomeEditor: React.FC<OutcomeEditorProps> = ({ isOpen, onClose, onSave, gameData, initialOutcome, isDynamicContext = false }) => {
    const [outcomeType, setOutcomeType] = useState<ChoiceOutcome['type']>(initialOutcome?.type || 'create_entity');
    const [createOutcome, setCreateOutcome] = useState<Omit<ChoiceOutcomeCreateEntity, 'type'>>(() => 
        initialOutcome?.type === 'create_entity' ? initialOutcome : BLANK_CREATE_OUTCOME
    );
    const [updateOutcome, setUpdateOutcome] = useState<Omit<ChoiceOutcomeUpdateEntity, 'type'>>(() =>
        initialOutcome?.type === 'update_entity' ? initialOutcome : BLANK_UPDATE_OUTCOME
    );
    
    useEffect(() => {
        if (!isOpen) return;
        debugService.log('OutcomeEditor: Modal opened or props changed.', { initialOutcome, isDynamicContext });
        if (initialOutcome) {
            setOutcomeType(initialOutcome.type);
            if (initialOutcome.type === 'create_entity') setCreateOutcome(initialOutcome);
            if (initialOutcome.type === 'update_entity') setUpdateOutcome(initialOutcome);
        } else {
            setOutcomeType('create_entity');
            setCreateOutcome(BLANK_CREATE_OUTCOME);
            setUpdateOutcome(BLANK_UPDATE_OUTCOME);
        }
    }, [initialOutcome, isOpen, isDynamicContext]);

    const targetEntityTemplate = useMemo((): Template | null => {
        if (outcomeType !== 'update_entity' || !updateOutcome.targetEntityId || updateOutcome.targetEntityId === '<chosen_entity>') return null;
        const entity = gameData.entities.find(e => e.id === updateOutcome.targetEntityId);
        if (!entity) return null;
        return gameData.templates.find(t => t.id === entity.templateId) || null;
    }, [outcomeType, updateOutcome.targetEntityId, gameData]);


    const handleSave = () => {
        let outcomeToSave: ChoiceOutcome | null = null;
        if (outcomeType === 'create_entity' && createOutcome.templateId && createOutcome.name) {
            outcomeToSave = { type: 'create_entity', ...createOutcome };
        } else if (outcomeType === 'update_entity' && updateOutcome.targetEntityId && updateOutcome.attributeId) {
            outcomeToSave = { type: 'update_entity', ...updateOutcome };
        }

        if (outcomeToSave) {
            debugService.log('OutcomeEditor: Saving outcome', { outcome: outcomeToSave });
            onSave(outcomeToSave);
        } else {
             debugService.log('OutcomeEditor: Save aborted, invalid data');
        }
    };

    const renderCreateEditor = () => (
        <div className="space-y-3">
            <StyleSelect 
                label="Template to Create" 
                value={createOutcome.templateId} 
                onChange={e => setCreateOutcome(p => ({...p, templateId: e.target.value}))}
                help="Select the blueprint that the new entity will be based on."
            >
                <option value="">-- Select Template --</option>
                {gameData.templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </StyleSelect>
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)]">New Entity Name</label>
                    <HelpTooltip title="New Entity Name" content="The name that the newly created entity will have." />
                </div>
                <input type="text" value={createOutcome.name} onChange={e => setCreateOutcome(p => ({...p, name: e.target.value}))} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2" />
            </div>
        </div>
    );
    
    const renderUpdateEditor = () => (
         <div className="space-y-3">
            <StyleSelect 
                label="Entity to Update" 
                value={updateOutcome.targetEntityId} 
                onChange={e => setUpdateOutcome(p => ({...p, targetEntityId: e.target.value, attributeId: ''}))}
                help={isDynamicContext ? "Select a specific entity to modify, or choose '<The Chosen Entity>' to modify the entity that the player selected from the dynamic list." : "Select the specific entity you want to modify."}
            >
                <option value="">-- Select Entity --</option>
                {isDynamicContext && <option value="<chosen_entity>">&lt;The Chosen Entity&gt;</option>}
                {gameData.entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </StyleSelect>
            <StyleSelect 
                label="Attribute to Update" 
                value={updateOutcome.attributeId} 
                onChange={e => setUpdateOutcome(p => ({...p, attributeId: e.target.value}))} 
                disabled={!targetEntityTemplate && updateOutcome.targetEntityId !== '<chosen_entity>'}
                help="Select the attribute on the target entity that you want to change."
            >
                 <option value="">-- Select Attribute --</option>
                 {isDynamicContext && updateOutcome.targetEntityId === '<chosen_entity>' &&
                    <optgroup label="From Chosen Entity's Template">
                         {gameData.templates.flatMap(t => t.attributes.map(a => <option key={a.id} value={a.id}>{a.name} ({t.name})</option>))}
                    </optgroup>
                 }
                 {targetEntityTemplate?.attributes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </StyleSelect>
             <div>
                 <div className="flex items-center gap-2 mb-1">
                    <label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)]">New Value</label>
                    <HelpTooltip title="New Value" content={isDynamicContext ? "The new value to set for the attribute. You can also click 'Use Chosen ID' to set the attribute value to be the ID of the entity the player selected." : "The new value to set for the attribute."} />
                </div>
                <div className="flex items-center gap-2">
                    <input 
                        type="text" 
                        value={String(updateOutcome.value ?? '')} 
                        onChange={e => setUpdateOutcome(p => ({...p, value: e.target.value}))} 
                        className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2 disabled:bg-[var(--bg-panel-light)] disabled:text-[var(--text-tertiary)]"
                        disabled={updateOutcome.value === '<chosen_entity_id>'}
                    />
                    {isDynamicContext && (
                        <button 
                            onClick={() => setUpdateOutcome(p => ({...p, value: p.value === '<chosen_entity_id>' ? '' : '<chosen_entity_id>'}))}
                            className={`px-2 py-2 text-xs rounded-md whitespace-nowrap ${updateOutcome.value === '<chosen_entity_id>' ? 'bg-[var(--bg-active)] text-[var(--text-on-accent)]' : 'bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)]'}`}
                        >
                            Use Chosen ID
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialOutcome ? 'Edit Outcome' : 'Add Outcome'}
        >
            <div className="space-y-4">
                 <StyleSelect 
                    label="Outcome Type" 
                    value={outcomeType} 
                    onChange={e => setOutcomeType(e.target.value as ChoiceOutcome['type'])}
                    help="Select the type of consequence this outcome will have on the game world."
                 >
                    <option value="create_entity">Create a new Entity</option>
                    <option value="update_entity">Update an existing Entity</option>
                 </StyleSelect>
                 <div className="p-3 bg-[var(--bg-input)]/50 rounded-md border border-[var(--border-primary)]">
                    {outcomeType === 'create_entity' && renderCreateEditor()}
                    {outcomeType === 'update_entity' && renderUpdateEditor()}
                 </div>
            </div>
             <div className="mt-6 flex justify-end space-x-3">
                <button onClick={onClose} className="px-4 py-2 rounded-md bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-semibold transition-colors">Cancel</button>
                <button onClick={handleSave} className="px-4 py-2 rounded-md bg-[var(--bg-active)] hover:opacity-90 text-[var(--text-on-accent)] font-semibold transition-colors">Save Outcome</button>
            </div>
        </Modal>
    );
};