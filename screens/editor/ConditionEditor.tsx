
import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '../../components/Modal';
import { GameData, Condition, ConditionOperator, AttributeDefinition } from '../../types';
import { StyleSelect } from '../../components/editor/StyleComponents';

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
        if (initialCondition) {
            setConditionType(initialCondition.type);
            if (initialCondition.type === 'attribute') setAttrCondition(initialCondition);
            if (initialCondition.type === 'entity_exists') setExistsCondition(initialCondition);
            if (initialCondition.type === 'has_stuff') setStuffCondition(initialCondition);
        } else {
            // Reset to defaults for a new condition
            setConditionType('attribute');
            setAttrCondition(BLANK_ATTRIBUTE_CONDITION);
            setExistsCondition({ templateId: '', exists: true });
            setStuffCondition({ targetEntityId: '', stuffItemId: '', hasIt: true });
        }
    }, [initialCondition, isOpen]);
    

    const selectedEntityForAttr = useMemo(() => {
        if (!attrCondition.targetEntityId) return null;
        return gameData.entities.find(e => e.id === attrCondition.targetEntityId);
    }, [attrCondition.targetEntityId, gameData.entities]);
    
    const availableAttributes = useMemo((): {id: string, name: string}[] => {
        const targetEntity = isFilter ? gameData.entities[0] : selectedEntityForAttr;
        if (!targetEntity) return [];

        const template = gameData.templates.find(t => t.id === targetEntity.templateId);
        if (!template) return [];

        const baseAttrs = template.attributes.map(a => ({ id: a.id, name: `${a.name} (Base)` }));

        const stuffAttrs = (template.includedStuff || []).flatMap(is => {
            const stuffSet = gameData.stuff.find(s => s.id === is.setId);
            if (!stuffSet) return [];
            return is.itemIds.flatMap(itemId => {
                const item = stuffSet.items.find(i => i.id === itemId);
                if (!item) return [];
                return item.attributes.map(attr => ({
                    id: `${item.id}_${attr.id}`,
                    name: `${attr.name} (${item.name})`
                }));
            });
        });

        return [...baseAttrs, ...stuffAttrs];
    }, [selectedEntityForAttr, gameData, isFilter]);

    const allStuffItems = useMemo(() => {
        return gameData.stuff.flatMap(set => set.items.map(item => ({...item, setName: set.name})));
    }, [gameData.stuff]);


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
            onSave(conditionToSave);
        }
    };

    const renderAttributeEditor = () => (
        <div className="space-y-3">
            {!isFilter && (
                 <StyleSelect label="Target Entity" value={attrCondition.targetEntityId} onChange={e => setAttrCondition(p => ({ ...p, targetEntityId: e.target.value, attributeId: '' }))}>
                    <option value="">-- Select Entity --</option>
                    {gameData.entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </StyleSelect>
            )}

             <StyleSelect label="Attribute" value={attrCondition.attributeId} onChange={e => setAttrCondition(p => ({ ...p, attributeId: e.target.value }))} disabled={!isFilter && !selectedEntityForAttr}>
                <option value="">-- Select Attribute --</option>
                {availableAttributes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </StyleSelect>

            <div className="grid grid-cols-2 gap-3">
                 <StyleSelect label="Operator" value={attrCondition.operator} onChange={e => setAttrCondition(p => ({...p, operator: e.target.value as ConditionOperator}))}>
                    <option value="==">Equals (==)</option>
                    <option value="!=">Not Equals (!=)</option>
                    <option value=">">Greater Than (&gt;)</option>
                    <option value="<">Less Than (&lt;)</option>
                    <option value=">=">Greater Than or Equals (&gt;=)</option>
                    <option value="<=">Less Than or Equals (&lt;=)</option>
                 </StyleSelect>
                 <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Value</label>
                    <input type="text" value={attrCondition.value === null ? '' : String(attrCondition.value)} onChange={e => setAttrCondition(p => ({ ...p, value: e.target.value === '' ? null : e.target.value }))} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm" placeholder="Leave blank for 'not set'"/>
                </div>
            </div>
        </div>
    );
    
    const renderEntityExistsEditor = () => (
        <div className="space-y-3">
            <StyleSelect label="Template" value={existsCondition.templateId} onChange={e => setExistsCondition(p => ({ ...p, templateId: e.target.value }))}>
                <option value="">-- Select Template --</option>
                {gameData.templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </StyleSelect>
            <StyleSelect label="Condition" value={String(existsCondition.exists)} onChange={e => setExistsCondition(p => ({ ...p, exists: e.target.value === 'true' }))}>
                <option value="true">Exists</option>
                <option value="false">Does Not Exist</option>
            </StyleSelect>
        </div>
    );

    const renderHasStuffEditor = () => (
         <div className="space-y-3">
             <StyleSelect label="Target Entity" value={stuffCondition.targetEntityId} onChange={e => setStuffCondition(p => ({...p, targetEntityId: e.target.value }))}>
                <option value="">-- Select Entity --</option>
                {gameData.entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </StyleSelect>
            <StyleSelect label="Stuff Item" value={stuffCondition.stuffItemId} onChange={e => setStuffCondition(p => ({...p, stuffItemId: e.target.value }))}>
                <option value="">-- Select Item --</option>
                {allStuffItems.map(item => <option key={item.id} value={item.id}>{item.name} ({item.setName})</option>)}
            </StyleSelect>
             <StyleSelect label="Condition" value={String(stuffCondition.hasIt)} onChange={e => setStuffCondition(p => ({ ...p, hasIt: e.target.value === 'true' }))}>
                <option value="true">Has Item</option>
                <option value="false">Does Not Have Item</option>
            </StyleSelect>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialCondition ? 'Edit Condition' : 'Add Condition'}
        >
            <div className="space-y-4">
                 <StyleSelect label="Condition Type" value={conditionType} onChange={e => setConditionType(e.target.value as Condition['type'])}>
                    <option value="attribute">Check an Attribute</option>
                    {!isFilter && <option value="entity_exists">Check if Entity Exists</option>}
                    {!isFilter && <option value="has_stuff">Check if Entity Has "Stuff"</option>}
                </StyleSelect>

                <div className="p-3 bg-gray-900/50 rounded-md border border-gray-700">
                    {conditionType === 'attribute' && renderAttributeEditor()}
                    {conditionType === 'entity_exists' && renderEntityExistsEditor()}
                    {conditionType === 'has_stuff' && renderHasStuffEditor()}
                </div>
            </div>
             <div className="mt-6 flex justify-end space-x-3">
                <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 text-white font-semibold transition-colors">Cancel</button>
                <button onClick={handleSave} className="px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-700 text-white font-semibold transition-colors">Save Condition</button>
            </div>
        </Modal>
    );
};
