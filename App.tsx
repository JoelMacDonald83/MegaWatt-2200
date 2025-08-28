
import React, { useState } from 'react';
import { PhoenixEditor } from './screens/PhoenixEditor';
import { MegaWattGame } from './screens/MegaWattGame';
import type { GameData } from './types';

// Define IDs for consistent referencing
const TEMPLATE_CHARACTER_ID = 'template_char_1';
const TEMPLATE_POWER_SOURCE_ID = 'template_power_1';
const ATTR_BACKSTORY_ID = 'attr_backstory_1';
const ATTR_DESCRIPTION_ID = 'attr_desc_1';
const ATTR_OPERATOR_ID = 'attr_operator_1';

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
        textColor: 'light',
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
      // FIX: `foregroundImageBase64` is a top-level property on the StoryCard type, not a property of `styles`.
      foregroundImageBase64: '', // Placeholder for user to upload an image
       styles: {
        textPosition: 'bottom',
        textAlign: 'center',
        textColor: 'light',
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
  ],
  entities: [
    {
      id: 'char_1',
      templateId: TEMPLATE_CHARACTER_ID,
      name: 'Jax "Glitch" Corrigan',
      attributeValues: {
        [ATTR_BACKSTORY_ID]: 'A former corporate netrunner who burned his connections and now keeps the colony\'s systems from frying.',
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
      id: 'ps_1',
      templateId: TEMPLATE_POWER_SOURCE_ID,
      name: 'Geo-Thermal Vent Alpha',
      attributeValues: {
        [ATTR_DESCRIPTION_ID]: 'The primary geothermal power plant, tapping into the planet\'s unstable core.',
        [ATTR_OPERATOR_ID]: 'char_1', // This value is the ID of the Jax entity
      },
    },
  ],
};


const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');
  const [gameData, setGameData] = useState<GameData>(initialGameData);

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
            <MegaWattGame gameData={gameData} />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
