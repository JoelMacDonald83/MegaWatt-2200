
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { GameData, Template, Entity, PlayerChoice, NewsItem } from '../types';
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


type EditorTabs = 'world' | 'gameplay' | 'blueprints' | 'entities';

type DeletionModalState = 
  | { type: 'none' }
  | { type: 'delete-template'; template: Template, descendantCount: number }
  | { type: 'delete-entity'; entity: Entity }
  | { type: 'delete-choice'; choice: PlayerChoice };

type EditingState =
  | { mode: 'none' }
  | { mode: 'edit-template'; template: Template }
  | { mode: 'new-template'; template: Template }
  | { mode: 'edit-entity'; entity: Entity }
  | { mode: 'new-entity'; entity: Entity }
  | { mode: 'edit-choice'; choice: PlayerChoice }
  | { mode: 'new-choice'; choice: PlayerChoice };

interface PhoenixEditorProps {
  gameData: GameData;
  onCommitChange: (gameData: GameData) => void;
  onLoadGame: (jsonString: string) => void;
}

type ImportableKey = keyof typeof VALIDATORS;

const BulkImportButton: React.FC<{dataType: string, onImport: (e: React.ChangeEvent<HTMLInputElement>) => void}> = ({ dataType, onImport }) => {
    const ref = useRef<HTMLInputElement>(null);
    return (
        <div>
            <button onClick={() => ref.current?.click()} className="flex items-center justify-center gap-2 w-full bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-accent)] font-semibold py-2 px-4 rounded transition duration-300 text-[length:var(--font-size-sm)] capitalize">
                <ArrowUpTrayIcon className="w-4 h-4" />
                Import {dataType}
            </button>
            <input type="file" accept=".json" multiple ref={ref} onChange={onImport} className="hidden" />
        </div>
    );
};

// Helper to get all descendants of a template
const getDescendantIds = (templateId: string, templates: Template[]): string[] => {
    let children = templates.filter(t => t.parentId === templateId);
    let descendantIds: string[] = children.map(c => c.id);
    children.forEach(child => {
        descendantIds = descendantIds.concat(getDescendantIds(child.id, templates));
    });
    return descendantIds;
};

