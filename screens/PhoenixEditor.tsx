
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { GameData, Template, Entity, PlayerChoice, NewsItem, PhoenixProject, CompanyLauncherSettings, GameMenuSettings, GameCardStyle, ShowcaseImage, GameListStyle, GameListBackgroundType, GameListLayout, TextStyle, ChoiceChunk, ImageCredit } from '../types';
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

type EditorTabs = 'game_menu' | 'gameplay' | 'blueprints' | 'entities';
type TopLevelTabs = 'launcher' | 'games';

type DeletionModalState = 
  | { type: 'none' }
  | { type: 'delete-game'; game: GameData }
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
  | { mode: 'new-chunk' };

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

const ImageCreditEditor: React.FC<{
  credit?: ImageCredit;
  onUpdate: (credit: ImageCredit) => void;
}> = ({ credit, onUpdate }) => {
  const handleChange = (field: keyof ImageCredit, value: string) => {
    onUpdate({ ...credit, [field]: value });
  };
  return (
    <div className="mt-2 p-2 border-t border-[var(--border-secondary)] space-y-2">
       <h5 className="text-xs font-semibold text-[var(--text-secondary)]">Image Credits (Optional)</h5>
        <input 
            type="text" 
            placeholder="Artist Name" 
            value={credit?.artistName || ''}
            onChange={(e) => handleChange('artistName', e.target.value)}
            className="w-full bg-[var(--bg-panel)] border border-[var(--border-secondary)] rounded-md p-1.5 text-sm"
        />
        <input 
            type="url" 
            placeholder="Source URL (e.g., from Unsplash)" 
            value={credit?.sourceUrl || ''}
            onChange={(e) => handleChange('sourceUrl', e.target.value)}
            className="w-full bg-[var(--bg-panel)] border border-[var(--border-secondary)] rounded-md p-1.5 text-sm"
        />
        <input 
            type="url" 
            placeholder="Artist Socials/Portfolio URL" 
            value={credit?.socialsUrl || ''}
            onChange={(e) => handleChange('socialsUrl', e.target.value)}
            className="w-full bg-[var(--bg-panel)] border border-[var(--border-secondary)] rounded-md p-1.5 text-sm"
        />
    </div>
  )
};

