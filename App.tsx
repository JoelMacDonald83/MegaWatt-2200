




import React, { useState } from 'react';
import { PhoenixEditor } from './screens/PhoenixEditor';
import { MegaWattGame } from './screens/MegaWattGame';
import type { GameData, ChoiceOutcome } from './types';

// Define IDs for consistent referencing
const TEMPLATE_CHARACTER_ID = 'template_char_1';
const TEMPLATE_POWER_SOURCE_ID = 'template_power_1';
const TEMPLATE_FACILITY_ID = 'template_facility_1';
const TEMPLATE_DRONE_ID = 'template_drone_1';
const TEMPLATE_COLONY_STATS_ID = 'template_colony_stats_1';

const ATTR_BACKSTORY_ID = 'attr_backstory_1';
const ATTR_DESCRIPTION_ID = 'attr_desc_1';
const ATTR_OPERATOR_ID = 'attr_operator_1';
const ATTR_STATUS_ID = 'attr_status_1';
const ATTR_POWER_SOURCE_ID = 'attr_power_source_1';
const ATTR_SKILL_LEVEL_ID = 'attr_skill_level_1';
const ATTR_SKILL_SPEC_ID = 'attr_skill_spec_1';

const CHOICE_FIRST_PRIORITY_ID = 'choice_1';
const CHOICE_ASSIGN_OPERATOR_ID = 'choice_2';

const ENTITY_GEOTHERMAL_VENT_ID = 'ps_1';

const STUFF_SET_SKILLS_ID = 'stuff_set_skills_1';
const SKILL_ITEM_ACCOUNTING_ID = 'skill_item_accounting_1';
const SKILL_ITEM_HACKING_ID = 'skill_item_hacking_1';


