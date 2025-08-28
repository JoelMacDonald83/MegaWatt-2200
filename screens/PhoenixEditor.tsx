

import React, { useState, useMemo, useCallback, useRef } from 'react';
import type { GameData, Template, Entity, StoryCard, PlayerChoice, StuffSet } from '../types';
import { GlobeAltIcon } from '../components/icons/GlobeAltIcon';
import { CubeTransparentIcon } from '../components/icons/CubeTransparentIcon';
import { RectangleStackIcon } from '../components/icons/RectangleStackIcon';
import { PencilIcon } from '../components/icons/PencilIcon';
import { TrashIcon } from '../components/icons/TrashIcon';
import { ArrowDownTrayIcon } from '../components/icons/ArrowDownTrayIcon';
import { ArrowUpTrayIcon } from '../components/icons/ArrowUpTrayIcon';
import { Modal } from '../components/Modal';
import { PlusIcon } from '../components/icons/PlusIcon';
import { BookOpenIcon } from '../components/icons/BookOpenIcon';
import { ArrowUpIcon } from '../components/icons/ArrowUpIcon';
import { ArrowDownIcon } from '../components/icons/ArrowDownIcon';
import { BoltIcon } from '../components/icons/BoltIcon';
import { TemplateEditor } from './editor/TemplateEditor';
import { EntityEditor } from './editor/EntityEditor';
import { StoryCardEditor } from './editor/StoryCardEditor';
import { ChoiceEditor } from './editor/ChoiceEditor';
import { generateImageFromPrompt, generateStoryContent } from '../services/geminiService';
import { ArchiveBoxIcon } from '../components/icons/ArchiveBoxIcon';
import { StuffEditor } from './editor/StuffEditor';


type EditorTabs = 'world' | 'story' | 'gameplay' | 'stuff' | 'templates' | 'entities';

type DeletionModalState = 
  | { type: 'none' }
  | { type: 'delete-template'; template: Template }
  | { type: 'delete-entity'; entity: Entity }
  | { type: 'delete-story-card'; card: StoryCard }
  | { type: 'delete-choice'; choice: PlayerChoice }
  | { type: 'delete-stuff-set'; stuffSet: StuffSet };

type EditingState =
  | { mode: 'none' }
  | { mode: 'edit-template'; template: Template }
  | { mode: 'new-template'; template: Template }
  | { mode: 'edit-entity'; entity: Entity }
  | { mode: 'new-entity'; entity: Entity }
  | { mode: 'edit-story-card'; card: StoryCard }
  | { mode: 'new-story-card'; card: StoryCard }
  | { mode: 'edit-choice'; choice: PlayerChoice }
  | { mode: 'new-choice'; choice: PlayerChoice }
  | { mode: 'edit-stuff-set'; stuffSet: StuffSet }
  | { mode: 'new-stuff-set'; stuffSet: StuffSet };

interface PhoenixEditorProps {
  gameData: GameData;
  setGameData: React.Dispatch<React.SetStateAction<GameData>>;
}