const ShowcaseImageEditor: React.FC<{
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

    const handleGenerateClick = (image: ShowcaseImage) => {
        if (!image.prompt) return;
        onGenerate(image.prompt, (base64) => {
            handleUpdateImage(image.id, { base64: `data:image/jpeg;base64,${base64}` });
        });
    };
    
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, imageId: string) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (typeof event.target?.result === 'string') {
                     handleUpdateImage(imageId, { base64: event.target.result as string });
                }
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
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
                <div key={image.id} className="bg-[var(--bg-panel-light)] p-3 rounded-lg">
                    <div className="flex gap-3">
                        {image.base64 ? 
                            <img src={image.base64} className="w-24 h-24 object-cover rounded-md flex-shrink-0" alt="Showcase preview"/> :
                            <div className="w-24 h-24 bg-[var(--bg-input)] rounded-md flex items-center justify-center text-[var(--text-tertiary)] text-xs flex-shrink-0">No Image</div>
                        }
                        <div className="flex-grow space-y-2">
                             <textarea 
                                value={image.prompt}
                                onChange={(e) => handleUpdateImage(image.id, { prompt: e.target.value })}
                                placeholder="AI Image Prompt..." 
                                rows={2} 
                                className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2 text-sm"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => handleGenerateClick(image)} disabled={isGenerating === 'image' || !image.prompt} className="bg-[var(--text-accent-bright)] hover:opacity-90 disabled:bg-[var(--bg-panel)] text-[var(--text-on-accent)] text-sm font-bold py-2 px-3 rounded-md">
                                    {isGenerating === 'image' ? "Generating..." : "Generate"}
                                </button>
                                <label htmlFor={`showcase-upload-${image.id}`} className="bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] flex items-center justify-center text-[var(--text-primary)] text-sm font-bold py-2 px-3 rounded-md cursor-pointer">
                                    Upload
                                </label>
                                <input 
                                    id={`showcase-upload-${image.id}`}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleFileUpload(e, image.id)}
                                />
                            </div>
                        </div>
                        <div className="flex flex-col justify-between items-center">
                             <div className="flex flex-col">
                                <button onClick={() => handleMoveImage(index, 'up')} disabled={index === 0} className="p-1 disabled:opacity-30"><ArrowUpIcon className="w-4 h-4" /></button>
                                <button
                                    onClick={() => onSetCoverImage(image.id)}
                                    className={`p-1 rounded-full transition-colors ${cardCoverImageId === image.id ? 'text-yellow-400' : 'text-gray-500 hover:bg-yellow-400/20'}`}
                                    title="Set as card cover image"
                                >
                                    <StarIcon className="w-4 h-4" fill={cardCoverImageId === image.id ? 'currentColor' : 'none'} stroke="currentColor" />
                                </button>
                                <button onClick={() => handleMoveImage(index, 'down')} disabled={index === images.length - 1} className="p-1 disabled:opacity-30"><ArrowDownIcon className="w-4 h-4" /></button>
                            </div>
                            <button onClick={() => handleRemoveImage(image.id)} className="p-1"><TrashIcon className="w-4 h-4 text-red-500/80 hover:text-red-400"/></button>
                        </div>
                    </div>
                    <ImageCreditEditor 
                        credit={image.credit} 
                        onUpdate={(credit) => handleUpdateImage(image.id, { credit })} 
                    />
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
                    <p className="text-sm text-[var(--text-secondary)]">{item.date} - <span className={`font-medium ${item.status === 'published' ? 'text-green-400' : 'text-yellow-400'}`}>{item.status}</span></p>
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
                                {gameData.startChoiceId === choice.id && <span title="Start Scene"><PlayIcon className="w-4 h-4 text-green-400 mr-2 flex-shrink-0" /></span>}
                                <div className="opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center flex-shrink-0">
                                    <button onClick={(e) => { e.stopPropagation(); handleSetStartChoice(choice.id) }} className="p-1" title="Set as Start Scene">
                                        <PlayIcon className={`w-4 h-4 ${gameData.startChoiceId === choice.id ? 'text-green-400' : 'text-gray-500'}`} />
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
    gameData: GameData,
    onCommitGameChange: (gameData: GameData) => void,
    onBack: () => void,
    onGenerateImage: (prompt: string, onUpdate: (base64: string) => void) => void,
    isGenerating: string | null,
    showToast: (message: string, type?: 'success' | 'error') => void;
}> = ({ gameData, onCommitGameChange, onBack, onGenerateImage, isGenerating, showToast }) => {
    const [activeTab, setActiveTab] = useState<EditorTabs>('game_menu');
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [entityFilter, setEntityFilter] = useState<string>('all');
    const [deletionModalState, setDeletionModalState] = useState<DeletionModalState>({ type: 'none' });
    const [editingState, setEditingState] = useState<EditingState>({ mode: 'none' });
    const [editingNewsItem, setEditingNewsItem] = useState<NewsItem | { isNew: true } | null>(null);
    const [newMenuTag, setNewMenuTag] = useState('');

    const [draggedChoice, setDraggedChoice] = useState<{ choiceId: string; sourceChunkId: string } | null>(null);
    const [dropIndicator, setDropIndicator] = useState<{ chunkId: string; index: number } | null>(null);

    const handleColonyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onCommitGameChange({ ...gameData, colonyName: e.target.value });
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
                        <span className={`flex-grow ${selectedItemId === entity.id ? 'text-[var(--text-accent)]' : ''}`}>{entity.name}</span>
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
                            <div><label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)] mb-1">Colony Name</label><input type="text" value={gameData.colonyName} onChange={handleColonyNameChange} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2"/></div>
                            <div><label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)] mb-1">Menu Description</label><textarea value={gameData.menuSettings.description} onChange={e => updateMenuSettings('description', e.target.value)} rows={4} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2"/></div>
                            <div>
                                <label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)] mb-1">Tags</label>
                                <div className="flex flex-wrap gap-2 mb-2">{(gameData.menuSettings.tags || []).map(tag => <span key={tag} className="flex items-center bg-[var(--text-accent-dark)]/50 text-[var(--text-accent)] text-xs font-medium px-2 py-1 rounded-full">{tag}<button onClick={() => handleRemoveMenuTag(tag)} className="ml-1.5 -mr-0.5 w-4 h-4 rounded-full text-[var(--text-accent)] hover:bg-red-500/50">&times;</button></span>)}</div>
                                <div className="flex gap-2"><input type="text" placeholder="Add a tag..." value={newMenuTag} onChange={e => setNewMenuTag(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddMenuTag(); } }} className="flex-grow bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2"/><button onClick={handleAddMenuTag} className="bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-bold px-4 rounded">Add</button></div>
                            </div>
                        </CollapsibleSection>
                        <CollapsibleSection title="Showcase & Cover Images">
                            <HelpTooltip title="Showcase Images" content="Manage the images for this game. One can be selected as the card's cover image by clicking the star icon. If 'Image Slider' is enabled in the launcher settings, these images will be shown as a carousel on the game's preview card." />
                           <ShowcaseImageEditor 
                                images={gameData.menuSettings.showcaseImages || []}
                                onUpdate={(images) => updateMenuSettings('showcaseImages', images)}
                                onGenerate={onGenerateImage}
                                isGenerating={isGenerating}
                                cardCoverImageId={gameData.cardCoverImageId}
                                onSetCoverImage={(id) => onCommitGameChange({ ...gameData, cardCoverImageId: id })}
                           />
                        </CollapsibleSection>
                        <CollapsibleSection title="News & Credits">
                            <div><label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)] mb-1">News & Updates</label><NewsListEditor news={gameData.menuSettings.news} onAdd={() => setEditingNewsItem({ isNew: true })} onEdit={setEditingNewsItem} onDelete={handleDeleteNewsItem} /></div>
                            <div><label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)] mb-1">Credits</label><textarea value={gameData.menuSettings.credits} onChange={e => updateMenuSettings('credits', e.target.value)} rows={6} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2"/></div>
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
                    <button onClick={handleDeleteConfirmed} className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors">Delete</button>
                </div>
            </Modal>
      </div>
    );
};

