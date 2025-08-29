

import React, { useState, useMemo, useEffect } from 'react';
import type { Template, AttributeDefinition, GameData } from '../../types';
import { debugService } from '../../services/debugService';
import { TrashIcon } from '../../components/icons/TrashIcon';
import { PlusIcon } from '../../components/icons/PlusIcon';
import { HelpTooltip } from '../../components/HelpTooltip';

interface TemplateEditorProps {
    template: Template;
    onChange: (t: Template) => void;
    onSave: (t: Template) => void;
    onCancel: () => void;
    gameData: GameData;
    isNew: boolean;
}

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
    sourceName: string; // Name of the template or component
    sourceId: string;
    isInherited: boolean;
    isFromComponent: boolean;
    componentId?: string;
}

const useResolvedTemplate = (template: Template, allTemplates: Template[]) => {
    return useMemo(() => {
        debugService.log('TemplateEditor: Recalculating resolved properties (inheritance & composition)', { template, allTemplates });
        
        const resolvedAttributes: ResolvedAttribute[] = [];
        const seenAttributeIds = new Set<string>();

        // 1. Add own attributes
        template.attributes.forEach(attr => {
            const compositeId = attr.id;
            if (!seenAttributeIds.has(compositeId)) {
                resolvedAttributes.push({ 
                    definition: attr, 
                    sourceName: template.name, 
                    sourceId: template.id, 
                    isInherited: false,
                    isFromComponent: false,
                });
                seenAttributeIds.add(compositeId);
            }
        });

        // 2. Walk up parent chain for inherited attributes and components
        const hierarchy: Template[] = [];
        let current: Template | undefined = allTemplates.find(t => t.id === template.parentId);
        while (current) {
            hierarchy.unshift(current); // Build from top-down
            current = allTemplates.find(t => t.id === current?.parentId);
        }
        
        hierarchy.forEach(ancestor => {
            ancestor.attributes.forEach(attr => {
                 const compositeId = attr.id;
                 if (!seenAttributeIds.has(compositeId)) {
                    resolvedAttributes.push({ 
                        definition: attr, 
                        sourceName: ancestor.name, 
                        sourceId: ancestor.id, 
                        isInherited: true,
                        isFromComponent: false,
                    });
                    seenAttributeIds.add(compositeId);
                 }
            });
        });
        
        // 3. Gather all components from self and parents
        const allComponentIds = new Set<string>();
        [template, ...hierarchy].forEach(t => {
            (t.includedComponentIds || []).forEach(id => allComponentIds.add(id));
        });

        // 4. Add attributes from components
        allComponentIds.forEach(componentId => {
            const component = allTemplates.find(t => t.id === componentId);
            if (component) {
                component.attributes.forEach(attr => {
                    const compositeId = `${component.id}_${attr.id}`;
                     if (!seenAttributeIds.has(compositeId)) {
                        resolvedAttributes.push({
                            definition: attr,
                            sourceName: component.name,
                            sourceId: component.id,
                            isInherited: false, // Or based on hierarchy? Let's say false for simplicity.
                            isFromComponent: true,
                            componentId: component.id,
                        });
                        seenAttributeIds.add(compositeId);
                     }
                });
            }
        });

        debugService.log('TemplateEditor: Finished recalculating resolved properties', { resolvedAttributes });
        return { attributes: resolvedAttributes };
    }, [template, allTemplates]);
};


