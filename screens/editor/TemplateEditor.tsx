

import React, { useState, useMemo, useEffect } from 'react';
import type { Template, AttributeDefinition, GameData, IncludedStuff, StuffItem } from '../../types';
import { Modal } from '../../components/Modal';
import { debugService } from '../../services/debugService';

interface TemplateEditorProps {
    template: Template;
    onChange: (t: Template) => void;
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

  useEffect(() => {
    debugService.log('ItemSelectionModal: Opened or received new props', { stuffSetId, selectedItemIds });
    setLocalSelection(selectedItemIds);
  }, [selectedItemIds, stuffSetId]);

  if (!stuffSet) return null;

  const handleToggle = (itemId: string) => {
    const newSelection = localSelection.includes(itemId)
      ? localSelection.filter(id => id !== itemId)
      : [...localSelection, itemId];
    
    debugService.log('ItemSelectionModal: Toggled item', { itemId, currentSelection: localSelection, newSelection });
    setLocalSelection(newSelection);
  };
  
  const categorizedItems = useMemo(() => {
      const categories: {[key: string]: StuffItem[]} = {};
      stuffSet.items.forEach(item => {
          if (!categories[item.category]) {
              categories[item.category] = [];
          }
          categories[item.category].push(item);
      });
      return Object.entries(categories).sort(([a], [b]) => a.localeCompare(b));
  }, [stuffSet.items]);

  const handleSave = () => {
    debugService.log('ItemSelectionModal: "Save Selection" clicked', { finalSelection: localSelection });
    onSave(localSelection);
    onClose();
  };
  
  const handleClose = () => {
    debugService.log('ItemSelectionModal: Closed without saving');
    onClose();
  }

  return (
    <Modal isOpen={true} onClose={handleClose} title={`Select Items from ${stuffSet.name}`}>
        <div className="space-y-4 max-h-96 overflow-y-auto">
            {categorizedItems.map(([category, items]) => (
                <div key={category}>
                    <h4 className="text-sm font-bold text-gray-400 border-b border-gray-600 pb-1 mb-2">{category}</h4>
                    <div className="space-y-2">
                        {items.map(item => (
                            <label key={item.id} className="flex items-center p-2 bg-gray-900 rounded-md hover:bg-gray-700 cursor-pointer">
                                <input 
                                    type="checkbox"
                                    checked={localSelection.includes(item.id)}
                                    onChange={() => handleToggle(item.id)}
                                    className="h-5 w-5 rounded bg-gray-700 border-gray-600 text-cyan-600 focus:ring-cyan-500"
                                />
                                <span className="ml-3 text-gray-300">{item.name}</span>
                            </label>
                        ))}
                    </div>
                </div>
            ))}
        </div>
        <div className="mt-6 flex justify-end space-x-3">
            <button onClick={handleClose} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 text-white font-semibold transition-colors">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-700 text-white font-semibold transition-colors">Save Selection</button>
        </div>
    </Modal>
  );
};


const getDescendantIds = (templateId: string, templates: Template[]): string[] => {
    let children = templates.filter(t => t.parentId === templateId);
    let descendantIds: string[] = children.map(c => c.id);
    children.forEach(child => {
        descendantIds = descendantIds.concat(getDescendantIds(child.id, templates));
    });
    return descendantIds;
};

interface ResolvedAttribute {
    definition: AttributeDefinition;
    sourceName: string;
    sourceId: string;
}

interface ResolvedStuff {
    stuff: IncludedStuff;
    sourceName: string;
    sourceId: string;
}

