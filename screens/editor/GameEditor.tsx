

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { GameData, Template, Entity, PlayerChoice, NewsItem, PhoenixProject, CompanyLauncherSettings, GameMenuSettings, GameCardStyle, ShowcaseImage, GameListStyle, GameListBackgroundType, GameListLayout, TextStyle, ChoiceChunk, ImageCredit, ImageStyle, Layout } from '../types';
import { GlobeAltIcon } from '../components/icons/GlobeAltIcon';
import { CubeTransparentIcon } from '../components/icons/CubeTransparentIcon';
import { RectangleStackIcon } from '../components/icons/RectangleStackIcon';
import { PencilIcon } from '../components/icons/PencilIcon';
import { TrashIcon } from '../components/icons/TrashIcon';
import { ArrowDownTrayIcon } from '../components/icons/ArrowDownTrayIcon';
import { ArrowUpTrayIcon } from '../components/icons/ArrowUpTrayIcon';
import { Modal } from '../components/Modal';
import { PlusIcon } from '../components/icons/PlusIcon';
import { BoltIcon } from '../components/icons/BoltIcon';
import { TemplateEditor } from './editor/TemplateEditor';
import { EntityEditor } from './editor/EntityEditor';
import { ChoiceEditor } from './editor/ChoiceEditor';
import { generateImageFromPrompt, generateStoryContent } from '../services/geminiService';
import { VALIDATORS } from '../services/dataValidationService';
import { Toast } from '../components/Toast';
import { DebugPanel } from '../components/DebugPanel';
import { BugAntIcon } from '../components/icons/BugAntIcon';
import { debugService } from '../services/debugService';
import { PlayIcon } from '../components/icons/PlayIcon';
import { PuzzlePieceIcon } from '../components/icons/PuzzlePieceIcon';
import { HelpTooltip } from '../components/HelpTooltip';
import { ArrowLeftIcon } from '../components/icons/ArrowLeftIcon';
import { RocketLaunchIcon } from '../components/icons/RocketLaunchIcon';
import { UserGroupIcon } from '../components/icons/UserGroupIcon';
import { StarIcon } from '../components/icons/StarIcon';
import { StyleRadio, StyleSelect } from '../components/editor/StyleComponents';
import { ToggleSwitch } from '../components/ToggleSwitch';
import { ArrowUpIcon } from '../components/icons/ArrowUpIcon';
import { ArrowDownIcon } from '../components/icons/ArrowDownIcon';
import { MegaWattGame } from './MegaWattGame';
import { CollapsibleSection } from '../components/CollapsibleSection';
import { ChevronDownIcon } from '../components/icons/ChevronDownIcon';
import { BookOpenIcon } from '../components/icons/BookOpenIcon';
import { FrameworkDoc } from './FrameworkDoc';
import { ImageInput } from '../components/editor/ImageInput';
import { Squares2X2Icon } from '../components/icons/Squares2X2Icon';
import { LayoutEditor } from './editor/LayoutEditor';

type EditorTabs = 'game_menu' | 'gameplay' | 'blueprints' | 'entities';
type TopLevelTabs = 'launcher' | 'games' | 'layouts' | 'framework';

type DeletionModalState = 
  | { type: 'none' }
  | { type: 'delete-game'; game: GameData }
  | { type: 'delete-layout'; layout: Layout }
  | { type: 'delete-template'; template: Template, descendantCount: number }
  | { type: 'delete-entity'; entity: Entity }
  | { type: 'delete-choice'; choice: PlayerChoice }
  | { type: 'delete-chunk', chunk: ChoiceChunk };

type EditingState =
  | { mode: 'none' }
  | { mode: 'edit-template'; template: Template }
  | { mode: 'new-template'; template: Template }
  | { mode: 'edit-entity'; entity: Entity }
  | { mode: 'new-entity'; entity: Entity }
  | { mode: 'edit-choice'; choice: PlayerChoice }
  | { mode: 'new-choice'; choice: PlayerChoice; chunkId: string }
  | { mode: 'edit-chunk'; chunk: ChoiceChunk }
  | { mode: 'new-chunk' }
  | { mode: 'edit-layout'; layout: Layout }
  | { mode: 'new-layout' };