export const PhoenixEditor: React.FC<PhoenixEditorProps> = ({ gameData, setGameData }) => {
  const [activeTab, setActiveTab] = useState<EditorTabs>('world');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [deletionModalState, setDeletionModalState] = useState<DeletionModalState>({ type: 'none' });
  const [editingState, setEditingState] = useState<EditingState>({ mode: 'none' });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleColonyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGameData(prev => ({ ...prev, colonyName: e.target.value }));
  };
  
  const handleAddItem = () => {
    if (activeTab === 'templates') {
      const newItemId = `template_${Date.now()}`;
      const newTemplate: Template = { id: newItemId, name: 'New Template', description: '', tags: [], attributes: [] };
      setSelectedItemId(null);
      setEditingState({ mode: 'new-template', template: newTemplate });
    } else if (activeTab === 'entities') {
      if (!entityFilter || entityFilter === 'all') {
        return;
      }
      const newItemId = `entity_${Date.now()}`;
      const newEntity: Entity = { id: newItemId, templateId: entityFilter, name: 'New Entity', attributeValues: {} };
      setSelectedItemId(null);
      setEditingState({ mode: 'new-entity', entity: newEntity });
    } else if (activeTab === 'story') {
      const newItemId = `story_${Date.now()}`;
      const newCard: StoryCard = { id: newItemId, description: 'New story point...', imagePrompt: '' };
      setSelectedItemId(null);
      setEditingState({ mode: 'new-story-card', card: newCard });
    } else if (activeTab === 'gameplay') {
      const newItemId = `choice_${Date.now()}`;
      const newChoice: PlayerChoice = { id: newItemId, name: 'New Choice', prompt: 'What will you do?', choiceType: 'static', staticOptions: [] };
      setSelectedItemId(null);
      setEditingState({ mode: 'new-choice', choice: newChoice });
    } else if (activeTab === 'stuff') {
      const newItemId = `stuff_set_${Date.now()}`;
      const newStuffSet: StuffSet = { id: newItemId, name: 'New Set', description: '', items: [] };
      setSelectedItemId(null);
      setEditingState({ mode: 'new-stuff-set', stuffSet: newStuffSet });
    }
  };

  const handleDeleteConfirmed = () => {
    if (deletionModalState.type === 'delete-template') {
        setGameData(prev => ({
          ...prev,
          templates: prev.templates.filter(t => t.id !== deletionModalState.template.id),
          entities: prev.entities.filter(e => e.templateId !== deletionModalState.template.id),
        }));
        if (selectedItemId === deletionModalState.template.id) setSelectedItemId(null);
    } else if (deletionModalState.type === 'delete-entity') {
        setGameData(prev => ({
          ...prev,
          entities: prev.entities.filter(e => e.id !== deletionModalState.entity.id),
        }));
        if (selectedItemId === deletionModalState.entity.id) setSelectedItemId(null);
    } else if (deletionModalState.type === 'delete-story-card') {
      setGameData(prev => ({
        ...prev,
        story: prev.story.filter(c => c.id !== deletionModalState.card.id),
      }));
      if (selectedItemId === deletionModalState.card.id) setSelectedItemId(null);
    } else if (deletionModalState.type === 'delete-choice') {
      setGameData(prev => ({
        ...prev,
        choices: prev.choices.filter(c => c.id !== deletionModalState.choice.id),
        story: prev.story.map(card => card.choiceId === deletionModalState.choice.id ? { ...card, choiceId: undefined } : card),
      }));
      if (selectedItemId === deletionModalState.choice.id) setSelectedItemId(null);
    } else if (deletionModalState.type === 'delete-stuff-set') {
       setGameData(prev => ({
        ...prev,
        stuff: prev.stuff.filter(s => s.id !== deletionModalState.stuffSet.id),
        // Also remove this stuff from any templates that use it
        templates: prev.templates.map(t => ({
          ...t,
          includedStuff: (t.includedStuff || []).filter(is => is.setId !== deletionModalState.stuffSet.id),
        }))
      }));
      if (selectedItemId === deletionModalState.stuffSet.id) setSelectedItemId(null);
    }
    setDeletionModalState({ type: 'none' });
  };

  const handleSaveTemplate = (templateToSave: Template) => {
    if (editingState.mode === 'new-template') {
      setGameData(prev => ({ ...prev, templates: [...prev.templates, templateToSave] }));
    } else {
      setGameData(prev => ({ ...prev, templates: prev.templates.map(t => t.id === templateToSave.id ? templateToSave : t)}));
    }
    setEditingState({ mode: 'none' });
    setSelectedItemId(templateToSave.id);
  }

  const handleSaveEntity = (entityToSave: Entity) => {
    if (editingState.mode === 'new-entity') {
      setGameData(prev => ({ ...prev, entities: [...prev.entities, entityToSave] }));
    } else {
      setGameData(prev => ({ ...prev, entities: prev.entities.map(e => e.id === entityToSave.id ? entityToSave : e)}));
    }
    setEditingState({ mode: 'none' });
    setSelectedItemId(entityToSave.id);
  }

  const handleSaveStoryCard = (cardToSave: StoryCard) => {
    if (editingState.mode === 'new-story-card') {
      setGameData(prev => ({ ...prev, story: [...prev.story, cardToSave] }));
    } else {
      setGameData(prev => ({ ...prev, story: prev.story.map(c => c.id === cardToSave.id ? cardToSave : c)}));
    }
    setEditingState({ mode: 'none' });
    setSelectedItemId(cardToSave.id);
  };

  const handleSaveChoice = (choiceToSave: PlayerChoice) => {
    if (editingState.mode === 'new-choice') {
      setGameData(prev => ({ ...prev, choices: [...prev.choices, choiceToSave] }));
    } else {
      setGameData(prev => ({ ...prev, choices: prev.choices.map(c => c.id === choiceToSave.id ? choiceToSave : c)}));
    }
    setEditingState({ mode: 'none' });
    setSelectedItemId(choiceToSave.id);
  };

  const handleSaveStuffSet = (stuffSetToSave: StuffSet) => {
    if (editingState.mode === 'new-stuff-set') {
      setGameData(prev => ({ ...prev, stuff: [...prev.stuff, stuffSetToSave] }));
    } else {
      setGameData(prev => ({ ...prev, stuff: prev.stuff.map(s => s.id === stuffSetToSave.id ? stuffSetToSave : s)}));
    }
    setEditingState({ mode: 'none' });
    setSelectedItemId(stuffSetToSave.id);
  };

  const handleMoveStoryCard = (cardId: string, direction: 'up' | 'down') => {
    setGameData(prev => {
      const cards = [...prev.story];
      const index = cards.findIndex(c => c.id === cardId);
      if (index === -1) return prev;
      if (direction === 'up' && index > 0) {
        [cards[index - 1], cards[index]] = [cards[index], cards[index - 1]];
      } else if (direction === 'down' && index < cards.length - 1) {
        [cards[index + 1], cards[index]] = [cards[index], cards[index + 1]];
      }
      return { ...prev, story: cards };
    });
  };

  const handleCancelEdit = () => {
    setEditingState({ mode: 'none' });
  }
  
  const handleGenerateImage = useCallback(async (prompt: string, onUpdate: (base64: string) => void) => {
    setIsGenerating('story_image');
    try {
        const imageBase64 = await generateImageFromPrompt(prompt);
        onUpdate(`data:image/jpeg;base64,${imageBase64}`);
    } catch (error) {
        console.error(error);
        alert((error as Error).message);
    } finally {
        setIsGenerating(null);
    }
  }, []);

  const handleGenerateContent = useCallback(async (entity: Entity, attributeId: string, onUpdate: (entity: Entity) => void) => {
    const template = gameData.templates.find(t => t.id === entity.templateId);
    if (!template) return;
    const attribute = template.attributes.find(a => a.id === attributeId);
    if (!attribute) return;


    setIsGenerating(attribute.id);
    const prompt = `Generate a gritty, cyberpunk-themed "${attribute.name}" for a ${template.name} named "${entity.name}" in a colony called "${gameData.colonyName}". The content should be concise and evocative (2-4 sentences).`;
    const content = await generateStoryContent(prompt);
    
    const updatedEntity = { 
        ...entity, 
        attributeValues: {
            ...entity.attributeValues,
            [attribute.id]: content
        } 
    };
    onUpdate(updatedEntity);
    setIsGenerating(null);
  }, [gameData.colonyName, gameData.templates]);

  const handleExport = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(gameData, null, 2))}`;
    const link = document.createElement('a');
    link.href = jsonString;
    link.download = `${gameData.colonyName.replace(/\s+/g, '_') || 'megawatt_colony'}.json`;
    link.click();
  };
  
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result;
          if (typeof text === 'string') {
            const importedData = JSON.parse(text);
            // Basic validation
            if (importedData.colonyName && Array.isArray(importedData.templates) && Array.isArray(importedData.entities)) {
              setGameData(importedData);
              alert('Game data imported successfully!');
            } else {
              alert('Invalid game data file format.');
            }
          }
        } catch (error) {
          console.error('Error parsing JSON:', error);
          alert('Failed to import file. Make sure it is a valid JSON file.');
        }
      };
      reader.readAsText(file);
    }
  };

  const filteredEntities = useMemo(() => {
    if (entityFilter === 'all') return gameData.entities;
    return gameData.entities.filter(e => e.templateId === entityFilter);
  }, [entityFilter, gameData.entities]);

  const TabButton = ({ tab, icon, label }: { tab: EditorTabs; icon: JSX.Element; label: string }) => (
    <button onClick={() => { setActiveTab(tab); setSelectedItemId(null); setEditingState({mode: 'none'}) }} className={`flex flex-col items-center justify-center p-3 space-y-1 w-full text-xs transition duration-300 ${activeTab === tab ? 'bg-gray-700 text-cyan-300' : 'text-gray-400 hover:bg-gray-800'}`}>
      {icon}
      <span>{label}</span>
    </button>
  );

  const listItems = useMemo(() => {
    switch (activeTab) {
      case 'templates': return gameData.templates;
      case 'entities': return filteredEntities;
      case 'story': return gameData.story;
      case 'gameplay': return gameData.choices;
      case 'stuff': return gameData.stuff;
      default: return [];
    }
  }, [activeTab, gameData, filteredEntities]);

  const currentSelectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    const allItems = [...gameData.templates, ...gameData.entities, ...gameData.story, ...gameData.choices, ...gameData.stuff];
    return allItems.find(item => item.id === selectedItemId) || null;
  }, [selectedItemId, gameData]);


  const renderSummary = () => {
     if (!currentSelectedItem) {
      return <div className="flex items-center justify-center h-full text-gray-500 p-8 text-center">
        {editingState.mode === 'none' ? 'Select an item from the list to view its summary, or create a new one.' : 'Editing...'}
        </div>;
    }

    if ('items' in currentSelectedItem) { // It's a StuffSet
      const stuffSet = currentSelectedItem as StuffSet;
      return (
        <div className="p-8 space-y-6">
          <h2 className="text-3xl font-bold text-cyan-300">{stuffSet.name}</h2>
          <p className="text-gray-400">{stuffSet.description || <i>No description.</i>}</p>
          <div>
            <h4 className="text-lg font-semibold text-gray-300 mb-2">Items in this Set</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              {stuffSet.items.length > 0 ? stuffSet.items.map(item => (
                <li key={item.id}>{item.name} <span className="text-gray-500">({item.category})</span></li>
              )) : <li className="text-gray-500 text-sm list-none">No items defined in this set.</li>}
            </ul>
          </div>
        </div>
      );
    }

    if ('prompt' in currentSelectedItem) { // It's a PlayerChoice
      const choice = currentSelectedItem as PlayerChoice;
      const options = choice.choiceType === 'static' ? choice.staticOptions || [] : [];

      return (
         <div className="p-8 space-y-6">
            <h2 className="text-3xl font-bold text-cyan-300">{choice.name}</h2>
            <div className="pt-4">
                <h4 className="text-lg font-semibold text-gray-300 mb-2">Player Prompt</h4>
                <p className="text-gray-400 italic mb-3">"{choice.prompt}"</p>
                <h4 className="text-lg font-semibold text-gray-300 mb-2">Type</h4>
                <p className="text-gray-300">{choice.choiceType === 'static' ? 'Static Options' : 'Dynamic from Template'}</p>
                {choice.choiceType === 'static' && (
                  <>
                    <h4 className="text-lg font-semibold text-gray-300 mt-4 mb-2">Options</h4>
                    <ul className="list-disc list-inside space-y-2">
                        {options.map(opt => (
                            <li key={opt.id} className="text-gray-300">
                               <span className="font-semibold">{opt.card.description?.substring(0, 50) || 'Card'}...</span>
                               <span className="text-xs text-gray-500 ml-2">({opt.outcome.type})</span>
                            </li>
                        ))}
                    </ul>
                   </>
                )}
                 {choice.choiceType === 'dynamic_from_template' && choice.dynamicConfig && (
                   <div className="mt-4 space-y-2">
                      <p className="text-gray-400">Generates cards from entities using the <span className="font-semibold text-cyan-400">{gameData.templates.find(t => t.id === choice.dynamicConfig?.sourceTemplateId)?.name}</span> template.</p>
                   </div>
                 )}
            </div>
         </div>
      );
    }

    if ('imagePrompt' in currentSelectedItem) { // It's a StoryCard
      const card = currentSelectedItem as StoryCard;
      const linkedChoice = card.choiceId ? gameData.choices.find(c => c.id === card.choiceId) : null;
      return (
        <div className="p-8 space-y-6">
          <h2 className="text-3xl font-bold text-cyan-300">Story Card</h2>
          <p className="text-gray-300 whitespace-pre-wrap">{card.description}</p>
          <div>
            <h4 className="text-lg font-semibold text-gray-300 mb-2">Image Prompt</h4>
            <p className="text-gray-400 italic">{card.imagePrompt || "No prompt provided."}</p>
          </div>
          {card.imageBase64 && (
             <div>
                <h4 className="text-lg font-semibold text-gray-300 mb-2">Background Image</h4>
                <img src={card.imageBase64} alt="Story background" className="rounded-lg max-w-sm border border-gray-600"/>
             </div>
          )}
           {card.foregroundImageBase64 && (
             <div>
                <h4 className="text-lg font-semibold text-gray-300 mb-2">Foreground Image</h4>
                <img src={card.foregroundImageBase64} alt="Story foreground" className="rounded-lg max-w-xs border border-gray-600 bg-black/20"/>
             </div>
          )}
           {linkedChoice && (
             <div className="pt-4 border-t border-gray-600">
                <h4 className="text-lg font-semibold text-gray-300 mb-2">Linked Player Choice</h4>
                <p className="text-gray-400 italic">"{linkedChoice.prompt}"</p>
             </div>
          )}
        </div>
      );
    }

    if ('attributes' in currentSelectedItem) { // It's a Template
      const template = currentSelectedItem as Template;
      return (
        <div className="p-8 space-y-6">
          <h2 className="text-3xl font-bold text-cyan-300">{template.name}</h2>
          <p className="text-gray-400">{template.description || <i>No description.</i>}</p>
          <div>
            <h4 className="text-lg font-semibold text-gray-300 mb-2">Tags</h4>
            <div className="flex flex-wrap gap-2">
              {template.tags.length > 0 ? template.tags.map(tag => (
                <span key={tag} className="bg-cyan-800/50 text-cyan-200 text-xs font-medium px-2.5 py-1 rounded-full">{tag}</span>
              )) : <span className="text-gray-500 text-sm">No tags.</span>}
            </div>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-gray-300 mb-2">Attributes</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              {template.attributes.length > 0 ? template.attributes.map(attr => (
                <li key={attr.id}>{attr.name} <span className="text-gray-500">({attr.type})</span></li>
              )) : <li className="text-gray-500 text-sm list-none">No attributes defined.</li>}
            </ul>
          </div>
        </div>
      );
    } else { // It's an Entity
      const entity = currentSelectedItem as Entity;
      const template = gameData.templates.find(t => t.id === entity.templateId);
      if (!template) return <div className="p-6 text-red-400">Error: Cannot find template for this entity.</div>;

      return (
        <div className="p-8 space-y-6">
            <h2 className="text-3xl font-bold text-teal-300">{entity.name}</h2>
            <p className="text-gray-400 italic">Instance of <span className="font-semibold text-gray-300">{template.name}</span></p>
             <div className="space-y-4 pt-4 border-t border-gray-700">
                {template.attributes.length > 0 ? template.attributes.map(attr => {
                  const value = entity.attributeValues[attr.id];
                  let displayValue: React.ReactNode = <i className="text-gray-500">Not set</i>;

                  if (value) {
                     if (attr.type === 'entity_reference') {
                      const referencedEntity = gameData.entities.find(e => e.id === value);
                      displayValue = referencedEntity ? referencedEntity.name : <i className="text-red-400">Invalid Reference</i>;
                    } else {
                      displayValue = String(value);
                    }
                  }
                  
                  return (
                    <div key={attr.id}>
                      <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{attr.name}</h4>
                      <p className="text-gray-200 whitespace-pre-wrap">{displayValue}</p>
                    </div>
                  );
                }) : <p className="text-gray-500">This entity's template has no attributes.</p>}
            </div>
        </div>
      )
    }
  };
  
  const getButtonTitle = () => {
    if (activeTab === 'entities' && (!entityFilter || entityFilter === 'all')) {
      return "Select a template first";
    }
    switch (activeTab) {
      case 'templates': return 'Add New Template';
      case 'entities': return 'Add New Entity';
      case 'story': return 'Add New Story Card';
      case 'gameplay': return 'Add New Choice';
      case 'stuff': return 'Add New Set';
      default: return '';
    }
  };

  const renderMainPanel = () => {
    switch (editingState.mode) {
        case 'new-template':
        case 'edit-template':
            return <TemplateEditor 
                key={editingState.template.id}
                initialTemplate={editingState.template}
                onSave={handleSaveTemplate}
                onCancel={handleCancelEdit}
                gameData={gameData}
                isNew={editingState.mode === 'new-template'}
            />;
        case 'new-entity':
        case 'edit-entity':
            return <EntityEditor
                key={editingState.entity.id}
                initialEntity={editingState.entity}
                onSave={handleSaveEntity}
                onCancel={handleCancelEdit}
                gameData={gameData}
                onGenerate={handleGenerateContent}
                isGenerating={isGenerating}
                isNew={editingState.mode === 'new-entity'}
            />;
        case 'new-story-card':
        case 'edit-story-card':
            return <StoryCardEditor
                key={editingState.card.id}
                initialCard={editingState.card}
                onSave={handleSaveStoryCard}
                onCancel={handleCancelEdit}
                onGenerateImage={handleGenerateImage}
                isGenerating={isGenerating === 'story_image'}
                isNew={editingState.mode === 'new-story-card'}
                choices={gameData.choices}
            />;
        case 'new-choice':
        case 'edit-choice':
            return <ChoiceEditor
                key={editingState.choice.id}
                initialChoice={editingState.choice}
                onSave={handleSaveChoice}
                onCancel={handleCancelEdit}
                gameData={gameData}
                isNew={editingState.mode === 'new-choice'}
                onGenerateImage={handleGenerateImage}
                isGeneratingImage={isGenerating === 'story_image'}
            />;
        case 'new-stuff-set':
        case 'edit-stuff-set':
            return <StuffEditor
                key={editingState.stuffSet.id}
                initialStuffSet={editingState.stuffSet}
                onSave={handleSaveStuffSet}
                onCancel={handleCancelEdit}
                isNew={editingState.mode === 'new-stuff-set'}
            />;
        case 'none':
        default:
            return <div className="flex-1 bg-gray-800 overflow-y-auto">{renderSummary()}</div>;
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-gray-200">
      <nav className="w-20 bg-gray-950 flex flex-col items-center pt-5 space-y-4 border-r border-gray-800">
        <TabButton tab="world" icon={<GlobeAltIcon className="w-6 h-6"/>} label="World" />
        <TabButton tab="story" icon={<BookOpenIcon className="w-6 h-6"/>} label="Story" />
        <TabButton tab="gameplay" icon={<BoltIcon className="w-6 h-6"/>} label="Gameplay" />
        <TabButton tab="stuff" icon={<ArchiveBoxIcon className="w-6 h-6"/>} label="Stuff" />
        <TabButton tab="templates" icon={<CubeTransparentIcon className="w-6 h-6"/>} label="Templates" />
        <TabButton tab="entities" icon={<RectangleStackIcon className="w-6 h-6"/>} label="Entities" />
      </nav>

      {activeTab !== 'world' && (
        <aside className="w-80 bg-gray-800/50 border-r border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700">
                <h2 className="text-lg font-semibold capitalize">{activeTab}</h2>
                 {activeTab === 'entities' && (
                    <select value={entityFilter} onChange={e => {setEntityFilter(e.target.value); setSelectedItemId(null); setEditingState({mode: 'none'});}} className="w-full mt-2 bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm">
                        <option value="all">-- All Templates --</option>
                        {gameData.templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                )}
            </div>
            <div className="p-4 border-b border-gray-700">
                <button 
                    onClick={handleAddItem}
                    disabled={activeTab === 'entities' && (!entityFilter || entityFilter === 'all')}
                    className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-cyan-300 font-bold py-2 px-4 rounded transition duration-300 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
                    title={getButtonTitle()}
                >
                    <PlusIcon className="w-5 h-5" />
                    {getButtonTitle()}
                </button>
            </div>
            <ul className="flex-grow overflow-y-auto">
                {listItems.length > 0 ? (
                    listItems.map((item: any, index: number) => {
                        const isStoryCard = 'imagePrompt' in item && !('prompt' in item);
                        const isTemplate = 'attributes' in item && !('items' in item);
                        const isChoice = 'prompt' in item;
                        const isStuffSet = 'items' in item;

                        const handleEdit = () => {
                            setSelectedItemId(item.id);
                             if (isTemplate) setEditingState({ mode: 'edit-template', template: item as Template });
                             else if (isStoryCard) setEditingState({ mode: 'edit-story-card', card: item as StoryCard });
                             else if (isChoice) setEditingState({ mode: 'edit-choice', choice: item as PlayerChoice });
                             else if (isStuffSet) setEditingState({ mode: 'edit-stuff-set', stuffSet: item as StuffSet });
                             else setEditingState({ mode: 'edit-entity', entity: item as Entity });
                        };

                        const handleDelete = () => {
                             if (isTemplate) setDeletionModalState({ type: 'delete-template', template: item as Template });
                             else if (isStoryCard) setDeletionModalState({ type: 'delete-story-card', card: item as StoryCard });
                             else if (isChoice) setDeletionModalState({ type: 'delete-choice', choice: item as PlayerChoice });
                             else if (isStuffSet) setDeletionModalState({ type: 'delete-stuff-set', stuffSet: item as StuffSet });
                             else setDeletionModalState({ type: 'delete-entity', entity: item as Entity });
                        }

                        let itemName = 'name' in item ? item.name : (item as StoryCard).description;
                        
                        return (
                        <li key={item.id} className={`flex items-center justify-between group transition duration-200 ${selectedItemId === item.id && editingState.mode === 'none' ? 'bg-cyan-600/30' : 'hover:bg-gray-700'}`}>
                            <button onClick={() => {setSelectedItemId(item.id); setEditingState({mode: 'none'})}} className="flex-grow text-left p-3 text-sm truncate">
                                {isStoryCard ? `Card ${index + 1}: ${itemName}` : itemName}
                            </button>
                            <div className="flex items-center pr-2">
                               {isStoryCard && (
                                <>
                                  <button onClick={() => handleMoveStoryCard(item.id, 'up')} disabled={index === 0} className="p-1 text-gray-400 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed"><ArrowUpIcon className="w-4 h-4" /></button>
                                  <button onClick={() => handleMoveStoryCard(item.id, 'down')} disabled={index === listItems.length - 1} className="p-1 text-gray-400 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed"><ArrowDownIcon className="w-4 h-4" /></button>
                                </>
                               )}
                               <button onClick={handleEdit} className="p-1 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"><PencilIcon className="w-4 h-4" /></button>
                               <button onClick={handleDelete} className="p-1 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="w-4 h-4" /></button>
                            </div>
                        </li>
                    )})
                ) : (
                    <li className="p-4 text-center text-sm text-gray-500 italic">
                        {activeTab === 'templates' && "No templates created yet."}
                        {activeTab === 'entities' && "No entities for this template."}
                        {activeTab === 'story' && "No story cards yet."}
                        {activeTab === 'gameplay' && "No choices defined yet."}
                        {activeTab === 'stuff' && "No 'Stuff' sets created yet."}
                        <br/>
                         Click the "Add New..." button above to get started.
                    </li>
                )}
            </ul>
        </aside>
      )}

      <main className="flex-1 flex flex-col">
        {activeTab === 'world' ? (
            <div className="p-8">
                <h1 className="text-3xl font-bold text-cyan-300 mb-6">World Settings</h1>
                <div className="max-w-md space-y-8">
                    <div>
                      <label htmlFor="colonyName" className="block text-lg font-medium text-gray-400 mb-2">Colony Name</label>
                      <input
                          id="colonyName"
                          type="text"
                          value={gameData.colonyName}
                          onChange={handleColonyNameChange}
                          className="w-full text-2xl bg-gray-800 border-2 border-gray-600 rounded-md p-3 focus:ring-cyan-500 focus:border-cyan-500"
                          placeholder="e.g., Neo-Sector 7"
                      />
                    </div>

                    <div className="space-y-4 pt-8 border-t border-gray-700">
                      <h2 className="text-xl font-semibold text-gray-300">Data Management</h2>
                      <div className="flex space-x-4">
                        <button onClick={handleExport} className="flex items-center justify-center gap-2 w-full bg-gray-700 hover:bg-gray-600 text-cyan-300 font-bold py-2 px-4 rounded transition duration-300">
                          <ArrowDownTrayIcon className="w-5 h-5" />
                          Export to JSON
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 w-full bg-gray-700 hover:bg-gray-600 text-cyan-300 font-bold py-2 px-4 rounded transition duration-300">
                          <ArrowUpTrayIcon className="w-5 h-5" />
                          Import from JSON
                        </button>
                        <input type="file" accept=".json" ref={fileInputRef} onChange={handleImport} className="hidden" />
                      </div>
                    </div>
                </div>
            </div>
        ) : (
           renderMainPanel()
        )}
      </main>

      <Modal
        isOpen={deletionModalState.type !== 'none'}
        onClose={() => setDeletionModalState({ type: 'none' })}
        title="Confirm Deletion"
      >
        <div className="text-gray-300">
          <p>Are you sure you want to delete <strong className="text-white">
            {deletionModalState.type === 'delete-template' && deletionModalState.template.name}
            {deletionModalState.type === 'delete-entity' && deletionModalState.entity.name}
             {deletionModalState.type === 'delete-story-card' && 'this story card'}
             {deletionModalState.type === 'delete-choice' && deletionModalState.choice.name}
             {deletionModalState.type === 'delete-stuff-set' && deletionModalState.stuffSet.name}
          </strong>?</p>
          {deletionModalState.type === 'delete-template' && <p className="mt-2 text-sm text-yellow-400">This will also delete all entities created from this template. This action cannot be undone.</p>}
          {deletionModalState.type === 'delete-choice' && <p className="mt-2 text-sm text-yellow-400">Any story cards using this choice will be unlinked. This action cannot be undone.</p>}
          {deletionModalState.type === 'delete-stuff-set' && <p className="mt-2 text-sm text-yellow-400">Any templates using this set will have it removed. This action cannot be undone.</p>}

          {deletionModalState.type !== 'none' && !['delete-template', 'delete-choice', 'delete-stuff-set'].includes(deletionModalState.type) && <p className="mt-2 text-sm text-yellow-400">This action cannot be undone.</p>}
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <button onClick={() => setDeletionModalState({ type: 'none' })} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 text-white font-semibold transition-colors">Cancel</button>
          <button onClick={handleDeleteConfirmed} className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors">Delete</button>
        </div>
      </Modal>

    </div>
  );
};