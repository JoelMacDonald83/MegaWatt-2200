

import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Entity, GameData, AttributeDefinition, Template, IncludedStuff } from '../../types';
import { debugService } from '../../services/debugService';
import { StyleSelect } from '../../components/editor/StyleComponents';

interface EntityEditorProps {
    initialEntity: Entity;
    onSave: (e: Entity) => void;
    onCancel: () => void;
    gameData: GameData;
    onGenerate: (entity: Entity, attributeId: string, onUpdate: (entity: Entity) => void) => void;
    onGenerateImage: (prompt: string, onUpdate: (base64: string) => void) => void;
    isGenerating: string | null;
    isGeneratingImage: boolean;
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
            if (!attribute.referencedTemplateId) {
                return (
                    <div className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-gray-500 text-sm italic">
                        The referenced template is not set for this attribute.
                    </div>
                );
            }
            const referencedEntities = gameData.entities.filter(e => e.templateId === attribute.referencedTemplateId);
            return (
                <select 
                    value={(value as string) || ''} 
                    onChange={e => onChange(e.target.value || null)} 
                    className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-teal-500 focus:border-teal-500"
                >
                    <option value="">-- Unassigned --</option>
                    {referencedEntities.length > 0 
                        ? referencedEntities.map(refE => <option key={refE.id} value={refE.id}>{refE.name}</option>)
                        : <option value="" disabled>No valid entities to reference.</option>
                    }
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

interface ResolvedProperties {
    attributes: { definition: AttributeDefinition; sourceTemplate: Template }[];
    stuff: { included: IncludedStuff; sourceTemplate: Template }[];
}


const useResolvedTemplateProperties = (templateId: string, gameData: GameData): ResolvedProperties | null => {
    return useMemo(() => {
        debugService.log('EntityEditor: Recalculating resolved properties for template', { templateId });
        const { templates } = gameData;
        const resolved: ResolvedProperties = { attributes: [], stuff: [] };
        
        let currentTemplate = templates.find(t => t.id === templateId);
        if (!currentTemplate) {
            debugService.log('EntityEditor: Could not find template for property resolution', { templateId });
            return null;
        }

        const hierarchy: Template[] = [];
        while(currentTemplate) {
            hierarchy.unshift(currentTemplate);
            currentTemplate = templates.find(t => t.id === currentTemplate?.parentId);
        }

        const seenAttributeIds = new Set<string>();
        const seenStuffSetIds = new Set<string>();

        for (const template of hierarchy) {
            template.attributes.forEach(attr => {
                if (!seenAttributeIds.has(attr.id)) {
                    resolved.attributes.push({ definition: attr, sourceTemplate: template });
                    seenAttributeIds.add(attr.id);
                }
            });
            (template.includedStuff || []).forEach(is => {
                 if (!seenStuffSetIds.has(is.setId)) {
                    resolved.stuff.push({ included: is, sourceTemplate: template });
                    seenStuffSetIds.add(is.setId);
                 }
            });
        }
        debugService.log('EntityEditor: Finished recalculating resolved properties', { resolved, hierarchy: hierarchy.map(t => t.name) });
        return resolved;
    }, [templateId, gameData]);
};


export const EntityEditor: React.FC<EntityEditorProps> = ({ initialEntity, onSave, onCancel, gameData, onGenerate, onGenerateImage, isGenerating, isGeneratingImage, isNew }) => {
    const [localEntity, setLocalEntity] = useState<Entity>(() => JSON.parse(JSON.stringify(initialEntity)));
    const bgInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        debugService.log('EntityEditor: Component mounted or received new props.', { initialEntity, isNew });
        setLocalEntity(JSON.parse(JSON.stringify(initialEntity)));
    }, [initialEntity, isNew]);

    const template = gameData.templates.find(t => t.id === localEntity.templateId);
    
    const resolvedProperties = useResolvedTemplateProperties(localEntity.templateId, gameData);

    const styles = useMemo(() => {
        const s = localEntity.styles || {};
        const hasBgImage = !!localEntity.imageBase64;
        return {
            borderColor: s.borderColor || 'cyan-500',
            borderWidth: s.borderWidth || 'md',
            shadow: s.shadow || 'lg',
            titleColor: s.titleColor || 'text-cyan-300',
            backgroundColor: s.backgroundColor || 'bg-gray-800/50',
            overlay: s.backgroundOverlayStrength || (hasBgImage ? 'medium' : 'none'),
        };
    }, [localEntity.styles, localEntity.imageBase64]);

    const previewClasses = useMemo(() => {
        return {
            border: `border-${styles.borderColor} ${ { none: 'border-0', sm: 'border', md: 'border-2', lg: 'border-4' }[styles.borderWidth] }`,
            shadow: { none: 'shadow-none', sm: 'shadow-sm', md: 'shadow-md', lg: 'shadow-lg', xl: 'shadow-xl' }[styles.shadow],
            overlay: { none: '', light: 'bg-black/20', medium: 'bg-black/50', heavy: 'bg-black/70' }[styles.overlay],
        };
    }, [styles]);

