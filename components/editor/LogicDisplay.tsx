


import React from 'react';
import type { Condition, GameData, ChoiceOutcome } from '../../types';
import { UserIcon } from '../icons/UserIcon';
import { TagIcon } from '../icons/TagIcon';
import { CubeTransparentIcon } from '../icons/CubeTransparentIcon';
import { PuzzlePieceIcon } from '../icons/PuzzlePieceIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { PencilIcon } from '../icons/PencilIcon';

// Helper to find attribute name from any template or component
const findAttributeDefinition = (attributeId: string, gameData: GameData): { name: string } | null => {
    for (const template of gameData.templates) {
        // Direct attribute on a template
        const attr = template.attributes.find(a => a.id === attributeId);
        if (attr) return attr;

        // Composite attribute ID from a component (e.g., 'componentId_attributeId')
        if (template.isComponent && attributeId.startsWith(template.id + '_')) {
            const attrIdPart = attributeId.substring(template.id.length + 1);
            const compAttr = template.attributes.find(a => a.id === attrIdPart);
            if (compAttr) return compAttr;
        }
    }
    return null;
};

const LogicChip: React.FC<{ children: React.ReactNode, className?: string, icon?: React.ReactNode }> = ({ children, className = '', icon }) => (
    <div className={`flex items-center gap-1.5 bg-[var(--bg-main)] px-2 py-1 rounded-md text-[var(--text-secondary)] ${className}`}>
        {icon && <div className="w-3.5 h-3.5">{icon}</div>}
        <span className="truncate">{children}</span>
    </div>
);

const OperatorChip: React.FC<{op: string}> = ({ op }) => (
     <div className="font-mono font-bold text-[var(--text-accent)] text-center w-6">{op}</div>
);

export const ConditionDisplay: React.FC<{condition: Condition, gameData: GameData, isFilter?: boolean}> = ({ condition, gameData, isFilter = false }) => {
    
    const renderContent = () => {
        switch (condition.type) {
            case 'attribute': {
                const entityName = isFilter 
                    ? 'This entity' 
                    : gameData.entities.find(e => e.id === condition.targetEntityId)?.name || 'Unknown Entity';
                
                const attrName = findAttributeDefinition(condition.attributeId, gameData)?.name || 'Unknown Attribute';
                
                const valueStr = condition.value === null 
                    ? (condition.operator === '==' ? 'is unset' : 'is set')
                    : `'${condition.value}'`;

                const operator = condition.value === null ? '' : condition.operator;
                
                return (
                    <>
                        <LogicChip icon={<UserIcon />}>{entityName}</LogicChip>
                        <LogicChip icon={<TagIcon />} className="text-[var(--text-primary)] font-medium">{attrName}</LogicChip>
                        {operator && <OperatorChip op={operator} />}
                        <LogicChip className="bg-[var(--bg-panel-light)]">{valueStr}</LogicChip>
                    </>
                );
            }
            case 'entity_exists': {
                const templateName = gameData.templates.find(t => t.id === condition.templateId)?.name || 'Unknown';
                return (
                    <>
                        <LogicChip icon={<CubeTransparentIcon />}>{templateName}</LogicChip>
                        <LogicChip className="text-[var(--text-primary)] font-medium">{condition.exists ? 'Exists' : 'Does NOT Exist'}</LogicChip>
                    </>
                );
            }
            case 'has_stuff': {
                 const targetName = isFilter 
                    ? 'This entity' 
                    : gameData.entities.find(e => e.id === condition.targetEntityId)?.name || 'Unknown';
                 const itemName = gameData.templates.find(i => i.id === condition.stuffItemId)?.name || 'Unknown Item';
                 return (
                     <>
                        <LogicChip icon={<UserIcon />}>{targetName}</LogicChip>
                        <LogicChip className="text-[var(--text-primary)] font-medium">{condition.hasIt ? 'Has' : 'Does NOT Have'}</LogicChip>
                        <LogicChip icon={<PuzzlePieceIcon />}>{itemName}</LogicChip>
                     </>
                 );
            }
            default: return <LogicChip>Invalid condition</LogicChip>;
        }
    };
    
    return <div className="flex items-center gap-1.5 flex-wrap text-[length:var(--font-size-xs)]">{renderContent()}</div>;
};


export const OutcomeDisplay: React.FC<{outcome: ChoiceOutcome, gameData: GameData, isDynamicContext?: boolean}> = ({ outcome, gameData, isDynamicContext }) => {
     const renderContent = () => {
        if (outcome.type === 'create_entity') {
            const template = gameData.templates.find(t => t.id === outcome.templateId);
            return (
                <>
                    <LogicChip icon={<PlusIcon className="text-[var(--text-success)]"/>} className="text-[var(--text-success)] font-bold">CREATE</LogicChip>
                    <LogicChip className="text-[var(--text-primary)] font-medium">{outcome.name}</LogicChip>
                    <LogicChip>(from <span className="font-semibold">{template?.name || 'Unknown'}</span>)</LogicChip>
                </>
            );
        }
        if (outcome.type === 'update_entity') {
            const entityName = outcome.targetEntityId === '<chosen_entity>'
                ? '<Chosen Entity>'
                : gameData.entities.find(e => e.id === outcome.targetEntityId)?.name || 'Unknown';

            const attrName = findAttributeDefinition(outcome.attributeId, gameData)?.name || 'Unknown Attr';
            
            const valueStr = outcome.value === '<chosen_entity_id>'
                ? '<Chosen Entity ID>'
                : `'${outcome.value}'`;

            return (
                <>
                    <LogicChip icon={<PencilIcon className="text-[var(--text-warning)]"/>} className="text-[var(--text-warning)] font-bold">UPDATE</LogicChip>
                    <LogicChip icon={<UserIcon />}>{entityName}</LogicChip>
                    <LogicChip icon={<TagIcon />} className="text-[var(--text-primary)] font-medium">{attrName}</LogicChip>
                    <OperatorChip op="to" />
                    <LogicChip className="bg-[var(--bg-panel-light)]">{valueStr}</LogicChip>
                </>
            );
        }
        return <LogicChip>Invalid Outcome</LogicChip>;
    };

     return <div className="flex items-center gap-1.5 flex-wrap text-[length:var(--font-size-xs)]">{renderContent()}</div>;
};