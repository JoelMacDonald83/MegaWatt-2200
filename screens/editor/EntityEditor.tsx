

import React, { useState, useMemo } from 'react';
import type { Entity, GameData, AttributeDefinition } from '../../types';

interface EntityEditorProps {
    initialEntity: Entity;
    onSave: (e: Entity) => void;
    onCancel: () => void;
    gameData: GameData;
    onGenerate: (entity: Entity, attributeId: string, onUpdate: (entity: Entity) => void) => void;
    isGenerating: string | null;
    isNew: boolean;
}

const AttributeInput: React.FC<{
    attribute: AttributeDefinition;
    value: string | number | null;
    onChange: (value: string | number | null) => void;
    gameData: GameData;
}> = ({ attribute, value, onChange, gameData }) => {
    switch(attribute.type) {
        case 'textarea':
            return (
                <textarea 
                    value={(value as string) || ''} 
                    onChange={e => onChange(e.target.value)} 
                    rows={6} 
                    className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-teal-500 focus:border-teal-500"
                />
            );
        case 'number':
            return (
                <input 
                    type="number" 
                    value={(value as number) || ''} 
                    onChange={e => onChange(e.target.valueAsNumber || null)} 
                    className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-teal-500 focus:border-teal-500"
                />
            );
        case 'entity_reference':
            const referencedEntities = gameData.entities.filter(e => e.templateId === attribute.referencedTemplateId);
            return (
                <select 
                    value={(value as string) || ''} 
                    onChange={e => onChange(e.target.value || null)} 
                    className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-teal-500 focus:border-teal-500"
                >
                    <option value="">-- Unassigned --</option>
                    {referencedEntities.map(refE => <option key={refE.id} value={refE.id}>{refE.name}</option>)}
                </select>
            );
        case 'string':
        default:
            return (
                <input 
                    type="text" 
                    value={(value as string) || ''} 
                    onChange={e => onChange(e.target.value)} 
                    className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-teal-500 focus:border-teal-500"
                />
            );
    }
};

export const EntityEditor: React.FC<EntityEditorProps> = ({ initialEntity, onSave, onCancel, gameData, onGenerate, isGenerating, isNew }) => {
    const [localEntity, setLocalEntity] = useState<Entity>(() => JSON.parse(JSON.stringify(initialEntity)));

    const template = gameData.templates.find(t => t.id === localEntity.templateId);

    const resolvedAttributes = useMemo(() => {
        if (!template) return null;

        const templateAttributes = template.attributes;

        const stuffAttributes = (template.includedStuff || []).flatMap(included => {
            const stuffSet = gameData.stuff.find(s => s.id === included.setId);
            if (!stuffSet) return [];

            const items = stuffSet.items.filter(i => included.itemIds.includes(i.id));

            return {
                setName: stuffSet.name,
                items: items.map(item => ({
                    itemName: item.name,
                    itemId: item.id,
                    attributes: item.attributes
                }))
            };
        });

        return { templateAttributes, stuffAttributes };

    }, [template, gameData.stuff]);

    if (!template || !resolvedAttributes) {
        return <div className="p-6 text-red-400">Error: Cannot find template with ID {localEntity.templateId}</div>;
    }

    const handleAttributeValueChange = (attrId: string, value: string | number | null) => {
        setLocalEntity(prev => ({
            ...prev,
            attributeValues: { ...prev.attributeValues, [attrId]: value }
        }));
    };

    return (
        <div className="flex-1 flex flex-col bg-gray-800">
             <header className="p-4 border-b border-gray-700">
                <h2 className="text-xl font-bold text-cyan-300">{isNew ? 'Creating New Entity' : `Editing: ${initialEntity.name}`}</h2>
            </header>
            <main className="flex-grow p-6 space-y-6 overflow-y-auto">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
                    <input type="text" value={localEntity.name} onChange={e => setLocalEntity(prev => ({ ...prev, name: e.target.value }))} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-teal-500 focus:border-teal-500"/>
                </div>
                
                {/* Template Attributes */}
                {resolvedAttributes.templateAttributes.length > 0 && (
                    <fieldset className="space-y-4 pt-4 border-t border-gray-700">
                         <legend className="text-lg font-semibold text-gray-300 -mb-2 px-1">{template.name} Attributes</legend>
                         {resolvedAttributes.templateAttributes.map(attr => (
                            <div key={attr.id}>
                                <label className="block text-sm font-medium text-gray-400 mb-1">{attr.name}</label>
                                <AttributeInput 
                                    attribute={attr} 
                                    value={localEntity.attributeValues[attr.id] ?? null}
                                    onChange={(value) => handleAttributeValueChange(attr.id, value)}
                                    gameData={gameData}
                                />
                                {attr.type === 'textarea' && (
                                    <button onClick={() => onGenerate(localEntity, attr.id, setLocalEntity)} disabled={!!isGenerating} className="mt-2 w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition duration-300">
                                        {isGenerating === attr.id ? 'Generating...' : 'Generate with AI'}
                                    </button>
                                )}
                            </div>
                        ))}
                    </fieldset>
                )}
                
                {/* Stuff Attributes */}
                {resolvedAttributes.stuffAttributes.map(stuffGroup => (
                     <fieldset key={stuffGroup.setName} className="space-y-4 pt-4 border-t border-gray-700">
                         <legend className="text-lg font-semibold text-teal-300 px-1">{stuffGroup.setName}</legend>
                         {stuffGroup.items.map(item => (
                            <div key={item.itemId} className="p-3 bg-gray-900/50 rounded-md border border-gray-700">
                                <h4 className="font-bold text-gray-300 mb-2">{item.itemName}</h4>
                                <div className="space-y-3 pl-2">
                                    {item.attributes.map(attr => {
                                      const compositeId = `${item.itemId}_${attr.id}`;
                                      return (
                                        <div key={compositeId}>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">{attr.name}</label>
                                            <AttributeInput 
                                                attribute={attr} 
                                                value={localEntity.attributeValues[compositeId] ?? null}
                                                onChange={(value) => handleAttributeValueChange(compositeId, value)}
                                                gameData={gameData}
                                            />
                                        </div>
                                      );
                                    })}
                                </div>
                            </div>
                         ))}
                     </fieldset>
                ))}


            </main>
             <footer className="p-4 flex justify-end space-x-3 border-t border-gray-700 bg-gray-800/50">
                <button onClick={onCancel} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 text-white font-semibold transition-colors">Cancel</button>
                <button onClick={() => onSave(localEntity)} className="px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-700 text-white font-semibold transition-colors">Save Changes</button>
            </footer>
        </div>
    );
}