interface PhoenixEditorProps {
  projectData: PhoenixProject;
  onCommitChange: (projectData: PhoenixProject) => void;
  onLoadProject: (jsonString: string) => void;
  onSaveProject: () => void;
  onStartSimulation: (game: GameData) => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

// Helper to get all descendants of a template
const getDescendantIds = (templateId: string, templates: Template[]): string[] => {
    let children = templates.filter(t => t.parentId === templateId);
    let descendantIds: string[] = children.map(c => c.id);
    children.forEach(child => {
        descendantIds = descendantIds.concat(getDescendantIds(child.id, templates));
    });
    return descendantIds;
};

const ShowcaseImageManager: React.FC<{
    images: ShowcaseImage[],
    onUpdate: (images: ShowcaseImage[]) => void,
    onGenerate: (prompt: string, onUpdateBase64: (base64: string) => void) => void,
    isGenerating: string | null,
    cardCoverImageId?: string,
    onSetCoverImage: (id: string) => void,
}> = ({ images, onUpdate, onGenerate, isGenerating, cardCoverImageId, onSetCoverImage }) => {
    
    const handleUpdateImage = (id: string, updatedImage: Partial<ShowcaseImage>) => {
        onUpdate(images.map(img => img.id === id ? {...img, ...updatedImage} : img));
    };

    const handleAddImage = () => {
        const newImage: ShowcaseImage = { id: `img_${Date.now()}`, prompt: '' };
        onUpdate([...images, newImage]);
    };

    const handleRemoveImage = (id: string) => {
        onUpdate(images.filter(img => img.id !== id));
    };

    const handleMoveImage = (index: number, direction: 'up' | 'down') => {
        const newImages = [...images];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newImages.length) return;
        [newImages[index], newImages[targetIndex]] = [newImages[targetIndex], newImages[index]];
        onUpdate(newImages);
    };

    return (
        <div className="space-y-3">
            {(images || []).map((image, index) => (
                <div key={image.id} className="bg-[var(--bg-panel-light)] p-3 rounded-lg flex gap-2">
                    <div className="flex-grow">
                       <ImageInput 
                            src={image.src}
                            prompt={image.prompt}
                            credit={image.credit}
                            style={image.style}
                            onUpdate={(updates) => handleUpdateImage(image.id, updates)}
                            onGenerateImage={onGenerate}
                            isGeneratingImage={isGenerating === 'image'}
                       />
                    </div>

                    <div className="flex flex-col justify-between items-center flex-shrink-0">
                        <div className="flex flex-col">
                            <button onClick={() => handleMoveImage(index, 'up')} disabled={index === 0} className="p-1 disabled:opacity-30"><ArrowUpIcon className="w-4 h-4" /></button>
                            <div className="relative">
                            <button
                                onClick={() => onSetCoverImage(image.id)}
                                className={`p-1 rounded-full transition-colors ${cardCoverImageId === image.id ? 'text-[var(--text-warning)]' : 'text-[var(--text-tertiary)] hover:bg-[var(--text-warning)]/20'}`}
                                title="Set as card cover image"
                            >
                                <StarIcon className="w-4 h-4" fill={cardCoverImageId === image.id ? 'currentColor' : 'none'} stroke="currentColor" />
                            </button>
                            <div className="absolute top-1/2 -right-3 -translate-y-1/2"><HelpTooltip title="Set as Cover Image" content="Designates this image as the main cover image for the game's card in the launcher." /></div>
                            </div>
                            <button onClick={() => handleMoveImage(index, 'down')} disabled={index === images.length - 1} className="p-1 disabled:opacity-30"><ArrowDownIcon className="w-4 h-4" /></button>
                        </div>
                        <button onClick={() => handleRemoveImage(image.id)} className="p-1"><TrashIcon className="w-4 h-4 text-[var(--text-danger)]/80 hover:text-[var(--text-danger)]"/></button>
                    </div>
                </div>
            ))}
            <button onClick={handleAddImage} className="w-full flex items-center justify-center gap-2 bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-bold py-2 px-4 rounded transition duration-300">
                <PlusIcon className="w-4 h-4" /> Add Showcase Image
            </button>
        </div>
    );
};


const NewsListEditor: React.FC<{
    news: NewsItem[],
    onAdd: () => void,
    onEdit: (item: NewsItem) => void,
    onDelete: (itemId: string) => void,
}> = ({ news, onAdd, onEdit, onDelete }) => (
    <div className="space-y-3">
        {(news || []).map(item => (
            <div key={item.id} className="bg-[var(--bg-panel-light)] p-3 rounded-md flex justify-between items-center">
                <div>
                    <p className="font-semibold text-[var(--text-primary)]">{item.title}</p>
                    <p className="text-sm text-[var(--text-secondary)]">{item.date} - <span className={`font-medium ${item.status === 'published' ? 'text-[var(--text-success)]' : 'text-[var(--text-warning)]'}`}>{item.status}</span></p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => onEdit(item)} className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><PencilIcon className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(item.id)} className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-danger)]"><TrashIcon className="w-4 h-4" /></button>
                </div>
            </div>
        ))}
        <button onClick={onAdd} className="w-full flex items-center justify-center gap-2 bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-bold py-2 px-4 rounded transition duration-300">
            <PlusIcon className="w-4 h-4" /> Add News Item
        </button>
    </div>
);