export const PhoenixEditor: React.FC<PhoenixEditorProps> = ({ gameData, onCommitChange, onLoadGame }) => {
  const [activeTab, setActiveTab] = useState<EditorTabs>('world');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [deletionModalState, setDeletionModalState] = useState<DeletionModalState>({ type: 'none' });
  const [editingState, setEditingState] = useState<EditingState>({ mode: 'none' });
  const [importLog, setImportLog] = useState<string[]>([]);
  const [toast, setToast] = useState({ show: false, message: '' });
  const [isDebugPanelOpen, setIsDebugPanelOpen] = useState(false);
  const [newMenuTag, setNewMenuTag] = useState('');
  const [editingNewsItem, setEditingNewsItem] = useState<NewsItem | { isNew: true } | null>(null);
  const loadProjectInputRef = useRef<HTMLInputElement>(null);
  const menuBgInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    debugService.log("PhoenixEditor: Component mounted", { gameData });
  }, []);

  useEffect(() => {
    debugService.log("PhoenixEditor: Active tab changed", { activeTab });
  }, [activeTab]);

  useEffect(() => {
    debugService.log("PhoenixEditor: Selected item changed", { selectedItemId });
  }, [selectedItemId]);

  useEffect(() => {
    debugService.log("PhoenixEditor: Editing state changed", { editingState });
  }, [editingState]);
  
  useEffect(() => {
    debugService.log("PhoenixEditor: Entity filter changed", { entityFilter });
  }, [entityFilter]);

  const showToast = (message: string) => {
    debugService.log("PhoenixEditor: Showing toast", { message });
    setToast({ show: true, message });
  };

  const handleColonyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    debugService.log("PhoenixEditor: Colony name changing", { oldName: gameData.colonyName, newName });
    onCommitChange({ ...gameData, colonyName: newName });
  };

  const updateMenuSettings = (field: keyof GameData['menuSettings'], value: any) => {
    onCommitChange({
        ...gameData,
        menuSettings: {
            ...gameData.menuSettings,
            [field]: value,
        },
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
          const updatedNews = [...news];
          updatedNews[existingIndex] = newsItem;
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

  const handleAddItem = (type: 'choice' | 'template' | 'component' | 'entity') => {
    debugService.log("PhoenixEditor: handleAddItem called", { type });
    if (type === 'template' || type === 'component') {
      const isComponent = type === 'component';
      const newItemId = `template_${Date.now()}`;
      const newTemplate: Template = { 
        id: newItemId, 
        name: isComponent ? 'New Component' : 'New Template', 
        description: '', 
        tags: [], 
        attributes: [], 
        isComponent 
      };
      setSelectedItemId(null);
      setEditingState({ mode: 'new-template', template: newTemplate });
    } else if (type === 'entity') {
      if (!entityFilter || entityFilter === 'all') {
        debugService.log("PhoenixEditor: Add entity aborted, no template selected");
        return;
      }
      const newItemId = `entity_${Date.now()}`;
      const newEntity: Entity = { id: newItemId, templateId: entityFilter, name: 'New Entity', attributeValues: {} };
      setSelectedItemId(null);
      setEditingState({ mode: 'new-entity', entity: newEntity });
    } else if (type === 'choice') {
      const newItemId = `choice_${Date.now()}`;
      const newChoice: PlayerChoice = { id: newItemId, name: 'New Scene', description: 'A new scene begins...', imagePrompt: '', prompt: '', choiceType: 'static', staticOptions: [] };
      setSelectedItemId(null);
      setEditingState({ mode: 'new-choice', choice: newChoice });
    }
  };

  const handleDeleteConfirmed = () => {
    debugService.log("PhoenixEditor: Deletion confirmed", { deletionModalState });
    let newGameData = { ...gameData };

    if (deletionModalState.type === 'delete-template') {
        const idsToDelete = [deletionModalState.template.id, ...getDescendantIds(deletionModalState.template.id, gameData.templates)];
        debugService.log("PhoenixEditor: Deleting template(s)", { idsToDelete });
        newGameData = {
          ...gameData,
          templates: gameData.templates.filter(t => !idsToDelete.includes(t.id)),
          entities: gameData.entities.filter(e => !idsToDelete.includes(e.templateId)),
        };
        if (selectedItemId && idsToDelete.includes(selectedItemId)) {
          setSelectedItemId(null);
        }
    } else if (deletionModalState.type === 'delete-entity') {
        newGameData = { ...gameData, entities: gameData.entities.filter(e => e.id !== deletionModalState.entity.id) };
        if (selectedItemId === deletionModalState.entity.id) setSelectedItemId(null);
    } else if (deletionModalState.type === 'delete-choice') {
        newGameData = {
          ...gameData,
          choices: gameData.choices.filter(c => c.id !== deletionModalState.choice.id),
        };
        if (selectedItemId === deletionModalState.choice.id) setSelectedItemId(null);
    }
    
    debugService.log("PhoenixEditor: Committing deletion to history", { oldGameData: gameData, newGameData });
    onCommitChange(newGameData);
    setDeletionModalState({ type: 'none' });
  };

  const handleSaveTemplate = (templateToSave: Template) => {
    debugService.log('PhoenixEditor: handleSaveTemplate called', { templateToSave, currentEditingState: editingState });
    const isNew = editingState.mode === 'new-template';
    const newTemplates = isNew
      ? [...gameData.templates, templateToSave]
      : gameData.templates.map(t => t.id === templateToSave.id ? templateToSave : t);
    const newGameData = { ...gameData, templates: newTemplates };
    
    debugService.log(`PhoenixEditor: Committing ${isNew ? 'new' : 'updated'} template.`, { oldGameData: gameData, newGameData });
    onCommitChange(newGameData);

    setEditingState({ mode: 'none' });
    setSelectedItemId(templateToSave.id);
    showToast('Blueprint saved successfully!');
  }

  const handleTemplateChange = (updatedTemplate: Template) => {
    debugService.log('PhoenixEditor: handleTemplateChange called from child editor', { updatedTemplate });
    // This function now only updates the local editing state.
    // The explicit "Save Changes" button is now responsible for committing to the global state.
    setEditingState(prev => {
        if (prev.mode === 'edit-template' || prev.mode === 'new-template') {
            const newState = { ...prev, template: updatedTemplate };
            debugService.log('PhoenixEditor: Updating editingState with template changes', { oldState: prev, newState });
            return newState;
        }
        debugService.log('PhoenixEditor: handleTemplateChange ignored, wrong mode', { currentState: prev });
        return prev;
    });
  };

  const handleSaveEntity = (entityToSave: Entity) => {
    debugService.log('PhoenixEditor: handleSaveEntity called', { entityToSave, currentEditingState: editingState });
    const isNew = editingState.mode === 'new-entity';
    const newEntities = isNew
     ? [...gameData.entities, entityToSave]
     : gameData.entities.map(e => e.id === entityToSave.id ? entityToSave : e);
    const newGameData = { ...gameData, entities: newEntities };
    debugService.log(`PhoenixEditor: Committing ${isNew ? 'new' : 'updated'} entity.`, { oldGameData: gameData, newGameData });
    onCommitChange(newGameData);

    setEditingState({ mode: 'none' });
    setSelectedItemId(entityToSave.id);
    showToast('Entity saved successfully!');
  }

  const handleSaveChoice = (choiceToSave: PlayerChoice) => {
    debugService.log('PhoenixEditor: handleSaveChoice called', { choiceToSave, currentEditingState: editingState });
    const isNew = editingState.mode === 'new-choice';
    const newChoices = isNew
     ? [...gameData.choices, choiceToSave]
     : gameData.choices.map(c => c.id === choiceToSave.id ? choiceToSave : c);
    const newGameData = { ...gameData, choices: newChoices };
    debugService.log(`PhoenixEditor: Committing ${isNew ? 'new' : 'updated'} choice.`, { oldGameData: gameData, newGameData });
    onCommitChange(newGameData);

    setEditingState({ mode: 'none' });
    setSelectedItemId(choiceToSave.id);
    showToast('Scene saved successfully!');
  };

  const handleSetStartChoice = (choiceId: string) => {
    debugService.log('PhoenixEditor: Setting start choice', { choiceId });
    onCommitChange({ ...gameData, startChoiceId: choiceId });
  };

  const handleCancelEdit = () => {
    debugService.log('PhoenixEditor: Edit cancelled', { editingState });
    // With the removal of auto-saving, cancel simply closes the editor, discarding any local changes.
    // No need to revert the global gameData state.
    setEditingState({ mode: 'none' });
  }
  
  const handleGenerateImage = useCallback(async (prompt: string, onUpdate: (base64: string) => void) => {
    debugService.log('PhoenixEditor: handleGenerateImage called', { prompt });
    setIsGenerating('image');
    try {
        const imageBase64 = await generateImageFromPrompt(prompt);
        debugService.log('PhoenixEditor: Image generation successful');
        onUpdate(imageBase64);
    } catch (error) {
        debugService.log('PhoenixEditor: Image generation failed', { error });
        alert((error as Error).message);
    } finally {
        setIsGenerating(null);
    }
  }, []);

  const handleGenerateContent = useCallback(async (entity: Entity, attributeId: string, onUpdate: (entity: Entity) => void) => {
    const template = gameData.templates.find(t => t.id === entity.templateId);
    const attribute = template?.attributes.find(a => a.id === attributeId);
    const prompt = `Generate a gritty, cyberpunk-themed "${attribute?.name}" for a ${template?.name} named "${entity.name}" in a colony called "${gameData.colonyName}". The content should be concise and evocative (2-4 sentences).`;
    debugService.log('PhoenixEditor: handleGenerateContent called', { entity, attributeId, prompt });
    
    setIsGenerating(attributeId);
    try {
        const content = await generateStoryContent(prompt);
        debugService.log('PhoenixEditor: Content generation successful', { content });
        const updatedEntity = { 
            ...entity, 
            attributeValues: {
                ...entity.attributeValues,
                [attributeId]: content
            } 
        };
        onUpdate(updatedEntity);
    } catch (error) {
        debugService.log('PhoenixEditor: Content generation failed', { error });
    } finally {
        setIsGenerating(null);
    }
  }, [gameData.colonyName, gameData.templates]);

  const handleExport = () => {
    debugService.log('PhoenixEditor: Exporting project to JSON', { colonyName: gameData.colonyName });
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(gameData, null, 2))}`;
    const link = document.createElement('a');
    link.href = jsonString;
    link.download = `${gameData.colonyName.replace(/\s+/g, '_') || 'megawatt_colony'}.json`;
    link.click();
  };
  
  const handleLoadProjectClick = () => {
    loadProjectInputRef.current?.click();
  };

  const handleProjectFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (window.confirm('Loading a project from file will overwrite your current work. Are you sure?')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result;
            if (typeof text === 'string') {
                onLoadGame(text);
            }
        };
        reader.readAsText(file);
    }

    if(event.target) {
        event.target.value = '';
    }
  };

  const handleBulkImport = (dataType: ImportableKey) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const fileNames = Array.from(files).map(f => f.name);
    debugService.log("PhoenixEditor: Bulk import started", { dataType, fileNames });
    setImportLog(prev => [`--- Starting import for ${dataType}... ---`, ...prev]);

    const validator = VALIDATORS[dataType];
    if (!validator) {
        const errorMsg = `❌ ERROR: No validator found for type ${dataType}.`;
        debugService.log("PhoenixEditor: Bulk import failed", { error: errorMsg });
        setImportLog(prev => [errorMsg, ...prev]);
        return;
    }

    const promises = Array.from(files).map(file => 
        new Promise<{fileName: string, content: any}>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const content = JSON.parse(event.target?.result as string);
                    resolve({ fileName: file.name, content });
                } catch (err) {
                    reject({ fileName: file.name, error: 'Invalid JSON format.' });
                }
            };
            reader.onerror = () => reject({ fileName: file.name, error: 'Failed to read file.' });
            reader.readAsText(file);
        })
    );

    Promise.allSettled(promises).then(results => {
        const successfullyRead: {fileName: string, content: any}[] = [];
        results.forEach(result => {
            if (result.status === 'fulfilled') {
                successfullyRead.push(result.value);
            } else {
                const errorMsg = `❌ ERROR (${result.reason.fileName}): ${result.reason.error}`;
                debugService.log("PhoenixEditor: Bulk import file read error", { reason: result.reason });
                setImportLog(prev => [errorMsg, ...prev]);
            }
        });
        
        if (successfullyRead.length === 0) return;
        
        const validatedItems: any[] = [];
        successfullyRead.forEach(({ fileName, content }) => {
            const itemsToValidate = Array.isArray(content) ? content : [content];
            let allValidInFile = true;
            for (const item of itemsToValidate) {
                if (validator(item)) {
                    validatedItems.push(item);
                } else {
                    allValidInFile = false;
                    const errorMsg = `❌ ERROR (${fileName}): Item with ID '${item.id || 'unknown'}' failed validation. Skipping file.`;
                    debugService.log("PhoenixEditor: Bulk import validation failed for item", { fileName, item });
                    setImportLog(prev => [errorMsg, ...prev]);
                    break;
                }
            }
            if (allValidInFile) {
                 const successMsg = `✅ SUCCESS (${fileName}): Imported ${itemsToValidate.length} item(s).`;
                 debugService.log("PhoenixEditor: Bulk import file succeeded", { fileName, itemCount: itemsToValidate.length });
                 setImportLog(prev => [successMsg, ...prev]);
            }
        });
        
        if(validatedItems.length === 0) return;

        const currentData = gameData[dataType] as any[];
        const dataMap = new Map(currentData.map((item: any) => [item.id, item]));
        
        validatedItems.forEach(item => {
            dataMap.set(item.id, item);
        });
        
        const newGameData = {
            ...gameData,
            [dataType]: Array.from(dataMap.values())
        };
        
        debugService.log("PhoenixEditor: Committing bulk import to history", { dataType, oldGameData: gameData, newGameData });
        onCommitChange(newGameData);

        if (e.target) {
            e.target.value = '';
        }
    });
};

  const filteredEntities = useMemo(() => {
    if (entityFilter === 'all') return gameData.entities;
    const template = gameData.templates.find(t => t.id === entityFilter);
    if (template?.isComponent) return []; // Don't show entities for component blueprints
    return gameData.entities.filter(e => e.templateId === entityFilter);
  }, [entityFilter, gameData.entities, gameData.templates]);

  const TabButton = ({ tab, icon, label }: { tab: EditorTabs; icon: JSX.Element; label: string }) => (
    <button onClick={() => { setActiveTab(tab); setSelectedItemId(null); setEditingState({mode: 'none'}) }} className={`flex flex-col items-center justify-center p-3 space-y-1 w-full text-[length:var(--font-size-xs)] transition duration-300 ${activeTab === tab ? 'bg-[var(--bg-panel-light)] text-[var(--text-accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-panel)]'}`}>
      {icon}
      <span>{label}</span>
    </button>
  );

  const currentSelectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    const allItems = [...gameData.templates, ...gameData.entities, ...gameData.choices];
    return allItems.find(item => item.id === selectedItemId) || null;
  }, [selectedItemId, gameData]);


  const renderSummary = () => {
     if (!currentSelectedItem) {
      return <div className="flex items-center justify-center h-full text-[var(--text-tertiary)] p-8 text-center">
        {editingState.mode === 'none' ? 'Select an item from the list to view its summary, or create a new one.' : 'Editing...'}
        </div>;
    }

    if ('choiceType' in currentSelectedItem) { // It's a PlayerChoice
      const choice = currentSelectedItem as PlayerChoice;
      const nextChoice = choice.nextChoiceId ? gameData.choices.find(c => c.id === choice.nextChoiceId) : null;

      return (
         <div className="p-8 space-y-6">
            <h2 className="text-[length:var(--font-size-3xl)] font-bold text-[var(--text-accent)]">{choice.name}</h2>
             <p className="text-[var(--text-secondary)] whitespace-pre-wrap">{choice.description}</p>
             <div>
                <h4 className="text-[length:var(--font-size-lg)] font-semibold text-[var(--text-secondary)] mb-2">Image Prompt</h4>
                <p className="text-[var(--text-tertiary)] italic">{choice.imagePrompt || "No prompt provided."}</p>
            </div>
             {choice.imageBase64 && (
             <div>
                <h4 className="text-[length:var(--font-size-lg)] font-semibold text-[var(--text-secondary)] mb-2">Background Image</h4>
                <img src={choice.imageBase64} alt="Story background" className="rounded-lg max-w-sm border border-[var(--border-secondary)]"/>
             </div>
            )}
            <div className="pt-4 border-t border-[var(--border-primary)]">
                <h4 className="text-[length:var(--font-size-lg)] font-semibold text-[var(--text-secondary)] mb-2">Logic & Navigation</h4>
                {choice.prompt && (
                    <>
                        <p className="text-[var(--text-tertiary)] mb-1">Presents player with prompt: <span className="italic">"{choice.prompt}"</span></p>
                        <p className="text-[var(--text-tertiary)] text-[length:var(--font-size-sm)]">Type: {choice.choiceType === 'static' ? 'Static Options' : 'Dynamic from Template'}</p>
                    </>
                )}
                {nextChoice && <p className="text-[var(--text-tertiary)]">Continues to scene: <span className="italic">"{nextChoice.name}"</span></p>}
                {!choice.prompt && !nextChoice && <p className="text-[var(--text-tertiary)]">This is an ending point in the story.</p>}
           </div>
         </div>
      );
    }

    if ('isComponent' in currentSelectedItem) { // It's a Template (Blueprint)
      const template = currentSelectedItem as Template;
      return (
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-3">
            {template.isComponent && <PuzzlePieceIcon className="w-8 h-8 text-[var(--text-teal)]" />}
            <h2 className="text-[length:var(--font-size-3xl)] font-bold text-[var(--text-accent)]">{template.name}</h2>
          </div>
          <span className={`text-[length:var(--font-size-sm)] font-medium px-2 py-1 rounded-full ${template.isComponent ? 'bg-teal-800/50 text-teal-200' : 'bg-cyan-800/50 text-cyan-200'}`}>
              {template.isComponent ? 'Component' : 'Template'}
          </span>
          <p className="text-[var(--text-secondary)]">{template.description || <i>No description.</i>}</p>
          <div>
            <h4 className="text-[length:var(--font-size-lg)] font-semibold text-[var(--text-secondary)] mb-2">Tags</h4>
            <div className="flex flex-wrap gap-2">
              {template.tags.length > 0 ? template.tags.map(tag => (
                <span key={tag} className="bg-[var(--bg-panel-light)] text-[var(--text-secondary)] text-[length:var(--font-size-xs)] font-medium px-2.5 py-1 rounded-full">{tag}</span>
              )) : <span className="text-[var(--text-tertiary)] text-[length:var(--font-size-sm)]">No tags.</span>}
            </div>
          </div>
          <div>
            <h4 className="text-[length:var(--font-size-lg)] font-semibold text-[var(--text-secondary)] mb-2">Own Attributes</h4>
            <ul className="list-disc list-inside space-y-1 text-[var(--text-secondary)]">
              {template.attributes.length > 0 ? template.attributes.map(attr => (
                <li key={attr.id}>{attr.name} <span className="text-[var(--text-tertiary)]">({attr.type})</span></li>
              )) : <li className="text-[var(--text-tertiary)] text-[length:var(--font-size-sm)] list-none">No attributes defined on this blueprint directly.</li>}
            </ul>
          </div>
        </div>
      );
    } else { // It's an Entity
      const entity = currentSelectedItem as Entity;
      const template = gameData.templates.find(t => t.id === entity.templateId);
      if (!template) return <div className="p-6 text-[var(--text-danger)]">Error: Cannot find template for this entity.</div>;

      return (
        <div className="p-8 space-y-6">
            <h2 className="text-[length:var(--font-size-3xl)] font-bold text-[var(--text-teal)]">{entity.name}</h2>
            <p className="text-[var(--text-secondary)] italic">Instance of <span className="font-semibold text-[var(--text-primary)]">{template.name}</span></p>
             {entity.imageBase64 && (
                 <div>
                    <h4 className="text-[length:var(--font-size-lg)] font-semibold text-[var(--text-secondary)] mb-2">Image</h4>
                    <img src={entity.imageBase64} alt={entity.name} className="rounded-lg max-w-sm border border-[var(--border-secondary)]"/>
                 </div>
            )}
             <div className="space-y-4 pt-4 border-t border-[var(--border-primary)]">
                {template.attributes.length > 0 ? template.attributes.map(attr => {
                  const value = entity.attributeValues[attr.id];
                  let displayValue: React.ReactNode = <i className="text-[var(--text-tertiary)]">Not set</i>;

                  if (value) {
                     if (attr.type === 'entity_reference') {
                      const referencedEntity = gameData.entities.find(e => e.id === value);
                      displayValue = referencedEntity ? referencedEntity.name : <i className="text-[var(--text-danger)]">Invalid Reference</i>;
                    } else {
                      displayValue = String(value);
                    }
                  }
                  
                  return (
                    <div key={attr.id}>
                      <h4 className="text-[length:var(--font-size-sm)] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{attr.name}</h4>
                      <p className="text-[var(--text-primary)] whitespace-pre-wrap">{displayValue}</p>
                    </div>
                  );
                }) : <p className="text-[var(--text-tertiary)]">This entity's template has no attributes.</p>}
            </div>
        </div>
      )
    }
  };
  
  const renderMainPanel = () => {
    switch (editingState.mode) {
        case 'new-template':
        case 'edit-template':
            return <TemplateEditor 
                key={editingState.template.id}
                template={editingState.template}
                onChange={handleTemplateChange}
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
                onGenerateImage={handleGenerateImage}
                isGenerating={isGenerating}
                isGeneratingImage={isGenerating === 'image'}
                isNew={editingState.mode === 'new-entity'}
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
                isGeneratingImage={isGenerating === 'image'}
            />;
        case 'none':
        default:
            return <div className="flex-1 bg-[var(--bg-panel)] overflow-y-auto">{renderSummary()}</div>;
    }
  };

  const TemplateTreeItem = ({ template, level, onSelect, onEdit, onDelete }: { 
    template: Template & { children: (Template & { children: any[] })[] }, 
    level: number,
    onSelect: (id: string) => void,
    onEdit: (template: Template) => void,
    onDelete: (template: Template) => void,
  }) => (
    <>
      <li 
        className={`flex items-center justify-between group transition duration-200 ${selectedItemId === template.id && editingState.mode === 'none' ? 'bg-[var(--text-accent)]/20' : 'hover:bg-[var(--bg-hover)]'}`}
        style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
      >
        <button onClick={() => onSelect(template.id)} className="flex-grow text-left py-3 pr-3 text-[length:var(--font-size-sm)] truncate flex items-center gap-2">
            {template.isComponent ? <PuzzlePieceIcon className="w-4 h-4 text-[var(--text-teal)] flex-shrink-0" /> : <CubeTransparentIcon className="w-4 h-4 text-[var(--text-accent)] flex-shrink-0" />}
            <span>{template.name}</span>
        </button>
        <div className="flex items-center pr-2">
           <button onClick={() => onEdit(template)} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] opacity-0 group-hover:opacity-100 transition-opacity"><PencilIcon className="w-4 h-4" /></button>
           <button onClick={() => onDelete(template)} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-danger)] opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="w-4 h-4" /></button>
        </div>
      </li>
      {template.children.map(child => (
        <TemplateTreeItem 
          key={child.id} 
          template={child} 
          level={level + 1} 
          onSelect={onSelect} 
          onEdit={onEdit} 
          onDelete={onDelete}
        />
      ))}
    </>
  );

  const templateTree = useMemo(() => {
    const templates = gameData.templates;
    const tree: (Template & { children: any[] })[] = [];
    const map: { [id: string]: (Template & { children: any[] }) } = {};

    templates.forEach(template => {
        map[template.id] = { ...template, children: [] };
    });

    templates.forEach(template => {
        if (template.parentId && map[template.parentId]) {
            map[template.parentId].children.push(map[template.id]);
        } else {
            tree.push(map[template.id]);
        }
    });

    return tree;
  }, [gameData.templates]);

  return (
    <div className="flex h-full bg-[var(--bg-main)] text-[var(--text-primary)]">
      <nav className="w-20 bg-black/20 flex flex-col items-center pt-5 space-y-4 border-r border-[var(--border-primary)]">
        <TabButton tab="world" icon={<GlobeAltIcon className="w-6 h-6"/>} label="World" />
        <TabButton tab="gameplay" icon={<BoltIcon className="w-6 h-6"/>} label="Gameplay" />
        <TabButton tab="blueprints" icon={<CubeTransparentIcon className="w-6 h-6"/>} label="Blueprints" />
        <TabButton tab="entities" icon={<RectangleStackIcon className="w-6 h-6"/>} label="Entities" />
      </nav>

      {activeTab !== 'world' && (
        <aside className="w-80 bg-[var(--bg-panel)]/50 border-r border-[var(--border-primary)] flex flex-col">
            <div className="p-4 border-b border-[var(--border-primary)]">
                <div className="flex items-center gap-2">
                    <h2 className="text-[length:var(--font-size-lg)] font-semibold capitalize">{activeTab}</h2>
                    {activeTab === 'gameplay' && <HelpTooltip title="Gameplay" content="This section is where you build the interactive story of your colony. Each 'Scene' is a node in your story. Scenes can present narrative text, show images, and either lead directly to the next scene or present the player with choices that have consequences." />}
                    {activeTab === 'blueprints' && <HelpTooltip title="Blueprints" content="Blueprints are the foundation of your world. They define the structure for all your entities.\n\n- Templates: Define types of entities, like 'Character' or 'Facility'.\n- Components: Reusable bundles of attributes, like a 'Skill' or 'Inventory', that can be added to any template." />}
                    {activeTab === 'entities' && <HelpTooltip title="Entities" content="Entities are the specific instances of your Templates that exist in the game world. If 'Character' is your Template, then 'Jax Corrigan' is an Entity. Here you create, manage, and define the specific attribute values for every person, place, and thing in your colony." />}
                </div>
                 {activeTab === 'entities' && (
                    <select value={entityFilter} onChange={e => {setEntityFilter(e.target.value); setSelectedItemId(null); setEditingState({mode: 'none'});}} className="w-full mt-2 bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2 focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)] text-[length:var(--font-size-sm)]">
                        <option value="all">-- All Templates --</option>
                        {gameData.templates.filter(t => !t.isComponent).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                )}
            </div>
            <div className="p-4 border-b border-[var(--border-primary)] space-y-2">
                {activeTab === 'blueprints' && (
                    <div className="space-y-2">
                        <button onClick={() => handleAddItem('template')} className="w-full flex items-center justify-center gap-2 bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-accent)] font-bold py-2 px-4 rounded transition duration-300"><PlusIcon className="w-5 h-5" /> New Template</button>
                        <button onClick={() => handleAddItem('component')} className="w-full flex items-center justify-center gap-2 bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-teal)] font-bold py-2 px-4 rounded transition duration-300"><PlusIcon className="w-5 h-5" /> New Component</button>
                    </div>
                )}
                {activeTab === 'entities' && <button onClick={() => handleAddItem('entity')} disabled={!entityFilter || entityFilter === 'all'} className="w-full flex items-center justify-center gap-2 bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-accent)] font-bold py-2 px-4 rounded transition duration-300 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed" title={!entityFilter || entityFilter === 'all' ? 'Select a template first' : 'Add New Entity'}><PlusIcon className="w-5 h-5" /> Add New Entity</button>}
                {activeTab === 'gameplay' && (
                  <button onClick={() => handleAddItem('choice')} className="w-full flex items-center justify-center gap-2 bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-accent)] font-bold py-2 px-4 rounded transition duration-300"><PlusIcon className="w-5 h-5" /> Add New Scene</button>
                )}
            </div>
            <ul className="flex-grow overflow-y-auto">
                {activeTab === 'blueprints' && (
                  gameData.templates.length > 0 ? (
                    templateTree.map(rootTemplate => (
                      <TemplateTreeItem
                          key={rootTemplate.id}
                          template={rootTemplate}
                          level={0}
                          onSelect={(id) => { setSelectedItemId(id); setEditingState({mode: 'none'}) }}
                          onEdit={(template) => {
                              setSelectedItemId(template.id);
                              const templateToEdit = JSON.parse(JSON.stringify(template));
                              debugService.log("PhoenixEditor: Starting to edit template", { template: templateToEdit });
                              setEditingState({ mode: 'edit-template', template: templateToEdit });
                          }}
                          onDelete={(template) => {
                              const descendantIds = getDescendantIds(template.id, gameData.templates);
                              setDeletionModalState({ type: 'delete-template', template, descendantCount: descendantIds.length });
                          }}
                      />
                    ))
                  ) : <li className="p-4 text-center text-[length:var(--font-size-sm)] text-[var(--text-tertiary)] italic">No blueprints created yet.</li>
                )}
                {activeTab === 'entities' && (
                  filteredEntities.length > 0 ? (
                    filteredEntities.map((entity) => (
                      <li key={entity.id} className={`flex items-center justify-between group transition duration-200 ${selectedItemId === entity.id && editingState.mode === 'none' ? 'bg-[var(--text-accent)]/20' : 'hover:bg-[var(--bg-hover)]'}`}>
                          <button onClick={() => {setSelectedItemId(entity.id); setEditingState({mode: 'none'})}} className="flex-grow text-left p-3 text-[length:var(--font-size-sm)] truncate">{entity.name}</button>
                          <div className="flex items-center pr-2">
                            <button onClick={() => setEditingState({ mode: 'edit-entity', entity: JSON.parse(JSON.stringify(entity)) })} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] opacity-0 group-hover:opacity-100 transition-opacity"><PencilIcon className="w-4 h-4" /></button>
                            <button onClick={() => setDeletionModalState({ type: 'delete-entity', entity })} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-danger)] opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="w-4 h-4" /></button>
                          </div>
                      </li>
                    ))
                  ) : <li className="p-4 text-center text-[length:var(--font-size-sm)] text-[var(--text-tertiary)] italic">No entities for this template.</li>
                )}
                {activeTab === 'gameplay' && (
                  gameData.choices.length > 0 ? (
                    gameData.choices.map((choice) => (
                      <li key={choice.id} className={`flex items-center justify-between group transition duration-200 ${selectedItemId === choice.id && editingState.mode === 'none' ? 'bg-[var(--text-accent)]/20' : 'hover:bg-[var(--bg-hover)]'}`}>
                         <button onClick={() => {setSelectedItemId(choice.id); setEditingState({mode: 'none'})}} className="flex-grow text-left p-3 text-[length:var(--font-size-sm)] truncate flex items-center gap-2">
                           {gameData.startChoiceId === choice.id && <PlayIcon className="w-4 h-4 text-[var(--text-accent)] flex-shrink-0" />}
                           <span className={gameData.startChoiceId === choice.id ? 'font-bold text-[var(--text-primary)]' : ''}>{choice.name}</span>
                         </button>
                          <div className="flex items-center pr-2">
                            <button onClick={() => handleSetStartChoice(choice.id)} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-accent)] opacity-0 group-hover:opacity-100 transition-opacity" title="Set as Start Scene"><PlayIcon className="w-4 h-4" /></button>
                            <button onClick={() => setEditingState({ mode: 'edit-choice', choice: JSON.parse(JSON.stringify(choice)) })} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] opacity-0 group-hover:opacity-100 transition-opacity"><PencilIcon className="w-4 h-4" /></button>
                            <button onClick={() => setDeletionModalState({ type: 'delete-choice', choice })} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-danger)] opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="w-4 h-4" /></button>
                          </div>
                      </li>
                    ))
                  ) : <li className="px-4 py-2 text-center text-[length:var(--font-size-sm)] text-[var(--text-tertiary)] italic">No scenes defined yet.</li>
                )}
            </ul>
        </aside>
      )}

      <main className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'world' ? (
            <div className="flex-1 p-8 overflow-y-auto">
                <h1 className="text-[length:var(--font-size-3xl)] font-bold text-[var(--text-accent)] mb-6">World Settings</h1>
                <div className="max-w-2xl space-y-8">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <label htmlFor="colonyName" className="block text-[length:var(--font-size-lg)] font-medium text-[var(--text-secondary)]">Colony Name</label>
                            <HelpTooltip title="Colony Name" content="This is the name of your project and colony. It will be displayed as the main title in the game preview." />
                        </div>
                      <input
                          id="colonyName"
                          type="text"
                          value={gameData.colonyName}
                          onChange={handleColonyNameChange}
                          className="w-full text-[length:var(--font-size-2xl)] bg-[var(--bg-input)] border-2 border-[var(--border-secondary)] rounded-md p-3 focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)]"
                          placeholder="e.g., Neo-Sector 7"
                      />
                    </div>
                    
                    <div className="space-y-6 pt-8 border-t border-[var(--border-primary)]">
                        <div className="flex items-center gap-2">
                            <h2 className="text-[length:var(--font-size-xl)] font-semibold text-[var(--text-secondary)]">Game Landing Page</h2>
                            <HelpTooltip title="Game Landing Page" content="Customize the 'title screen' players see before starting the game. This includes the main description, feature tags, and a background image." />
                        </div>
                        <div>
                            <label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)] mb-1">Description</label>
                            <textarea value={gameData.menuSettings.description} onChange={(e) => updateMenuSettings('description', e.target.value)} rows={4} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2 focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)]"/>
                        </div>
                        <div>
                            <label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)] mb-1">Feature Tags</label>
                            <div className="flex flex-wrap items-center gap-2 p-2 bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md">
                                {gameData.menuSettings.tags.map((tag) => (
                                    <span key={tag} className="flex items-center bg-[var(--text-accent-dark)]/50 text-[var(--text-accent)] text-[length:var(--font-size-xs)] font-medium px-2.5 py-1 rounded-full">
                                        {tag}
                                        <button onClick={() => handleRemoveMenuTag(tag)} className="ml-1.5 -mr-1 w-4 h-4 flex items-center justify-center rounded-full text-[var(--text-accent)] hover:bg-red-500/50 hover:text-white transition-colors" aria-label={`Remove tag ${tag}`}>&times;</button>
                                    </span>
                                ))}
                                <input type="text" value={newMenuTag} onChange={e => setNewMenuTag(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddMenuTag(); } }} placeholder="Add tag..." className="bg-transparent flex-grow p-1 focus:outline-none min-w-[80px]" />
                            </div>
                        </div>
                         <div>
                            <label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)] mb-1">Background Image Prompt (AI)</label>
                            <textarea value={gameData.menuSettings.backgroundImagePrompt} onChange={e => updateMenuSettings('backgroundImagePrompt', e.target.value)} rows={2} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2 focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)]"/>
                            <div className="flex space-x-2 mt-2">
                                <button onClick={() => gameData.menuSettings.backgroundImagePrompt && handleGenerateImage(gameData.menuSettings.backgroundImagePrompt, (base64) => updateMenuSettings('backgroundImageBase64', `data:image/jpeg;base64,${base64}`))} disabled={isGenerating === 'image' || !gameData.menuSettings.backgroundImagePrompt} className="flex-1 bg-[var(--text-accent-bright)] hover:opacity-90 disabled:bg-[var(--bg-panel-light)] text-[var(--text-on-accent)] font-bold py-2 px-4 rounded-md transition duration-300">
                                    {isGenerating === 'image' ? 'Generating...' : 'Generate with AI'}
                                </button>
                                <button onClick={() => menuBgInputRef.current?.click()} className="flex-1 bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-bold py-2 px-4 rounded-md transition duration-300">Upload Background</button>
                                <input type="file" accept="image/*" ref={menuBgInputRef} onChange={e => {
                                    const file = e.target.files?.[0];
                                    if(file) {
                                        const reader = new FileReader();
                                        reader.onload = (ev) => updateMenuSettings('backgroundImageBase64', ev.target?.result);
                                        reader.readAsDataURL(file);
                                    }
                                    e.target.value = '';
                                }} className="hidden"/>
                                {gameData.menuSettings.backgroundImageBase64 && <button onClick={() => updateMenuSettings('backgroundImageBase64', '')} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition duration-300">Clear</button>}
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-[length:var(--font-size-lg)] font-semibold text-[var(--text-secondary)]">News & Updates</h3>
                                <HelpTooltip title="News & Updates" content="Add news items that will be displayed in the 'News' section of your game's main menu. This is a great way to provide lore, patch notes, or updates to your players." />
                            </div>
                            <div className="space-y-2">
                                {gameData.menuSettings.news.map(item => (
                                    <div key={item.id} className="bg-[var(--bg-input)] p-3 rounded-md border border-[var(--border-secondary)] flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold text-[var(--text-primary)]">{item.title}</p>
                                            <p className="text-[length:var(--font-size-xs)] text-[var(--text-secondary)]">{item.date}</p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button onClick={() => setEditingNewsItem(item)} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><PencilIcon className="w-4 h-4" /></button>
                                            <button onClick={() => handleDeleteNewsItem(item.id)} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-danger)]"><TrashIcon className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                ))}
                                <button onClick={() => setEditingNewsItem({ isNew: true })} className="w-full flex items-center justify-center gap-2 bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-accent)] font-bold py-2 px-4 rounded transition duration-300">
                                    <PlusIcon className="w-5 h-5" /> Add News Item
                                </button>
                            </div>
                        </div>
                         <div>
                            <div className="flex items-center gap-2 mb-1">
                                <label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)]">Credits</label>
                                <HelpTooltip title="Credits" content="The text entered here will be displayed in the 'Credits' section of the game's main menu." />
                            </div>
                            <textarea value={gameData.menuSettings.credits} onChange={(e) => updateMenuSettings('credits', e.target.value)} rows={6} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2 focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)]"/>
                        </div>
                    </div>

                    <div className="space-y-4 pt-8 border-t border-[var(--border-primary)]">
                        <div className="flex items-center gap-2">
                            <h2 className="text-[length:var(--font-size-xl)] font-semibold text-[var(--text-secondary)]">Project Data Management</h2>
                            <HelpTooltip title="Project Data Management" content="This allows you to save your entire project (all world data, entities, blueprints, and gameplay scenes) to a single '.json' file on your computer. You can use this for backups or to transfer your project to another device. Use 'Load Project from File' to load a previously saved project, which will overwrite your current session." />
                        </div>
                        <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">Save your entire project to a file on your device for backup, or load a project to continue your work.</p>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={handleExport} className="flex items-center justify-center gap-2 w-full bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-accent)] font-bold py-2 px-4 rounded transition duration-300">
                                <ArrowDownTrayIcon className="w-5 h-5" />
                                Save Project to File
                            </button>
                            <button onClick={handleLoadProjectClick} className="flex items-center justify-center gap-2 w-full bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-accent)] font-bold py-2 px-4 rounded transition duration-300">
                                <ArrowUpTrayIcon className="w-5 h-5" />
                                Load Project from File
                            </button>
                            <input type="file" accept=".json" ref={loadProjectInputRef} onChange={handleProjectFileChange} className="hidden" />
                        </div>
                    </div>

                    <div className="space-y-6 pt-8 border-t border-[var(--border-primary)]">
                        <div className="flex items-center gap-2">
                            <h2 className="text-[length:var(--font-size-xl)] font-semibold text-[var(--text-secondary)]">Bulk Import</h2>
                            <HelpTooltip title="Bulk Import" content="This feature allows you to import multiple data entries from JSON files. Each file can contain a single object or an array of objects that match the data structure for that type (e.g., Templates, Entities). If an imported item has the same ID as an existing item, the existing item will be overwritten." />
                        </div>
                        <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">Import one or more JSON files for a specific data type. Each file can contain a single object or an array of objects. Items with existing IDs will be overwritten.</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <BulkImportButton dataType="templates" onImport={handleBulkImport('templates')} />
                            <BulkImportButton dataType="entities" onImport={handleBulkImport('entities')} />
                            <BulkImportButton dataType="choices" onImport={handleBulkImport('choices')} />
                        </div>
                        {importLog.length > 0 && (
                            <div className="mt-4 p-3 bg-[var(--bg-input)] rounded-md border border-[var(--border-secondary)] max-h-48 overflow-y-auto">
                                <h3 className="font-semibold text-[var(--text-secondary)] text-[length:var(--font-size-sm)] mb-2">Import Log</h3>
                                <ul className="space-y-1 text-[length:var(--font-size-xs)]">
                                    {importLog.slice(0, 50).map((entry, index) => (
                                        <li key={index} className={`whitespace-pre-wrap ${entry.startsWith('❌') ? 'text-[var(--text-danger)]' : entry.startsWith('✅') ? 'text-[var(--text-success)]' : 'text-[var(--text-primary)]'}`}>{entry}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
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
          />
      )}

      <Modal
        isOpen={deletionModalState.type !== 'none'}
        onClose={() => setDeletionModalState({ type: 'none' })}
        title="Confirm Deletion"
      >
        <div className="text-[var(--text-secondary)]">
          <p>Are you sure you want to delete <strong className="text-[var(--text-primary)]">
            {deletionModalState.type === 'delete-template' && deletionModalState.template.name}
            {deletionModalState.type === 'delete-entity' && deletionModalState.entity.name}
             {deletionModalState.type === 'delete-choice' && deletionModalState.choice.name}
          </strong>?</p>
          {deletionModalState.type === 'delete-template' && (
            <p className="mt-2 text-[length:var(--font-size-sm)] text-[var(--text-warning)]">
              This will also delete all {deletionModalState.descendantCount > 0 && `
              ${deletionModalState.descendantCount} sub-template(s) and all`} entities created from these templates. This action cannot be undone.
            </p>
          )}
          {deletionModalState.type === 'delete-choice' && <p className="mt-2 text-[length:var(--font-size-sm)] text-[var(--text-warning)]">Any story cards using this choice will be unlinked. This action cannot be undone.</p>}

          <p className="mt-2 text-[length:var(--font-size-sm)] text-[var(--text-warning)]">You can use Undo (Ctrl+Z) to revert this action.</p>
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <button onClick={() => setDeletionModalState({ type: 'none' })} className="px-4 py-2 rounded-md bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-semibold transition-colors">Cancel</button>
          <button onClick={handleDeleteConfirmed} className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors">Delete</button>
        </div>
      </Modal>

        <Toast 
            show={toast.show}
            message={toast.message}
            onClose={() => setToast({ show: false, message: '' })}
        />
        
        <button
            onClick={() => setIsDebugPanelOpen(true)}
            className="fixed bottom-5 right-5 z-40 p-3 bg-[var(--bg-panel-light)]/80 hover:bg-[var(--text-accent-bright)]/90 backdrop-blur-sm rounded-full text-white shadow-lg transition-all"
            title="Open Debug Panel"
        >
            <BugAntIcon className="w-6 h-6" />
        </button>

        <DebugPanel isOpen={isDebugPanelOpen} onClose={() => setIsDebugPanelOpen(false)} />

    </div>
  );
};

const NewsEditorModal: React.FC<{
    item: NewsItem | null;
    onClose: () => void;
    onSave: (item: NewsItem) => void;
}> = ({ item, onClose, onSave }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    useEffect(() => {
        setTitle(item?.title || '');
        setContent(item?.content || '');
    }, [item]);

    const handleSave = () => {
        if (!title.trim()) {
            alert('Title is required.');
            return;
        }
        onSave({
            id: item?.id || `news_${Date.now()}`,
            date: item?.date || new Date().toLocaleDateString('en-CA'),
            title,
            content,
        });
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={item ? 'Edit News Item' : 'Add News Item'}>
            <div className="space-y-4">
                <div>
                    <label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)] mb-1">Title</label>
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2 focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)]"/>
                </div>
                <div>
                    <label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)] mb-1">Content</label>
                    <textarea value={content} onChange={e => setContent(e.target.value)} rows={10} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2 focus:ring-[var(--border-accent)] focus:border-[var(--border-accent)]"/>
                </div>
            </div>
             <div className="mt-6 flex justify-end space-x-3">
                <button onClick={onClose} className="px-4 py-2 rounded-md bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-semibold transition-colors">Cancel</button>
                <button onClick={handleSave} className="px-4 py-2 rounded-md bg-[var(--bg-active)] hover:opacity-90 text-[var(--text-on-accent)] font-semibold transition-colors">Save</button>
            </div>
        </Modal>
    );
};
