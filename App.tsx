
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PhoenixEditor } from './screens/PhoenixEditor';
import { MegaWattGame } from './screens/MegaWattGame';
import type { GameData, ChoiceOutcome } from './types';
import { debugService } from './services/debugService';
import { HistoryService } from './services/historyService';
import { ArrowUturnLeftIcon } from './components/icons/ArrowUturnLeftIcon';
import { ArrowUturnRightIcon } from './components/icons/ArrowUturnRightIcon';
import { SettingsProvider } from './contexts/SettingsContext';
import { Cog6ToothIcon } from './components/icons/Cog6ToothIcon';
import { SettingsModal } from './components/SettingsModal';
import { GlobalStyles } from './components/GlobalStyles';


// Define IDs for consistent referencing
const TEMPLATE_CHARACTER_ID = 'template_char_1';
const TEMPLATE_POWER_SOURCE_ID = 'template_power_1';
const TEMPLATE_FACILITY_ID = 'template_facility_1';
const TEMPLATE_DRONE_ID = 'template_drone_1';
const TEMPLATE_COLONY_STATS_ID = 'template_colony_stats_1';

const COMPONENT_SKILL_HACKING_ID = 'comp_skill_hacking_1';
const COMPONENT_SKILL_ACCOUNTING_ID = 'comp_skill_accounting_1';

const ATTR_BACKSTORY_ID = 'attr_backstory_1';
const ATTR_ROLE_ID = 'attr_role_1';
const ATTR_DESCRIPTION_ID = 'attr_desc_1';
const ATTR_OPERATOR_ID = 'attr_operator_1';
const ATTR_STATUS_ID = 'attr_status_1';
const ATTR_POWER_SOURCE_ID = 'attr_power_source_1';
const ATTR_SKILL_LEVEL_ID = 'attr_skill_level_1';
const ATTR_SKILL_SPEC_ID = 'attr_skill_spec_1';

const CHOICE_INTRO_1 = 'choice_intro_1';
const CHOICE_INTRO_2 = 'choice_intro_2';
const CHOICE_FIRST_PRIORITY_ID = 'choice_1';
const CHOICE_ASSIGN_OPERATOR_ID = 'choice_2';

const ENTITY_GEOTHERMAL_VENT_ID = 'ps_1';
const ENTITY_JAX_ID = 'char_1';