const ColorInput: React.FC<{
    label: string;
    value: string;
    onChange: (color: string) => void;
    help?: string;
}> = ({ label, value, onChange, help }) => {
    const colorPickerRef = useRef<HTMLInputElement>(null);

    return (
        <div>
            <div className="flex items-center gap-2 mb-1">
                <label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)]">{label}</label>
                {help && <HelpTooltip title={label} content={help} />}
            </div>
            <div className="flex items-center bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md">
                <div 
                    className="w-8 h-8 rounded-l-md border-r border-[var(--border-secondary)] cursor-pointer"
                    style={{ backgroundColor: value }}
                    onClick={() => colorPickerRef.current?.click()}
                />
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full bg-transparent p-2 text-sm focus:outline-none"
                    placeholder="#RRGGBBAA"
                />
                <input
                    ref={colorPickerRef}
                    type="color"
                    value={value.slice(0, 7)} // Color input doesn't support alpha
                    onChange={(e) => {
                        const currentAlpha = value.length === 9 ? value.slice(7) : 'ff';
                        onChange(`${e.target.value}${currentAlpha}`);
                    }}
                    className="absolute opacity-0 w-0 h-0"
                />
            </div>
        </div>
    );
};

const TextStyleEditor: React.FC<{
    value: TextStyle;
    onChange: (value: TextStyle) => void;
}> = ({ value, onChange }) => {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <ColorInput label="Color" value={value.color} onChange={color => onChange({ ...value, color })} />
                <StyleSelect label="Font Size" value={value.fontSize} onChange={e => onChange({ ...value, fontSize: e.target.value as TextStyle['fontSize'] })}>
                    <option value="xs">X-Small</option>
                    <option value="sm">Small</option>
                    <option value="base">Base</option>
                    <option value="lg">Large</option>
                    <option value="xl">X-Large</option>
                </StyleSelect>
                <StyleRadio label="Text Align" name="text-align" value={value.textAlign} onChange={e => onChange({ ...value, textAlign: e.target.value as TextStyle['textAlign'] })} options={[{value: 'left', label: 'Left'}, {value: 'center', label: 'Center'}, {value: 'right', label: 'Right'}]} />
            </div>
        </div>
    );
};

