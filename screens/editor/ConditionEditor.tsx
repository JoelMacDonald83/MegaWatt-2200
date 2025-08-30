

import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '../../components/Modal';
import { GameData, Condition, ConditionOperator, AttributeDefinition, Template } from '../../types';
import { StyleSelect } from '../../components/editor/StyleComponents';
import { debugService } from '../../services/debugService';
import { HelpTooltip } from '../../components/HelpTooltip';

interface ConditionEditorProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (condition: Condition) => void;
    gameData: GameData;
    initialCondition: Condition | null;
    isFilter?: boolean; // If true, hides entity selection for attribute conditions
}

const BLANK_ATTRIBUTE_CONDITION: Omit<Extract<Condition, { type: 'attribute' }>, 'type'> = {
    targetEntityId: '',
    attributeId: '',
    operator: '==',
    value: '',
};

export const ConditionEditor: React.FC<ConditionEditorProps> = ({ isOpen, onClose, onSave, gameData, initialCondition, isFilter = false }) => {
    
    const [conditionType, setConditionType] = useState<Condition['type']>(initialCondition?.type || 'attribute');
    
    const [attrCondition, setAttrCondition] = useState(() => 
        (initialCondition?.type === 'attribute' ? initialCondition : BLANK_ATTRIBUTE_CONDITION)
    );
    
    const [existsCondition, setExistsCondition] = useState(() => 
        (initialCondition?.type === 'entity_exists' ? initialCondition : { templateId: '', exists: true })
    );

    const [stuffCondition, setStuffCondition] = useState(() => 
        (initialCondition?.type === 'has_stuff' ? initialCondition : { targetEntityId: '', stuffItemId: '', hasIt: true })
    );

    // This effect synchronizes the local state if the initial condition prop changes while the modal is open
    useEffect(() => {
        if (!isOpen) return;
        debugService.log('ConditionEditor: Modal opened or props changed.', { initialCondition, isFilter });
        if (initialCondition) {
            setConditionType(initialCondition.type);
            if (initialCondition.type === 'attribute') setAttrCondition(initialCondition);
            if (initialCondition.type === 'entity_exists') setExistsCondition(initialCondition);
            if (initialCondition.type === 'has_stuff') setStuffCondition(initialCondition);
        } else {
            // Reset to defaults for a new condition
            debugService.log('ConditionEditor: Resetting to blank condition.');
            setConditionType('attribute');
            setAttrCondition(BLANK_ATTRIBUTE_CONDITION);
            setExistsCondition({ templateId: '', exists: true });
            setStuffCondition({ targetEntityId: '', stuffItemId: '', hasIt: true });
        }
    }, [initialCondition, isOpen, isFilter]);
    

    const selectedEntityForAttr = useMemo(() => {
        if (!attrCondition.targetEntityId) return null;
        return gameData.entities.find(e => e.id === attrCondition.targetEntityId);
    }, [attrCondition.targetEntityId, gameData.entities]);
    
    // Fix: Replaced `includedStuff` and `gameData.stuff` with logic to resolve inherited attributes and components.
    const availableAttributes = useMemo((): {id: string, name: string}[] => {
        // For dynamic filters, we can't know the entity, so we need a representative template.
        // This part of the UI logic would need to be passed the sourceTemplateId for full accuracy.
        // As a fallback, we'll assume any entity might be the target. For now, this is a limitation.
        const targetEntity = isFilter ? gameData.entities[0] : selectedEntityForAttr;
        if (!targetEntity) return [];

        let template = gameData.templates.find(t => t.id === targetEntity.templateId);
        if (!template) return [];
        
        const hierarchy: Template[] = [];
        let current: Template | undefined = template;
        while(current) {
            hierarchy.push(current);
            current = gameData.templates.find(t => t.id === current?.parentId);
        }
        
        const allBaseAttributes: { id: string; name: string; }[] = [];
        const allComponentIds = new Set<string>();
        const seenAttributeIds = new Set<string>();
        
        // Get attributes and components from the full hierarchy
        hierarchy.forEach(temp => {
            temp.attributes.forEach(attr => {
                if (!seenAttributeIds.has(attr.id)) {
                    allBaseAttributes.push({ id: attr.id, name: `${attr.name} (${temp.name})` });
                    seenAttributeIds.add(attr.id);
                }
            });
            (temp.includedComponentIds || []).forEach(id => allComponentIds.add(id));
        });

        const componentAttrs = Array.from(allComponentIds).flatMap(componentId => {
            const componentTemplate = gameData.templates.find(t => t.id === componentId);
            if (!componentTemplate) return [];
            return componentTemplate.attributes.map(attr => ({
                id: `${componentTemplate.id}_${attr.id}`,
                name: `${attr.name} (${componentTemplate.name})`
            }));
        });

        return [...allBaseAttributes, ...componentAttrs];
    }, [selectedEntityForAttr, gameData.entities, gameData.templates, isFilter]);

    // Fix: Replaced `gameData.stuff` with a filter on `gameData.templates` to get components.
    const allStuffItems = useMemo(() => {
        return gameData.templates.filter(t => t.isComponent).map(item => ({...item, setName: 'Component'}));
    }, [gameData.templates]);


    const handleSave = () => {
        let conditionToSave: Condition | null = null;
        if (conditionType === 'attribute') {
            conditionToSave = { type: 'attribute', ...attrCondition };
        } else if (conditionType === 'entity_exists') {
            conditionToSave = { type: 'entity_exists', ...existsCondition };
        } else if (conditionType === 'has_stuff') {
            conditionToSave = { type: 'has_stuff', ...stuffCondition };
        }

        if (conditionToSave) {
            debugService.log('ConditionEditor: Saving condition', { condition: conditionToSave });
            onSave(conditionToSave);
        } else {
            debugService.log('ConditionEditor: Save aborted, no valid condition to save.');
        }
    };
    
    const handleClose = () => {
        debugService.log('ConditionEditor: Modal closed without saving.');
        onClose();
    };

    const renderAttributeEditor = () => (
        <div className="space-y-3">
            {!isFilter && (
                 <StyleSelect 
                    label="Target Entity" 
                    value={attrCondition.targetEntityId} 
                    onChange={e => setAttrCondition(p => ({ ...p, targetEntityId: e.target.value, attributeId: '' }))}
                    help="The specific entity whose attribute you want to check."
                 >
                    <option value="">-- Select Entity --</option>
                    {gameData.entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </StyleSelect>
            )}

             <StyleSelect 
                label="Attribute" 
                value={attrCondition.attributeId} 
                onChange={e => setAttrCondition(p => ({ ...p, attributeId: e.target.value }))} 
                disabled={!isFilter && !selectedEntityForAttr}
                help="The attribute on the target entity that you want to check."
            >
                <option value="">-- Select Attribute --</option>
                {availableAttributes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </StyleSelect>

            <div className="grid grid-cols-2 gap-3">
                 <StyleSelect 
                    label="Operator" 
                    value={attrCondition.operator} 
                    onChange={e => setAttrCondition(p => ({...p, operator: e.target.value as ConditionOperator}))}
                    help="The type of comparison to perform."
                 >
                    <option value="==">Equals (==)</option>
                    <option value="!=">Not Equals (!=)</option>
                    <option value=">">Greater Than (&gt;)</option>
                    <option value="<">Less Than (&lt;)</option>
                    <option value=">=">Greater Than or Equals (&gt;=)</option>
                    <option value="<=">Less Than or Equals (&lt;=)</option>
                 </StyleSelect>
                 <div>
                    <div className="flex items-center gap-2 mb-1">
                        <label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)]">Value</label>
                        <HelpTooltip title="Comparison Value" content="The value to compare against the attribute. Leave this blank to check if an attribute 'is set' or 'is not set' (using 'Equals' or 'Not Equals')." />
                    </div>
                    <input type="text" value={attrCondition.value === null ? '' : String(attrCondition.value)} onChange={e => setAttrCondition(p => ({ ...p, value: e.target.value === '' ? null : e.target.value }))} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2 text-sm" placeholder="Leave blank for 'not set'"/>
                </div>
            </div>
        </div>
    );
    
    const renderEntityExistsEditor = () => (
        <div className="space-y-3">
            <StyleSelect 
                label="Template" 
                value={existsCondition.templateId} 
                onChange={e => setExistsCondition(p => ({ ...p, templateId: e.target.value }))}
                help="Check if any entity created from this template exists in the game world."
            >
                <option value="">-- Select Template --</option>
                {gameData.templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </StyleSelect>
            <StyleSelect 
                label="Condition" 
                value={String(existsCondition.exists)} 
                onChange={e => setExistsCondition(p => ({ ...p, exists: e.target.value === 'true' }))}
                help="Define whether this condition should pass if the entity exists or if it does not exist."
            >
                <option value="true">Exists</option>
                <option value="false">Does Not Exist</option>
            </StyleSelect>
        </div>
    );

    const renderHasStuffEditor = () => (
         <div className="space-y-3">
             {!isFilter && (
                <StyleSelect 
                    label="Target Entity" 
                    value={stuffCondition.targetEntityId} 
                    onChange={e => setStuffCondition(p => ({...p, targetEntityId: e.target.value }))}
                    help="The specific entity to check for a component."
                >
                    <option value="">-- Select Entity --</option>
                    {gameData.entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </StyleSelect>
             )}
            <StyleSelect 
                label="Component Item" 
                value={stuffCondition.stuffItemId} 
                onChange={e => setStuffCondition(p => ({...p, stuffItemId: e.target.value }))}
                help="The component to check for. The check passes if the entity's template (or any of its parents) includes this component."
            >
                <option value="">-- Select Item --</option>
                {allStuffItems.map(item => <option key={item.id} value={item.id}>{item.name} ({item.setName})</option>)}
            </StyleSelect>
             <StyleSelect 
                label="Condition" 
                value={String(stuffCondition.hasIt)} 
                onChange={e => setStuffCondition(p => ({ ...p, hasIt: e.target.value === 'true' }))}
                help="Define whether this condition should pass if the entity has the component or if it does not have it."
            >
                <option value="true">Has Item</option>
                <option value="false">Does Not Have Item</option>
            </StyleSelect>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={initialCondition ? 'Edit Condition' : 'Add Condition'}
        >
            <div className="space-y-4">
                 <StyleSelect 
                    label="Condition Type" 
                    value={conditionType} 
                    onChange={e => setConditionType(e.target.value as Condition['type'])}
                    help="Select the fundamental type of check you want to perform on the game state."
                >
                    <option value="attribute">Check an Attribute</option>
                    <option value="has_stuff">Check if Entity Has Component</option>
                    {!isFilter && <option value="entity_exists">Check if Entity Exists</option>}
                </StyleSelect>

                <div className="p-3 bg-[var(--bg-input)]/50 rounded-md border border-[var(--border-primary)]">
                    {conditionType === 'attribute' && renderAttributeEditor()}
                    {conditionType === 'entity_exists' && renderEntityExistsEditor()}
                    {conditionType === 'has_stuff' && renderHasStuffEditor()}
                </div>
            </div>
             <div className="mt-6 flex justify-end space-x-3">
                <button onClick={handleClose} className="px-4 py-2 rounded-md bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-semibold transition-colors">Cancel</button>
                <button onClick={handleSave} className="px-4 py-2 rounded-md bg-[var(--bg-active)] hover:opacity-90 text-[var(--text-on-accent)] font-semibold transition-colors">Save Condition</button>
            </div>
        </Modal>
    );
};