const initialGameData: GameData = {
  colonyName: 'Aethelburg Node',
  startChoiceId: CHOICE_INTRO_1,
  menuSettings: {
    description: 'A sputtering candle in the dark. As its new Administrator, you must make the hard choices that will determine whether that candle is snuffed out, or burns bright enough to ignite a new dawn.',
    tags: ['Sci-Fi', 'Narrative Driven', 'Colony Sim'],
    backgroundImagePrompt: 'A lone figure stands on a high balcony overlooking a futuristic, cyberpunk colony dome at night. The mood is contemplative and serious.',
    backgroundImageBase64: '',
    news: [
      {
        id: 'news_1',
        date: '2200-10-26',
        title: 'Power Fluctuations Detected in Sector Gamma',
        author: 'Engineering Department',
        content: '**Attention all personnel:**\n\nWe are tracking intermittent power surges originating from the geothermal plant. Non-essential systems may be temporarily rerouted.\n\nAn investigation is underway. Please conserve energy until further notice.',
        imagePrompt: 'A futuristic power grid schematic with a glowing red warning symbol over a specific sector. Dark, high-tech interface.',
        imageBase64: '',
        tags: ['System Alert', 'Engineering'],
        style: 'urgent',
        status: 'published',
        layout: 'image_top',
      }
    ],
    credits: 'Created with the Phoenix Editor for MegaWatt 2200.',
  },
  choices: [
    {
      id: CHOICE_INTRO_1,
      name: 'Intro Scene 1',
      description: 'In the smog-choked canyons of a dying Earth, humanity fled to the stars. We built colonies, metal islands in the vast, silent ocean of space. This is the story of one such outpost.',
      imagePrompt: 'A vast, detailed cyberpunk city under a polluted, orange sky. Flying vehicles weave between towering skyscrapers adorned with neon signs. Cinematic, wide-angle shot.',
      choiceType: 'static', // This is a linear scene
      nextChoiceId: CHOICE_INTRO_2,
      styles: {
        textPosition: 'middle',
        textAlign: 'center',
        textColor: 'text-white',
        overlayStrength: 'medium',
        backgroundAnimation: 'kenburns-normal',
        backgroundAnimationDuration: 45,
        fontFamily: 'serif',
        fontSize: 'large',
        textWidth: 'medium',
        backgroundEffect: 'none',
        cardTransition: 'dissolve',
        cardTransitionDuration: 1.5,
        textAnimation: 'typewriter',
        textAnimationDuration: 4,
        textAnimationDelay: 1.6,
      }
    },
    {
      id: CHOICE_INTRO_2,
      name: 'Intro Scene 2',
      description: 'Aethelburg Node. A sputtering candle in the dark. As its new Administrator, you must make the hard choices that will determine whether that candle is snuffed out, or burns bright enough to ignite a new dawn.',
      imagePrompt: 'A lone figure stands on a high balcony overlooking a futuristic, cyberpunk colony dome at night. The mood is contemplative and serious.',
      foregroundImageBase64: '', // Placeholder for user to upload an image
      choiceType: 'static', // This is a linear scene
      nextChoiceId: CHOICE_FIRST_PRIORITY_ID,
       styles: {
        textPosition: 'bottom',
        textAlign: 'center',
        textColor: 'text-white',
        overlayStrength: 'heavy',
        backgroundAnimation: 'kenburns-subtle',
        fontFamily: 'sans',
        fontSize: 'normal',
        textWidth: 'wide',
        backgroundEffect: 'none',
        cardTransition: 'slide-left',
        textAnimation: 'rise-up',
        textAnimationDelay: 0.8,
        foregroundImageStyles: {
          position: 'center',
          size: 'medium',
          animation: 'fade-in',
          animationDuration: 2,
          animationDelay: 1.2
        }
      },
    },
    {
      id: CHOICE_FIRST_PRIORITY_ID,
      name: 'First Priority Directive',
      description: 'Your first directive has arrived from the consortium. Resources are scarce, and you must decide where to focus the colony\'s initial efforts.',
      imagePrompt: 'A holographic interface displaying resource allocation charts and colony schematics. A hand is reaching out to touch one of the options. Tech noir, glowing interface.',
      prompt: "What is our first priority?",
      choiceType: 'static',
      staticOptions: [
        {
          id: 'opt_1',
          text: "Secure the Food Supply",
          outcomes: [{
            type: 'create_entity',
            templateId: TEMPLATE_FACILITY_ID,
            name: "Hydroponics Bay Alpha",
            attributeValues: {
              [ATTR_STATUS_ID]: "Online and operational. Initial yields are stable."
            }
          }]
        },
        {
          id: 'opt_2',
          text: "Expand Reconnaissance",
          outcomes: [{
            type: 'create_entity',
            templateId: TEMPLATE_DRONE_ID,
            name: "Scout Drone Relay",
             attributeValues: {
              [ATTR_STATUS_ID]: "Active. Now monitoring local sectors for resources and anomalies."
            }
          }]
        }
      ]
    },
    {
      id: CHOICE_ASSIGN_OPERATOR_ID,
      name: 'Assign Geothermal Plant Operator',
      description: 'The Geo-Thermal Vent needs a dedicated operator.', // Added description
      imagePrompt: 'A massive, industrial geothermal power plant inside a rocky cavern, steam billowing from pipes.', // Added image prompt
      prompt: 'Who will you assign?',
      choiceType: 'dynamic_from_template',
      dynamicConfig: {
        sourceTemplateId: TEMPLATE_CHARACTER_ID,
        optionTemplate: {
          text: '{entity.name}',
        },
        outcomeTemplates: [{
          type: 'update_entity',
          targetEntityId: ENTITY_GEOTHERMAL_VENT_ID,
          attributeId: ATTR_OPERATOR_ID,
          value: '<chosen_entity_id>',
        }],
        nextChoiceId: null, // This branch ends here for now
        // Show only characters who do not have a role assigned.
        filterConditions: [
          {
            type: 'attribute',
            // targetEntityId is a placeholder here; it will be replaced by the entity being filtered.
            targetEntityId: '',
            attributeId: ATTR_ROLE_ID,
            operator: '==',
            value: null,
          }
        ]
      }
    }
  ],
  templates: [
    {
      id: TEMPLATE_CHARACTER_ID,
      name: 'Character',
      description: 'A person or operative in the colony.',
      tags: ['personnel', 'operative'],
      isComponent: false,
      attributes: [
        { id: ATTR_BACKSTORY_ID, name: 'Backstory', type: 'textarea' },
        { id: ATTR_ROLE_ID, name: 'Role', type: 'string' },
      ],
      includedComponentIds: [COMPONENT_SKILL_HACKING_ID]
    },
    {
      id: TEMPLATE_POWER_SOURCE_ID,
      name: 'Power Source',
      description: 'A facility that generates power for the colony.',
      tags: ['utility', 'location', 'power'],
      isComponent: false,
      attributes: [
        { id: ATTR_DESCRIPTION_ID, name: 'Description', type: 'textarea' },
        { id: ATTR_OPERATOR_ID, name: 'Operator', type: 'entity_reference', referencedTemplateId: TEMPLATE_CHARACTER_ID },
      ],
    },
     {
      id: TEMPLATE_FACILITY_ID,
      name: 'Facility',
      description: 'A structural installation within the a colonym.',
      tags: ['location', 'structure'],
      isComponent: false,
      attributes: [
        { id: ATTR_STATUS_ID, name: 'Status Report', type: 'textarea' },
      ],
    },
    {
      id: TEMPLATE_DRONE_ID,
      name: 'Drone System',
      description: 'An automated system, typically for reconnaissance or utility.',
      tags: ['utility', 'automated'],
      isComponent: false,
      attributes: [
        { id: ATTR_STATUS_ID, name: 'Status Report', type: 'textarea' },
      ],
    },
     {
      id: TEMPLATE_COLONY_STATS_ID,
      name: 'Colony Stats',
      description: 'High-level status and configuration for the entire colony.',
      tags: ['system'],
      isComponent: false,
      attributes: [
        { id: ATTR_POWER_SOURCE_ID, name: 'Primary Power Source', type: 'entity_reference', referencedTemplateId: TEMPLATE_POWER_SOURCE_ID },
      ],
    },
    // --- Components (formerly Stuff) ---
    {
      id: COMPONENT_SKILL_HACKING_ID,
      name: 'Skill: Hacking',
      description: 'Component for characters who can bypass digital security.',
      tags: ['skill', 'technical'],
      isComponent: true,
      attributes: [
        { id: ATTR_SKILL_LEVEL_ID, name: 'Level', type: 'number' },
      ],
    },
    {
      id: COMPONENT_SKILL_ACCOUNTING_ID,
      name: 'Skill: Accounting',
      description: 'Component for characters who can manage financial records.',
      tags: ['skill', 'financial'],
      isComponent: true,
      attributes: [
        { id: ATTR_SKILL_LEVEL_ID, name: 'Level', type: 'number' },
        { id: ATTR_SKILL_SPEC_ID, name: 'Specialization', type: 'string'},
      ]
    }
  ],
  entities: [
    {
      id: ENTITY_JAX_ID,
      templateId: TEMPLATE_CHARACTER_ID,
      name: 'Jax "Glitch" Corrigan',
      attributeValues: {
        [ATTR_BACKSTORY_ID]: 'A former corporate netrunner who burned his connections and now keeps the colony\'s systems from frying.',
        [ATTR_ROLE_ID]: 'Chief Systems Analyst',
        // New composite key for the 'Level' attribute from the included 'Hacking' component
        [`${COMPONENT_SKILL_HACKING_ID}_${ATTR_SKILL_LEVEL_ID}`]: 5,
      },
    },
    {
      id: 'char_2',
      templateId: TEMPLATE_CHARACTER_ID,
      name: 'Dr. Aris Thorne',
      attributeValues: {
        [ATTR_BACKSTORY_ID]: 'A bio-engineer with a questionable past, responsible for the colony\'s hydroponics and medical bay.',
        [ATTR_ROLE_ID]: null,
      },
    },
    {
      id: ENTITY_GEOTHERMAL_VENT_ID,
      templateId: TEMPLATE_POWER_SOURCE_ID,
      name: 'Geo-Thermal Vent Alpha',
      attributeValues: {
        [ATTR_DESCRIPTION_ID]: 'The primary geothermal power plant, tapping into the planet\'s unstable core.',
        [ATTR_OPERATOR_ID]: null,
      },
    },
  ],
};


