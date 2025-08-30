


import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Entity, GameData, AttributeDefinition, Template, ImageCredit } from '../../types';
import { debugService } from '../../services/debugService';
import { StyleSelect } from '../../components/editor/StyleComponents';
import { HelpTooltip } from '../../components/HelpTooltip';
import { CollapsibleSection } from '../../components/CollapsibleSection';

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

const ImageCreditEditor: React.FC<{
  credit?: ImageCredit;
  onUpdate: (credit: ImageCredit) => void;
}> = ({ credit, onUpdate }) => {
  const handleChange = (field: keyof ImageCredit, value: string) => {
    onUpdate({ ...credit, [field]: value });
  };
  return (
    <div className="mt-2 p-2 border-t border-[var(--border-secondary)] space-y-2">
       <h5 className="text-xs font-semibold text-[var(--text-secondary)]">Image Credits (Optional)</h5>
        <input 
            type="text" 
            placeholder="Artist Name" 
            value={credit?.artistName || ''}
            onChange={(e) => handleChange('artistName', e.target.value)}
            className="w-full bg-[var(--bg-panel)] border border-[var(--border-secondary)] rounded-md p-1.5 text-sm"
        />
        <input 
            type="url" 
            placeholder="Source URL (e.g., from Unsplash)" 
            value={credit?.sourceUrl || ''}
            onChange={(e) => handleChange('sourceUrl', e.target.value)}
            className="w-full bg-[var(--bg-panel)] border border-[var(--border-secondary)] rounded-md p-1.5 text-sm"
        />
        <input 
            type="url" 
            placeholder="Artist Socials/Portfolio URL" 
            value={credit?.socialsUrl || ''}
            onChange={(e) => handleChange('socialsUrl', e.target.value)}
            className="w-full bg-[var(--bg-panel)] border border-[var(--border-secondary)] rounded-md p-1.5 text-sm"
        />
    </div>
  )
};

