
import React, { useState, useMemo } from 'react';
import type { GameData, PlayerChoice, ChoiceOption, StoryCard } from '../../types';
import { StyleRadio, StyleSelect } from '../../components/editor/StyleComponents';
import { TrashIcon } from '../../components/icons/TrashIcon';
import { Modal } from '../../components/Modal';
import { StoryCardEditor } from './StoryCardEditor';

interface ChoiceEditorProps {
    initialChoice: PlayerChoice;
    onSave: (c: PlayerChoice) => void;
    onCancel: () => void;
    gameData: GameData;
    isNew: boolean;
    onGenerateImage: (prompt: string, onUpdate: (base64: string) => void) => void;
    isGeneratingImage: boolean;
}

type EditingCardState =
  | { type: 'static'; optionId: string; card: Omit<StoryCard, 'id' | 'choiceId'> }
  | { type: 'dynamic'; card: Omit<StoryCard, 'id' | 'choiceId'> }
  | null;

export const ChoiceEditor: React.FC<ChoiceEditorProps> = ({ initialChoice, onSave, onCancel, gameData, isNew, onGenerateImage, isGeneratingImage }) => {
    const [localChoice, setLocalChoice] = useState<PlayerChoice>(() => JSON.parse(JSON.stringify(initialChoice)));
    const [editingCardState, setEditingCardState] = useState<EditingCardState>(null);


    const updateField = (field: keyof PlayerChoice, value: any) => {
        setLocalChoice(prev => ({ ...prev, [field]: value }));
    };

    const handleChoiceTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newType = e.target.value as PlayerChoice['choiceType'];
        setLocalChoice(prev => {
            if (newType === 'static' && !prev.staticOptions) {
                return { ...prev, choiceType: newType, staticOptions: [] };
            }
            if (newType === 'dynamic_from_template' && !prev.dynamicConfig) {
                 return { ...prev, choiceType: newType, dynamicConfig: { sourceTemplateId: '', cardTemplate: { description: '{entity.name}', imagePrompt: '' }, outcomeTemplate: { type: 'update_entity', targetEntityId: '', attributeId: '' } } };
            }
            return { ...prev, choiceType: newType };
        })
    };

    const updateStaticOption = (optionId: string, newOptionData: Partial<ChoiceOption>) => {
        const newOptions = (localChoice.staticOptions || []).map(opt =>
            opt.id === optionId ? { ...opt, ...newOptionData } : opt
        );
        updateField('staticOptions', newOptions);
    };

    const addStaticOption = () => {
        const newOption: ChoiceOption = {
            id: `opt_${Date.now()}`,
            card: { description: 'New Option', imagePrompt: ''},
            outcome: { type: 'create_entity', templateId: gameData.templates[0]?.id || '', name: 'New Entity' }
        };
        updateField('staticOptions', [...(localChoice.staticOptions || []), newOption]);
    };

    const removeStaticOption = (optionId: string) => {
        updateField('staticOptions', (localChoice.staticOptions || []).filter(opt => opt.id !== optionId));
    };

    const handleSaveCard = (savedCard: StoryCard) => {
        if (!editingCardState) return;
    
        // Omit properties that don't belong on a choice card
        const { id, choiceId, ...cardData } = savedCard;

        if (editingCardState.type === 'static') {
            updateStaticOption(editingCardState.optionId, { card: cardData });
        } else if (editingCardState.type === 'dynamic') {
            setLocalChoice(p => ({
                ...p,
                dynamicConfig: { ...p.dynamicConfig!, cardTemplate: cardData }
            }));
        }
    
        setEditingCardState(null);
    };

    const targetEntityForDynamicOutcome = useMemo(() => {
        if (localChoice.choiceType === 'dynamic_from_template' && localChoice.dynamicConfig?.outcomeTemplate.targetEntityId) {
            return gameData.entities.find(e => e.id === localChoice.dynamicConfig?.outcomeTemplate.targetEntityId);
        }
        return null;
    }, [localChoice.dynamicConfig?.outcomeTemplate.targetEntityId, gameData.entities, localChoice.choiceType]);

    const targetTemplateForDynamicOutcome = useMemo(() => {
        if (targetEntityForDynamicOutcome) {
            return gameData.templates.find(t => t.id === targetEntityForDynamicOutcome.templateId);
        }
        return null;
    }, [targetEntityForDynamicOutcome, gameData.templates]);


    return (
        <div className="flex-1 flex flex-col bg-gray-800">
            <header className="p-4 border-b border-gray-700">
                <h2 className="text-xl font-bold text-cyan-300">{isNew ? 'Creating New Choice' : `Editing Choice: ${initialChoice.name}`}</h2>
            </header>
            <main className="flex-grow p-6 space-y-6 overflow-y-auto">
                 <div>
                    <label className="block text-sm font-medium text-gray-400">Name (for Editor)</label>
                    <input type="text" value={localChoice.name} onChange={e => updateField('name', e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500"/>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-400">Player Prompt</label>
                    <input type="text" value={localChoice.prompt} onChange={e => updateField('prompt', e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500"/>
                </div>
                
                 <div className="space-y-4 pt-4 border-t border-gray-700">
                    <StyleRadio label="Choice Type" name="choiceType" value={localChoice.choiceType} onChange={handleChoiceTypeChange} options={[{value: 'static', label: 'Static'}, {value: 'dynamic_from_template', label: 'Dynamic'}]} />
                    
                    {localChoice.choiceType === 'static' && (
                        <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-gray-300">Static Options</h3>
                            {(localChoice.staticOptions || []).map(opt => (
                                <div key={opt.id} className="bg-gray-900/50 p-3 rounded-md border border-gray-700 flex items-center justify-between">
                                    <p className="text-gray-300">{opt.card.description?.substring(0, 50) || 'Untitled Card'}...</p>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setEditingCardState({ type: 'static', optionId: opt.id, card: opt.card })} className="text-sm text-cyan-400 hover:text-cyan-300">Edit Card</button>
                                        <button className="text-sm text-gray-400 hover:text-white">Outcome</button>
                                        <button onClick={() => removeStaticOption(opt.id)} className="p-1 text-gray-400 hover:text-red-400"><TrashIcon className="w-4 h-4"/></button>
                                    </div>
                                </div>
                            ))}
                            <button onClick={addStaticOption} disabled={gameData.templates.length === 0} className="w-full text-sm bg-gray-700 hover:bg-gray-600 text-cyan-300 font-semibold py-2 px-4 rounded transition duration-300 disabled:bg-gray-600 disabled:text-gray-400">Add Option</button>
                        </div>
                    )}

                    {localChoice.choiceType === 'dynamic_from_template' && localChoice.dynamicConfig && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-300">Dynamic Options</h3>
                             <StyleSelect label="Source Template" value={localChoice.dynamicConfig.sourceTemplateId} onChange={e => setLocalChoice(p => ({...p, dynamicConfig: {...p.dynamicConfig!, sourceTemplateId: e.target.value}}))}>
                                <option value="">-- Select Template --</option>
                                {gameData.templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </StyleSelect>

                            <fieldset className="p-3 border border-gray-700 rounded-md">
                                <legend className="text-sm font-semibold text-gray-400 px-2">Card Template</legend>
                                 <p className="text-xs text-gray-500 mb-2">Define how each entity from the source template will be displayed. Use placeholders like <code className="bg-gray-950 p-1 rounded text-cyan-400">{`{entity.name}`}</code> or <code className="bg-gray-950 p-1 rounded text-cyan-400">{`{entity.attributeValues.ATTR_ID}`}</code>.</p>
                                <button onClick={() => setEditingCardState({ type: 'dynamic', card: localChoice.dynamicConfig!.cardTemplate })} className="w-full text-sm bg-gray-700 hover:bg-gray-600 text-cyan-300 font-semibold py-2 px-4 rounded transition duration-300">Edit Card Template</button>
                            </fieldset>
                            
                             <fieldset className="p-3 border border-gray-700 rounded-md">
                                <legend className="text-sm font-semibold text-gray-400 px-2">Outcome</legend>
                                <p className="text-xs text-gray-500 mb-2">Define what happens when the player chooses one of the generated cards. The chosen entity's ID will be used as the value.</p>
                                <div className="space-y-2">
                                     <StyleSelect label="Target Entity to Update" value={localChoice.dynamicConfig.outcomeTemplate.targetEntityId} onChange={e => setLocalChoice(p => ({...p, dynamicConfig: {...p.dynamicConfig!, outcomeTemplate: {...p.dynamicConfig!.outcomeTemplate, targetEntityId: e.target.value, attributeId: ''}}}))}>
                                        <option value="">-- Select Target Entity --</option>
                                        {gameData.entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                    </StyleSelect>
                                     {targetTemplateForDynamicOutcome && (
                                        <StyleSelect label="Attribute to Update" value={localChoice.dynamicConfig.outcomeTemplate.attributeId} onChange={e => setLocalChoice(p => ({...p, dynamicConfig: {...p.dynamicConfig!, outcomeTemplate: {...p.dynamicConfig!.outcomeTemplate, attributeId: e.target.value}}}))}
                                            disabled={!targetTemplateForDynamicOutcome}
                                        >
                                            <option value="">-- Select Attribute --</option>
                                            {targetTemplateForDynamicOutcome.attributes.filter(a => a.type === 'entity_reference' && a.referencedTemplateId === localChoice.dynamicConfig?.sourceTemplateId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                        </StyleSelect>
                                     )}
                                </div>
                            </fieldset>
                        </div>
                    )}
                </div>
            </main>
            <footer className="p-4 flex justify-end space-x-3 border-t border-gray-700 bg-gray-800/50">
                <button onClick={onCancel} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 text-white font-semibold transition-colors">Cancel</button>
                <button onClick={() => onSave(localChoice)} className="px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-700 text-white font-semibold transition-colors">Save Changes</button>
            </footer>

            <Modal
                isOpen={!!editingCardState}
                onClose={() => setEditingCardState(null)}
                title={editingCardState?.type === 'static' ? 'Edit Option Card' : 'Edit Card Template'}
            >
                {editingCardState && (
                    <div className="-m-6">
                        <StoryCardEditor
                            key={editingCardState.type === 'static' ? editingCardState.optionId : 'dynamic-card-editor'}
                            initialCard={editingCardState.card as StoryCard}
                            onSave={handleSaveCard}
                            onCancel={() => setEditingCardState(null)}
                            onGenerateImage={onGenerateImage}
                            isGenerating={isGeneratingImage}
                            isNew={false}
                            isChoiceCard={true}
                        />
                    </div>
                )}
            </Modal>
        </div>
    );
};
