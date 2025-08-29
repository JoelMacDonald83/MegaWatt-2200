

import React, { useState, useMemo, useEffect } from 'react';
import type { GameData, PlayerChoice, ChoiceOption, StoryCard, Condition } from '../../types';
import { StyleRadio, StyleSelect } from '../../components/editor/StyleComponents';
import { TrashIcon } from '../../components/icons/TrashIcon';
import { Modal } from '../../components/Modal';
import { StoryCardEditor } from './StoryCardEditor';
import { ConditionEditor } from './ConditionEditor';
import { conditionToString } from '../../services/conditionEvaluator';
import { debugService } from '../../services/debugService';


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

type EditingConditionState =
  | { type: 'static'; optionId: string; condition: Condition | null; conditionIndex?: number }
  | { type: 'dynamic'; condition: Condition | null; conditionIndex?: number }
  | null;

export const ChoiceEditor: React.FC<ChoiceEditorProps> = ({ initialChoice, onSave, onCancel, gameData, isNew, onGenerateImage, isGeneratingImage }) => {
    const [localChoice, setLocalChoice] = useState<PlayerChoice>(() => JSON.parse(JSON.stringify(initialChoice)));
    const [editingCardState, setEditingCardState] = useState<EditingCardState>(null);
    const [editingConditionState, setEditingConditionState] = useState<EditingConditionState>(null);

    useEffect(() => {
        debugService.log('ChoiceEditor: Component mounted or received new props.', { initialChoice, isNew });
        setLocalChoice(JSON.parse(JSON.stringify(initialChoice)));
    }, [initialChoice, isNew]);
    
    useEffect(() => {
        debugService.log('ChoiceEditor: Editing card state changed.', { editingCardState });
    }, [editingCardState]);
    
    useEffect(() => {
        debugService.log('ChoiceEditor: Editing condition state changed.', { editingConditionState });
    }, [editingConditionState]);

    const updateField = (field: keyof PlayerChoice, value: any) => {
        setLocalChoice(prev => {
            const newState = { ...prev, [field]: value };
            debugService.log('ChoiceEditor: Updating simple field', { field, value, oldState: prev, newState });
            return newState;
        });
    };
    
    const updatePromptStyle = (key: keyof NonNullable<PlayerChoice['styles']>['promptStyles'], value: any) => {
        setLocalChoice(prev => {
             const newState = {
                ...prev,
                styles: {
                    ...(prev.styles || {}),
                    promptStyles: {
                        ...(prev.styles?.promptStyles || {}),
                        [key]: value
                    }
                }
            };
            debugService.log('ChoiceEditor: Updating prompt style', { key, value, oldState: prev, newState });
            return newState;
        });
    };

    const handleChoiceTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newType = e.target.value as PlayerChoice['choiceType'];
        debugService.log('ChoiceEditor: Choice type changing', { newType });
        setLocalChoice(prev => {
            let newState = { ...prev, choiceType: newType };
            if (newType === 'static' && !prev.staticOptions) {
                newState.staticOptions = [];
            }
            if (newType === 'dynamic_from_template' && !prev.dynamicConfig) {
                 newState.dynamicConfig = { sourceTemplateId: '', cardTemplate: { description: '{entity.name}', imagePrompt: '' }, outcomeTemplate: { type: 'update_entity', targetEntityId: '', attributeId: '' } };
            }
            debugService.log('ChoiceEditor: Choice type changed', { oldState: prev, newState });
            return newState;
        })
    };

    const updateStaticOption = (optionId: string, newOptionData: Partial<ChoiceOption>) => {
        setLocalChoice(prev => {
            const newOptions = (prev.staticOptions || []).map(opt =>
                opt.id === optionId ? { ...opt, ...newOptionData } : opt
            );
            const newState = { ...prev, staticOptions: newOptions };
            debugService.log('ChoiceEditor: Updating static option', { optionId, newOptionData, oldState: prev, newState });
            return newState;
        });
    };

    const addStaticOption = () => {
        setLocalChoice(prev => {
            const newOption: ChoiceOption = {
                id: `opt_${Date.now()}`,
                card: { description: 'New Option', imagePrompt: ''},
                outcome: { type: 'create_entity', templateId: gameData.templates[0]?.id || '', name: 'New Entity' }
            };
            const newState = { ...prev, staticOptions: [...(prev.staticOptions || []), newOption] };
            debugService.log('ChoiceEditor: Adding static option', { newOption, oldState: prev, newState });
            return newState;
        });
    };

    const removeStaticOption = (optionId: string) => {
        setLocalChoice(prev => {
            const newState = {
                ...prev,
                staticOptions: (prev.staticOptions || []).filter(opt => opt.id !== optionId)
            };
            debugService.log('ChoiceEditor: Removing static option', { optionId, oldState: prev, newState });
            return newState;
        });
    };

    const handleSaveCard = (savedCard: StoryCard) => {
        debugService.log('ChoiceEditor: Saving card from StoryCardEditor', { savedCard, editingCardState });
        if (!editingCardState) return;
    
        const { id, choiceId, ...cardData } = savedCard;

        if (editingCardState.type === 'static') {
            updateStaticOption(editingCardState.optionId, { card: cardData });
        } else if (editingCardState.type === 'dynamic') {
            setLocalChoice(p => {
                const newState = {
                    ...p,
                    dynamicConfig: { ...p.dynamicConfig!, cardTemplate: cardData }
                };
                debugService.log('ChoiceEditor: Updating dynamic card template', { cardData, oldState: p, newState });
                return newState;
            });
        }
    
        setEditingCardState(null);
    };
    
    const handleSaveCondition = (condition: Condition) => {
        debugService.log('ChoiceEditor: Saving condition from ConditionEditor', { condition, editingConditionState });
        if (!editingConditionState) return;

        if (editingConditionState.type === 'static') {
            const option = (localChoice.staticOptions || []).find(o => o.id === editingConditionState.optionId);
            if (!option) return;
            
            const newConditions = [...(option.conditions || [])];
            if (editingConditionState.conditionIndex !== undefined) {
                newConditions[editingConditionState.conditionIndex] = condition;
            } else {
                newConditions.push(condition);
            }
            updateStaticOption(editingConditionState.optionId, { conditions: newConditions });

        } else if (editingConditionState.type === 'dynamic') {
            const newConditions = [...(localChoice.dynamicConfig?.filterConditions || [])];
             if (editingConditionState.conditionIndex !== undefined) {
                newConditions[editingConditionState.conditionIndex] = condition;
            } else {
                newConditions.push(condition);
            }
            setLocalChoice(p => {
                const newState = { ...p, dynamicConfig: { ...p.dynamicConfig!, filterConditions: newConditions }};
                debugService.log('ChoiceEditor: Updating dynamic filter conditions', { newConditions, oldState: p, newState });
                return newState;
            });
        }
        setEditingConditionState(null);
    };

    const handleRemoveCondition = (type: 'static' | 'dynamic', index: number, optionId?: string) => {
        debugService.log('ChoiceEditor: Removing condition', { type, index, optionId });
        if (type === 'static' && optionId) {
            const option = (localChoice.staticOptions || []).find(o => o.id === optionId);
            if (!option || !option.conditions) return;
            const newConditions = option.conditions.filter((_, i) => i !== index);
            updateStaticOption(optionId, { conditions: newConditions });
        } else if (type === 'dynamic') {
            if (!localChoice.dynamicConfig?.filterConditions) return;
            const newConditions = localChoice.dynamicConfig.filterConditions.filter((_, i) => i !== index);
            setLocalChoice(p => {
                 const newState = { ...p, dynamicConfig: { ...p.dynamicConfig!, filterConditions: newConditions }};
                 debugService.log('ChoiceEditor: Removing dynamic filter condition', { index, oldState: p, newState });
                 return newState;
            });
        }
    };

    const handleSaveChanges = () => {
        debugService.log('ChoiceEditor: "Save Changes" button clicked. Calling onSave.', { finalChoiceState: localChoice });
        onSave(localChoice);
    };

    const handleCancelClick = () => {
        debugService.log('ChoiceEditor: "Cancel" button clicked.');
        onCancel();
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

                <fieldset className="space-y-2 pt-4 border-t border-gray-700">
                    <legend className="text-sm font-semibold text-gray-400 -mb-2 px-1">Prompt Styling</legend>
                    <div className="grid grid-cols-2 gap-4">
                        <StyleSelect 
                            label="Font Size" 
                            value={localChoice.styles?.promptStyles?.fontSize || 'large'}
                            onChange={e => updatePromptStyle('fontSize', e.target.value)}
                        >
                            <option value="normal">Normal</option>
                            <option value="large">Large</option>
                            <option value="xlarge">X-Large</option>
                            <option value="xxlarge">XX-Large</option>
                        </StyleSelect>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Text Color Class</label>
                            <input 
                                type="text" 
                                value={localChoice.styles?.promptStyles?.textColor || 'text-cyan-200'}
                                onChange={e => updatePromptStyle('textColor', e.target.value)}
                                className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm"
                                placeholder="e.g. text-cyan-200"
                            />
                        </div>
                    </div>
                </fieldset>
                
                 <div className="space-y-4 pt-4 border-t border-gray-700">
                    <StyleRadio label="Choice Type" name="choiceType" value={localChoice.choiceType} onChange={handleChoiceTypeChange} options={[{value: 'static', label: 'Static'}, {value: 'dynamic_from_template', label: 'Dynamic'}]} />
                    
                    {localChoice.choiceType === 'static' && (
                        <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-gray-300">Static Options</h3>
                            {(localChoice.staticOptions || []).map(opt => (
                                <div key={opt.id} className="bg-gray-900/50 p-3 rounded-md border border-gray-700 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-gray-300">{opt.card.description?.substring(0, 50) || 'Untitled Card'}...</p>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => setEditingCardState({ type: 'static', optionId: opt.id, card: opt.card })} className="text-sm text-cyan-400 hover:text-cyan-300">Edit Card</button>
                                            <button className="text-sm text-gray-400 hover:text-white">Outcome</button>
                                            <button onClick={() => removeStaticOption(opt.id)} className="p-1 text-gray-400 hover:text-red-400"><TrashIcon className="w-4 h-4"/></button>
                                        </div>
                                    </div>
                                    <div className="pt-2 border-t border-gray-700">
                                        <h4 className="text-xs font-semibold text-gray-400 mb-1">Conditions (Must all be true)</h4>
                                        <div className="space-y-1">
                                            {(opt.conditions || []).map((cond, index) => (
                                                <div key={index} className="text-xs flex justify-between items-center bg-gray-800 p-1 rounded">
                                                    <span className="text-gray-300">{conditionToString(cond, gameData)}</span>
                                                    <button onClick={() => handleRemoveCondition('static', index, opt.id)}><TrashIcon className="w-3 h-3 text-red-500"/></button>
                                                </div>
                                            ))}
                                        </div>
                                        <button onClick={() => setEditingConditionState({ type: 'static', optionId: opt.id, condition: null})} className="text-xs mt-1 text-cyan-400 hover:text-cyan-300 w-full text-left">+ Add Condition</button>
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
                                <legend className="text-sm font-semibold text-gray-400 px-2">Filter Conditions</legend>
                                <p className="text-xs text-gray-500 mb-2">Only show entities from the source template if they meet all these conditions.</p>
                                <div className="space-y-1">
                                    {(localChoice.dynamicConfig.filterConditions || []).map((cond, index) => (
                                        <div key={index} className="text-xs flex justify-between items-center bg-gray-800 p-1 rounded">
                                            <span className="text-gray-300">{conditionToString(cond, gameData, true)}</span>
                                            <button onClick={() => handleRemoveCondition('dynamic', index)}><TrashIcon className="w-3 h-3 text-red-500"/></button>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => setEditingConditionState({ type: 'dynamic', condition: null })} className="text-xs mt-1 text-cyan-400 hover:text-cyan-300 w-full text-left">+ Add Filter Condition</button>
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
                <button onClick={handleCancelClick} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 text-white font-semibold transition-colors">Cancel</button>
                <button onClick={handleSaveChanges} className="px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-700 text-white font-semibold transition-colors">Save Changes</button>
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
            
            {editingConditionState && (
                <ConditionEditor
                    isOpen={!!editingConditionState}
                    onClose={() => setEditingConditionState(null)}
                    onSave={handleSaveCondition}
                    gameData={gameData}
                    initialCondition={editingConditionState.condition}
                    isFilter={editingConditionState.type === 'dynamic'}
                />
            )}
        </div>
    );
};