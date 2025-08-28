
import type { Condition, GameData, Entity, Template } from '../types';

function getEntityAttributeValue(entity: Entity | undefined, attributeId: string): string | number | null {
    if (!entity) return null;
    const value = entity.attributeValues[attributeId];
    return value === undefined ? null : value;
}

function checkAttributeCondition(condition: Extract<Condition, { type: 'attribute' }>, gameData: GameData): boolean {
    const entity = gameData.entities.find(e => e.id === condition.targetEntityId);
    if (!entity) return false;

    const valueA = getEntityAttributeValue(entity, condition.attributeId);
    const valueB = condition.value;

    // Special handling for null/undefined to check for "is set" / "is not set"
    if (valueB === null || valueB === undefined) {
        if (condition.operator === '==') return valueA === null || valueA === undefined || valueA === '';
        if (condition.operator === '!=') return valueA !== null && valueA !== undefined && valueA !== '';
    }

    if (valueA === null || valueA === undefined) return false;

    switch (condition.operator) {
        case '==': return valueA == valueB;
        case '!=': return valueA != valueB;
        case '>': return valueA > valueB;
        case '<': return valueA < valueB;
        case '>=': return valueA >= valueB;
        case '<=': return valueA <= valueB;
        default: return false;
    }
}

function checkEntityExistsCondition(condition: Extract<Condition, { type: 'entity_exists' }>, gameData: GameData): boolean {
    const exists = gameData.entities.some(e => e.templateId === condition.templateId);
    return exists === condition.exists;
}

function checkHasStuffCondition(condition: Extract<Condition, { type: 'has_stuff' }>, gameData: GameData): boolean {
    const entity = gameData.entities.find(e => e.id === condition.targetEntityId);
    if (!entity) return false;
    
    const template = gameData.templates.find(t => t.id === entity.templateId);
    if (!template || !template.includedStuff) return false;
    
    const hasItem = template.includedStuff.some(is => {
        const stuffSet = gameData.stuff.find(s => s.id === is.setId);
        if (!stuffSet) return false;
        return is.itemIds.includes(condition.stuffItemId);
    });

    return hasItem === condition.hasIt;
}


export function evaluateCondition(condition: Condition, gameData: GameData): boolean {
    switch (condition.type) {
        case 'attribute':
            return checkAttributeCondition(condition, gameData);
        case 'entity_exists':
            return checkEntityExistsCondition(condition, gameData);
        case 'has_stuff':
            return checkHasStuffCondition(condition, gameData);
        default:
            return false;
    }
}

function findAttributeDefinition(attributeId: string, gameData: GameData): { name: string; type: string } | null {
    for (const template of gameData.templates) {
        const attr = template.attributes.find(a => a.id === attributeId);
        if (attr) return attr;
    }
    for (const stuffSet of gameData.stuff) {
        for (const item of stuffSet.items) {
             const attr = item.attributes.find(a => a.id === attributeId.split('_').pop());
             if (attr && attributeId.startsWith(item.id)) return attr;
        }
    }
    return null;
}

export function conditionToString(condition: Condition, gameData: GameData, isFilter: boolean = false): string {
    switch (condition.type) {
        case 'attribute':
            const entityName = isFilter ? 'This entity' : gameData.entities.find(e => e.id === condition.targetEntityId)?.name || 'Unknown Entity';
            const attrDef = findAttributeDefinition(condition.attributeId, gameData);
            const attrName = attrDef?.name || 'Unknown Attribute';
            const valueStr = condition.value === null ? 'not set' : `'${condition.value}'`;
            const operator = condition.value === null ? (condition.operator === '==' ? 'is' : 'is not') : condition.operator;
            return `${entityName}'s ${attrName} ${operator} ${valueStr}`;
        case 'entity_exists':
            const templateName = gameData.templates.find(t => t.id === condition.templateId)?.name || 'Unknown Template';
            return `An entity from template '${templateName}' ${condition.exists ? 'exists' : 'does not exist'}`;
        case 'has_stuff':
             const targetName = gameData.entities.find(e => e.id === condition.targetEntityId)?.name || 'Unknown Entity';
             const allItems = gameData.stuff.flatMap(s => s.items);
             const itemName = allItems.find(i => i.id === condition.stuffItemId)?.name || 'Unknown Item';
             return `${targetName} ${condition.hasIt ? 'has' : 'does not have'} '${itemName}'`;
        default:
            return 'Invalid condition';
    }
}
