

import React, { useMemo } from 'react';
import { Modal } from '../Modal';
import { Entity, GameData, Template, AttributeDefinition } from '../../types';
import { debugService } from '../../services/debugService';

interface ResolvedProperties {
    baseAttributes: { definition: AttributeDefinition; sourceTemplate: Template }[];
    components: { component: Template; attributes: AttributeDefinition[] }[];
}

// This hook is adapted from EntityEditor to resolve the full attribute list for an entity.
const useResolvedTemplateProperties = (templateId: string, gameData: GameData): ResolvedProperties | null => {
    return useMemo(() => {
        const { templates } = gameData;
        let currentTemplate = templates.find(t => t.id === templateId);
        if (!currentTemplate) return null;

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
        
        return { baseAttributes, components };
    }, [templateId, gameData]);
};


interface EntityDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    entity: Entity;
    gameData: GameData;
    onAttributeChange: (entityId: string, attributeId: string, value: string | number | null) => void;
}

export const EntityDetailModal: React.FC<EntityDetailModalProps> = ({ isOpen, onClose, entity, gameData, onAttributeChange }) => {
    
    const resolvedProperties = useResolvedTemplateProperties(entity.templateId, gameData);

    const editableAttributes = useMemo(() => {
        if (!resolvedProperties) return [];

        const allAttributes = [
            ...resolvedProperties.baseAttributes.map(a => ({
                ...a.definition, 
                compositeId: a.definition.id, 
                sourceName: a.sourceTemplate.name 
            })),
            ...resolvedProperties.components.flatMap(c => 
                c.attributes.map(attr => ({
                    ...attr, 
                    compositeId: `${c.component.id}_${attr.id}`, 
                    sourceName: c.component.name
                }))
            )
        ];

        return allAttributes.filter(attr => 
            attr.isPlayerEditable && 
            attr.type === 'string' && 
            Array.isArray(attr.playerEditOptions) && 
            attr.playerEditOptions.length > 0
        );
    }, [resolvedProperties]);

    if (!resolvedProperties) {
        debugService.log('EntityDetailModal: Could not resolve properties for entity', { entity });
        return null;
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={entity.name}>
            <div className="flex flex-col sm:flex-row gap-6">
                <div className="w-full sm:w-1/3 flex-shrink-0">
                    <div className="aspect-square bg-[var(--bg-input)] rounded-lg overflow-hidden">
                        {/* FIX: The 'imageBase64' property does not exist on type 'Entity'. Changed to 'src'. */}
                        {entity.src ? (
                            // FIX: The 'imageBase64' property does not exist on type 'Entity'. Changed to 'src'.
                            <img src={entity.src} alt={entity.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-[var(--text-tertiary)]">No Image</div>
                        )}
                    </div>
                </div>
                <div className="flex-grow">
                    {editableAttributes.length > 0 ? (
                        <div className="space-y-4">
                            <h3 className="text-[length:var(--font-size-lg)] font-semibold text-[var(--text-primary)]">Customizable Options</h3>
                            {editableAttributes.map(attr => (
                                <div key={attr.compositeId}>
                                    <label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)] mb-1">
                                        {attr.name}
                                        <span className="text-[var(--text-tertiary)] text-[length:var(--font-size-xs)] ml-2">({attr.sourceName})</span>
                                    </label>
                                    <select
                                        value={(entity.attributeValues[attr.compositeId] as string) || ''}
                                        onChange={e => onAttributeChange(entity.id, attr.compositeId, e.target.value)}
                                        className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2"
                                    >
                                        {(attr.playerEditOptions || []).map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-center">
                            <p className="text-[var(--text-secondary)]">This entity has no customizable options.</p>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};