export const PhoenixEditor: React.FC<PhoenixEditorProps> = ({ projectData, onCommitChange, onLoadProject, onSaveProject, onStartSimulation, showToast }) => {
    const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
    const [topLevelTab, setTopLevelTab] = useState<TopLevelTabs>('games');
    const [isGenerating, setIsGenerating] = useState<string | null>(null);
    const [editingNewsItem, setEditingNewsItem] = useState<NewsItem | { isNew: true } | null>(null);
    const [deletionModalState, setDeletionModalState] = useState<DeletionModalState>({ type: 'none' });
    const loadProjectInputRef = useRef<HTMLInputElement>(null);
    const launcherBgInputRef = useRef<HTMLInputElement>(null);
    
    const selectedGameForEditing = useMemo(() => {
        if (!selectedGameId) return null;
        return projectData.games.find(g => g.id === selectedGameId);
    }, [selectedGameId, projectData.games]);

    const handleGenerateImage = useCallback(async (prompt: string, onUpdate: (base64: string) => void) => {
        setIsGenerating('image');
        try {
            const imageBase64 = await generateImageFromPrompt(prompt);
            onUpdate(imageBase64);
            showToast('Image generated successfully!');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            debugService.log('PhoenixEditor: Failed to generate image', { error });
            showToast(errorMessage, 'error');
        } 
        finally { setIsGenerating(null); }
    }, [showToast]);

    const commitGameChange = (updatedGameData: GameData) => {
        const newGames = projectData.games.map(g => g.id === updatedGameData.id ? updatedGameData : g);
        onCommitChange({ ...projectData, games: newGames });
    };

    const handleAddNewGame = () => {
        const newGame: GameData = {
            id: `game_${Date.now()}`,
            gameTitle: 'New Game Project',
            colonyName: 'Untitled Colony',
            startChoiceId: null,
            allChoices: [],
            choiceChunks: [],
            templates: [],
            entities: [],
            menuSettings: { description: '', tags: [], showcaseImages: [], credits: '', news: [] }
        };
        onCommitChange({ ...projectData, games: [...projectData.games, newGame] });
        setSelectedGameId(newGame.id);
    };
    
    const handleDeleteGame = (game: GameData) => {
        setDeletionModalState({ type: 'delete-game', game });
    };
    
    const handleDeleteConfirmed = () => {
        if (deletionModalState.type === 'delete-game') {
            const newGames = projectData.games.filter(g => g.id !== deletionModalState.game.id);
            onCommitChange({ ...projectData, games: newGames });
        }
        setDeletionModalState({ type: 'none' });
    };

    const updateLauncherSettings = (updates: Partial<CompanyLauncherSettings>) => {
        onCommitChange({ ...projectData, launcherSettings: { ...projectData.launcherSettings, ...updates } });
    };

    const updateLauncherCardStyle = (updates: Partial<GameCardStyle>) => {
        const currentStyle = projectData.launcherSettings.gameCardStyle || {};
        const newStyle = { ...currentStyle, ...updates };
        updateLauncherSettings({ gameCardStyle: newStyle });
    };

    const updateLauncherListStyle = (updates: Partial<GameListStyle>) => {
        const currentStyle = projectData.launcherSettings.gameListStyle || {};
        const newStyle = { ...currentStyle, ...updates };
        updateLauncherSettings({ gameListStyle: newStyle });
    };

    const handleSaveLauncherNewsItem = (newsItem: NewsItem) => {
        const news = projectData.launcherSettings.news || [];
        const existingIndex = news.findIndex(n => n.id === newsItem.id);
        const updatedNews = [...news];
        if (existingIndex > -1) {
            updatedNews[existingIndex] = newsItem;
        } else {
            updatedNews.push(newsItem);
        }
        updateLauncherSettings({ news: updatedNews });
        setEditingNewsItem(null);
    };

    const handleDeleteLauncherNewsItem = (newsItemId: string) => {
        const news = projectData.launcherSettings.news || [];
        updateLauncherSettings({ news: news.filter(n => n.id !== newsItemId) });
    };
    
    const handleLauncherBgUpload = (file: File | null) => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (typeof e.target?.result === 'string') {
                    updateLauncherSettings({ backgroundImageBase64: e.target.result });
                }
            };
            reader.readAsDataURL(file);
        } else if (file) {
            showToast('Please select a valid image file.', 'error');
        }
    }

    if (selectedGameForEditing) {
        return (
            <GameEditor 
                gameData={selectedGameForEditing}
                onCommitGameChange={commitGameChange}
                onBack={() => setSelectedGameId(null)}
                onGenerateImage={handleGenerateImage}
                isGenerating={isGenerating}
                showToast={showToast}
            />
        );
    }
    
    // Top Level Editor (Launcher & Games)
    const TopLevelTabButton: React.FC<{tab: TopLevelTabs, icon: JSX.Element, label: string}> = ({ tab, icon, label }) => (
        <button onClick={() => setTopLevelTab(tab)} className={`flex flex-col items-center justify-center p-3 space-y-1 w-full text-[length:var(--font-size-xs)] transition duration-300 ${topLevelTab === tab ? 'bg-[var(--bg-panel-light)] text-[var(--text-accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-panel)]'}`}>
            {icon}<span>{label}</span>
        </button>
    );

    const launcherCardStyle = projectData.launcherSettings.gameCardStyle || {};
    const launcherListStyle = projectData.launcherSettings.gameListStyle || {};

    return (
        <div className="flex h-full bg-[var(--bg-main)] text-[var(--text-primary)]">
            <nav className="w-20 bg-black/20 flex flex-col items-center pt-5 space-y-4 border-r border-[var(--border-primary)]">
                <TopLevelTabButton tab="launcher" icon={<RocketLaunchIcon className="w-6 h-6" />} label="Launcher" />
                <TopLevelTabButton tab="games" icon={<UserGroupIcon className="w-6 h-6" />} label="Games" />
                 <div className="!mt-auto p-2 w-full space-y-2">
                    <button onClick={onSaveProject} className="flex flex-col items-center justify-center p-2 space-y-1 w-full text-[var(--text-secondary)] hover:bg-[var(--bg-panel)] rounded-md">
                        <ArrowDownTrayIcon className="w-5 h-5"/>
                        <span className="text-[10px]">Save</span>
                    </button>
                    <button onClick={() => loadProjectInputRef.current?.click()} className="flex flex-col items-center justify-center p-2 space-y-1 w-full text-[var(--text-secondary)] hover:bg-[var(--bg-panel)] rounded-md">
                        <ArrowUpTrayIcon className="w-5 h-5"/>
                        <span className="text-[10px]">Load</span>
                    </button>
                    <input type="file" accept=".json" ref={loadProjectInputRef} onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                                const jsonString = ev.target?.result as string;
                                if (jsonString) onLoadProject(jsonString);
                            };
                            reader.readAsText(file);
                            e.target.value = ''; // Reset for same-file uploads
                        }
                    }} className="hidden"/>
                </div>
            </nav>
            <main className="flex-1 overflow-y-auto">
                {topLevelTab === 'launcher' && (
                    <div className="p-8">
                         <h1 className="text-[length:var(--font-size-3xl)] font-bold text-[var(--text-accent)] mb-6">Main Launcher Settings</h1>
                         <div className="max-w-3xl space-y-8">
                            <CollapsibleSection title="Branding">
                                <div><label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)] mb-1">Company Name</label><input type="text" value={projectData.launcherSettings.companyName} onChange={e => updateLauncherSettings({ companyName: e.target.value })} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2"/></div>
                                <div>
                                    <label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)] mb-2">Launcher Background Image</label>
                                    <div className="w-full aspect-video bg-[var(--bg-input)] rounded-md border-2 border-dashed border-[var(--border-secondary)] flex items-center justify-center" style={{ backgroundImage: `url(${projectData.launcherSettings.backgroundImageBase64})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                                        {!projectData.launcherSettings.backgroundImageBase64 && <span className="text-[var(--text-tertiary)]">No Image Set</span>}
                                    </div>
                                    <textarea placeholder="AI Image Prompt..." value={projectData.launcherSettings.backgroundImagePrompt} onChange={e => updateLauncherSettings({ backgroundImagePrompt: e.target.value })} rows={2} className="mt-2 w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2"/>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                                        <button onClick={() => handleGenerateImage(projectData.launcherSettings.backgroundImagePrompt!, (b64) => updateLauncherSettings({ backgroundImageBase64: `data:image/jpeg;base64,${b64}` }))} disabled={isGenerating === 'image' || !projectData.launcherSettings.backgroundImagePrompt} className="bg-[var(--text-accent-bright)] hover:opacity-90 disabled:bg-[var(--bg-panel-light)] text-[var(--text-on-accent)] font-bold py-2 px-4 rounded-md">{isGenerating === 'image' ? "Generating..." : "Generate"}</button>
                                        <button onClick={() => launcherBgInputRef.current?.click()} className="bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-bold py-2 px-4 rounded-md">Upload Image</button>
                                        <input type="file" accept="image/*" ref={launcherBgInputRef} onChange={e => handleLauncherBgUpload(e.target.files?.[0] ?? null)} className="hidden"/>
                                        <button onClick={() => updateLauncherSettings({ backgroundImageBase64: undefined })} className="bg-red-900/50 hover:bg-red-800/50 text-red-300 font-bold py-2 px-4 rounded-md">Clear</button>
                                    </div>
                                    <ImageCreditEditor
                                        credit={projectData.launcherSettings.backgroundImageCredit}
                                        onUpdate={(credit) => updateLauncherSettings({ backgroundImageCredit: credit })}
                                    />
                                </div>
                            </CollapsibleSection>
                             <CollapsibleSection title="Game List Container">
                                <StyleRadio label="Background Type" name="gamelist-bg-type" value={launcherListStyle.backgroundType || 'transparent'} onChange={(e) => updateLauncherListStyle({ backgroundType: e.target.value as GameListBackgroundType })} options={[{value: 'transparent', label: 'Transparent'}, {value: 'solid', label: 'Solid'}, {value: 'gradient', label: 'Gradient'}]} />
                                {launcherListStyle.backgroundType === 'solid' && (
                                    <ColorInput label="Background Color" value={launcherListStyle.backgroundColor1 || '#1f293780'} onChange={val => updateLauncherListStyle({ backgroundColor1: val })} />
                                )}
                                {launcherListStyle.backgroundType === 'gradient' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <ColorInput label="Gradient Color 1" value={launcherListStyle.backgroundColor1 || '#1f293780'} onChange={val => updateLauncherListStyle({ backgroundColor1: val })} />
                                        <ColorInput label="Gradient Color 2" value={launcherListStyle.backgroundColor2 || '#11182740'} onChange={val => updateLauncherListStyle({ backgroundColor2: val })} />
                                    </div>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div><label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)] mb-1">Padding (px)</label><input type="number" value={launcherListStyle.padding || 0} onChange={e => updateLauncherListStyle({ padding: e.target.valueAsNumber })} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2" /></div>
                                    <div><label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)] mb-1">Border Radius (px)</label><input type="number" value={launcherListStyle.borderRadius || 0} onChange={e => updateLauncherListStyle({ borderRadius: e.target.valueAsNumber })} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2" /></div>
                                </div>
                            </CollapsibleSection>
                             <CollapsibleSection title="Game Card Display">
                                <div className="space-y-6">
                                    <StyleRadio label="Layout" name="gamelist-layout" value={projectData.launcherSettings.gameListLayout || 'grid'} onChange={(e) => updateLauncherSettings({ gameListLayout: e.target.value as GameListLayout })} options={[{value: 'grid', label: 'Grid'}, {value: 'list', label: 'List'}]} help="Choose how the list of games is displayed in the launcher." />
                                    
                                    <div className="space-y-4 pt-4 border-t border-[var(--border-primary)]">
                                        <h4 className="text-[length:var(--font-size-lg)] font-semibold text-[var(--text-accent)]">Image & Interaction</h4>
                                        <StyleRadio label="Image Display" name="image-display" value={launcherCardStyle.imageDisplay || 'single'} onChange={(e) => updateLauncherCardStyle({ imageDisplay: e.target.value as 'single' | 'slider' })} options={[{value: 'single', label: 'Single Image'}, {value: 'slider', label: 'Image Slider'}]} help="Show a static image or an interactive image carousel for each game." />
                                        <StyleSelect label="Image Aspect Ratio" value={launcherCardStyle.imageAspectRatio || '16/9'} onChange={e => updateLauncherCardStyle({ imageAspectRatio: e.target.value as GameCardStyle['imageAspectRatio']})} help="The shape of the preview image for each game. 'Auto' uses a fixed height.">
                                            <option value="16/9">16:9 (Widescreen)</option><option value="4/3">4:3 (Standard)</option><option value="1/1">1:1 (Square)</option><option value="auto">Auto (Fixed Height)</option>
                                        </StyleSelect>
                                        <StyleSelect label="Hover Effect" value={launcherCardStyle.hoverEffect || 'lift'} onChange={e => updateLauncherCardStyle({ hoverEffect: e.target.value as GameCardStyle['hoverEffect'] })} help="The visual effect when the user hovers their mouse over a game card.">
                                            <option value="lift">Glow & Ring</option><option value="glow">Glow Only</option><option value="none">None</option>
                                        </StyleSelect>
                                    </div>
                                    
                                    <div className="space-y-4 pt-4 border-t border-[var(--border-primary)]">
                                        <h4 className="text-[length:var(--font-size-lg)] font-semibold text-[var(--text-accent)]">Header Content</h4>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                 <label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)]">Header Text</label>
                                                 <HelpTooltip title="Card Header Text" content="The main text for the card. Use placeholders {game.gameTitle} and {game.colonyName} to insert game data automatically." />
                                            </div>
                                            <textarea value={launcherCardStyle.headerText || ''} onChange={(e) => updateLauncherCardStyle({ headerText: e.target.value })} rows={1} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2" />
                                        </div>
                                        <TextStyleEditor value={launcherCardStyle.headerStyle!} onChange={headerStyle => updateLauncherCardStyle({ headerStyle })}/>
                                    </div>

                                     <div className="space-y-4 pt-4 border-t border-[var(--border-primary)]">
                                        <h4 className="text-[length:var(--font-size-lg)] font-semibold text-[var(--text-accent)]">Body Content</h4>
                                        <div>
                                             <div className="flex items-center gap-2 mb-1">
                                                <label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)]">Body Text</label>
                                                 <HelpTooltip title="Card Body Text" content="The secondary text for the card. Use placeholders {game.gameTitle} and {game.colonyName} to insert game data automatically." />
                                            </div>
                                            <textarea value={launcherCardStyle.bodyText || ''} onChange={(e) => updateLauncherCardStyle({ bodyText: e.target.value })} rows={1} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2" />
                                        </div>
                                        <TextStyleEditor value={launcherCardStyle.bodyStyle!} onChange={bodyStyle => updateLauncherCardStyle({ bodyStyle })}/>
                                    </div>

                                     <div className="space-y-4 pt-4 border-t border-[var(--border-primary)]">
                                        <h4 className="text-[length:var(--font-size-lg)] font-semibold text-[var(--text-accent)]">General Card Style</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <ColorInput label="Background" value={launcherCardStyle.backgroundColor || '#1f293780'} onChange={val => updateLauncherCardStyle({ backgroundColor: val })} />
                                            <ColorInput label="Border" value={launcherCardStyle.borderColor || '#4b5563'} onChange={val => updateLauncherCardStyle({ borderColor: val })} />
                                            <ColorInput label="Button BG" value={launcherCardStyle.buttonColor || '#22d3ee'} onChange={val => updateLauncherCardStyle({ buttonColor: val })} />
                                            <ColorInput label="Button Text" value={launcherCardStyle.buttonTextColor || '#111827'} onChange={val => updateLauncherCardStyle({ buttonTextColor: val })} />
                                        </div>
                                    </div>
                                </div>
                            </CollapsibleSection>
                           <CollapsibleSection title="Company News">
                               <NewsListEditor news={projectData.launcherSettings.news} onAdd={() => setEditingNewsItem({ isNew: true })} onEdit={setEditingNewsItem} onDelete={handleDeleteLauncherNewsItem} />
                           </CollapsibleSection>
                         </div>
                    </div>
                )}
                {topLevelTab === 'games' && (
                    <div className="p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h1 className="text-[length:var(--font-size-3xl)] font-bold text-[var(--text-accent)]">Game Projects</h1>
                            <button onClick={handleAddNewGame} className="flex items-center justify-center gap-2 bg-[var(--bg-active)] hover:opacity-90 text-[var(--text-on-accent)] font-bold py-2 px-4 rounded transition duration-300">
                                <PlusIcon className="w-5 h-5" /> New Game
                            </button>
                        </div>
                        <div className="space-y-4">
                            {projectData.games.map(game => (
                                <div key={game.id} className="bg-[var(--bg-panel)] p-4 rounded-lg border border-[var(--border-primary)] flex justify-between items-center">
                                    <div>
                                        <h2 className="text-lg font-bold text-[var(--text-primary)]">{game.gameTitle}</h2>
                                        <p className="text-sm text-[var(--text-secondary)]">{game.colonyName}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => onStartSimulation(game)} className="flex items-center gap-2 bg-[var(--bg-active)]/20 hover:bg-[var(--bg-active)]/40 text-[var(--text-accent)] font-semibold py-2 px-4 rounded transition duration-300">
                                            <PlayIcon className="w-4 h-4" /> Simulate
                                        </button>
                                        <button onClick={() => setSelectedGameId(game.id)} className="flex items-center gap-2 bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-semibold py-2 px-4 rounded transition duration-300">
                                            <PencilIcon className="w-4 h-4" /> Edit
                                        </button>
                                        <button onClick={() => handleDeleteGame(game)} className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-danger)]"><TrashIcon className="w-5 h-5" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
             {editingNewsItem && (
                 <NewsEditorModal
                    item={'isNew' in editingNewsItem ? null : editingNewsItem}
                    onClose={() => setEditingNewsItem(null)}
                    onSave={topLevelTab === 'launcher' ? handleSaveLauncherNewsItem : handleSaveLauncherNewsItem /*This should be game news item saver but its not defined here*/}
                    onGenerateImage={handleGenerateImage}
                    isGenerating={isGenerating === 'image'}
                />
            )}
            <Modal isOpen={deletionModalState.type === 'delete-game'} onClose={() => setDeletionModalState({type: 'none'})} title="Confirm Deletion">
                <p>Are you sure you want to delete the game project <strong className="text-[var(--text-primary)]">{deletionModalState.type === 'delete-game' && deletionModalState.game.gameTitle}</strong>? This action cannot be undone.</p>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={() => setDeletionModalState({ type: 'none' })} className="px-4 py-2 rounded-md bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-semibold transition-colors">Cancel</button>
                    <button onClick={handleDeleteConfirmed} className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors">Delete</button>
                </div>
            </Modal>
        </div>
    );
};


const parseMarkdown = (text: string): string => {
  if (!text) return '';
  let processedText = text
    .replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.*?)_/g, '<em>$1</em>').replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[var(--text-accent)] hover:underline">$1</a>');
  
  const lines = processedText.split('\n');
  let html = '';
  let inList = false;

  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${trimmedLine.substring(2)}</li>`;
    } else {
      if (inList) { html += '</ul>'; inList = false; }
      if (trimmedLine) { html += `<p>${line}</p>`; }
    }
  });
  if (inList) { html += '</ul>'; }
  return html;
};

