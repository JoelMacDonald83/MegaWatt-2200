

import React, { useState, useMemo, useEffect } from 'react';
import type { StuffSet, StuffItem, AttributeDefinition } from '../../types';
import { PlusIcon } from '../../components/icons/PlusIcon';
import { TrashIcon } from '../../components/icons/TrashIcon';
import { Modal } from '../../components/Modal';
import { PencilIcon } from '../../components/icons/PencilIcon';
import { debugService } from '../../services/debugService';


interface StuffEditorProps {
    initialStuffSet: StuffSet;
    onSave: (s: StuffSet) => void;
    onCancel: () => void;
    isNew: boolean;
}

const ItemEditorModal: React.FC<{
  item: StuffItem;
  onSave: (updatedItem: StuffItem) => void;
  onClose: () => void;
}> = ({ item, onSave, onClose }) => {
  const [localItem, setLocalItem] = useState<StuffItem>(() => JSON.parse(JSON.stringify(item)));

  useEffect(() => {
    debugService.log('ItemEditorModal: Mounted or received new item prop', { item });
    setLocalItem(JSON.parse(JSON.stringify(item)));
  }, [item]);

  const updateField = (field: keyof StuffItem, value: any) => {
    setLocalItem(prev => {
        const newState = { ...prev, [field]: value };
        debugService.log('ItemEditorModal: Updating field', { field, value, oldState: prev, newState });
        return newState;
    });
  };
  
  const addAttribute = () => {
    setLocalItem(prev => {
        const newAttr: AttributeDefinition = { id: `attr_${Date.now()}`, name: 'New Attribute', type: 'string' };
        const newState = { ...prev, attributes: [...prev.attributes, newAttr]};
        debugService.log('ItemEditorModal: Adding attribute', { newAttr, oldState: prev, newState });
        return newState;
    });
  };
  
  const updateAttribute = (attrId: string, updatedAttr: Partial<AttributeDefinition>) => {
    setLocalItem(prev => {
        const newAttributes = prev.attributes.map(a => a.id === attrId ? {...a, ...updatedAttr} : a);
        const newState = { ...prev, attributes: newAttributes };
        debugService.log('ItemEditorModal: Updating attribute', { attrId, updatedAttr, oldState: prev, newState });
        return newState;
    });
  };
  
  const removeAttribute = (attrId: string) => {
    setLocalItem(prev => {
        const newState = {
        ...prev,
        attributes: prev.attributes.filter(a => a.id !== attrId)
        };
        debugService.log('ItemEditorModal: Removing attribute', { attrId, oldState: prev, newState });
        return newState;
    });
  };

  const handleSave = () => {
    debugService.log('ItemEditorModal: Save clicked', { finalItemState: localItem });
    onSave(localItem);
  }

  return (
    <Modal isOpen={true} onClose={onClose} title={`Editing Item: ${item.name}`}>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        <div>
          <label className="block text-sm font-medium text-gray-400">Item Name</label>
          <input type="text" value={localItem.name} onChange={e => updateField('name', e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500"/>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400">Category</label>
          <input type="text" value={localItem.category} onChange={e => updateField('category', e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500"/>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400">Description</label>
          <textarea value={localItem.description} onChange={e => updateField('description', e.target.value)} rows={2} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500"/>
        </div>
        <div className="space-y-3 pt-4 border-t border-gray-700">
            <h4 className="text-md font-semibold text-gray-300">Attributes for this Item</h4>
            {localItem.attributes.map(attr => (
                <div key={attr.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center bg-gray-900/50 p-2 rounded-md">
                    <input type="text" placeholder="Attribute Name" value={attr.name} onChange={e => updateAttribute(attr.id, { name: e.target.value })} className="bg-gray-800 border border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500"/>
                    <select value={attr.type} onChange={e => updateAttribute(attr.id, { type: e.target.value as AttributeDefinition['type']})} className="bg-gray-800 border border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500">
                        <option value="string">String</option>
                        <option value="textarea">Text Area</option>
                        <option value="number">Number</option>
                    </select>
                    <button onClick={() => removeAttribute(attr.id)} className="text-red-400 hover:text-red-300 p-1"><TrashIcon className="w-4 h-4" /></button>
                </div>
            ))}
            <button onClick={addAttribute} className="w-full text-sm bg-gray-700 hover:bg-gray-600 text-cyan-300 font-semibold py-2 px-3 rounded transition duration-300">Add Attribute</button>
        </div>
      </div>
      <div className="mt-6 flex justify-end space-x-3">
        <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 text-white font-semibold transition-colors">Cancel</button>
        <button onClick={handleSave} className="px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-700 text-white font-semibold transition-colors">Save Item</button>
      </div>
    </Modal>
  );
};


export const StuffEditor: React.FC<StuffEditorProps> = ({ initialStuffSet, onSave, onCancel, isNew }) => {
    const [localStuffSet, setLocalStuffSet] = useState<StuffSet>(() => JSON.parse(JSON.stringify(initialStuffSet)));
    const [editingItem, setEditingItem] = useState<StuffItem | null>(null);

    useEffect(() => {
        debugService.log('StuffEditor: Component mounted or received new props.', { initialStuffSet, isNew });
        setLocalStuffSet(JSON.parse(JSON.stringify(initialStuffSet)));
    }, [initialStuffSet, isNew]);
    
    useEffect(() => {
        debugService.log('StuffEditor: Editing item state changed.', { editingItem });
    }, [editingItem]);

    const updateField = (field: keyof StuffSet, value: any) => {
        setLocalStuffSet(prev => {
            const newState = { ...prev, [field]: value };
            debugService.log('StuffEditor: Updating simple field', { field, value, oldState: prev, newState });
            return newState;
        });
    };

    const handleAddItem = () => {
        setLocalStuffSet(prev => {
            const newItem: StuffItem = {
                id: `item_${Date.now()}`,
                name: 'New Item',
                description: '',
                category: 'General',
                attributes: []
            };
            const newState = { ...prev, items: [...prev.items, newItem]};
            debugService.log('StuffEditor: Adding new item', { newItem, oldState: prev, newState });
            return newState;
        });
    };

    const handleSaveItem = (updatedItem: StuffItem) => {
        debugService.log('StuffEditor: Saving item from modal', { updatedItem });
        setLocalStuffSet(prev => {
            const newItems = prev.items.map(i => i.id === updatedItem.id ? updatedItem : i);
            const newState = { ...prev, items: newItems };
            debugService.log('StuffEditor: Item array updated', { oldState: prev, newState });
            return newState;
        });
        setEditingItem(null);
    };

    const handleRemoveItem = (itemId: string) => {
        if (window.confirm('Are you sure you want to delete this item?')) {
             setLocalStuffSet(prev => {
                const newState = {
                    ...prev,
                    items: prev.items.filter(i => i.id !== itemId)
                };
                debugService.log('StuffEditor: Removing item', { itemId, oldState: prev, newState });
                return newState;
            });
        } else {
            debugService.log('StuffEditor: Item removal cancelled by user', { itemId });
        }
    };
    
    const handleSaveChanges = () => {
        debugService.log('StuffEditor: "Save Changes" clicked. Calling onSave.', { finalState: localStuffSet });
        onSave(localStuffSet);
    };
    
    const handleCancelClick = () => {
        debugService.log('StuffEditor: "Cancel" clicked.');
        onCancel();
    }

    const categorizedItems = useMemo(() => {
        return localStuffSet.items.reduce((acc, item) => {
            const category = item.category || 'Uncategorized';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(item);
            return acc;
        }, {} as Record<string, StuffItem[]>);
    }, [localStuffSet.items]);


    return (
        <div className="flex-1 flex flex-col bg-gray-800">
            <header className="p-4 border-b border-gray-700">
                <h2 className="text-xl font-bold text-cyan-300">{isNew ? 'Creating New Set' : `Editing Set: ${initialStuffSet.name}`}</h2>
            </header>
            <main className="flex-grow p-6 space-y-6 overflow-y-auto">
                 <div>
                    <label className="block text-sm font-medium text-gray-400">Set Name</label>
                    <input type="text" value={localStuffSet.name} onChange={e => updateField('name', e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400">Description</label>
                    <textarea value={localStuffSet.description} onChange={e => updateField('description', e.target.value)} rows={2} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500"/>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-700">
                    <div className="flex justify-between items-center">
                      <h4 className="text-lg font-semibold text-gray-300">Items in this Set</h4>
                      <button onClick={handleAddItem} className="flex items-center gap-2 text-sm bg-gray-700 hover:bg-gray-600 text-cyan-300 font-semibold py-1 px-3 rounded-md transition duration-300">
                        <PlusIcon className="w-4 h-4"/> Add Item
                      </button>
                    </div>

                    <div className="space-y-3">
                        {Object.keys(categorizedItems).sort().map(category => (
                            <details key={category} open className="bg-gray-900/50 rounded-lg border border-gray-700">
                                <summary className="p-3 font-semibold text-cyan-300 cursor-pointer">{category}</summary>
                                <div className="px-3 pb-3 space-y-2">
                                {categorizedItems[category].map(item => (
                                    <div key={item.id} className="bg-gray-800 p-3 rounded-md flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold text-gray-200">{item.name}</p>
                                            <p className="text-xs text-gray-400">{item.description || <i>No description</i>}</p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button onClick={() => setEditingItem(item)} className="p-1 text-gray-400 hover:text-white"><PencilIcon className="w-4 h-4" /></button>
                                            <button onClick={() => handleRemoveItem(item.id)} className="p-1 text-gray-400 hover:text-red-400"><TrashIcon className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                ))}
                                </div>
                            </details>
                        ))}
                         {localStuffSet.items.length === 0 && (
                            <p className="text-center text-sm text-gray-500 italic py-4">No items defined in this set yet.</p>
                         )}
                    </div>
                </div>

            </main>
            <footer className="p-4 flex justify-end space-x-3 border-t border-gray-700 bg-gray-800/50">
                <button onClick={handleCancelClick} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 text-white font-semibold transition-colors">Cancel</button>
                <button onClick={handleSaveChanges} className="px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-700 text-white font-semibold transition-colors">Save Changes</button>
            </footer>

            {editingItem && (
                <ItemEditorModal 
                    item={editingItem}
                    onSave={handleSaveItem}
                    onClose={() => setEditingItem(null)}
                />
            )}
        </div>
    );
};