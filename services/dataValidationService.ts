import type { Template, Entity, PlayerChoice } from '../types';

// A helper to check for common 'id' and 'name' properties
// Fix: Changed return type from a type predicate to boolean. The type predicate was too restrictive,
// causing TypeScript to believe `obj` only had `id` and `name` properties in functions that called this helper.
const hasBaseFields = (obj: any): boolean => {
  return typeof obj === 'object' && obj !== null && typeof obj.id === 'string' && typeof obj.name === 'string';
};

export const isTemplate = (obj: any): obj is Template => {
  return (
    hasBaseFields(obj) &&
    typeof obj.description === 'string' &&
    Array.isArray(obj.tags) &&
    Array.isArray(obj.attributes) &&
    typeof obj.isComponent === 'boolean' &&
    (!obj.includedComponentIds || Array.isArray(obj.includedComponentIds))
  );
};

export const isEntity = (obj: any): obj is Entity => {
  return (
    hasBaseFields(obj) &&
    typeof obj.templateId === 'string' &&
    typeof obj.attributeValues === 'object' && obj.attributeValues !== null
  );
};

export const isPlayerChoice = (obj: any): obj is PlayerChoice => {
  return (
    hasBaseFields(obj) &&
    typeof obj.prompt === 'string' &&
    (obj.choiceType === 'static' || obj.choiceType === 'dynamic_from_template')
  );
};

export const VALIDATORS = {
    templates: isTemplate,
    entities: isEntity,
    choices: isPlayerChoice,
};