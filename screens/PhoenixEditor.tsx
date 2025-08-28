import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { GameData, Template, Entity, AttributeDefinition, StoryCard } from '../types';
import { generateStoryContent, generateImageFromPrompt } from '../services/geminiService';
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


type EditorTabs = 'world' | 'story' | 'templates' | 'entities';

type DeletionModalState = 
  | { type: 'none' }
  | { type: 'delete-template'; template: Template }
  | { type: 'delete-entity'; entity: Entity }
  | { type: 'delete-story-card'; card: StoryCard };

type EditingState =
  | { mode: 'none' }
  | { mode: 'edit-template'; template: Template }
  | { mode: 'new-template'; template: Template }
  | { mode: 'edit-entity'; entity: Entity }
  | { mode: 'new-entity'; entity: Entity }
  | { mode: 'edit-story-card'; card: StoryCard }
  | { mode: 'new-story-card'; card: StoryCard };

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

  const handleGenerateContent = useCallback(async (entity: Entity, attribute: AttributeDefinition, onUpdate: (entity: Entity) => void) => {
    const template = gameData.templates.find(t => t.id === entity.templateId);
    if (!template) return;

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
      default: return [];
    }
  }, [activeTab, gameData.templates, gameData.story, filteredEntities]);

  const currentSelectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    const allItems = [...gameData.templates, ...gameData.entities, ...gameData.story];
    return allItems.find(item => item.id === selectedItemId) || null;
  }, [selectedItemId, gameData.templates, gameData.entities, gameData.story]);


  const renderSummary = () => {
     if (!currentSelectedItem) {
      return <div className="flex items-center justify-center h-full text-gray-500 p-8 text-center">
        {editingState.mode === 'none' ? 'Select an item from the list to view its summary, or create a new one.' : 'Editing...'}
        </div>;
    }

    if ('imagePrompt' in currentSelectedItem) { // It's a StoryCard
      const card = currentSelectedItem as StoryCard;
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
      return "Select a template first to add an entity";
    }
    switch (activeTab) {
      case 'templates': return 'Add New Template';
      case 'entities': return 'Add New Entity';
      case 'story': return 'Add New Story Card';
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
                templates={gameData.templates}
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
                    listItems.map((item, index) => {
                        const isStoryCard = activeTab === 'story';
                        const isTemplate = activeTab === 'templates';
                        
                        const handleEdit = () => {
                            setSelectedItemId(item.id);
                             if (isTemplate) setEditingState({ mode: 'edit-template', template: item as Template });
                             else if (isStoryCard) setEditingState({ mode: 'edit-story-card', card: item as StoryCard });
                             else setEditingState({ mode: 'edit-entity', entity: item as Entity });
                        };

                        const handleDelete = () => {
                             if (isTemplate) setDeletionModalState({ type: 'delete-template', template: item as Template });
                             else if (isStoryCard) setDeletionModalState({ type: 'delete-story-card', card: item as StoryCard });
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
          </strong>?</p>
          {deletionModalState.type === 'delete-template' && <p className="mt-2 text-sm text-yellow-400">This will also delete all entities created from this template. This action cannot be undone.</p>}
           {deletionModalState.type !== 'none' && deletionModalState.type !== 'delete-template' && <p className="mt-2 text-sm text-yellow-400">This action cannot be undone.</p>}
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <button onClick={() => setDeletionModalState({ type: 'none' })} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 text-white font-semibold transition-colors">Cancel</button>
          <button onClick={handleDeleteConfirmed} className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors">Delete</button>
        </div>
      </Modal>

    </div>
  );
};

const StyleSelect: React.FC<{label: string, value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, children: React.ReactNode, wrapperClassName?: string}> = ({label, value, onChange, children, wrapperClassName}) => (
    <div className={wrapperClassName}>
        <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
        <select value={value} onChange={onChange} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm">
            {children}
        </select>
    </div>
);

const StyleNumberInput: React.FC<{label: string, value: number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, step?: number, min?: number, wrapperClassName?: string}> = ({label, value, onChange, step=0.1, min=0, wrapperClassName}) => (
    <div className={wrapperClassName}>
        <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
        <input type="number" value={value} onChange={onChange} step={step} min={min} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm" />
    </div>
);

const StyleRadio: React.FC<{label: string, name: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, options: {value: string, label: string}[]}> = ({label, name, value, onChange, options}) => (
    <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
        <div className="flex items-center space-x-2 bg-gray-900 border border-gray-600 rounded-md p-1">
            {options.map(opt => (
                <label key={opt.value} className={`flex-1 text-center text-sm px-2 py-1 rounded-md cursor-pointer transition-colors ${value === opt.value ? 'bg-cyan-600 text-white' : 'hover:bg-gray-700'}`}>
                    <input type="radio" name={name} value={opt.value} checked={value === opt.value} onChange={onChange} className="sr-only" />
                    {opt.label}
                </label>
            ))}
        </div>
    </div>
);


// Story Card Editor Component
const StoryCardEditor = ({ initialCard, onSave, onCancel, onGenerateImage, isGenerating, isNew }: { initialCard: StoryCard, onSave: (c: StoryCard) => void, onCancel: () => void, onGenerateImage: (prompt: string, onUpdate: (base64: string) => void) => void, isGenerating: boolean, isNew: boolean }) => {
    const [localCard, setLocalCard] = useState<StoryCard>(() => JSON.parse(JSON.stringify(initialCard)));
    const bgInputRef = useRef<HTMLInputElement>(null);
    const fgInputRef = useRef<HTMLInputElement>(null);

    const handleGenerate = () => {
        if (localCard.imagePrompt) {
            onGenerateImage(localCard.imagePrompt, (base64) => {
                setLocalCard(prev => ({ ...prev, imageBase64: base64 }));
            });
        }
    };
    
    const handleFileUpload = (file: File | null, field: 'imageBase64' | 'foregroundImageBase64') => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (typeof e.target?.result === 'string') {
                    setLocalCard(prev => ({...prev, [field]: e.target.result}));
                }
            };
            reader.readAsDataURL(file);
        } else if (file) {
            alert('Please select a valid image file.');
        }
    }

    const updateStyle = (key: keyof NonNullable<StoryCard['styles']>, value: any) => {
        setLocalCard(prev => ({
            ...prev,
            styles: {
                ...(prev.styles || {}),
                [key]: value
            }
        }));
    };

    const updateFgStyle = (key: keyof NonNullable<StoryCard['styles']>['foregroundImageStyles'], value: any) => {
        setLocalCard(prev => ({
            ...prev,
            styles: {
                ...prev.styles,
                foregroundImageStyles: {
                    ...(prev.styles?.foregroundImageStyles || {}),
                    [key]: value,
                }
            }
        }));
    };
    
    const styles = useMemo(() => ({
        textPosition: localCard.styles?.textPosition || 'bottom',
        textAlign: localCard.styles?.textAlign || 'center',
        textColor: localCard.styles?.textColor || 'light',
        overlayStrength: localCard.styles?.overlayStrength || 'medium',
        backgroundAnimation: localCard.styles?.backgroundAnimation || 'kenburns-normal',
        backgroundAnimationDuration: localCard.styles?.backgroundAnimationDuration || 30,
        fontFamily: localCard.styles?.fontFamily || 'sans',
        fontSize: localCard.styles?.fontSize || 'normal',
        textWidth: localCard.styles?.textWidth || 'medium',
        backgroundEffect: localCard.styles?.backgroundEffect || 'none',
        cardTransition: localCard.styles?.cardTransition || 'fade',
        cardTransitionDuration: localCard.styles?.cardTransitionDuration || 0.6,
        textAnimation: localCard.styles?.textAnimation || 'fade-in',
        textAnimationDuration: localCard.styles?.textAnimationDuration || 1,
        textAnimationDelay: localCard.styles?.textAnimationDelay || 0.5,
        fg: {
            position: localCard.styles?.foregroundImageStyles?.position || 'center',
            size: localCard.styles?.foregroundImageStyles?.size || 'medium',
            animation: localCard.styles?.foregroundImageStyles?.animation || 'fade-in',
            animationDuration: localCard.styles?.foregroundImageStyles?.animationDuration || 1,
            animationDelay: localCard.styles?.foregroundImageStyles?.animationDelay || 1,
        }
    }), [localCard.styles]);

    // Preview Classes
    const previewPositionClasses = { top: 'justify-start', middle: 'justify-center', bottom: 'justify-end' }[styles.textPosition];
    const previewTextAlignClasses = { left: 'text-left', center: 'text-center', right: 'text-right' }[styles.textAlign];
    const previewFlexAlignClasses = { left: 'items-start', center: 'items-center', right: 'items-end' }[styles.textAlign];
    const previewColorClass = styles.textColor === 'light' ? 'text-white' : 'text-gray-900';
    const previewFontClass = { sans: 'font-sans', serif: 'font-serif', mono: 'font-mono' }[styles.fontFamily];
    const previewFontSizeClass = { normal: 'text-[0.5rem] leading-tight', large: 'text-[0.6rem] leading-tight', xlarge: 'text-[0.7rem] leading-tight' }[styles.fontSize];
    const previewWidthClass = { narrow: 'w-1/2', medium: 'w-3/4', wide: 'w-full' }[styles.textWidth];
    const previewBgEffectClass = { none: '', blur: 'blur-sm', darken: 'brightness-75' }[styles.backgroundEffect];
    
    const previewFgPositionClass = { left: 'justify-start', center: 'justify-center', right: 'justify-end'}[styles.fg.position];
    const previewFgSizeClass = { small: 'w-1/4', medium: 'w-1/3', large: 'w-1/2'}[styles.fg.size];

    return (
        <div className="flex-1 flex flex-col bg-gray-800">
            <header className="p-4 border-b border-gray-700">
                <h2 className="text-xl font-bold text-cyan-300">{isNew ? 'Creating New Story Card' : `Editing Story Card`}</h2>
            </header>
            <main className="flex-grow p-6 space-y-6 overflow-y-auto">
                 <div>
                    <label className="block text-sm font-medium text-gray-400">Description</label>
                    <textarea value={localCard.description} onChange={e => setLocalCard(prev => ({ ...prev, description: e.target.value }))} rows={4} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500"/>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-400">AI Background Prompt</label>
                    <textarea value={localCard.imagePrompt} onChange={e => setLocalCard(prev => ({ ...prev, imagePrompt: e.target.value }))} rows={2} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500" placeholder="e.g., A lone figure overlooking a vast cyberpunk city at night..."/>
                    <div className="flex space-x-2 mt-2">
                        <button onClick={handleGenerate} disabled={isGenerating || !localCard.imagePrompt} className="flex-1 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition duration-300">
                            {isGenerating ? 'Generating...' : 'Generate with AI'}
                        </button>
                        <button onClick={() => bgInputRef.current?.click()} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition duration-300">Upload Background</button>
                        <input type="file" accept="image/*" ref={bgInputRef} onChange={e => handleFileUpload(e.target.files?.[0] ?? null, 'imageBase64')} className="hidden"/>
                         {localCard.imageBase64 && <button onClick={() => setLocalCard(p => ({...p, imageBase64: undefined}))} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition duration-300">Clear</button>}
                    </div>
                </div>
                
                 <div className="space-y-4 pt-4 border-t border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-300">Styling Options</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Text Styling */}
                        <StyleSelect label="Text Position" value={styles.textPosition} onChange={e => updateStyle('textPosition', e.target.value)}><option value="top">Top</option><option value="middle">Middle</option><option value="bottom">Bottom</option></StyleSelect>
                        <StyleSelect label="Text Alignment" value={styles.textAlign} onChange={e => updateStyle('textAlign', e.target.value)}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></StyleSelect>
                        <StyleRadio label="Text Color" name="textColor" value={styles.textColor} onChange={e => updateStyle('textColor', e.target.value)} options={[{value: 'light', label: 'Light'}, {value: 'dark', label: 'Dark'}]} />
                        <StyleSelect label="Font Family" value={styles.fontFamily} onChange={e => updateStyle('fontFamily', e.target.value)}><option value="sans">Sans-Serif</option><option value="serif">Serif</option><option value="mono">Monospace</option></StyleSelect>
                        <StyleSelect label="Font Size" value={styles.fontSize} onChange={e => updateStyle('fontSize', e.target.value)}><option value="normal">Normal</option><option value="large">Large</option><option value="xlarge">X-Large</option></StyleSelect>
                        <StyleSelect label="Text Width" value={styles.textWidth} onChange={e => updateStyle('textWidth', e.target.value)}><option value="narrow">Narrow</option><option value="medium">Medium</option><option value="wide">Wide</option></StyleSelect>
                        
                        {/* Background & Overlay */}
                        <StyleSelect label="Overlay Strength" value={styles.overlayStrength} onChange={e => updateStyle('overlayStrength', e.target.value)}><option value="none">None</option><option value="light">Light</option><option value="medium">Medium</option><option value="heavy">Heavy</option></StyleSelect>
                        <StyleSelect label="Background Effect" value={styles.backgroundEffect} onChange={e => updateStyle('backgroundEffect', e.target.value)}><option value="none">None</option><option value="blur">Blur</option><option value="darken">Darken</option></StyleSelect>
                        <div></div>
                        
                        {/* Animations */}
                        <div className="grid grid-cols-[2fr_1fr] gap-2"><StyleSelect wrapperClassName="col-span-2" label="Background Animation" value={styles.backgroundAnimation} onChange={e => updateStyle('backgroundAnimation', e.target.value)}><option value="kenburns-normal">Ken Burns Normal</option><option value="kenburns-subtle">Ken Burns Subtle</option><option value="pan-left">Pan Left</option><option value="pan-right">Pan Right</option><option value="zoom-out">Zoom Out</option><option value="none">None</option></StyleSelect><StyleNumberInput wrapperClassName="col-span-2" label="Duration (s)" value={styles.backgroundAnimationDuration} onChange={e => updateStyle('backgroundAnimationDuration', e.target.valueAsNumber)} /></div>
                        <div className="grid grid-cols-[2fr_1fr] gap-2"><StyleSelect wrapperClassName="col-span-2" label="Card Transition" value={styles.cardTransition} onChange={e => updateStyle('cardTransition', e.target.value)}><option value="fade">Fade</option><option value="dissolve">Dissolve</option><option value="slide-left">Slide Left</option><option value="slide-up">Slide Up</option><option value="zoom-in">Zoom In</option></StyleSelect><StyleNumberInput wrapperClassName="col-span-2" label="Duration (s)" value={styles.cardTransitionDuration} onChange={e => updateStyle('cardTransitionDuration', e.target.valueAsNumber)} /></div>
                        <div className="grid grid-cols-2 gap-2"><StyleSelect wrapperClassName="col-span-2" label="Text Animation" value={styles.textAnimation} onChange={e => updateStyle('textAnimation', e.target.value)}><option value="fade-in">Fade In</option><option value="rise-up">Rise Up</option><option value="typewriter">Typewriter</option><option value="none">None</option></StyleSelect><StyleNumberInput label="Duration (s)" value={styles.textAnimationDuration} onChange={e => updateStyle('textAnimationDuration', e.target.valueAsNumber)} /><StyleNumberInput label="Delay (s)" value={styles.textAnimationDelay} onChange={e => updateStyle('textAnimationDelay', e.target.valueAsNumber)} /></div>
                    </div>
                 </div>

                 <fieldset className="space-y-4 pt-4 border-t border-gray-700">
                    <legend className="text-lg font-semibold text-gray-300 -mb-2 px-1">Foreground Image</legend>
                    <div className="flex space-x-2">
                        <button onClick={() => fgInputRef.current?.click()} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition duration-300">Upload Foreground</button>
                        <input type="file" accept="image/*" ref={fgInputRef} onChange={e => handleFileUpload(e.target.files?.[0] ?? null, 'foregroundImageBase64')} className="hidden"/>
                        {localCard.foregroundImageBase64 && <button onClick={() => setLocalCard(p => ({...p, foregroundImageBase64: undefined}))} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition duration-300">Clear</button>}
                    </div>
                    {localCard.foregroundImageBase64 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                             <StyleSelect label="Position" value={styles.fg.position} onChange={e => updateFgStyle('position', e.target.value)}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></StyleSelect>
                             <StyleSelect label="Size" value={styles.fg.size} onChange={e => updateFgStyle('size', e.target.value)}><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></StyleSelect>
                             <div></div>
                             <div className="grid grid-cols-2 gap-2">
                                <StyleSelect wrapperClassName="col-span-2" label="Animation" value={styles.fg.animation} onChange={e => updateFgStyle('animation', e.target.value)}><option value="none">None</option><option value="fade-in">Fade In</option><option value="slide-in-left">Slide-in Left</option><option value="slide-in-right">Slide-in Right</option><option value="zoom-in">Zoom In</option></StyleSelect>
                                <StyleNumberInput label="Duration (s)" value={styles.fg.animationDuration} onChange={e => updateFgStyle('animationDuration', e.target.valueAsNumber)} />
                                <StyleNumberInput label="Delay (s)" value={styles.fg.animationDelay} onChange={e => updateFgStyle('animationDelay', e.target.valueAsNumber)} />
                             </div>
                        </div>
                    )}
                 </fieldset>

                {(localCard.imageBase64 || localCard.description) && (
                     <div>
                        <h4 className="text-lg font-semibold text-gray-300 mb-2">Live Preview</h4>
                        <div className="relative aspect-video w-full max-w-lg bg-gray-900 rounded-lg border border-gray-600 overflow-hidden">
                            {localCard.imageBase64 && <img src={localCard.imageBase64} className={`absolute inset-0 w-full h-full object-cover transition-all ${previewBgEffectClass}`} />}
                            <div className={`absolute inset-0 flex p-2 ${previewPositionClasses} ${previewFlexAlignClasses}`}>
                                <p className={`${previewWidthClass} ${previewTextAlignClasses} ${previewColorClass} ${previewFontClass} ${previewFontSizeClass} [text-shadow:0_1px_4px_rgba(0,0,0,0.8)]`}>
                                    {localCard.description.substring(0, 100)}{localCard.description.length > 100 ? '...' : ''}
                                </p>
                            </div>
                            {localCard.foregroundImageBase64 && (
                                <div className={`absolute inset-0 flex items-center p-4 ${previewFgPositionClass}`}>
                                    <img src={localCard.foregroundImageBase64} className={`object-contain ${previewFgSizeClass} max-h-full`} alt="Foreground Preview"/>
                                </div>
                            )}
                        </div>
                     </div>
                )}
            </main>
            <footer className="p-4 flex justify-end space-x-3 border-t border-gray-700 bg-gray-800/50">
                <button onClick={onCancel} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 text-white font-semibold transition-colors">Cancel</button>
                <button onClick={() => onSave(localCard)} className="px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-700 text-white font-semibold transition-colors">Save Changes</button>
            </footer>
        </div>
    );
}

