
import React, { useState } from 'react';
import type { Template, AttributeDefinition } from '../../types';

interface TemplateEditorProps {
    initialTemplate: Template;
    onSave: (t: Template) => void;
    onCancel: () => void;
    templates: Template[];
    isNew: boolean;
}

export const TemplateEditor: React.FC<TemplateEditorProps> = ({ initialTemplate, onSave, onCancel, templates, isNew }) => {
    const [localTemplate, setLocalTemplate] = useState<Template>(() => JSON.parse(JSON.stringify(initialTemplate)));
    const [newTag, setNewTag] = useState('');

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
            </main>
            <footer className="p-4 flex justify-end space-x-3 border-t border-gray-700 bg-gray-800/50">
                <button onClick={onCancel} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 text-white font-semibold transition-colors">Cancel</button>
                <button onClick={() => onSave(localTemplate)} className="px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-700 text-white font-semibold transition-colors">Save Changes</button>
            </footer>
        </div>
    );
}