// FIX: Added missing ChunkEditorModal component.
const ChunkEditorModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (chunk: ChoiceChunk) => void;
    initialChunk: ChoiceChunk | null;
}> = ({ isOpen, onClose, onSave, initialChunk }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        if (initialChunk) {
            setName(initialChunk.name);
            setDescription(initialChunk.description);
        } else {
            setName('');
            setDescription('');
        }
    }, [initialChunk, isOpen]);

    const handleSave = () => {
        const chunkToSave: ChoiceChunk = {
            id: initialChunk?.id || `chunk_${Date.now()}`,
            name: name.trim() || 'Untitled Chunk',
            description,
            choiceIds: initialChunk?.choiceIds || [],
        };
        onSave(chunkToSave);
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={initialChunk ? 'Edit Chunk' : 'New Chunk'}>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Chunk Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2"
                        placeholder="e.g., Chapter 1"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Description</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2"
                        placeholder="A brief description of this group of scenes."
                    />
                </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
                <button onClick={onClose} className="px-4 py-2 rounded-md bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-semibold">Cancel</button>
                <button onClick={handleSave} className="px-4 py-2 rounded-md bg-[var(--bg-active)] hover:opacity-90 text-[var(--text-on-accent)] font-semibold">Save</button>
            </div>
        </Modal>
    );
};