const MarkdownToolbar: React.FC<{textareaRef: React.RefObject<HTMLTextAreaElement>; onContentChange: (newContent: string) => void; }> = ({ textareaRef, onContentChange }) => {
    const applyStyle = (style: 'bold' | 'italic') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);
        const marker = style === 'bold' ? '**' : '*';
        
        const newText = `${textarea.value.substring(0, start)}${marker}${selectedText}${marker}${textarea.value.substring(end)}`;
        
        onContentChange(newText);
        
        // Wait for state update and then focus
        setTimeout(() => {
            textarea.focus();
            textarea.selectionStart = start + marker.length;
            textarea.selectionEnd = end + marker.length;
        }, 0);
    };

    return (
        <div className="flex items-center gap-2 p-1 bg-[var(--bg-input)] border-b border-[var(--border-secondary)] rounded-t-md">
            <button onClick={() => applyStyle('bold')} className="p-2 rounded hover:bg-[var(--bg-hover)] font-bold">B</button>
            <button onClick={() => applyStyle('italic')} className="p-2 rounded hover:bg-[var(--bg-hover)] italic">I</button>
        </div>
    );
};

const NewsItemPreview: React.FC<{ item: NewsItem | null }> = ({ item }) => {
    if (!item) {
        return <div className="p-6 text-center text-[var(--text-secondary)]">Preview will appear here.</div>;
    }
    const styleClasses = {
        normal: { container: 'border-transparent', title: 'text-[var(--text-accent)]' },
        urgent: { container: 'border-red-500/50', title: 'text-red-400' },
        lore: { container: 'border-yellow-600/50 bg-[var(--bg-panel)]/80', title: 'text-yellow-400' }
    }[item.style || 'normal'];
    
    const layoutClasses = {
        container: `flex flex-col ${item.layout !== 'image_top' ? 'md:flex-row' : ''} ${item.layout === 'image_right' ? 'md:flex-row-reverse' : ''} gap-6`,
        image: `flex-shrink-0 rounded-md ${item.layout !== 'image_top' ? 'md:w-1/3' : 'w-full h-48'} object-cover`,
    };

    return (
        <div className={`bg-[var(--bg-panel)]/50 rounded-lg overflow-hidden border ${styleClasses.container} transition-colors`}>
            <div className="p-6">
                <div className={layoutClasses.container}>
                    {item.imageBase64 && (
                        <img src={item.imageBase64} alt={item.title} className={layoutClasses.image} />
                    )}
                    <div className="flex-grow">
                        <div className="flex justify-between items-start mb-1 text-[var(--text-secondary)] text-sm">
                            <p>{item.date || new Date().toISOString().slice(0, 10)}</p>
                            {item.author && <p className="italic">from {item.author}</p>}
                        </div>
                        <h3 className={`text-2xl font-semibold mb-2 ${styleClasses.title}`}>{item.title || 'Untitled'}</h3>
                        {item.tags && item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                                {item.tags.map(tag => (
                                    <span key={tag} className="bg-[var(--bg-panel-light)]/50 text-[var(--text-secondary)] text-xs font-medium px-2.5 py-1 rounded-full">{tag}</span>
                                ))}
                            </div>
                        )}
                        <div className="text-gray-300 prose prose-sm prose-invert max-w-none prose-p:my-2 prose-ul:my-2" dangerouslySetInnerHTML={{ __html: parseMarkdown(item.content) }} />
                        {item.cta && item.cta.text && item.cta.url && (
                            <div className="mt-4">
                                <a href={item.cta.url} target="_blank" rel="noopener noreferrer" className="inline-block bg-[var(--bg-active)] hover:opacity-90 text-[var(--text-on-accent)] font-bold py-2 px-6 rounded-full transition-transform transform hover:scale-105 text-sm">
                                    {item.cta.text}
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

const NewsEditorModal: React.FC<{item: NewsItem | null; onClose: () => void; onSave: (item: NewsItem) => void; onGenerateImage: (prompt: string, onUpdate: (base64: string) => void) => void; isGenerating: boolean;}> = ({ item, onClose, onSave, onGenerateImage, isGenerating }) => {
    const [newsItem, setNewsItem] = useState<NewsItem>(() => item || { id: `news_${Date.now()}`, date: new Date().toISOString().slice(0, 10), title: '', content: '', status: 'draft', layout: 'image_top' });
    const [newTag, setNewTag] = useState('');
    const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

    const updateField = (field: keyof NewsItem, value: any) => setNewsItem(p => ({...p, [field]: value}));
    const updateCta = (field: 'text' | 'url', value: string) => setNewsItem(p => ({...p, cta: {...(p.cta || {text:'', url:''}), [field]: value}}));
    
    const handleAddTag = () => {
        const currentTags = newsItem.tags || [];
        if (newTag.trim() && !currentTags.includes(newTag.trim())) {
            updateField('tags', [...currentTags, newTag.trim()]);
            setNewTag('');
        }
    };
    const handleRemoveTag = (tagToRemove: string) => updateField('tags', (newsItem.tags || []).filter(t => t !== tagToRemove));

    const handleSave = () => {
        onSave(newsItem);
    };

    const handleGenerateClick = () => {
        if (newsItem.imagePrompt) {
            onGenerateImage(newsItem.imagePrompt, (base64) => updateField('imageBase64', `data:image/jpeg;base64,${base64}`));
        }
    };
    
    const handleFileUpload = (file: File | null) => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (typeof e.target?.result === 'string') {
                    updateField('imageBase64', e.target.result);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={item ? "Edit News Item" : "Create News Item"}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <input type="text" placeholder="Title" value={newsItem.title} onChange={e => updateField('title', e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2 text-xl font-bold"/>
                    <input type="date" value={newsItem.date} onChange={e => updateField('date', e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2"/>
                    <input type="text" placeholder="Author (optional)" value={newsItem.author || ''} onChange={e => updateField('author', e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2"/>
                    <div>
                        <MarkdownToolbar textareaRef={contentTextareaRef} onContentChange={(content) => updateField('content', content)} />
                        <textarea ref={contentTextareaRef} placeholder="Content (Markdown supported)" value={newsItem.content} onChange={e => updateField('content', e.target.value)} rows={8} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-b-md p-2 focus:ring-0 focus:border-[var(--border-secondary)]"/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <select value={newsItem.style || 'normal'} onChange={e => updateField('style', e.target.value as NewsItem['style'])} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2">
                            <option value="normal">Style: Normal</option><option value="urgent">Style: Urgent</option><option value="lore">Style: Lore</option>
                        </select>
                        <select value={newsItem.status} onChange={e => updateField('status', e.target.value as NewsItem['status'])} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2">
                            <option value="draft">Status: Draft</option><option value="published">Status: Published</option>
                        </select>
                    </div>
                    <select value={newsItem.layout} onChange={e => updateField('layout', e.target.value as NewsItem['layout'])} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2">
                        <option value="image_top">Layout: Image Top</option><option value="image_left">Layout: Image Left</option><option value="image_right">Layout: Image Right</option>
                    </select>
                    <div className="p-2 border border-[var(--border-secondary)] rounded-md">
                        <h4 className="text-sm font-semibold mb-2 text-[var(--text-secondary)]">Call to Action (Optional)</h4>
                        <div className="space-y-2">
                            <input type="text" placeholder="Button Text (e.g., 'Learn More')" value={newsItem.cta?.text || ''} onChange={e => updateCta('text', e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2"/>
                            <input type="url" placeholder="URL (https://...)" value={newsItem.cta?.url || ''} onChange={e => updateCta('url', e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2"/>
                        </div>
                    </div>
                    <div className="p-2 border border-[var(--border-secondary)] rounded-md">
                        <h4 className="text-sm font-semibold mb-2 text-[var(--text-secondary)]">Tags</h4>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {(newsItem.tags || []).map(tag => <span key={tag} className="flex items-center bg-[var(--text-accent-dark)]/50 text-[var(--text-accent)] text-xs font-medium px-2 py-1 rounded-full">{tag}<button onClick={() => handleRemoveTag(tag)} className="ml-1.5 -mr-0.5 w-4 h-4 rounded-full text-[var(--text-accent)] hover:bg-red-500/50">&times;</button></span>)}
                        </div>
                        <div className="flex gap-2"><input type="text" placeholder="Add a tag..." value={newTag} onChange={e => setNewTag(e.target.value)} className="flex-grow bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2"/><button onClick={handleAddTag} className="bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-bold px-4 rounded">Add</button></div>
                    </div>
                    <div className="p-2 border border-[var(--border-secondary)] rounded-md">
                        <h4 className="text-sm font-semibold mb-2 text-[var(--text-secondary)]">Image</h4>
                        <textarea placeholder="AI Image Prompt..." value={newsItem.imagePrompt || ''} onChange={e => updateField('imagePrompt', e.target.value)} rows={2} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2"/>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                            <button onClick={handleGenerateClick} disabled={isGenerating || !newsItem.imagePrompt} className="bg-[var(--text-accent-bright)] hover:opacity-90 disabled:bg-[var(--bg-panel-light)] text-[var(--text-on-accent)] font-bold py-2 px-4 rounded-md">{isGenerating ? "Generating..." : "Generate"}</button>
                            <label htmlFor="news-image-upload" className="text-center bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-bold py-2 px-4 rounded-md cursor-pointer flex items-center justify-center">Upload</label>
                            <input id="news-image-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e.target.files?.[0] ?? null)} />
                            <button onClick={() => updateField('imageBase64', undefined)} disabled={!newsItem.imageBase64} className="bg-red-900/50 hover:bg-red-800/50 text-red-300 font-bold py-2 px-4 rounded-md disabled:bg-[var(--bg-panel)] disabled:text-gray-500 disabled:cursor-not-allowed">Clear</button>
                        </div>
                        <ImageCreditEditor
                            credit={newsItem.imageCredit}
                            onUpdate={(credit) => updateField('imageCredit', credit)}
                        />
                    </div>
                </div>
                 <div className="space-y-4">
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">Live Preview</h3>
                    <NewsItemPreview item={newsItem} />
                </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
                <button onClick={onClose} className="px-4 py-2 rounded-md bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-semibold">Cancel</button>
                <button onClick={handleSave} className="px-4 py-2 rounded-md bg-[var(--bg-active)] hover:opacity-90 text-[var(--text-on-accent)] font-semibold">Save</button>
            </div>
        </Modal>
    );
};
