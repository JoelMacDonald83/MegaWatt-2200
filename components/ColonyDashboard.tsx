

import React, { useMemo } from 'react';
import type { GameData, Entity, PlayerChoice, Template } from '../types';
import { EntityCard } from './cards/EntityCard';
import { ActionCard } from './cards/ActionCard';
import { evaluateCondition } from '../services/conditionEvaluator';

interface ColonyDashboardProps {
  gameData: GameData;
  onTriggerChoice: (choiceId: string) => void;
  onEntityClick: (entity: Entity) => void;
}

export const ColonyDashboard: React.FC<ColonyDashboardProps> = ({ gameData, onTriggerChoice, onEntityClick }) => {

  const availableChoices = useMemo(() => {
    const allNextChoiceIds = new Set<string>();
    gameData.allChoices.forEach(c => {
      if (c.nextChoiceId) allNextChoiceIds.add(c.nextChoiceId);
      if (c.staticOptions) c.staticOptions.forEach(o => { if (o.nextChoiceId) allNextChoiceIds.add(o.nextChoiceId) });
      if (c.dynamicConfig?.nextChoiceId) allNextChoiceIds.add(c.dynamicConfig.nextChoiceId);
    });

    // An available choice is one that is NOT a "nextChoice" of any other choice/option.
    // We also need to check if it's the start choice.
    return gameData.allChoices.filter(c => c.id === gameData.startChoiceId || !allNextChoiceIds.has(c.id));
  }, [gameData.allChoices, gameData.startChoiceId]);

  const entityGroups = useMemo(() => {
    const groups: { template: Template, entities: Entity[] }[] = [];
    const entityMap = new Map<string, Entity[]>();

    gameData.entities.forEach(entity => {
      if (!entityMap.has(entity.templateId)) {
        entityMap.set(entity.templateId, []);
      }
      entityMap.get(entity.templateId)!.push(entity);
    });
    
    entityMap.forEach((entities, templateId) => {
        const template = gameData.templates.find(t => t.id === templateId);
        if (template && !template.isComponent) {
            groups.push({ template, entities });
        }
    });

    return groups;
  }, [gameData.entities, gameData.templates]);

  return (
    <div className="h-full overflow-y-auto p-8 pt-24">
      <div className="space-y-12">
        {availableChoices.length > 0 && (
            <div>
                 <h2 className="text-sm font-bold uppercase tracking-widest text-cyan-400/50 mb-4">// Directives</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {availableChoices.map(choice => (
                        <ActionCard key={choice.id} choice={choice} onTrigger={() => onTriggerChoice(choice.id)} />
                    ))}
                 </div>
            </div>
        )}

        {entityGroups.map(({ template, entities }) => (
            <div key={template.id}>
                <h2 className="text-sm font-bold uppercase tracking-widest text-cyan-400/50 mb-4">// {template.name}s</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {entities.map(entity => (
                        <button key={entity.id} onClick={() => onEntityClick(entity)} className="w-full h-full text-left focus-ring rounded-lg">
                           <EntityCard entity={entity} />
                        </button>
                    ))}
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};