// Template Editor Component
const TemplateEditor = ({ initialTemplate, onSave, onCancel, templates, isNew }: { initialTemplate: Template, onSave: (t: Template) => void, onCancel: () => void, templates: Template[], isNew: boolean}) => {
    const [localTemplate, setLocalTemplate] = useState<Template>(() => JSON.parse(JSON.stringify(initialTemplate)));
    const [newTag, setNewTag] = useState('');

    const updateField = (field: keyof Template, value: any) => {
        setLocalTemplate(prev => ({ ...prev, [field]: value }));
    };

    const addAttribute = () => {
      const newAttr: AttributeDefinition = { id: `attr_${Date.now()}`, name: 'New Attribute', type: 'string' };
      updateField('attributes', [...localTemplate.attributes, newAttr]);
    };
    
    const updateAttribute = (attrId: string, updatedAttr: Partial<AttributeDefinition>) => {
      const newAttributes = localTemplate.attributes.map(a => a.id === attrId ? {...a, ...updatedAttr} : a);
      updateField('attributes', newAttributes);
    }
    
    const removeAttribute = (attrId: string) => {
      updateField('attributes', localTemplate.attributes.filter(a => a.id !== attrId));
    }

    return (
        <div className="flex-1 flex flex-col bg-gray-800">
            <header className="p-4 border-b border-gray-700">
                <h2 className="text-xl font-bold text-cyan-300">{isNew ? 'Creating New Template' : `Editing: ${initialTemplate.name}`}</h2>
            </header>
            <main className="flex-grow p-6 space-y-6 overflow-y-auto">
                 <div>
                    <label className="block text-sm font-medium text-gray-400">Name</label>
                    <input type="text" value={localTemplate.name} onChange={e => updateField('name', e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400">Description</label>
                    <textarea value={localTemplate.description} onChange={e => updateField('description', e.target.value)} rows={3} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500"/>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-400">Tags</label>
                    <div className="flex flex-wrap items-center gap-2 p-2 bg-gray-900 border border-gray-600 rounded-md">
                        {localTemplate.tags.map((tag) => (
                            <span key={tag} className="flex items-center bg-cyan-800/50 text-cyan-200 text-xs font-medium px-2.5 py-1 rounded-full">
                                {tag}
                                <button
                                    onClick={() => updateField('tags', localTemplate.tags.filter(t => t !== tag))}
                                    className="ml-1.5 -mr-1 w-4 h-4 flex items-center justify-center rounded-full text-cyan-200 hover:bg-red-500/50 hover:text-white transition-colors"
                                    aria-label={`Remove tag ${tag}`}
                                >&times;</button>
                            </span>
                        ))}
                        <input type="text" value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => {
                            if (e.key === 'Enter' && newTag.trim() !== '') {
                                e.preventDefault();
                                if (!localTemplate.tags.includes(newTag.trim())) {
                                    updateField('tags', [...localTemplate.tags, newTag.trim()]);
                                }
                                setNewTag('');
                            }
                        }} placeholder="Add tag..." className="bg-transparent flex-grow p-1 focus:outline-none min-w-[80px]" />
                    </div>
                </div>
                 <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-300 border-b border-gray-600 pb-2">Attributes</h4>
                    {localTemplate.attributes.map(attr => (
                        <div key={attr.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-center bg-gray-900/50 p-3 rounded-md">
                            <input type="text" placeholder="Attribute Name" value={attr.name} onChange={e => updateAttribute(attr.id, { name: e.target.value })} className="bg-gray-800 border border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500"/>
                            <select value={attr.type} onChange={e => updateAttribute(attr.id, { type: e.target.value as AttributeDefinition['type'], referencedTemplateId: null })} className="bg-gray-800 border border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500">
                                <option value="string">String</option>
                                <option value="textarea">Text Area</option>
                                <option value="number">Number</option>
                                <option value="entity_reference">Entity Reference</option>
                            </select>
                            <button onClick={() => removeAttribute(attr.id)} className="text-red-400 hover:text-red-300 justify-self-end p-1">Remove</button>
                            {attr.type === 'entity_reference' && (
                                <select value={attr.referencedTemplateId || ''} onChange={e => updateAttribute(attr.id, { referencedTemplateId: e.target.value })} className="bg-gray-800 border border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500 md:col-span-2">
                                    <option value="">-- Select Template --</option>
                                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            )}
                        </div>
                    ))}
                    <button onClick={addAttribute} className="w-full bg-gray-700 hover:bg-gray-600 text-cyan-300 font-bold py-2 px-4 rounded transition duration-300">Add Attribute</button>
                </div>
            </main>
            <footer className="p-4 flex justify-end space-x-3 border-t border-gray-700 bg-gray-800/50">
                <button onClick={onCancel} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 text-white font-semibold transition-colors">Cancel</button>
                <button onClick={() => onSave(localTemplate)} className="px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-700 text-white font-semibold transition-colors">Save Changes</button>
            </footer>
        </div>
    );
}

// Entity Editor Component
const EntityEditor = ({ initialEntity, onSave, onCancel, gameData, onGenerate, isGenerating, isNew }: { initialEntity: Entity, onSave: (e: Entity) => void, onCancel: () => void, gameData: GameData, onGenerate: (entity: Entity, attribute: AttributeDefinition, onUpdate: (entity: Entity) => void) => void, isGenerating: string | null, isNew: boolean}) => {
    const [localEntity, setLocalEntity] = useState<Entity>(() => JSON.parse(JSON.stringify(initialEntity)));

    const template = gameData.templates.find(t => t.id === localEntity.templateId);

    if (!template) {
        return <div className="p-6 text-red-400">Error: Cannot find template with ID {localEntity.templateId}</div>;
    }

    const handleAttributeValueChange = (attrId: string, value: string | number | null) => {
        setLocalEntity(prev => ({
            ...prev,
            attributeValues: { ...prev.attributeValues, [attrId]: value }
        }));
    };

    return (
        <div className="flex-1 flex flex-col bg-gray-800">
             <header className="p-4 border-b border-gray-700">
                <h2 className="text-xl font-bold text-cyan-300">{isNew ? 'Creating New Entity' : `Editing: ${initialEntity.name}`}</h2>
            </header>
            <main className="flex-grow p-6 space-y-6 overflow-y-auto">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
                    <input type="text" value={localEntity.name} onChange={e => setLocalEntity(prev => ({ ...prev, name: e.target.value }))} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-teal-500 focus:border-teal-500"/>
                </div>
                {template.attributes.map(attr => {
                    const value = localEntity.attributeValues[attr.id];
                    switch(attr.type) {
                        case 'textarea':
                            return (
                                <div key={attr.id}>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">{attr.name}</label>
                                    <textarea value={(value as string) || ''} onChange={e => handleAttributeValueChange(attr.id, e.target.value)} rows={6} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-teal-500 focus:border-teal-500"></textarea>
                                    <button onClick={() => onGenerate(localEntity, attr, setLocalEntity)} disabled={!!isGenerating} className="mt-2 w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition duration-300">
                                        {isGenerating === attr.id ? 'Generating...' : 'Generate with AI'}
                                    </button>
                                </div>
                            );
                        case 'number':
                             return (
                                <div key={attr.id}>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">{attr.name}</label>
                                    <input type="number" value={(value as number) || ''} onChange={e => handleAttributeValueChange(attr.id, e.target.valueAsNumber || null)} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-teal-500 focus:border-teal-500"/>
                                </div>
                            );
                        case 'entity_reference':
                            const referencedEntities = gameData.entities.filter(e => e.templateId === attr.referencedTemplateId);
                            return (
                                <div key={attr.id}>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">{attr.name}</label>
                                    <select value={(value as string) || ''} onChange={e => handleAttributeValueChange(attr.id, e.target.value || null)} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-teal-500 focus:border-teal-500">
                                        <option value="">-- Unassigned --</option>
                                        {referencedEntities.map(refE => <option key={refE.id} value={refE.id}>{refE.name}</option>)}
                                    </select>
                                </div>
                            );
                        case 'string':
                        default:
                            return (
                                <div key={attr.id}>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">{attr.name}</label>
                                    <input type="text" value={(value as string) || ''} onChange={e => handleAttributeValueChange(attr.id, e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-teal-500 focus:border-teal-500"/>
                                </div>
                            );
                    }
                })}
            </main>
             <footer className="p-4 flex justify-end space-x-3 border-t border-gray-700 bg-gray-800/50">
                <button onClick={onCancel} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 text-white font-semibold transition-colors">Cancel</button>
                <button onClick={() => onSave(localEntity)} className="px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-700 text-white font-semibold transition-colors">Save Changes</button>
            </footer>
        </div>
    );
}