    if (!template || !resolvedProperties) {
        return <div className="p-6 text-red-400">Error: Cannot find template with ID {localEntity.templateId}</div>;
    }

    const { attributes: allAttributes, stuff: allStuff } = resolvedProperties;
    
    // Group attributes by their source template for rendering
    const attributesByTemplate = allAttributes.reduce((acc, { definition, sourceTemplate }) => {
        if (!acc[sourceTemplate.id]) {
            acc[sourceTemplate.id] = { templateName: sourceTemplate.name, attributes: [] };
        }
        acc[sourceTemplate.id].attributes.push(definition);
        return acc;
    }, {} as Record<string, { templateName: string, attributes: AttributeDefinition[] }>);

    const updateField = (field: keyof Entity, value: any) => {
        setLocalEntity(prev => ({...prev, [field]: value}));
    };

    const updateStyle = (key: keyof NonNullable<Entity['styles']>, value: any) => {
        setLocalEntity(prev => ({
            ...prev,
            styles: { ...(prev.styles || {}), [key]: value }
        }));
    };

    const handleAttributeValueChange = (attrId: string, value: string | number | null) => {
        setLocalEntity(prev => {
            const newState = {
                ...prev,
                attributeValues: { ...prev.attributeValues, [attrId]: value }
            };
            debugService.log('EntityEditor: Attribute value changed', { attrId, newValue: value, oldState: prev, newState });
            return newState;
        });
    };
    
    const handleGenerateContentClick = (attributeId: string) => {
        debugService.log('EntityEditor: AI generation clicked', { attributeId, currentEntityState: localEntity });
        onGenerate(localEntity, attributeId, (updatedEntity) => {
            debugService.log('EntityEditor: AI generation completed and updated entity state', { updatedEntity });
            setLocalEntity(updatedEntity);
        });
    }

    const handleGenerateImageClick = () => {
        if (localEntity.imagePrompt) {
            onGenerateImage(localEntity.imagePrompt, (base64) => {
                updateField('imageBase64', `data:image/jpeg;base64,${base64}`);
            });
        }
    };

