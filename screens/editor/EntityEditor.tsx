
import React, { useState } from 'react';
import type { Entity, GameData } from '../../types';

interface EntityEditorProps {
    initialEntity: Entity;
    onSave: (e: Entity) => void;
    onCancel: () => void;
    gameData: GameData;
    onGenerate: (entity: Entity, attributeId: string, onUpdate: (entity: Entity) => void) => void;
    isGenerating: string | null;
    isNew: boolean;
}

export const EntityEditor: React.FC<EntityEditorProps> = ({ initialEntity, onSave, onCancel, gameData, onGenerate, isGenerating, isNew }) => {
    const [localEntity, setLocalEntity] = useState<Entity>(() => JSON.parse(JSON.stringify(initialEntity)));

    const template = gameData.templates.find(t => t.id === localEntity.templateId);

    if (!template) {
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
                {template.attributes.map(attr => {
                    const value = localEntity.attributeValues[attr.id];
                    switch(attr.type) {
                        case 'textarea':
                            return (
                                <div key={attr.id}>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">{attr.name}</label>
                                    <textarea value={(value as string) || ''} onChange={e => handleAttributeValueChange(attr.id, e.target.value)} rows={6} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-teal-500 focus:border-teal-500"></textarea>
                                    <button onClick={() => onGenerate(localEntity, attr.id, setLocalEntity)} disabled={!!isGenerating} className="mt-2 w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition duration-300">
                                        {isGenerating === attr.id ? 'Generating...' : 'Generate with AI'}
                                    </button>
                                </div>
                            );
                        case 'number':
                             return (
                                <div key={attr.id}>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">{attr.name}</label>
                                    <input type="number" value={(value as number) || ''} onChange={e => handleAttributeValueChange(attr.id, e.target.valueAsNumber || null)} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-teal-500 focus:border-teal-500"/>
                                </div>
                            );
                        case 'entity_reference':
                            const referencedEntities = gameData.entities.filter(e => e.templateId === attr.referencedTemplateId);
                            return (
                                <div key={attr.id}>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">{attr.name}</label>
                                    <select value={(value as string) || ''} onChange={e => handleAttributeValueChange(attr.id, e.target.value || null)} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-teal-500 focus:border-teal-500">
                                        <option value="">-- Unassigned --</option>
                                        {referencedEntities.map(refE => <option key={refE.id} value={refE.id}>{refE.name}</option>)}
                                    </select>
                                </div>
                            );
                        case 'string':
                        default:
                            return (
                                <div key={attr.id}>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">{attr.name}</label>
                                    <input type="text" value={(value as string) || ''} onChange={e => handleAttributeValueChange(attr.id, e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-teal-500 focus:border-teal-500"/>
                                </div>
                            );
                    }
                })}
            </main>
             <footer className="p-4 flex justify-end space-x-3 border-t border-gray-700 bg-gray-800/50">
                <button onClick={onCancel} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 text-white font-semibold transition-colors">Cancel</button>
                <button onClick={() => onSave(localEntity)} className="px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-700 text-white font-semibold transition-colors">Save Changes</button>
            </footer>
        </div>
    );
}