const useResolvedTemplate = (template: Template, allTemplates: Template[]) => {
    return useMemo(() => {
        debugService.log('TemplateEditor: Recalculating resolved properties (inheritance)', { template, allTemplates });
        const resolved = {
            attributes: [] as ResolvedAttribute[],
            includedStuff: [] as ResolvedStuff[],
        };
        
        let current: Template | undefined = template;

        while (current) {
            const currentId = current.id;
            const currentName = current.name;

            current.attributes.forEach(attr => {
                if (!resolved.attributes.some(a => a.definition.id === attr.id)) {
                    resolved.attributes.push({ definition: attr, sourceName: currentName, sourceId: currentId });
                }
            });
             (current.includedStuff || []).forEach(is => {
                if (!resolved.includedStuff.some(rs => rs.stuff.setId === is.setId)) {
                    resolved.includedStuff.push({ stuff: is, sourceName: currentName, sourceId: currentId });
                }
            });
            current = allTemplates.find(t => t.id === current?.parentId);
        }
        debugService.log('TemplateEditor: Finished recalculating resolved properties', { resolved });
        return resolved;
    }, [template, allTemplates]);
};


export const TemplateEditor: React.FC<TemplateEditorProps> = ({ template, onChange, onSave, onCancel, gameData, isNew }) => {
    const { stuff } = gameData;
    const [newTag, setNewTag] = useState('');
    const [isItemSelectionOpen, setIsItemSelectionOpen] = useState<string | null>(null);

    useEffect(() => {
        debugService.log('TemplateEditor: Component mounted or received new props.', { template, isNew });
        // This effect runs when the component mounts or when the 'template' prop changes.
        // It's a key place to spot if the parent is overwriting the local state.
    }, [template, isNew]);

    const allTemplates = useMemo(() => {
        const otherTemplates = gameData.templates.filter(t => t.id !== template.id);
        return [...otherTemplates, template];
    }, [gameData.templates, template]);

    const resolvedProperties = useResolvedTemplate(template, allTemplates);

    const inheritedAttributes = useMemo(() => 
        resolvedProperties.attributes.filter(a => a.sourceId !== template.id), 
        [resolvedProperties.attributes, template.id]
    );

    const inheritedStuff = useMemo(() => 
        resolvedProperties.includedStuff.filter(s => s.sourceId !== template.id), 
        [resolvedProperties.includedStuff, template.id]
    );
    
    const updateSimpleField = (field: keyof Template, value: any) => {
        const newState = { ...template, [field]: value };
        debugService.log('TemplateEditor: Updating simple field', { field, value, oldState: template, newState });
        onChange(newState);
    };

    const addAttribute = () => {
      const newAttr: AttributeDefinition = { id: `attr_${Date.now()}`, name: 'New Attribute', type: 'string' };
      const newState = { ...template, attributes: [...template.attributes, newAttr] };
      debugService.log('TemplateEditor: Adding attribute', { newAttr, oldState: template, newState });
      onChange(newState);
    };
    
    const updateAttribute = (attrId: string, updatedAttr: Partial<AttributeDefinition>) => {
      const newState = {
          ...template,
          attributes: template.attributes.map(a => a.id === attrId ? {...a, ...updatedAttr} : a)
      };
      debugService.log('TemplateEditor: Updating attribute', { attrId, updatedAttr, oldState: template, newState });
      onChange(newState);
    }
    
    const removeAttribute = (attrId: string) => {
      const newState = {
          ...template,
          attributes: template.attributes.filter(a => a.id !== attrId)
      };
      debugService.log('TemplateEditor: Removing attribute', { attrId, oldState: template, newState });
      onChange(newState);
    }
    
    const handleAddTag = (tagToAdd: string) => {
        if (!template.tags.includes(tagToAdd)) {
            const newState = { ...template, tags: [...template.tags, tagToAdd] };
            debugService.log('TemplateEditor: Adding tag', { tagToAdd, oldState: template, newState });
            onChange(newState);
        } else {
            debugService.log('TemplateEditor: Add tag skipped (already exists)', { tagToAdd });
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        const newState = {
            ...template,
            tags: template.tags.filter(t => t !== tagToRemove)
        };
        debugService.log('TemplateEditor: Removing tag', { tagToRemove, oldState: template, newState });
        onChange(newState);
    };

    const handleIncludeStuffSet = (setId: string) => {
        if (!setId) return;
        if ((template.includedStuff || []).some(is => is.setId === setId)) {
            debugService.log('TemplateEditor: Include stuff set skipped (already included)', { setId });
            return;
        }
        const newInclusion = { setId, itemIds: [] };
        const newState = { ...template, includedStuff: [...(template.includedStuff || []), newInclusion] };
        debugService.log('TemplateEditor: Including stuff set', { newInclusion, oldState: template, newState });
        onChange(newState);
    };

    const handleRemoveStuffSet = (setId: string) => {
        const newState = {
            ...template,
            includedStuff: (template.includedStuff || []).filter(is => is.setId !== setId)
        };
        debugService.log('TemplateEditor: Removing stuff set', { setId, oldState: template, newState });
        onChange(newState);
    };

    const handleSaveItemSelection = (setId: string, newItemIds: string[]) => {
      debugService.log('TemplateEditor: handleSaveItemSelection received from modal', { setId, newItemIds });
      const newIncludedStuff = (template.includedStuff || []).map(is => 
          is.setId === setId ? { ...is, itemIds: newItemIds } : is
      );
      const newState = { ...template, includedStuff: newIncludedStuff };
      debugService.log('TemplateEditor: Updating includedStuff based on modal selection', { oldState: template, newState });
      onChange(newState);
    };

    const handleSaveChanges = () => {
        debugService.log('TemplateEditor: "Save Changes" button clicked. Calling onSave with final state.', { finalState: template });
        onSave(template);
    };

    const handleCancel = () => {
        debugService.log('TemplateEditor: "Cancel" button clicked.');
        onCancel();
    }
    
    const parentTemplateCandidates = useMemo(() => {
        const descendantIds = getDescendantIds(template.id, allTemplates);
        return allTemplates.filter(t => t.id !== template.id && !descendantIds.includes(t.id));
    }, [template.id, allTemplates]);

    const availableStuffSets = stuff.filter(s => !(resolvedProperties.includedStuff || []).some(is => is.stuff.setId === s.id));

    return (
        <div className="flex-1 flex flex-col bg-gray-800 min-h-0">
            <header className="p-4 border-b border-gray-700">
                <h2 className="text-xl font-bold text-cyan-300">{isNew ? 'Creating New Template' : `Editing: ${template.name}`}</h2>
            </header>
            <main className="flex-grow p-6 space-y-6 overflow-y-auto">
                 <div>
                    <label className="block text-sm font-medium text-gray-400">Name</label>
                    <input type="text" value={template.name} onChange={e => updateSimpleField('name', e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500"/>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-400">Parent Template</label>
                    <select value={template.parentId || ''} onChange={e => updateSimpleField('parentId', e.target.value || undefined)} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500">
                      <option value="">-- No Parent --</option>
                      {parentTemplateCandidates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400">Description</label>
                    <textarea value={template.description} onChange={e => updateSimpleField('description', e.target.value)} rows={3} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500"/>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-400">Tags</label>
                    <div className="flex flex-wrap items-center gap-2 p-2 bg-gray-900 border border-gray-600 rounded-md">
                        {template.tags.map((tag) => (
                            <span key={tag} className="flex items-center bg-cyan-800/50 text-cyan-200 text-xs font-medium px-2.5 py-1 rounded-full">
                                {tag}
                                <button
                                    onClick={() => handleRemoveTag(tag)}
                                    className="ml-1.5 -mr-1 w-4 h-4 flex items-center justify-center rounded-full text-cyan-200 hover:bg-red-500/50 hover:text-white transition-colors"
                                    aria-label={`Remove tag ${tag}`}
                                >&times;</button>
                            </span>
                        ))}
                        <input type="text" value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => {
                            if (e.key === 'Enter' && newTag.trim() !== '') {
                                e.preventDefault();
                                handleAddTag(newTag.trim());
                                setNewTag('');
                            }
                        }} placeholder="Add tag..." className="bg-transparent flex-grow p-1 focus:outline-none min-w-[80px]" />
                    </div>
                </div>
                 <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-300 border-b border-gray-600 pb-2">Own Attributes</h4>
                    {template.attributes.map(attr => (
                        <div key={attr.id} className="bg-gray-900/50 p-3 rounded-md">
                            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-center">
                                <input type="text" placeholder="Attribute Name" value={attr.name} onChange={e => updateAttribute(attr.id, { name: e.target.value })} className="bg-gray-800 border border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500"/>
                                <select value={attr.type} onChange={e => updateAttribute(attr.id, { type: e.target.value as AttributeDefinition['type'], referencedTemplateId: null })} className="bg-gray-800 border border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500">
                                    <option value="string">String</option>
                                    <option value="textarea">Text Area</option>
                                    <option value="number">Number</option>
                                    <option value="entity_reference">Entity Reference</option>
                                </select>
                                <button onClick={() => removeAttribute(attr.id)} className="text-red-400 hover:text-red-300 justify-self-end p-1">Remove</button>
                            </div>
                            {attr.type === 'entity_reference' && (
                                <div className="mt-2">
                                    <select 
                                        value={attr.referencedTemplateId || ''} 
                                        onChange={e => updateAttribute(attr.id, { referencedTemplateId: e.target.value || null })} 
                                        className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500"
                                    >
                                        <option value="">-- Select Template to Reference --</option>
                                        {allTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                    ))}
                    <button onClick={addAttribute} className="w-full bg-gray-700 hover:bg-gray-600 text-cyan-300 font-bold py-2 px-4 rounded transition duration-300">Add Attribute</button>
                </div>
                
                {inheritedAttributes.length > 0 && (
                 <div className="space-y-2 pt-4 border-t border-gray-700">
                    <h4 className="text-lg font-semibold text-gray-400">Inherited Attributes</h4>
                    {inheritedAttributes.map(({definition, sourceName}) => (
                        <div key={definition.id} className="bg-gray-900/70 p-2 rounded-md text-sm">
                            <span className="text-gray-300">{definition.name}</span>
                            <span className="text-xs text-gray-500 ml-2">({definition.type})</span>
                            <span className="text-xs text-cyan-400 float-right">from {sourceName}</span>
                        </div>
                    ))}
                 </div>
                )}


                <div className="space-y-4 pt-4 border-t border-gray-700">
                    <h4 className="text-lg font-semibold text-gray-300">Own Included Stuff</h4>
                    {(template.includedStuff || []).map(included => {
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
                 {inheritedStuff.length > 0 && (
                     <div className="space-y-2 pt-4 border-t border-gray-700">
                        <h4 className="text-lg font-semibold text-gray-400">Inherited Stuff</h4>
                        {inheritedStuff.map(({stuff, sourceName}) => {
                             const stuffSet = gameData.stuff.find(ss => ss.id === stuff.setId);
                             if (!stuffSet) return null;
                             return (
                                 <div key={stuff.setId} className="bg-gray-900/70 p-2 rounded-md text-sm">
                                     <span className="text-teal-300">{stuffSet.name}</span>
                                     <span className="text-xs text-cyan-400 float-right">from {sourceName}</span>
                                 </div>
                             );
                        })}
                     </div>
                )}
            </main>
            <footer className="p-4 flex justify-end space-x-3 border-t border-gray-700 bg-gray-800/50">
                <button onClick={handleCancel} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 text-white font-semibold transition-colors">Cancel</button>
                <button onClick={handleSaveChanges} className="px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-700 text-white font-semibold transition-colors">Save Changes</button>
            </footer>

            {isItemSelectionOpen && (
              <ItemSelectionModal
                stuffSetId={isItemSelectionOpen}
                gameData={gameData}
                selectedItemIds={(template.includedStuff || []).find(is => is.setId === isItemSelectionOpen)?.itemIds || []}
                onSave={(newItemIds) => handleSaveItemSelection(isItemSelectionOpen, newItemIds)}
                onClose={() => setIsItemSelectionOpen(null)}
              />
            )}
        </div>
    );
}
