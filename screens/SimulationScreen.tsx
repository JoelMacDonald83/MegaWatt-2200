

import React, { useState, useMemo } from 'react';
import type { GameData, PlayerChoice, ChoiceOption, ChoiceOutcome } from '../types';
import { ScenePresenter } from './MegaWattGame';
import { ColonyDashboard } from '../components/ColonyDashboard';

interface SimulationScreenProps {
  gameData: GameData;
  onChoiceMade: (outcomes: ChoiceOutcome[]) => void;
}

export const SimulationScreen: React.FC<SimulationScreenProps> = ({ gameData, onChoiceMade }) => {
  const [activeChoiceId, setActiveChoiceId] = useState<string | null>(null);
  const [prevChoiceId, setPrevChoiceId] = useState<string | null>(null);
  const [animationState, setAnimationState] = useState<'in' | 'out'>('in');

  const activeChoice = useMemo(() => {
    return gameData.allChoices.find(c => c.id === activeChoiceId);
  }, [activeChoiceId, gameData.allChoices]);

  const handleTriggerChoice = (choiceId: string) => {
    setPrevChoiceId(activeChoiceId);
    setActiveChoiceId(choiceId);
    setAnimationState('in');
  };

  const handleSceneCompletion = (option?: ChoiceOption) => {
    if (!activeChoice) return;

    if (option) {
      let resolvedOutcomes = option.outcomes;
      if (option.sourceEntityId) {
        resolvedOutcomes = option.outcomes.map(outcome => {
          if (outcome.type === 'update_entity') {
            const newOutcome = { ...outcome };
            if (newOutcome.targetEntityId === '<chosen_entity>') newOutcome.targetEntityId = option.sourceEntityId!;
            if (newOutcome.value === '<chosen_entity_id>') newOutcome.value = option.sourceEntityId!;
            return newOutcome;
          }
          return outcome;
        });
      }
      onChoiceMade(resolvedOutcomes);
    }

    const transitionDuration = activeChoice.styles?.cardTransitionDuration || 0.6;
    setAnimationState('out');

    setTimeout(() => {
      const nextChoiceId = option ? option.nextChoiceId : activeChoice.nextChoiceId;
      if (nextChoiceId && gameData.allChoices.find(c => c.id === nextChoiceId)) {
        setPrevChoiceId(activeChoiceId);
        setActiveChoiceId(nextChoiceId);
        setAnimationState('in');
      } else {
        setActiveChoiceId(null);
      }
    }, transitionDuration * 1000 + 100);
  };

  return (
    <div className="h-full bg-grid" style={{ "--grid-bg-color": "rgba(45, 212, 191, 0.05)" } as React.CSSProperties}>
      <ColonyDashboard
        gameData={gameData}
        onTriggerChoice={handleTriggerChoice}
      />
      {activeChoice && (
        <ScenePresenter
          choice={activeChoice}
          gameData={gameData}
          onComplete={handleSceneCompletion}
          animationState={animationState}
          isFirstScene={!prevChoiceId}
        />
      )}
    </div>
  );
};