    const handleFileUpload = (file: File | null) => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (typeof e.target?.result === 'string') {
                    updateField('imageBase64', e.target.result);
                }
            };
            reader.readAsDataURL(file);
        } else if (file) {
            alert('Please select a valid image file.');
        }
    }

    const handleSave = () => {
        debugService.log('EntityEditor: "Save Changes" clicked. Calling onSave.', { finalEntityState: localEntity });
        onSave(localEntity);
    }
    
    const handleCancel = () => {
        debugService.log('EntityEditor: "Cancel" clicked.');
        onCancel();
    }

    return (
        <div className="flex-1 flex flex-col bg-gray-800 min-h-0">
             <header className="p-4 border-b border-gray-700">
                <h2 className="text-xl font-bold text-cyan-300">{isNew ? 'Creating New Entity' : `Editing: ${initialEntity.name}`}</h2>
            </header>
            <main className="flex-grow p-6 space-y-6 overflow-y-auto">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
                    <input type="text" value={localEntity.name} onChange={e => updateField('name', e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-teal-500 focus:border-teal-500"/>
                </div>
                
                 {Object.values(attributesByTemplate).map(({ templateName, attributes }) => (
                     <fieldset key={templateName} className="space-y-4 pt-4 border-t border-gray-700">
                         <legend className="text-lg font-semibold text-gray-300 -mb-2 px-1">{templateName} Attributes</legend>
                         {attributes.map(attr => (
                            <div key={attr.id}>
                                <label className="block text-sm font-medium text-gray-400 mb-1">{attr.name}</label>
                                <AttributeInput 
                                    attribute={attr} 
                                    value={localEntity.attributeValues[attr.id] ?? null}
                                    onChange={(value) => handleAttributeValueChange(attr.id, value)}
                                    gameData={gameData}
                                />
                                {attr.type === 'textarea' && (
                                    <button onClick={() => handleGenerateContentClick(attr.id)} disabled={!!isGenerating} className="mt-2 w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition duration-300">
                                        {isGenerating === attr.id ? 'Generating...' : 'Generate with AI'}
                                    </button>
                                )}
                            </div>
                        ))}
                    </fieldset>
                 ))}
                
                {/* Stuff Attributes */}
                {allStuff.length > 0 && (
                     <fieldset className="space-y-4 pt-4 border-t border-gray-700">
                        <legend className="text-lg font-semibold text-teal-300 px-1">Stuff & Skills</legend>
                        {allStuff.map(({ included, sourceTemplate }) => {
                            const stuffSet = gameData.stuff.find(s => s.id === included.setId);
                            if (!stuffSet) return null;
                            const items = stuffSet.items.filter(i => included.itemIds.includes(i.id));

                            return (
                                <div key={stuffSet.id} className="p-3 bg-gray-900/50 rounded-md border border-gray-700">
                                    <h4 className="font-bold text-gray-300 mb-2">{stuffSet.name} <span className="text-xs text-cyan-400">(from {sourceTemplate.name})</span></h4>
                                     <div className="space-y-3 pl-2">
                                        {items.map(item => (
                                            <div key={item.id}>
                                                <h5 className="font-semibold text-gray-400 text-sm mb-2">{item.name}</h5>
                                                <div className="space-y-3 pl-2 border-l-2 border-gray-600">
                                                    {item.attributes.map(attr => {
                                                        const compositeId = `${item.id}_${attr.id}`;
                                                        return (
                                                            <div key={compositeId}>
                                                                <label className="block text-xs font-medium text-gray-400 mb-1">{attr.name}</label>
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
                                    </div>
                                </div>
                            );
                        })}
                     </fieldset>
                )}

                 <fieldset className="space-y-4 pt-4 border-t border-gray-700">
                    <legend className="text-lg font-semibold text-gray-300 -mb-2 px-1">Card Image</legend>
                     <div>
                        <label className="block text-sm font-medium text-gray-400">AI Background Prompt</label>
                        <textarea value={localEntity.imagePrompt || ''} onChange={e => updateField('imagePrompt', e.target.value)} rows={2} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500" placeholder={`e.g., A gritty cyberpunk portrait of ${localEntity.name}...`}/>
                        <div className="flex space-x-2 mt-2">
                            <button onClick={handleGenerateImageClick} disabled={isGeneratingImage || !localEntity.imagePrompt} className="flex-1 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition duration-300">
                                {isGeneratingImage ? 'Generating...' : 'Generate with AI'}
                            </button>
                            <button onClick={() => bgInputRef.current?.click()} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition duration-300">Upload Background</button>
                            <input type="file" accept="image/*" ref={bgInputRef} onChange={e => handleFileUpload(e.target.files?.[0] ?? null)} className="hidden"/>
                            {localEntity.imageBase64 && <button onClick={() => updateField('imageBase64', undefined)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition duration-300">Clear</button>}
                        </div>
                    </div>
                </fieldset>
                
                 <fieldset className="space-y-4 pt-4 border-t border-gray-700">
                    <legend className="text-lg font-semibold text-gray-300 -mb-2 px-1">Styling</legend>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <StyleSelect label="Border Width" value={styles.borderWidth} onChange={e => updateStyle('borderWidth', e.target.value)}><option value="none">None</option><option value="sm">Small</option><option value="md">Medium</option><option value="lg">Large</option></StyleSelect>
                        <div><label className="block text-xs font-medium text-gray-400 mb-1">Border Color</label><input type="text" value={styles.borderColor} onChange={e => updateStyle('borderColor', e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2" placeholder="e.g., cyan-500"/></div>
                        <StyleSelect label="Shadow" value={styles.shadow} onChange={e => updateStyle('shadow', e.target.value)}><option value="none">None</option><option value="sm">Small</option><option value="md">Medium</option><option value="lg">Large</option><option value="xl">X-Large</option></StyleSelect>
                        <div><label className="block text-xs font-medium text-gray-400 mb-1">Title Color Class</label><input type="text" value={styles.titleColor} onChange={e => updateStyle('titleColor', e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2" placeholder="e.g., text-cyan-300"/></div>
                        <div><label className="block text-xs font-medium text-gray-400 mb-1">Background Class</label><input type="text" value={styles.backgroundColor} onChange={e => updateStyle('backgroundColor', e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2" placeholder="e.g., bg-gray-800/50"/></div>
                        <StyleSelect label="Overlay Strength" value={styles.overlay} onChange={e => updateStyle('backgroundOverlayStrength', e.target.value)}><option value="none">None</option><option value="light">Light</option><option value="medium">Medium</option><option value="heavy">Heavy</option></StyleSelect>
                    </div>
                </fieldset>

                 <div>
                    <h4 className="text-lg font-semibold text-gray-300 mb-2">Live Preview</h4>
                    <div className={`relative ${styles.backgroundColor} ${previewClasses.border} ${previewClasses.shadow} h-64 rounded-lg backdrop-blur-sm flex flex-col overflow-hidden`}>
                        {localEntity.imageBase64 && (
                            <>
                                <img src={localEntity.imageBase64} alt={localEntity.name} className="absolute inset-0 w-full h-full object-cover"/>
                                <div className={`absolute inset-0 ${previewClasses.overlay}`} />
                            </>
                        )}
                        <div className="relative z-10 p-4 flex flex-col flex-grow">
                            <h3 className={`text-lg font-bold ${styles.titleColor} mb-2`}>{localEntity.name}</h3>
                            <p className="text-xs text-gray-400">Preview of attributes would be shown here.</p>
                        </div>
                    </div>
                </div>

            </main>
             <footer className="p-4 flex justify-end space-x-3 border-t border-gray-700 bg-gray-800/50">
                <button onClick={handleCancel} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 text-white font-semibold transition-colors">Cancel</button>
                <button onClick={handleSave} className="px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-700 text-white font-semibold transition-colors">Save Changes</button>
            </footer>
        </div>
    );
}