// FIX: Added missing ChunkedList component.
const ChunkedList: React.FC<{
    chunk: ChoiceChunk;
    gameData: GameData;
    selectedItemId: string | null;
    setSelectedItemId: (id: string | null) => void;
    setEditingState: (state: EditingState) => void;
    setDeletionModalState: (state: DeletionModalState) => void;
    handleSetStartChoice: (id: string) => void;
    draggedChoice: { choiceId: string; sourceChunkId: string } | null;
    setDraggedChoice: (dragged: { choiceId: string; sourceChunkId: string } | null) => void;
    dropIndicator: { chunkId: string; index: number } | null;
    setDropIndicator: (indicator: { chunkId: string; index: number } | null) => void;
    onDropChoice: (targetChunkId: string, targetIndex: number) => void;
}> = ({
    chunk,
    gameData,
    selectedItemId,
    setSelectedItemId,
    setEditingState,
    setDeletionModalState,
    handleSetStartChoice,
    draggedChoice,
    setDraggedChoice,
    dropIndicator,
    setDropIndicator,
    onDropChoice
}) => {
    const [isExpanded, setIsExpanded] = useState(true);

    const choicesInChunk = (chunk.choiceIds || []).map(id => gameData.allChoices.find(c => c.id === id)).filter((c): c is PlayerChoice => !!c);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, choiceId: string) => {
        setDraggedChoice({ choiceId, sourceChunkId: chunk.id });
        e.dataTransfer.effectAllowed = 'move';
    };
    
    const handleDragEnd = () => {
        setDraggedChoice(null);
        setDropIndicator(null);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        e.preventDefault();
        if (draggedChoice) {
            setDropIndicator({ chunkId: chunk.id, index });
        }
    };
    
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDropIndicator(null);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        e.preventDefault();
        if (!draggedChoice) return;
        
        if (draggedChoice.sourceChunkId === chunk.id) {
            const originalIndex = (chunk.choiceIds || []).indexOf(draggedChoice.choiceId);
            if (index === originalIndex || index === originalIndex + 1) {
                setDropIndicator(null);
                return;
            }
        }
        
        onDropChoice(chunk.id, index);
    };

    return (
        <div className="bg-[var(--bg-panel-light)]/30 rounded-md border border-[var(--border-primary)]">
            <div className="flex items-center p-2 group bg-[var(--bg-panel)]/40">
                <button onClick={() => setIsExpanded(!isExpanded)} className="p-1">
                    <ChevronDownIcon className={`w-4 h-4 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                </button>
                <div className="flex-grow">
                    <h3 className="font-semibold text-[var(--text-primary)]">{chunk.name}</h3>
                </div>
                 <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditingState({mode: 'edit-chunk', chunk})} className="p-1"><PencilIcon className="w-4 h-4"/></button>
                    <button onClick={() => setDeletionModalState({type: 'delete-chunk', chunk})} className="p-1 text-[var(--text-danger)]"><TrashIcon className="w-4 h-4"/></button>
                </div>
            </div>
            {isExpanded && (
                <div 
                    className="p-1 space-y-1"
                    onDragLeave={handleDragLeave}
                >
                    <div onDrop={(e) => handleDrop(e, 0)} onDragOver={(e) => handleDragOver(e, 0)} className="h-2 -mb-1">
                        {dropIndicator?.chunkId === chunk.id && dropIndicator.index === 0 && <div className="h-1 bg-[var(--text-accent)] rounded-full mx-2" />}
                    </div>
                    {choicesInChunk.map((choice, index) => (
                        <div key={choice.id}>
                            <div
                                draggable
                                onDragStart={(e) => handleDragStart(e, choice.id)}
                                onDragEnd={handleDragEnd}
                                onClick={() => setSelectedItemId(choice.id)}
                                className={`p-2 rounded-md cursor-pointer flex justify-between items-center group/item ${selectedItemId === choice.id ? 'bg-[var(--bg-active)]/20' : 'hover:bg-[var(--bg-hover)]'}`}
                            >
                                <span className={`flex-grow text-sm ${selectedItemId === choice.id ? 'text-[var(--text-accent)]' : ''}`}>{choice.name}</span>
                                {/* FIX: The 'title' prop is not valid on SVG components for tooltips. Moved it to a wrapping span. */}
                                {gameData.startChoiceId === choice.id && <span title="Start Scene"><PlayIcon className="w-4 h-4 text-[var(--text-success)] mr-2 flex-shrink-0" /></span>}
                                <div className="opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center flex-shrink-0">
                                    <button onClick={(e) => { e.stopPropagation(); handleSetStartChoice(choice.id) }} className="p-1" title="Set as Start Scene">
                                        <PlayIcon className={`w-4 h-4 ${gameData.startChoiceId === choice.id ? 'text-[var(--text-success)]' : 'text-[var(--text-tertiary)]'}`} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); setEditingState({ mode: 'edit-choice', choice }) }} className="p-1"><PencilIcon className="w-4 h-4" /></button>
                                    <button onClick={(e) => { e.stopPropagation(); setDeletionModalState({ type: 'delete-choice', choice }) }} className="p-1 text-[var(--text-danger)]"><TrashIcon className="w-4 h-4" /></button>
                                </div>
                            </div>
                            <div onDrop={(e) => handleDrop(e, index + 1)} onDragOver={(e) => handleDragOver(e, index + 1)} className="h-2 -mt-1">
                               {dropIndicator?.chunkId === chunk.id && dropIndicator.index === index + 1 && <div className="h-1 bg-[var(--text-accent)] rounded-full mx-2" />}
                            </div>
                        </div>
                    ))}
                     <button
                        onClick={() => setEditingState({ mode: 'new-choice', choice: { id: `choice_${Date.now()}`, name: 'New Scene', description: '', imagePrompt: '', choiceType: 'static' }, chunkId: chunk.id })}
                        className="w-full text-center text-sm p-2 rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center gap-1"
                     >
                        <PlusIcon className="w-4 h-4"/> New Scene
                    </button>
                </div>
            )}
        </div>
    );
};

const GameEditor: React.FC<{
    projectData: PhoenixProject;
    gameData: GameData,
    onCommitGameChange: (gameData: GameData) => void,
    onBack: () => void,
    onGenerateImage: (prompt: string, onUpdate: (base64: string) => void) => void,
    isGenerating: string | null,
    showToast: (message: string, type?: 'success' | 'error') => void;
}> = ({ projectData, gameData, onCommitGameChange, onBack, onGenerateImage, isGenerating, showToast }) => {
    const [activeTab, setActiveTab] = useState<EditorTabs>('game_menu');
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [entityFilter, setEntityFilter] = useState<string>('all');
    const [deletionModalState, setDeletionModalState] = useState<DeletionModalState>({ type: 'none' });
    const [editingState, setEditingState] = useState<EditingState>({ mode: 'none' });
    const [editingNewsItem, setEditingNewsItem] = useState<NewsItem | { isNew: true } | null>(null);
    const [newMenuTag, setNewMenuTag] = useState('');

    const [draggedChoice, setDraggedChoice] = useState<{ choiceId: string; sourceChunkId: string } | null>(null);
    const [dropIndicator, setDropIndicator] = useState<{ chunkId: string; index: number } | null>(null);

    const handleGameTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onCommitGameChange({ ...gameData, gameTitle: e.target.value });
    };
    
    const updateMenuSettings = (field: keyof GameData['menuSettings'], value: any) => {
        onCommitGameChange({
            ...gameData,
            menuSettings: { ...gameData.menuSettings, [field]: value },
        });
    };
    
    const handleAddMenuTag = () => {
        if (newMenuTag.trim() && !gameData.menuSettings.tags.includes(newMenuTag.trim())) {
            updateMenuSettings('tags', [...gameData.menuSettings.tags, newMenuTag.trim()]);
            setNewMenuTag('');
        }
    };

    const handleRemoveMenuTag = (tagToRemove: string) => {
        updateMenuSettings('tags', gameData.menuSettings.tags.filter(t => t !== tagToRemove));
    };

    const handleSaveNewsItem = (newsItem: NewsItem) => {
      const news = gameData.menuSettings.news || [];
      const existingIndex = news.findIndex(n => n.id === newsItem.id);
      if (existingIndex > -1) {
          const updatedNews = [...news]; updatedNews[existingIndex] = newsItem;
          updateMenuSettings('news', updatedNews);
      } else {
          updateMenuSettings('news', [...news, newsItem]);
      }
      setEditingNewsItem(null);
    };
    const handleDeleteNewsItem = (newsItemId: string) => {
        const news = gameData.menuSettings.news || [];
        updateMenuSettings('news', news.filter(n => n.id !== newsItemId));
    };

    const handleAddItem = (type: 'template' | 'component' | 'entity') => {
        if (type === 'template' || type === 'component') {
            const newTemplate: Template = { id: `template_${Date.now()}`, name: type === 'component' ? 'New Component' : 'New Template', description: '', tags: [], attributes: [], isComponent: type === 'component' };
            setEditingState({ mode: 'new-template', template: newTemplate });
        } else if (type === 'entity') {
            if (!entityFilter || entityFilter === 'all') return;
            const newEntity: Entity = { id: `entity_${Date.now()}`, templateId: entityFilter, name: 'New Entity', attributeValues: {} };
            setEditingState({ mode: 'new-entity', entity: newEntity });
        }
    };

    const handleDeleteConfirmed = () => {
        let newGameData = { ...gameData };
        if (deletionModalState.type === 'delete-template') {
            const idsToDelete = [deletionModalState.template.id, ...getDescendantIds(deletionModalState.template.id, gameData.templates)];
            newGameData = { ...gameData, templates: gameData.templates.filter(t => !idsToDelete.includes(t.id)), entities: gameData.entities.filter(e => !idsToDelete.includes(e.templateId)) };
            if (selectedItemId && idsToDelete.includes(selectedItemId)) setSelectedItemId(null);
        } else if (deletionModalState.type === 'delete-entity') {
            newGameData = { ...gameData, entities: gameData.entities.filter(e => e.id !== deletionModalState.entity.id) };
            if (selectedItemId === deletionModalState.entity.id) setSelectedItemId(null);
        } else if (deletionModalState.type === 'delete-choice') {
            const choiceIdToDelete = deletionModalState.choice.id;
            newGameData = { 
                ...gameData, 
                allChoices: gameData.allChoices.filter(c => c.id !== choiceIdToDelete),
                choiceChunks: gameData.choiceChunks.map(chunk => ({
                    ...chunk,
                    choiceIds: (chunk.choiceIds || []).filter(id => id !== choiceIdToDelete)
                }))
            };
            if (selectedItemId === choiceIdToDelete) setSelectedItemId(null);
        } else if (deletionModalState.type === 'delete-chunk') {
            newGameData = { 
                ...gameData, 
                choiceChunks: gameData.choiceChunks.filter(c => c.id !== deletionModalState.chunk.id),
                allChoices: gameData.allChoices.filter(choice => !(deletionModalState.chunk.choiceIds || []).includes(choice.id))
            };
        }
        onCommitGameChange(newGameData);
        setDeletionModalState({ type: 'none' });
    };

    const handleSaveTemplate = (templateToSave: Template) => {
        const isNew = editingState.mode === 'new-template';
        const newTemplates = isNew ? [...gameData.templates, templateToSave] : gameData.templates.map(t => t.id === templateToSave.id ? templateToSave : t);
        onCommitGameChange({ ...gameData, templates: newTemplates });
        setEditingState({ mode: 'none' });
        setSelectedItemId(templateToSave.id);
        showToast('Blueprint saved successfully!');
    };
    
    const handleTemplateChange = (updatedTemplate: Template) => {
        setEditingState(prev => (prev.mode === 'edit-template' || prev.mode === 'new-template') ? { ...prev, template: updatedTemplate } : prev);
    };

    const handleSaveEntity = (entityToSave: Entity) => {
        const isNew = editingState.mode === 'new-entity';
        const newEntities = isNew ? [...gameData.entities, entityToSave] : gameData.entities.map(e => e.id === entityToSave.id ? entityToSave : e);
        onCommitGameChange({ ...gameData, entities: newEntities });
        setEditingState({ mode: 'none' });
        setSelectedItemId(entityToSave.id);
        showToast('Entity saved successfully!');
    };

    const handleSaveChoice = (choiceToSave: PlayerChoice) => {
        if (editingState.mode === 'new-choice') {
            const { chunkId } = editingState;
            onCommitGameChange({
                ...gameData,
                allChoices: [...gameData.allChoices, choiceToSave],
                choiceChunks: gameData.choiceChunks.map(chunk => 
                    chunk.id === chunkId 
                        ? { ...chunk, choiceIds: [...(chunk.choiceIds || []), choiceToSave.id] }
                        : chunk
                )
            });
        } else {
            onCommitGameChange({
                ...gameData,
                allChoices: gameData.allChoices.map(c => c.id === choiceToSave.id ? choiceToSave : c)
            });
        }
        setEditingState({ mode: 'none' });
        setSelectedItemId(choiceToSave.id);
        showToast('Scene saved successfully!');
    };

    const handleSaveChunk = (chunkToSave: ChoiceChunk) => {
        const isNew = editingState.mode === 'new-chunk';
        const newChunks = isNew ? [...gameData.choiceChunks, chunkToSave] : gameData.choiceChunks.map(c => c.id === chunkToSave.id ? chunkToSave : c);
        onCommitGameChange({ ...gameData, choiceChunks: newChunks });
        setEditingState({mode: 'none'});
    }

    const handleSetStartChoice = (choiceId: string) => {
        onCommitGameChange({ ...gameData, startChoiceId: choiceId });
    };
    const handleCancelEdit = () => setEditingState({ mode: 'none' });
    
    const handleGenerateContent = useCallback(async (entity: Entity, attributeId: string, onUpdate: (entity: Entity) => void) => {
        const template = gameData.templates.find(t => t.id === entity.templateId);
        const attribute = template?.attributes.find(a => a.id === attributeId);
        const prompt = `Generate a gritty, cyberpunk-themed "${attribute?.name}" for a ${template?.name} named "${entity.name}" in a colony called "${gameData.colonyName}". The content should be concise and evocative (2-4 sentences).`;
        try {
            const content = await generateStoryContent(prompt);
            onUpdate({ ...entity, attributeValues: { ...entity.attributeValues, [attributeId]: content } });
            showToast('Content generated successfully!');
        } catch(error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            debugService.log('GameEditor: Failed to generate content', { error });
            showToast(errorMessage, 'error');
        }
    }, [gameData.colonyName, gameData.templates, showToast]);
    
    const handleDropChoice = (targetChunkId: string, targetIndex: number) => {
        if (!draggedChoice) return;
        const { choiceId, sourceChunkId } = draggedChoice;
        
        let newChunks = [...gameData.choiceChunks];
        const sourceChunk = newChunks.find(c => c.id === sourceChunkId);
        const targetChunk = newChunks.find(c => c.id === targetChunkId);

        if (!sourceChunk || !targetChunk) return;

        // Remove from source
        const newSourceChoiceIds = (sourceChunk.choiceIds || []).filter(id => id !== choiceId);
        
        if (sourceChunkId === targetChunkId) {
            // Reordering within the same chunk
            newSourceChoiceIds.splice(targetIndex, 0, choiceId);
            newChunks = newChunks.map(c => c.id === sourceChunkId ? { ...c, choiceIds: newSourceChoiceIds } : c);
        } else {
            // Moving between chunks
            const newTargetChoiceIds = [...(targetChunk.choiceIds || [])];
            newTargetChoiceIds.splice(targetIndex, 0, choiceId);
            newChunks = newChunks.map(c => {
                if (c.id === sourceChunkId) return { ...c, choiceIds: newSourceChoiceIds };
                if (c.id === targetChunkId) return { ...c, choiceIds: newTargetChoiceIds };
                return c;
            });
        }
        
        onCommitGameChange({ ...gameData, choiceChunks: newChunks });
        setDraggedChoice(null);
        setDropIndicator(null);
    };

    const renderSummary = () => (
        <div className="flex-1 flex items-center justify-center bg-[var(--bg-main)]">
            <div className="text-center text-[var(--text-secondary)]">
                <CubeTransparentIcon className="w-16 h-16 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-[var(--text-primary)]">Phoenix Editor</h2>
                <p>Select an item from the list to begin editing, or create a new one.</p>
            </div>
        </div>
    );

    const TabButton = ({ tab, icon, label }: { tab: EditorTabs; icon: JSX.Element; label: string }) => (
        <button onClick={() => { setActiveTab(tab); setSelectedItemId(null); setEditingState({mode: 'none'}) }} className={`flex flex-col items-center justify-center p-3 space-y-1 w-full text-[length:var(--font-size-xs)] transition duration-300 ${activeTab === tab ? 'bg-[var(--bg-panel-light)] text-[var(--text-accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-panel)]'}`}>
          {icon}
          <span>{label}</span>
        </button>
    );

    const renderMainPanel = () => { 
        switch (editingState.mode) {
            case 'new-template': case 'edit-template':
                return <TemplateEditor key={editingState.template.id} template={editingState.template} onChange={handleTemplateChange} onSave={handleSaveTemplate} onCancel={handleCancelEdit} gameData={gameData} isNew={editingState.mode === 'new-template'} />;
            case 'new-entity': case 'edit-entity':
                return <EntityEditor key={editingState.entity.id} initialEntity={editingState.entity} onSave={handleSaveEntity} onCancel={handleCancelEdit} gameData={gameData} onGenerate={handleGenerateContent} onGenerateImage={onGenerateImage} isGenerating={isGenerating} isGeneratingImage={isGenerating === 'image'} isNew={editingState.mode === 'new-entity'} />;
            case 'new-choice': case 'edit-choice':
                return <ChoiceEditor key={editingState.choice.id} initialChoice={editingState.choice} onSave={handleSaveChoice} onCancel={handleCancelEdit} gameData={gameData} isNew={editingState.mode === 'new-choice'} onGenerateImage={onGenerateImage} isGeneratingImage={isGenerating === 'image'} />;
            case 'new-chunk':
            case 'edit-chunk':
                return <ChunkEditorModal
                    isOpen={true}
                    onClose={handleCancelEdit}
                    onSave={handleSaveChunk}
                    initialChunk={editingState.mode === 'edit-chunk' ? editingState.chunk : null}
                />;
            case 'none': default:
                return renderSummary();
        }
    };
    
    return (
      <div className="flex h-full bg-[var(--bg-main)] text-[var(--text-primary)]">
          <nav className="w-20 bg-black/20 flex flex-col items-center pt-5 space-y-4 border-r border-[var(--border-primary)]">
            <button onClick={onBack} className="flex flex-col items-center justify-center p-3 space-y-1 w-full text-[var(--text-secondary)] hover:bg-[var(--bg-panel)] mb-4">
                <ArrowLeftIcon className="w-6 h-6" />
                <span className="text-[length:var(--font-size-xs)]">Games</span>
            </button>
            <TabButton tab="game_menu" icon={<GlobeAltIcon className="w-6 h-6"/>} label="Game Menu" />
            <TabButton tab="gameplay" icon={<BoltIcon className="w-6 h-6"/>} label="Gameplay" />
            <TabButton tab="blueprints" icon={<CubeTransparentIcon className="w-6 h-6"/>} label="Blueprints" />
            <TabButton tab="entities" icon={<RectangleStackIcon className="w-6 h-6"/>} label="Entities" />
          </nav>

          {activeTab !== 'game_menu' && (
            <aside className="w-80 bg-[var(--bg-panel)]/50 border-r border-[var(--border-primary)] flex flex-col">
              <div className="p-4 border-b border-[var(--border-primary)]">
                  {activeTab === 'gameplay' && <h2 className="text-lg font-bold">Scenes</h2>}
                  {activeTab === 'blueprints' && <h2 className="text-lg font-bold">Blueprints</h2>}
                  {activeTab === 'entities' && (
                      <select value={entityFilter} onChange={e => setEntityFilter(e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2">
                          <option value="all">All Entities</option>
                          {gameData.templates.filter(t => !t.isComponent).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                  )}
              </div>
              <div className="flex-grow overflow-y-auto p-2 space-y-1">
                  {activeTab === 'gameplay' && gameData.choiceChunks.map(chunk => (
                    <ChunkedList
                        key={chunk.id}
                        chunk={chunk}
                        gameData={gameData}
                        selectedItemId={selectedItemId}
                        setSelectedItemId={setSelectedItemId}
                        setEditingState={setEditingState}
                        setDeletionModalState={setDeletionModalState}
                        handleSetStartChoice={handleSetStartChoice}
                        draggedChoice={draggedChoice}
                        setDraggedChoice={setDraggedChoice}
                        dropIndicator={dropIndicator}
                        setDropIndicator={setDropIndicator}
                        onDropChoice={handleDropChoice}
                    />
                  ))}
                  {activeTab === 'blueprints' && gameData.templates.filter(t => !t.isComponent).map(template => (
                     <div key={template.id} onClick={() => setSelectedItemId(template.id)} className={`p-2 rounded-md cursor-pointer flex justify-between items-center group ${selectedItemId === template.id ? 'bg-[var(--bg-active)]/20' : 'hover:bg-[var(--bg-hover)]'}`}>
                        <span className={`flex-grow ${selectedItemId === template.id ? 'text-[var(--text-accent)]' : ''}`}>{template.name}</span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); setEditingState({ mode: 'edit-template', template })}} className="p-1"><PencilIcon className="w-4 h-4"/></button>
                        </div>
                    </div>
                  ))}
                  {activeTab === 'entities' && gameData.entities.filter(e => entityFilter === 'all' || e.templateId === entityFilter).map(entity => (
                    <div key={entity.id} onClick={() => setSelectedItemId(entity.id)} className={`p-2 rounded-md cursor-pointer flex justify-between items-center group ${selectedItemId === entity.id ? 'bg-[var(--bg-active)]/20' : 'hover:bg-[var(--bg-hover)]'}`}>
                        <span className={`flex-grow ${selectedItemId === template.id ? 'text-[var(--text-accent)]' : ''}`}>{entity.name}</span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); setEditingState({ mode: 'edit-entity', entity })}} className="p-1"><PencilIcon className="w-4 h-4"/></button>
                        </div>
                    </div>
                  ))}
              </div>
              <div className="p-2 border-t border-[var(--border-primary)]">
                  {activeTab === 'gameplay' && <button onClick={() => setEditingState({mode: 'new-chunk'})} className="w-full text-center p-2 rounded-md bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-semibold">New Chunk</button>}
                  {activeTab === 'blueprints' && <button onClick={() => handleAddItem('template')} className="w-full text-center p-2 rounded-md bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-semibold">New Blueprint</button>}
                  {activeTab === 'entities' && <button onClick={() => handleAddItem('entity')} disabled={entityFilter === 'all'} className="w-full text-center p-2 rounded-md bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-semibold disabled:bg-[var(--bg-panel)] disabled:text-[var(--text-secondary)] disabled:cursor-not-allowed">New Entity</button>}
              </div>
            </aside>
          )}

          <main className="flex-1 flex flex-col overflow-hidden">
            {activeTab === 'game_menu' ? (
                <div className="flex-1 p-8 overflow-y-auto">
                    <h1 className="text-[length:var(--font-size-3xl)] font-bold text-[var(--text-accent)] mb-6">Game Menu Settings for {gameData.gameTitle}</h1>
                     <div className="max-w-2xl space-y-8">
                        <CollapsibleSection title="Core Details">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)]">Game Title</label>
                                    <HelpTooltip title="Game Title" content="The main title of your game project as it appears in the launcher and editor lists." />
                                </div>
                                <input type="text" value={gameData.gameTitle} onChange={handleGameTitleChange} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2"/>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)]">Menu Description</label>
                                    <HelpTooltip title="Menu Description" content="This is the main description for your game that players will see on its dedicated menu screen before starting a simulation." />
                                </div>
                                <textarea value={gameData.menuSettings.description} onChange={e => updateMenuSettings('description', e.target.value)} rows={4} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2"/>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)]">Tags</label>
                                    <HelpTooltip title="Tags" content="Add tags to categorize your game (e.g., Sci-Fi, Horror, Narrative). These are displayed on the game's menu screen." />
                                </div>
                                <div className="flex flex-wrap gap-2 mb-2">{(gameData.menuSettings.tags || []).map(tag => <span key={tag} className="flex items-center bg-[var(--text-accent-dark)]/50 text-[var(--text-accent)] text-xs font-medium px-2 py-1 rounded-full">{tag}<button onClick={() => handleRemoveMenuTag(tag)} className="ml-1.5 -mr-0.5 w-4 h-4 rounded-full text-[var(--text-accent)] hover:bg-red-500/50">&times;</button></span>)}</div>
                                <div className="flex gap-2"><input type="text" placeholder="Add a tag..." value={newMenuTag} onChange={e => setNewMenuTag(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddMenuTag(); } }} className="flex-grow bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2"/><button onClick={handleAddMenuTag} className="bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-bold px-4 rounded">Add</button></div>
                            </div>
                        </CollapsibleSection>
                         <CollapsibleSection title="Menu Layout">
                             <StyleSelect 
                                label="Screen Layout" 
                                value={gameData.menuSettings.menuLayoutId || ''}
                                onChange={e => updateMenuSettings('menuLayoutId', e.target.value || undefined)}
                                help="Select a pre-defined layout from the Layout Editor to apply to this game's menu screen. If 'None' is selected, a default layout will be used."
                             >
                                 <option value="">-- None (Use Default) --</option>
                                 {projectData.layouts.map(layout => (
                                     <option key={layout.id} value={layout.id}>{layout.name}</option>
                                 ))}
                             </StyleSelect>
                        </CollapsibleSection>
                        <CollapsibleSection title="Showcase & Cover Images">
                            <HelpTooltip title="Showcase Images" content="Manage the images for this game. One can be selected as the card's cover image by clicking the star icon. If 'Image Slider' is enabled in the launcher settings, these images will be shown as a carousel on the game's preview card." />
                           <ShowcaseImageManager 
                                images={gameData.menuSettings.showcaseImages || []}
                                onUpdate={(images) => updateMenuSettings('showcaseImages', images)}
                                onGenerate={onGenerateImage}
                                isGenerating={isGenerating}
                                cardCoverImageId={gameData.cardCoverImageId}
                                onSetCoverImage={(id) => onCommitGameChange({ ...gameData, cardCoverImageId: id })}
                           />
                        </CollapsibleSection>
                        <CollapsibleSection title="News & Credits">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)]">News & Updates</label>
                                    <HelpTooltip title="News & Updates" content="Manage news articles and updates for this specific game. These will be shown on the game's menu screen." />
                                </div>
                                <NewsListEditor news={gameData.menuSettings.news} onAdd={() => setEditingNewsItem({ isNew: true })} onEdit={setEditingNewsItem} onDelete={handleDeleteNewsItem} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)]">Credits</label>
                                    <HelpTooltip title="Credits" content="Write the credits for your game. This can include your name, inspirations, or thank-yous. Supports Markdown for basic formatting." />
                                </div>
                                <textarea value={gameData.menuSettings.credits} onChange={e => updateMenuSettings('credits', e.target.value)} rows={6} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2"/>
                            </div>
                        </CollapsibleSection>
                     </div>
                </div>
            ) : (
                renderMainPanel()
            )}
          </main>
          
          {editingNewsItem && (
            <NewsEditorModal
                item={'isNew' in editingNewsItem ? null : editingNewsItem}
                onClose={() => setEditingNewsItem(null)}
                onSave={handleSaveNewsItem}
                onGenerateImage={onGenerateImage}
                isGenerating={isGenerating === 'image'}
            />
          )}

           <Modal
                isOpen={deletionModalState.type === 'delete-chunk' || deletionModalState.type === 'delete-choice'}
                onClose={() => setDeletionModalState({ type: 'none' })}
                title="Confirm Deletion"
            >
                <p>
                    {deletionModalState.type === 'delete-chunk' && `Are you sure you want to delete the chunk "${deletionModalState.chunk.name}" and all scenes within it? This action cannot be undone.`}
                    {deletionModalState.type === 'delete-choice' && `Are you sure you want to delete the scene "${deletionModalState.choice.name}"? This action cannot be undone.`}
                </p>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={() => setDeletionModalState({ type: 'none' })} className="px-4 py-2 rounded-md bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-semibold transition-colors">Cancel</button>
                    <button onClick={handleDeleteConfirmed} className="px-4 py-2 rounded-md bg-[var(--bg-danger)] hover:bg-[var(--bg-danger-hover)] text-[var(--text-on-danger)] font-semibold transition-colors">Delete</button>
                </div>
            </Modal>
      </div>
    );
};
