
import type { Condition, GameData, Entity, Template } from '../types';
import { debugService } from './debugService';

function getEntityAttributeValue(entity: Entity | undefined, attributeId: string): string | number | null {
    if (!entity) return null;
    const value = entity.attributeValues[attributeId];
    return value === undefined ? null : value;
}

function checkAttributeCondition(condition: Extract<Condition, { type: 'attribute' }>, gameData: GameData): boolean {
    const entity = gameData.entities.find(e => e.id === condition.targetEntityId);
    const valueA = getEntityAttributeValue(entity, condition.attributeId);
    const valueB = condition.value;
    let result: boolean;

    // Special handling for null/undefined to check for "is set" / "is not set"
    if (valueB === null || valueB === undefined) {
        if (condition.operator === '==') result = (valueA === null || valueA === undefined || valueA === '');
        else if (condition.operator === '!=') result = (valueA !== null && valueA !== undefined && valueA !== '');
        else result = false; // Other operators are not valid for null comparison
    } else if (valueA === null || valueA === undefined) {
        result = false; // Cannot compare a non-existent value against a real value (except for !=)
        if(condition.operator === '!=') result = true;
    } else {
        switch (condition.operator) {
            case '==': result = valueA == valueB; break;
            case '!=': result = valueA != valueB; break;
            case '>': result = valueA > valueB; break;
            case '<': result = valueA < valueB; break;
            case '>=': result = valueA >= valueB; break;
            case '<=': result = valueA <= valueB; break;
            default: result = false;
        }
    }
    
    debugService.log('ConditionEvaluator: checkAttributeCondition', {
      entityName: entity?.name || 'Unknown/Filter Entity',
      attributeId: condition.attributeId,
      valueA,
      operator: condition.operator,
      valueB,
      result
    });

    return result;
}

function checkEntityExistsCondition(condition: Extract<Condition, { type: 'entity_exists' }>, gameData: GameData): boolean {
    const exists = gameData.entities.some(e => e.templateId === condition.templateId);
    const result = exists === condition.exists;
    debugService.log('ConditionEvaluator: checkEntityExistsCondition', {
        templateId: condition.templateId,
        shouldExist: condition.exists,
        actualExistence: exists,
        result
    });
    return result;
}

function checkHasStuffCondition(condition: Extract<Condition, { type: 'has_stuff' }>, gameData: GameData): boolean {
    const entity = gameData.entities.find(e => e.id === condition.targetEntityId);
    if (!entity) {
        debugService.log('ConditionEvaluator: checkHasStuffCondition failed (entity not found)', { targetEntityId: condition.targetEntityId });
        return false;
    }
    
    const template = gameData.templates.find(t => t.id === entity.templateId);
    if (!template) {
        debugService.log('ConditionEvaluator: checkHasStuffCondition failed (template not found)', { templateId: entity.templateId });
        return false;
    }
    
    // Note: This logic needs to check inheritance chain if that's the desired behavior.
    // For now, it only checks the direct template.
    const hasItem = (template.includedStuff || []).some(is => is.itemIds.includes(condition.stuffItemId));

    const result = hasItem === condition.hasIt;
    debugService.log('ConditionEvaluator: checkHasStuffCondition', {
        entityName: entity.name,
        stuffItemId: condition.stuffItemId,
        shouldHave: condition.hasIt,
        actuallyHas: hasItem,
        result
    });

    return result;
}


export function evaluateCondition(condition: Condition, gameData: GameData): boolean {
    let result: boolean;
    switch (condition.type) {
        case 'attribute':
            result = checkAttributeCondition(condition, gameData);
            break;
        case 'entity_exists':
            result = checkEntityExistsCondition(condition, gameData);
            break;
        case 'has_stuff':
            result = checkHasStuffCondition(condition, gameData);
            break;
        default:
            result = false;
    }
    debugService.log('ConditionEvaluator: Final result for condition', { condition, result });
    return result;
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
    try {
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
    } catch (e) {
        debugService.log("Error in conditionToString", { error: e, condition });
        return "Error rendering condition";
    }
}