export const TemplateEditor: React.FC<TemplateEditorProps> = ({ template, onChange, onSave, onCancel, gameData, isNew }) => {
    const [newTag, setNewTag] = useState('');

    useEffect(() => {
        debugService.log('TemplateEditor: Component mounted or received new props.', { template, isNew });
    }, [template, isNew]);

    const allTemplates = useMemo(() => {
        const otherTemplates = gameData.templates.filter(t => t.id !== template.id);
        return [...otherTemplates, template];
    }, [gameData.templates, template]);

    const resolvedProperties = useResolvedTemplate(template, allTemplates);

    const attributesFromParent = useMemo(() => 
        resolvedProperties.attributes.filter(a => a.sourceId !== template.id && a.isInherited), 
        [resolvedProperties.attributes, template.id]
    );

    const attributesFromComponents = useMemo(() => 
        resolvedProperties.attributes.filter(a => a.isFromComponent), 
        [resolvedProperties.attributes]
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

    const handleIncludeComponent = (componentId: string) => {
        if (!componentId) return;
        const currentIds = template.includedComponentIds || [];
        if (currentIds.includes(componentId)) return;
        
        const newState = { ...template, includedComponentIds: [...currentIds, componentId] };
        debugService.log('TemplateEditor: Including component', { componentId, oldState: template, newState });
        onChange(newState);
    };

    const handleRemoveComponent = (componentId: string) => {
        const currentIds = template.includedComponentIds || [];
        const newState = { ...template, includedComponentIds: currentIds.filter(id => id !== componentId) };
        debugService.log('TemplateEditor: Removing component', { componentId, oldState: template, newState });
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

    const availableComponents = useMemo(() => {
        const includedIds = new Set(template.includedComponentIds || []);
        return gameData.templates.filter(t => t.isComponent && !includedIds.has(t.id));
    }, [gameData.templates, template.includedComponentIds]);

    return (
        <div className="flex-1 flex flex-col bg-[var(--bg-panel)] min-h-0">
            <header className="p-4 border-b border-[var(--border-primary)]">
                <h2 className="text-[length:var(--font-size-xl)] font-bold text-[var(--text-accent)]">{isNew ? `Creating New ${template.isComponent ? 'Component' : 'Template'}` : `Editing: ${template.name}`}</h2>
            </header>
            <main className="flex-grow p-6 space-y-6 overflow-y-auto">
                 <div>
                    <div className="flex items-center gap-2 mb-1">
                        <label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)]">Name</label>
                        <HelpTooltip title="Blueprint Name" content="The name for this blueprint. For example, 'Character', 'Vehicle', or 'Facility'." />
                    </div>
                    <input type="text" value={template.name} onChange={e => updateSimpleField('name', e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2 focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)]"/>
                </div>
                 <div>
                    <div className="flex items-center gap-2 mb-1">
                        <label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)]">Parent Blueprint</label>
                        <HelpTooltip title="Parent Blueprint (Inheritance)" content="Select another blueprint to be the 'parent' of this one. This blueprint will automatically inherit all attributes from its parent. This is useful for creating specialized types.\n\nExample: You could have a base 'Vehicle' blueprint, with 'Wheeled Vehicle' and 'Flying Vehicle' as children that inherit its basic properties and add their own." />
                    </div>
                    <select value={template.parentId || ''} onChange={e => updateSimpleField('parentId', e.target.value || undefined)} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2 focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)]">
                      <option value="">-- No Parent --</option>
                      {parentTemplateCandidates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)]">Description</label>
                        <HelpTooltip title="Blueprint Description" content="An editor-facing description for this blueprint to help you remember its purpose. This is not shown to the player." />
                    </div>
                    <textarea value={template.description} onChange={e => updateSimpleField('description', e.target.value)} rows={3} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2 focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)]"/>
                </div>
                 <div>
                    <div className="flex items-center gap-2 mb-1">
                        <label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)]">Tags</label>
                        <HelpTooltip title="Blueprint Tags" content="Tags are used for organizing your blueprints in the editor. They don't have any in-game effect." />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 p-2 bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md">
                        {template.tags.map((tag) => (
                            <span key={tag} className="flex items-center bg-[var(--text-accent-dark)]/50 text-[var(--text-accent)] text-[length:var(--font-size-xs)] font-medium px-2.5 py-1 rounded-full">
                                {tag}
                                <button
                                    onClick={() => handleRemoveTag(tag)}
                                    className="ml-1.5 -mr-1 w-4 h-4 flex items-center justify-center rounded-full text-[var(--text-accent)] hover:bg-red-500/50 hover:text-white transition-colors"
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
                    <div className="flex items-center gap-2 border-b border-[var(--border-primary)] pb-2">
                        <h4 className="text-[length:var(--font-size-lg)] font-semibold text-[var(--text-primary)]">Own Attributes</h4>
                        <HelpTooltip title="Own Attributes" content="These are the data fields defined directly on this blueprint. Entities created from this blueprint will have these fields available to store data." />
                    </div>
                    {template.attributes.map(attr => (
                        <div key={attr.id} className="bg-[var(--bg-input)]/50 p-3 rounded-md">
                            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <label className="text-[length:var(--font-size-xs)] font-medium text-[var(--text-secondary)]">Attribute Name</label>
                                        <HelpTooltip title="Attribute Name" content="The name of the data field, like 'Health' or 'Description'." />
                                    </div>
                                    <input type="text" placeholder="Attribute Name" value={attr.name} onChange={e => updateAttribute(attr.id, { name: e.target.value })} className="w-full bg-[var(--bg-panel)] border border-[var(--border-secondary)] rounded-md p-2 focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)]"/>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <label className="text-[length:var(--font-size-xs)] font-medium text-[var(--text-secondary)]">Attribute Type</label>
                                        <HelpTooltip title="Attribute Type" content={"Determines the kind of data this attribute holds:\n- String: A single line of text.\n- Text Area: A multi-line block of text.\n- Number: A numerical value.\n- Entity Reference: A link to another entity in the game."} />
                                    </div>
                                    <select value={attr.type} onChange={e => updateAttribute(attr.id, { type: e.target.value as AttributeDefinition['type'], referencedTemplateId: null })} className="w-full bg-[var(--bg-panel)] border border-[var(--border-secondary)] rounded-md p-2 focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)]">
                                        <option value="string">String</option>
                                        <option value="textarea">Text Area</option>
                                        <option value="number">Number</option>
                                        <option value="entity_reference">Entity Reference</option>
                                    </select>
                                </div>
                                <button onClick={() => removeAttribute(attr.id)} className="text-[var(--text-danger)] hover:text-red-300 p-2 bg-[var(--bg-panel-light)]/50 hover:bg-red-500/20 rounded-md">
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                            {attr.type === 'entity_reference' && (
                                <div className="mt-2">
                                    <div className="flex items-center gap-2 mb-1">
                                        <label className="text-[length:var(--font-size-xs)] font-medium text-[var(--text-secondary)]">Referenced Template</label>
                                        <HelpTooltip title="Referenced Template" content="This constrains the reference to only allow entities created from the selected template. For example, an 'Operator' attribute could be constrained to only reference 'Character' entities." />
                                    </div>
                                    <select 
                                        value={attr.referencedTemplateId || ''} 
                                        onChange={e => updateAttribute(attr.id, { referencedTemplateId: e.target.value || null })} 
                                        className="w-full bg-[var(--bg-panel)] border border-[var(--border-secondary)] rounded-md p-2 focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)]"
                                    >
                                        <option value="">-- Select Template to Reference --</option>
                                        {allTemplates.filter(t => !t.isComponent).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                    ))}
                    <button onClick={addAttribute} className="w-full bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-accent)] font-bold py-2 px-4 rounded transition duration-300 flex items-center justify-center gap-2"><PlusIcon className="w-4 h-4"/>Add Attribute</button>
                </div>

                {!template.isComponent && (
                    <div className="space-y-4 pt-4 border-t border-[var(--border-primary)]">
                        <div className="flex items-center gap-2">
                            <h4 className="text-[length:var(--font-size-lg)] font-semibold text-[var(--text-primary)]">Included Components</h4>
                            <HelpTooltip title="Included Components (Composition)" content="Components are reusable bundles of attributes. By including a component, you are 'plugging in' its attributes to this template.\n\nExample: You could create a 'Hacking Skill' component with a 'level' attribute. You can then include this component in any character template that needs that skill, without having to redefine the attribute each time." />
                        </div>
                        {(template.includedComponentIds || []).map(componentId => {
                            const component = gameData.templates.find(t => t.id === componentId);
                            return (
                                <div key={componentId} className="bg-[var(--bg-input)]/50 p-2 rounded-md border border-[var(--border-secondary)] flex justify-between items-center">
                                    <span className="font-semibold text-[var(--text-teal)]">{component?.name || 'Unknown Component'}</span>
                                    <button onClick={() => handleRemoveComponent(componentId)} className="text-[length:var(--font-size-sm)] text-[var(--text-danger)] hover:text-red-300 flex items-center gap-1"><TrashIcon className="w-4 h-4"/> Remove</button>
                                </div>
                            )
                        })}
                         <select onChange={(e) => handleIncludeComponent(e.target.value)} value="" className="w-full bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-accent)] font-bold py-2 px-4 rounded transition duration-300 disabled:bg-[var(--bg-input)] disabled:text-[var(--text-tertiary)]" disabled={availableComponents.length === 0}>
                            <option value="">{availableComponents.length > 0 ? '-- Include a Component --' : 'No available components'}</option>
                            {availableComponents.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                )}
                
                {attributesFromParent.length > 0 && (
                 <div className="space-y-2 pt-4 border-t border-[var(--border-primary)]">
                    <h4 className="text-[length:var(--font-size-lg)] font-semibold text-[var(--text-secondary)]">Inherited Attributes</h4>
                    {attributesFromParent.map(({definition, sourceName}) => (
                        <div key={definition.id} className="bg-[var(--bg-input)]/70 p-2 rounded-md text-[length:var(--font-size-sm)]">
                            <span className="text-[var(--text-primary)]">{definition.name}</span>
                            <span className="text-[length:var(--font-size-xs)] text-[var(--text-tertiary)] ml-2">({definition.type})</span>
                            <span className="text-[length:var(--font-size-xs)] text-[var(--text-accent)] float-right">from {sourceName}</span>
                        </div>
                    ))}
                 </div>
                )}

                 {attributesFromComponents.length > 0 && (
                     <div className="space-y-2 pt-4 border-t border-[var(--border-primary)]">
                        <h4 className="text-[length:var(--font-size-lg)] font-semibold text-[var(--text-teal)]">Attributes from Components</h4>
                        {attributesFromComponents.map(({definition, sourceName}) => (
                            <div key={`${sourceName}_${definition.id}`} className="bg-[var(--bg-input)]/70 p-2 rounded-md text-[length:var(--font-size-sm)]">
                                <span className="text-[var(--text-primary)]">{definition.name}</span>
                                <span className="text-[length:var(--font-size-xs)] text-[var(--text-tertiary)] ml-2">({definition.type})</span>
                                <span className="text-[length:var(--font-size-xs)] text-[var(--text-teal)] float-right">from {sourceName}</span>
                            </div>
                        ))}
                     </div>
                )}
            </main>
            <footer className="p-4 flex justify-end space-x-3 border-t border-[var(--border-primary)] bg-[var(--bg-panel)]/50">
                <button onClick={handleCancel} className="px-4 py-2 rounded-md bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-semibold transition-colors">Cancel</button>
                <button onClick={handleSaveChanges} className="px-4 py-2 rounded-md bg-[var(--bg-active)] hover:opacity-90 text-[var(--text-on-accent)] font-semibold transition-colors">Save Changes</button>
            </footer>
        </div>
    );
}