const initialGameData: GameData = {
  colonyName: 'Aethelburg Node',
  story: [
    {
      id: `story_${Date.now()}_1`,
      description: 'In the smog-choked canyons of a dying Earth, humanity fled to the stars. We built colonies, metal islands in the vast, silent ocean of space. This is the story of one such outpost.',
      imagePrompt: 'A vast, detailed cyberpunk city under a polluted, orange sky. Flying vehicles weave between towering skyscrapers adorned with neon signs. Cinematic, wide-angle shot.',
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
      id: `story_${Date.now()}_2`,
      description: 'Aethelburg Node. A sputtering candle in the dark. As its new Administrator, you must make the hard choices that will determine whether that candle is snuffed out, or burns bright enough to ignite a new dawn.',
      imagePrompt: 'A lone figure stands on a high balcony overlooking a futuristic, cyberpunk colony dome at night. The mood is contemplative and serious.',
      foregroundImageBase64: '', // Placeholder for user to upload an image
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
      choiceId: CHOICE_ASSIGN_OPERATOR_ID,
    },
    {
      id: `story_${Date.now()}_3`,
      description: 'Your first directive has arrived from the consortium. Resources are scarce, and you must decide where to focus the colony\'s initial efforts.',
      imagePrompt: 'A holographic interface displaying resource allocation charts and colony schematics. A hand is reaching out to touch one of the options. Tech noir, glowing interface.',
      choiceId: CHOICE_FIRST_PRIORITY_ID,
    }
  ],
  choices: [
    {
      id: CHOICE_FIRST_PRIORITY_ID,
      name: 'First Priority Directive',
      prompt: "What is our first priority?",
      choiceType: 'static',
      staticOptions: [
        {
          id: 'opt_1',
          card: {
            description: "Secure the Food Supply",
            imagePrompt: "A lush, futuristic hydroponics bay filled with green plants under glowing purple lights. Clean, high-tech, hopeful.",
            styles: { fontSize: 'large', borderWidth: 'md', borderColor: 'teal-500' }
          },
          outcome: {
            type: 'create_entity',
            templateId: TEMPLATE_FACILITY_ID,
            name: "Hydroponics Bay Alpha",
            attributeValues: {
              [ATTR_STATUS_ID]: "Online and operational. Initial yields are stable."
            }
          }
        },
        {
          id: 'opt_2',
          card: {
            description: "Expand Reconnaissance",
            imagePrompt: "A sleek, metallic drone launching from a platform, with a vast, unexplored alien landscape in the background.",
             styles: { fontSize: 'large', borderWidth: 'md', borderColor: 'cyan-500' }
          },
          outcome: {
            type: 'create_entity',
            templateId: TEMPLATE_DRONE_ID,
            name: "Scout Drone Relay",
             attributeValues: {
              [ATTR_STATUS_ID]: "Active. Now monitoring local sectors for resources and anomalies."
            }
          }
        }
      ]
    },
    {
      id: CHOICE_ASSIGN_OPERATOR_ID,
      name: 'Assign Geothermal Plant Operator',
      prompt: 'The Geo-Thermal Vent needs a dedicated operator. Who will you assign?',
      choiceType: 'dynamic_from_template',
      dynamicConfig: {
        sourceTemplateId: TEMPLATE_CHARACTER_ID,
        cardTemplate: {
          description: '{entity.name}',
          imagePrompt: 'A gritty, cyberpunk portrait of a skilled technician named {entity.name}.',
          styles: {
            fontSize: 'large',
            borderWidth: 'md',
            borderColor: 'yellow-500',
          }
        },
        outcomeTemplate: {
          type: 'update_entity',
          targetEntityId: ENTITY_GEOTHERMAL_VENT_ID,
          attributeId: ATTR_OPERATOR_ID,
        }
      }
    }
  ],
  templates: [
    {
      id: TEMPLATE_CHARACTER_ID,
      name: 'Character',
      description: 'A person or operative in the colony.',
      tags: ['personnel', 'operative'],
      attributes: [
        { id: ATTR_BACKSTORY_ID, name: 'Backstory', type: 'textarea' },
      ],
      includedStuff: [
        {
          setId: STUFF_SET_SKILLS_ID,
          itemIds: [SKILL_ITEM_HACKING_ID]
        }
      ]
    },
    {
      id: TEMPLATE_POWER_SOURCE_ID,
      name: 'Power Source',
      description: 'A facility that generates power for the colony.',
      tags: ['utility', 'location', 'power'],
      attributes: [
        { id: ATTR_DESCRIPTION_ID, name: 'Description', type: 'textarea' },
        { id: ATTR_OPERATOR_ID, name: 'Operator', type: 'entity_reference', referencedTemplateId: TEMPLATE_CHARACTER_ID },
      ],
    },
     {
      id: TEMPLATE_FACILITY_ID,
      name: 'Facility',
      description: 'A structural installation within the colony.',
      tags: ['location', 'structure'],
      attributes: [
        { id: ATTR_STATUS_ID, name: 'Status Report', type: 'textarea' },
      ],
    },
    {
      id: TEMPLATE_DRONE_ID,
      name: 'Drone System',
      description: 'An automated system, typically for reconnaissance or utility.',
      tags: ['utility', 'automated'],
      attributes: [
        { id: ATTR_STATUS_ID, name: 'Status Report', type: 'textarea' },
      ],
    },
     {
      id: TEMPLATE_COLONY_STATS_ID,
      name: 'Colony Stats',
      description: 'High-level status and configuration for the entire colony.',
      tags: ['system'],
      attributes: [
        { id: ATTR_POWER_SOURCE_ID, name: 'Primary Power Source', type: 'entity_reference', referencedTemplateId: TEMPLATE_POWER_SOURCE_ID },
      ],
    },
  ],
  entities: [
    {
      id: 'char_1',
      templateId: TEMPLATE_CHARACTER_ID,
      name: 'Jax "Glitch" Corrigan',
      attributeValues: {
        [ATTR_BACKSTORY_ID]: 'A former corporate netrunner who burned his connections and now keeps the colony\'s systems from frying.',
        // Value for the 'Level' attribute of the included 'Hacking' skill
        [`${SKILL_ITEM_HACKING_ID}_${ATTR_SKILL_LEVEL_ID}`]: 5,
      },
    },
    {
      id: 'char_2',
      templateId: TEMPLATE_CHARACTER_ID,
      name: 'Dr. Aris Thorne',
      attributeValues: {
        [ATTR_BACKSTORY_ID]: 'A bio-engineer with a questionable past, responsible for the colony\'s hydroponics and medical bay.',
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
  stuff: [
    {
      id: STUFF_SET_SKILLS_ID,
      name: 'Skills',
      description: 'Abilities and proficiencies for characters.',
      items: [
        {
          id: SKILL_ITEM_ACCOUNTING_ID,
          name: 'Accounting',
          description: 'Proficiency in managing financial records and resources.',
          category: 'Financial',
          attributes: [
            { id: ATTR_SKILL_LEVEL_ID, name: 'Level', type: 'number' },
            { id: ATTR_SKILL_SPEC_ID, name: 'Specialization', type: 'string'},
          ]
        },
        {
          id: SKILL_ITEM_HACKING_ID,
          name: 'Hacking',
          description: 'Skill in bypassing digital security and manipulating networks.',
          category: 'Technical',
          attributes: [
            { id: ATTR_SKILL_LEVEL_ID, name: 'Level', type: 'number' },
          ]
        }
      ]
    }
  ]
};


const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');
  const [gameData, setGameData] = useState<GameData>(initialGameData);

  const handleChoiceOutcome = (outcome: ChoiceOutcome) => {
    setGameData(prevData => {
      if (outcome.type === 'create_entity') {
        const newEntity = {
          id: `entity_${Date.now()}`,
          templateId: outcome.templateId,
          name: outcome.name,
          attributeValues: outcome.attributeValues || {},
        };
        return {
          ...prevData,
          entities: [...prevData.entities, newEntity]
        };
      }
       if (outcome.type === 'update_entity') {
        return {
          ...prevData,
          entities: prevData.entities.map(entity => {
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
      }
      return prevData;
    });
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <header className="absolute top-0 left-0 right-0 z-10 flex justify-between items-center p-3 bg-gray-950/70 backdrop-blur-sm border-b border-gray-800">
        <h1 className="text-lg font-bold text-white">
          <span className="text-cyan-400">MegaWatt 2200</span> / Phoenix Editor
        </h1>
        <div className="flex items-center space-x-2 bg-gray-800 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('editor')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${viewMode === 'editor' ? 'bg-cyan-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
          >
            Editor
          </button>
          <button
            onClick={() => setViewMode('preview')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${viewMode === 'preview' ? 'bg-cyan-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
          >
            Preview
          </button>
        </div>
      </header>
      <main className="h-full pt-[57px]">
        {viewMode === 'editor' ? (
          <PhoenixEditor gameData={gameData} setGameData={setGameData} />
        ) : (
          <div className="h-full overflow-y-auto">
            <MegaWattGame gameData={gameData} onChoiceMade={handleChoiceOutcome} />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;