

import React, { useState } from 'react';
import type { Template, AttributeDefinition, GameData } from '../../types';
import { Modal } from '../../components/Modal';

interface TemplateEditorProps {
    initialTemplate: Template;
    onSave: (t: Template) => void;
    onCancel: () => void;
    gameData: GameData;
    isNew: boolean;
}

const ItemSelectionModal: React.FC<{
  stuffSetId: string;
  gameData: GameData;
  selectedItemIds: string[];
  onSave: (newSelectedItemIds: string[]) => void;
  onClose: () => void;
}> = ({ stuffSetId, gameData, selectedItemIds, onSave, onClose }) => {
  const [localSelection, setLocalSelection] = useState(selectedItemIds);
  const stuffSet = gameData.stuff.find(s => s.id === stuffSetId);

  if (!stuffSet) return null;

  const handleToggle = (itemId: string) => {
    setLocalSelection(prev => 
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Select Items from ${stuffSet.name}`}>
        <div className="space-y-3 max-h-96 overflow-y-auto">
            {stuffSet.items.map(item => (
                <label key={item.id} className="flex items-center p-3 bg-gray-900 rounded-md hover:bg-gray-700 cursor-pointer">
                    <input 
                        type="checkbox"
                        checked={localSelection.includes(item.id)}
                        onChange={() => handleToggle(item.id)}
                        className="h-5 w-5 rounded bg-gray-700 border-gray-600 text-cyan-600 focus:ring-cyan-500"
                    />
                    <span className="ml-3 text-gray-300">{item.name} <span className="text-sm text-gray-500">({item.category})</span></span>
                </label>
            ))}
        </div>
        <div className="mt-6 flex justify-end space-x-3">
            <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 text-white font-semibold transition-colors">Cancel</button>
            <button onClick={() => { onSave(localSelection); onClose(); }} className="px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-700 text-white font-semibold transition-colors">Save Selection</button>
        </div>
    </Modal>
  );
};


export const TemplateEditor: React.FC<TemplateEditorProps> = ({ initialTemplate, onSave, onCancel, gameData, isNew }) => {
    const { templates, stuff } = gameData;
    const [localTemplate, setLocalTemplate] = useState<Template>(() => JSON.parse(JSON.stringify(initialTemplate)));
    const [newTag, setNewTag] = useState('');
    const [isItemSelectionOpen, setIsItemSelectionOpen] = useState<string | null>(null); // holds setId

    const updateField = (field: keyof Template, value: any) => {
        setLocalTemplate(prev => ({ ...prev, [field]: value }));
    };

    const addAttribute = () => {
      const newAttr: AttributeDefinition = { id: `attr_${Date.now()}`, name: 'New Attribute', type: 'string' };
      updateField('attributes', [...localTemplate.attributes, newAttr]);
    };
    
    const updateAttribute = (attrId: string, updatedAttr: Partial<AttributeDefinition>) => {
      const newAttributes = localTemplate.attributes.map(a => a.id === attrId ? {...a, ...updatedAttr} : a);
      updateField('attributes', newAttributes);
    }
    
    const removeAttribute = (attrId: string) => {
      updateField('attributes', localTemplate.attributes.filter(a => a.id !== attrId));
    }

    const handleIncludeStuffSet = (setId: string) => {
        if (!setId || (localTemplate.includedStuff || []).some(is => is.setId === setId)) return;
        const newInclusion = { setId, itemIds: [] };
        updateField('includedStuff', [...(localTemplate.includedStuff || []), newInclusion]);
    };

    const handleRemoveStuffSet = (setId: string) => {
        updateField('includedStuff', (localTemplate.includedStuff || []).filter(is => is.setId !== setId));
    };

    const handleSaveItemSelection = (setId: string, newItemIds: string[]) => {
      const newIncludedStuff = (localTemplate.includedStuff || []).map(is => 
          is.setId === setId ? { ...is, itemIds: newItemIds } : is
      );
      updateField('includedStuff', newIncludedStuff);
    };

    const availableStuffSets = stuff.filter(s => !(localTemplate.includedStuff || []).some(is => is.setId === s.id));

    return (
        <div className="flex-1 flex flex-col bg-gray-800">
            <header className="p-4 border-b border-gray-700">
                <h2 className="text-xl font-bold text-cyan-300">{isNew ? 'Creating New Template' : `Editing: ${initialTemplate.name}`}</h2>
            </header>
            <main className="flex-grow p-6 space-y-6 overflow-y-auto">
                 <div>
                    <label className="block text-sm font-medium text-gray-400">Name</label>
                    <input type="text" value={localTemplate.name} onChange={e => updateField('name', e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400">Description</label>
                    <textarea value={localTemplate.description} onChange={e => updateField('description', e.target.value)} rows={3} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500"/>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-400">Tags</label>
                    <div className="flex flex-wrap items-center gap-2 p-2 bg-gray-900 border border-gray-600 rounded-md">
                        {localTemplate.tags.map((tag) => (
                            <span key={tag} className="flex items-center bg-cyan-800/50 text-cyan-200 text-xs font-medium px-2.5 py-1 rounded-full">
                                {tag}
                                <button
                                    onClick={() => updateField('tags', localTemplate.tags.filter(t => t !== tag))}
                                    className="ml-1.5 -mr-1 w-4 h-4 flex items-center justify-center rounded-full text-cyan-200 hover:bg-red-500/50 hover:text-white transition-colors"
                                    aria-label={`Remove tag ${tag}`}
                                >&times;</button>
                            </span>
                        ))}
                        <input type="text" value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => {
                            if (e.key === 'Enter' && newTag.trim() !== '') {
                                e.preventDefault();
                                if (!localTemplate.tags.includes(newTag.trim())) {
                                    updateField('tags', [...localTemplate.tags, newTag.trim()]);
                                }
                                setNewTag('');
                            }
                        }} placeholder="Add tag..." className="bg-transparent flex-grow p-1 focus:outline-none min-w-[80px]" />
                    </div>
                </div>
                 <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-300 border-b border-gray-600 pb-2">Attributes</h4>
                    {localTemplate.attributes.map(attr => (
                        <div key={attr.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-center bg-gray-900/50 p-3 rounded-md">
                            <input type="text" placeholder="Attribute Name" value={attr.name} onChange={e => updateAttribute(attr.id, { name: e.target.value })} className="bg-gray-800 border border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500"/>
                            <select value={attr.type} onChange={e => updateAttribute(attr.id, { type: e.target.value as AttributeDefinition['type'], referencedTemplateId: null })} className="bg-gray-800 border border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500">
                                <option value="string">String</option>
                                <option value="textarea">Text Area</option>
                                <option value="number">Number</option>
                                <option value="entity_reference">Entity Reference</option>
                            </select>
                            <button onClick={() => removeAttribute(attr.id)} className="text-red-400 hover:text-red-300 justify-self-end p-1">Remove</button>
                            {attr.type === 'entity_reference' && (
                                <select value={attr.referencedTemplateId || ''} onChange={e => updateAttribute(attr.id, { referencedTemplateId: e.target.value })} className="bg-gray-800 border border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500 md:col-span-2">
                                    <option value="">-- Select Template --</option>
                                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            )}
                        </div>
                    ))}
                    <button onClick={addAttribute} className="w-full bg-gray-700 hover:bg-gray-600 text-cyan-300 font-bold py-2 px-4 rounded transition duration-300">Add Attribute</button>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-700">
                    <h4 className="text-lg font-semibold text-gray-300">Included Stuff</h4>
                    {(localTemplate.includedStuff || []).map(included => {
                       const stuffSet = gameData.stuff.find(s => s.id === included.setId);
                       if (!stuffSet) return null;
                       const includedItems = stuffSet.items.filter(i => included.itemIds.includes(i.id));
                       return (
                         <div key={included.setId} className="bg-gray-900/50 p-3 rounded-md border border-gray-600">
                            <div className="flex justify-between items-center">
                                <h5 className="font-bold text-teal-300">{stuffSet.name}</h5>
                                <div>
                                    <button onClick={() => setIsItemSelectionOpen(included.setId)} className="text-sm text-cyan-400 hover:text-cyan-300 mr-4">Select Items</button>
                                    <button onClick={() => handleRemoveStuffSet(included.setId)} className="text-sm text-red-400 hover:text-red-300">Remove</button>
                                </div>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">
                                Includes: {includedItems.length > 0 ? includedItems.map(i => i.name).join(', ') : <i className="text-gray-500">No items selected</i>}
                            </p>
                         </div>
                       );
                    })}
                    <select onChange={(e) => handleIncludeStuffSet(e.target.value)} value="" className="w-full bg-gray-700 hover:bg-gray-600 text-cyan-300 font-bold py-2 px-4 rounded transition duration-300 disabled:bg-gray-600 disabled:text-gray-400" disabled={availableStuffSets.length === 0}>
                        <option value="">{availableStuffSets.length > 0 ? '-- Include a Set --' : 'No available sets'}</option>
                        {availableStuffSets.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>
            </main>
            <footer className="p-4 flex justify-end space-x-3 border-t border-gray-700 bg-gray-800/50">
                <button onClick={onCancel} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 text-white font-semibold transition-colors">Cancel</button>
                <button onClick={() => onSave(localTemplate)} className="px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-700 text-white font-semibold transition-colors">Save Changes</button>
            </footer>

            {isItemSelectionOpen && (
              <ItemSelectionModal
                stuffSetId={isItemSelectionOpen}
                gameData={gameData}
                selectedItemIds={(localTemplate.includedStuff || []).find(is => is.setId === isItemSelectionOpen)?.itemIds || []}
                onSave={(newItemIds) => handleSaveItemSelection(isItemSelectionOpen, newItemIds)}
                onClose={() => setIsItemSelectionOpen(null)}
              />
            )}
        </div>
    );
}