const AppContent: React.FC = () => {
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');
  
  const historyService = useMemo(() => new HistoryService<GameData>(initialGameData), []);
  
  const [gameData, setGameData] = useState<GameData>(() => historyService.current()!);
  const [canUndo, setCanUndo] = useState(historyService.canUndo());
  const [canRedo, setCanRedo] = useState(historyService.canRedo());
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  useEffect(() => {
    debugService.log("App: Component mounted", { initialGameData });
    
    const unsubscribe = historyService.subscribe(() => {
        const currentData = historyService.current();
        if (currentData) {
            setGameData(currentData);
        }
        setCanUndo(historyService.canUndo());
        setCanRedo(historyService.canRedo());
        debugService.log("App: History update received from service", { canUndo: historyService.canUndo(), canRedo: historyService.canRedo() });
    });

    return unsubscribe;
  }, [historyService]);
  
  const handleUndo = useCallback(() => historyService.undo(), [historyService]);
  const handleRedo = useCallback(() => historyService.redo(), [historyService]);

  useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
          if ((event.ctrlKey || event.metaKey)) {
              if (event.key === 'z') {
                  event.preventDefault();
                  if (event.shiftKey) {
                      handleRedo();
                  } else {
                      handleUndo();
                  }
              } else if (event.key === 'y') {
                  event.preventDefault();
                  handleRedo();
              }
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
          window.removeEventListener('keydown', handleKeyDown);
      };
  }, [handleUndo, handleRedo]);

  const commitChange = useCallback((newGameData: GameData) => {
      historyService.push(newGameData);
  }, [historyService]);

  useEffect(() => {
    debugService.log("App: View mode changed", { viewMode });
  }, [viewMode]);

  const handleChoiceOutcomes = (outcomes: ChoiceOutcome[]) => {
    debugService.log("App: handleChoiceOutcomes triggered from game preview", { outcomes });
    
    let currentData = historyService.current();
    if (!currentData) return;
    
    debugService.log("App: gameData state before outcome", { gameData: currentData });

    for (const outcome of outcomes) {
        let nextData: GameData;
        if (outcome.type === 'create_entity') {
            const newEntity = {
                id: `entity_${Date.now()}`,
                templateId: outcome.templateId,
                name: outcome.name,
                attributeValues: outcome.attributeValues || {},
            };
            nextData = {
                ...currentData,
                entities: [...currentData.entities, newEntity]
            };
        } else if (outcome.type === 'update_entity') {
            nextData = {
                ...currentData,
                entities: currentData.entities.map(entity => {
                if (entity.id === outcome.targetEntityId) {
                    return {
                    ...entity,
                    attributeValues: {
                        ...entity.attributeValues,
                        [outcome.attributeId]: outcome.value,
                    }
                    };
                }
                return entity;
                })
            };
        } else {
            nextData = currentData;
        }
        currentData = nextData;
    }

    debugService.log("App: gameData state after all outcomes", { gameData: currentData });
    commitChange(currentData);
  };

  const handleSaveGame = () => {
    debugService.log('App: Saving game', { gameData });
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(gameData, null, 2))}`;
    const link = document.createElement('a');
    link.href = jsonString;
    link.download = `${gameData.colonyName.replace(/\s+/g, '_') || 'megawatt_save'}_${timestamp}.json`;
    link.click();
  };

  const handleLoadGame = (jsonString: string) => {
    try {
      debugService.log('App: Attempting to load game from string', { length: jsonString.length });
      const loadedData = JSON.parse(jsonString);
      // Basic validation to see if it looks like a game data file
      if (loadedData.colonyName && loadedData.entities && loadedData.templates && loadedData.choices) {
        historyService.clearAndPush(loadedData);
        debugService.log('App: Game loaded successfully', { loadedData });
        alert('Game loaded successfully!');
      } else {
        throw new Error('Invalid or corrupted save file format.');
      }
    } catch (error) {
      console.error("Failed to load game:", error);
      debugService.log('App: Game load failed', { error });
      alert(`Failed to load game: ${(error as Error).message}`);
    }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden">
       <GlobalStyles />
      <header className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center p-3 bg-[var(--bg-panel)]/70 backdrop-blur-sm border-b border-[var(--border-primary)]">
        <div className="flex items-center gap-4">
            <h1 className="text-[length:var(--font-size-lg)] font-bold text-[var(--text-primary)]">
              <span className="text-[var(--text-accent-bright)]">MegaWatt 2200</span> / Phoenix Editor
            </h1>
            <div className="flex items-center space-x-1 bg-[var(--bg-panel-light)] p-1 rounded-lg">
                <button onClick={handleUndo} disabled={!canUndo} className="p-1.5 text-[var(--text-secondary)] rounded-md transition-colors hover:bg-[var(--bg-hover)] disabled:text-[var(--text-tertiary)] disabled:cursor-not-allowed disabled:hover:bg-transparent" title="Undo (Ctrl+Z)">
                    <ArrowUturnLeftIcon className="w-5 h-5"/>
                </button>
                 <button onClick={handleRedo} disabled={!canRedo} className="p-1.5 text-[var(--text-secondary)] rounded-md transition-colors hover:bg-[var(--bg-hover)] disabled:text-[var(--text-tertiary)] disabled:cursor-not-allowed disabled:hover:bg-transparent" title="Redo (Ctrl+Y)">
                    <ArrowUturnRightIcon className="w-5 h-5"/>
                </button>
            </div>
        </div>
        <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2 bg-[var(--bg-panel-light)] p-1 rounded-lg">
              <button
                onClick={() => setViewMode('editor')}
                className={`px-3 py-1 text-[length:var(--font-size-sm)] font-medium rounded-md transition-colors ${viewMode === 'editor' ? 'bg-[var(--bg-active)] text-[var(--text-on-accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
              >
                Editor
              </button>
              <button
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1 text-[length:var(--font-size-sm)] font-medium rounded-md transition-colors ${viewMode === 'preview' ? 'bg-[var(--bg-active)] text-[var(--text-on-accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
              >
                Preview
              </button>
            </div>
             <button onClick={() => setIsSettingsModalOpen(true)} className="p-2 text-[var(--text-secondary)] rounded-md transition-colors bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)]" title="Editor Settings">
                <Cog6ToothIcon className="w-5 h-5"/>
            </button>
        </div>
      </header>
      <main className="h-full pt-[57px]">
        {viewMode === 'editor' ? (
          <PhoenixEditor 
            gameData={gameData} 
            onCommitChange={commitChange} 
            onLoadGame={handleLoadGame} 
          />
        ) : (
          <div className="h-full overflow-y-auto">
            <MegaWattGame 
              gameData={gameData} 
              onChoiceMade={handleChoiceOutcomes}
              onSaveGame={handleSaveGame}
              onLoadGame={handleLoadGame}
              onUndo={handleUndo}
              onRedo={handleRedo}
              canUndo={canUndo}
              canRedo={canRedo}
            />
          </div>
        )}
      </main>
      <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} />
    </div>
  );
};


const App: React.FC = () => (
  <SettingsProvider>
    <AppContent />
  </SettingsProvider>
);

export default App;