const AttributeInput: React.FC<{
    attribute: AttributeDefinition;
    value: string | number | null;
    onChange: (value: string | number | null) => void;
    gameData: GameData;
}> = ({ attribute, value, onChange, gameData }) => {
    
    if (attribute.isPlayerEditable && attribute.playerEditOptions && attribute.type === 'string') {
        return (
            <select
                value={(value as string) || ''}
                onChange={e => onChange(e.target.value)}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2"
            >
                <option value="">-- Select Default Value --</option>
                {(attribute.playerEditOptions || []).map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
        );
    }

    switch(attribute.type) {
        case 'textarea':
            return (
                <textarea 
                    value={(value as string) || ''} 
                    onChange={e => onChange(e.target.value)} 
                    rows={6} 
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2"
                />
            );
        case 'number':
            return (
                <input 
                    type="number" 
                    value={(value as number) || ''} 
                    onChange={e => onChange(e.target.valueAsNumber || null)} 
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2"
                />
            );
        case 'entity_reference':
            if (!attribute.referencedTemplateId) {
                return (
                    <div className="w-full bg-[var(--bg-panel)] border border-[var(--border-secondary)] rounded-md p-2 text-[var(--text-tertiary)] text-[length:var(--font-size-sm)] italic">
                        The referenced template is not set for this attribute.
                    </div>
                );
            }
            const referencedEntities = gameData.entities.filter(e => e.templateId === attribute.referencedTemplateId);
            return (
                <select 
                    value={(value as string) || ''} 
                    onChange={e => onChange(e.target.value || null)} 
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2"
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
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2"
                />
            );
    }
};

interface ResolvedProperties {
    baseAttributes: { definition: AttributeDefinition; sourceTemplate: Template }[];
    components: { component: Template; attributes: AttributeDefinition[] }[];
}


const useResolvedTemplateProperties = (templateId: string, gameData: GameData): ResolvedProperties | null => {
    return useMemo(() => {
        debugService.log('EntityEditor: Recalculating resolved properties for template', { templateId });
        const { templates } = gameData;
        
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

        const baseAttributes: ResolvedProperties['baseAttributes'] = [];
        const componentIds = new Set<string>();
        const seenAttributeIds = new Set<string>();

        for (const template of hierarchy) {
            template.attributes.forEach(attr => {
                if (!seenAttributeIds.has(attr.id)) {
                    baseAttributes.push({ definition: attr, sourceTemplate: template });
                    seenAttributeIds.add(attr.id);
                }
            });
            (template.includedComponentIds || []).forEach(id => componentIds.add(id));
        }

        const components: ResolvedProperties['components'] = [];
        componentIds.forEach(id => {
            const componentTemplate = templates.find(t => t.id === id);
            if (componentTemplate) {
                components.push({ component: componentTemplate, attributes: componentTemplate.attributes });
            }
        });

        const resolved = { baseAttributes, components };
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
            titleColor: s.titleColor || 'text-[var(--text-accent)]',
            backgroundColor: s.backgroundColor || 'bg-[var(--bg-panel)]/50',
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
        return <div className="p-6 text-[var(--text-danger)]">Error: Cannot find template with ID {localEntity.templateId}</div>;
    }

    const { baseAttributes, components } = resolvedProperties;

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
        <div className="flex-1 flex flex-col bg-[var(--bg-panel)] min-h-0">
             <header className="p-4 border-b border-[var(--border-primary)]">
                <h2 className="text-[length:var(--font-size-xl)] font-bold text-[var(--text-accent)]">{isNew ? 'Creating New Entity' : `Editing: ${initialEntity.name}`}</h2>
            </header>
            <main className="flex-grow p-6 space-y-8 overflow-y-auto">
                <CollapsibleSection title="Core Details">
                    <label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)] mb-1">Name</label>
                    <input type="text" value={localEntity.name} onChange={e => updateField('name', e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2"/>
                </CollapsibleSection>
                
                 <CollapsibleSection title="Base Attributes">
                    <HelpTooltip title="Base Attributes" content="These attributes come directly from the entity's own blueprint, or are inherited from its parent blueprint. Their values are unique to this specific entity." />
                    {baseAttributes.map(({ definition: attr, sourceTemplate }) => (
                        <div key={attr.id}>
                            <label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)] mb-1">{attr.name} <span className="text-[length:var(--font-size-xs)] text-[var(--text-accent)]">(from {sourceTemplate.name})</span></label>
                            <AttributeInput 
                                attribute={attr} 
                                value={localEntity.attributeValues[attr.id] ?? null}
                                onChange={(value) => handleAttributeValueChange(attr.id, value)}
                                gameData={gameData}
                            />
                            {attr.type === 'textarea' && (
                                <button onClick={() => handleGenerateContentClick(attr.id)} disabled={!!isGenerating} className="mt-2 w-full bg-[var(--text-accent-bright)] hover:opacity-90 disabled:bg-[var(--bg-panel-light)] text-[var(--text-on-accent)] font-bold py-2 px-4 rounded-md">
                                    {isGenerating === attr.id ? 'Generating...' : 'Generate with AI'}
                                </button>
                            )}
                        </div>
                    ))}
                </CollapsibleSection>
                
                {/* Component Attributes */}
                {components.map(({ component, attributes }) => (
                     <CollapsibleSection key={component.id} title={`Component: ${component.name}`}>
                        <HelpTooltip title={`Component: ${component.name}`} content={`These attributes are added to this entity because its blueprint includes the '${component.name}' component. This allows for mixing and matching capabilities across different types of entities.`} />
                        {attributes.map(attr => {
                            const compositeId = `${component.id}_${attr.id}`;
                            return (
                                <div key={compositeId}>
                                    <label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)] mb-1">{attr.name}</label>
                                    <AttributeInput 
                                        attribute={attr} 
                                        value={localEntity.attributeValues[compositeId] ?? null}
                                        onChange={(value) => handleAttributeValueChange(compositeId, value)}
                                        gameData={gameData}
                                    />
                                </div>
                            )
                        })}
                     </CollapsibleSection>
                ))}


                 <CollapsibleSection title="Card Image">
                    <HelpTooltip title="Card Image" content="This image is used for the background of the entity's card in the game view.\n\n- AI Background Prompt: Write a descriptive prompt for the AI to generate an image.\n- Upload Background: Upload your own image from your device.\n- Clear: Remove the current image." />
                     <div>
                        <label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)] mb-1">AI Background Prompt</label>
                        <textarea value={localEntity.imagePrompt || ''} onChange={e => updateField('imagePrompt', e.target.value)} rows={2} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2" placeholder={`e.g., A gritty cyberpunk portrait of ${localEntity.name}...`}/>
                        <div className="flex space-x-2 mt-2">
                            <button onClick={handleGenerateImageClick} disabled={isGeneratingImage || !localEntity.imagePrompt} className="flex-1 bg-[var(--text-accent-bright)] hover:opacity-90 disabled:bg-[var(--bg-panel-light)] text-[var(--text-on-accent)] font-bold py-2 px-4 rounded-md">
                                {isGeneratingImage ? 'Generating...' : 'Generate with AI'}
                            </button>
                            <button onClick={() => bgInputRef.current?.click()} className="flex-1 bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-bold py-2 px-4 rounded-md">Upload Background</button>
                            <input type="file" accept="image/*" ref={bgInputRef} onChange={e => handleFileUpload(e.target.files?.[0] ?? null)} className="hidden"/>
                            {localEntity.imageBase64 && <button onClick={() => updateField('imageBase64', undefined)} className="bg-red-900/50 hover:bg-red-800/50 text-red-300 font-bold py-2 px-4 rounded-md">Clear</button>}
                        </div>
                        <ImageCreditEditor
                          credit={localEntity.imageCredit}
                          onUpdate={(credit) => updateField('imageCredit', credit)}
                        />
                    </div>
                </CollapsibleSection>
                
                 <CollapsibleSection title="Card Styling">
                    <HelpTooltip title="Card Styling" content="These options control the visual appearance of this entity's card in the game's main colony view. You can customize borders, shadows, colors, and background overlays to make important entities stand out." />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <StyleSelect label="Border Width" help="Controls the thickness of the card's border." value={styles.borderWidth} onChange={e => updateStyle('borderWidth', e.target.value)}><option value="none">None</option><option value="sm">Small</option><option value="md">Medium</option><option value="lg">Large</option></StyleSelect>
                        <div>
                            <label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)] mb-1">Border Color</label>
                            <input type="text" value={styles.borderColor} onChange={e => updateStyle('borderColor', e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2" placeholder="e.g., cyan-500"/>
                        </div>
                        <StyleSelect label="Shadow" help="Controls the size and intensity of the drop shadow behind the card." value={styles.shadow} onChange={e => updateStyle('shadow', e.target.value)}><option value="none">None</option><option value="sm">Small</option><option value="md">Medium</option><option value="lg">Large</option><option value="xl">X-Large</option></StyleSelect>
                        <div>
                            <label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)] mb-1">Title Color Class</label>
                            <input type="text" value={styles.titleColor} onChange={e => updateStyle('titleColor', e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2" placeholder="e.g., text-cyan-300"/>
                        </div>
                        <div>
                            <label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)] mb-1">Background Class</label>
                            <input type="text" value={styles.backgroundColor} onChange={e => updateStyle('backgroundColor', e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2" placeholder="e.g., bg-gray-800/50"/>
                        </div>
                        <StyleSelect label="Overlay Strength" help="Adds a semi-transparent black overlay on top of the background image to improve text readability." value={styles.overlay} onChange={e => updateStyle('backgroundOverlayStrength', e.target.value)}><option value="none">None</option><option value="light">Light</option><option value="medium">Medium</option><option value="heavy">Heavy</option></StyleSelect>
                    </div>
                </CollapsibleSection>

                 <div>
                    <h4 className="text-[length:var(--font-size-lg)] font-semibold text-[var(--text-primary)] mb-2">Live Preview</h4>
                    <div className={`relative ${styles.backgroundColor} ${previewClasses.border} ${previewClasses.shadow} h-64 rounded-lg backdrop-blur-sm flex flex-col overflow-hidden`}>
                        {localEntity.imageBase64 && (
                            <>
                                <img src={localEntity.imageBase64} alt={localEntity.name} className="absolute inset-0 w-full h-full object-cover"/>
                                <div className={`absolute inset-0 ${previewClasses.overlay}`} />
                            </>
                        )}
                        <div className="relative z-10 p-4 flex flex-col flex-grow">
                            <h3 className={`text-lg font-bold ${styles.titleColor} mb-2`}>{localEntity.name}</h3>
                            <p className="text-xs text-[var(--text-secondary)]">Preview of attributes would be shown here.</p>
                        </div>
                    </div>
                </div>

            </main>
             <footer className="p-4 flex justify-end space-x-3 border-t border-[var(--border-primary)] bg-[var(--bg-panel)]/50">
                <button onClick={handleCancel} className="px-4 py-2 rounded-md bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-semibold transition-colors">Cancel</button>
                <button onClick={handleSave} className="px-4 py-2 rounded-md bg-[var(--bg-active)] hover:opacity-90 text-[var(--text-on-accent)] font-semibold transition-colors">Save Changes</button>
            </footer>
        </div>
    );
}
