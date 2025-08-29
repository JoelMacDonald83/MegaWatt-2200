
import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { GameData, PlayerChoice, ChoiceOption, Condition, ChoiceOutcome, Template } from '../../types';
import { StyleRadio, StyleSelect, StyleNumberInput } from '../../components/editor/StyleComponents';
import { TrashIcon } from '../../components/icons/TrashIcon';
import { PencilIcon } from '../../components/icons/PencilIcon';
import { ConditionEditor } from './ConditionEditor';
import { debugService } from '../../services/debugService';
import { OutcomeEditor } from './OutcomeEditor';
import { PlusIcon } from '../../components/icons/PlusIcon';
import { HelpTooltip } from '../../components/HelpTooltip';
import { CollapsibleSection } from '../../components/CollapsibleSection';
import { ConditionDisplay, OutcomeDisplay } from '../../components/editor/LogicDisplay';


interface ChoiceEditorProps {
    initialChoice: PlayerChoice;
    onSave: (c: PlayerChoice) => void;
    onCancel: () => void;
    gameData: GameData;
    isNew: boolean;
    onGenerateImage: (prompt: string, onUpdate: (base64: string) => void) => void;
    isGeneratingImage: boolean;
}

type EditingConditionState =
  | { type: 'static'; optionId: string; condition: Condition | null; conditionIndex?: number }
  | { type: 'dynamic'; condition: Condition | null; conditionIndex?: number }
  | null;

type EditingOutcomeState =
  | { type: 'static'; optionId: string; outcome: ChoiceOutcome | null; outcomeIndex?: number }
  | { type: 'dynamic'; outcome: ChoiceOutcome | null; outcomeIndex?: number }
  | null;


const PlaceholderSelector: React.FC<{
    gameData: GameData;
    sourceTemplateIds: string[];
    onInsert: (placeholder: string) => void;
}> = ({ gameData, sourceTemplateIds, onInsert }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const placeholderGroups = useMemo(() => {
        const groups: { groupName: string, items: { name: string, value: string }[] }[] = [];

        groups.push({
            groupName: 'General',
            items: [{ name: 'Entity Name', value: '{entity.name}' }]
        });
        
        const allAttributesByGroup = new Map<string, {name: string, value: string}[]>();

        sourceTemplateIds.forEach(templateId => {
            const template = gameData.templates.find(t => t.id === templateId);
            if (!template) return;

            let current: Template | undefined = template;
            const hierarchy: Template[] = [];
            while(current) {
                hierarchy.unshift(current); // Build from top-down to handle overrides correctly
                current = gameData.templates.find(t => t.id === current?.parentId);
            }

            const componentIds = new Set<string>();
            const seenAttrIds = new Set<string>();

            // Process hierarchy for base and inherited attributes
            for(const t of hierarchy) {
                const groupName = `Blueprint: ${t.name}`;
                if (!allAttributesByGroup.has(groupName)) allAttributesByGroup.set(groupName, []);
                
                t.attributes.forEach(attr => {
                    if (!seenAttrIds.has(attr.id)) {
                        allAttributesByGroup.get(groupName)!.push({
                            name: attr.name,
                            value: `{entity.attributeValues.${attr.id}}`,
                        });
                        seenAttrIds.add(attr.id);
                    }
                });
                (t.includedComponentIds || []).forEach(id => componentIds.add(id));
            }
            
            // Process components
            componentIds.forEach(compId => {
                const component = gameData.templates.find(t => t.id === compId);
                if (component) {
                    const groupName = `Component: ${component.name}`;
                    if (!allAttributesByGroup.has(groupName)) allAttributesByGroup.set(groupName, []);
                    
                    component.attributes.forEach(attr => {
                        allAttributesByGroup.get(groupName)!.push({
                            name: attr.name,
                            value: `{entity.attributeValues.${component.id}_${attr.id}}`,
                        });
                    });
                }
            });
        });
        
        allAttributesByGroup.forEach((items, groupName) => {
            if (items.length > 0) {
                groups.push({ groupName, items });
            }
        });

        return groups;
    }, [sourceTemplateIds, gameData.templates]);
    
    const handleSelect = (value: string) => {
        onInsert(value);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                type="button"
                onClick={() => setIsOpen(p => !p)}
                className="w-full text-left flex items-center justify-center gap-2 mt-2 bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-bold py-2 px-4 rounded transition duration-300"
            >
                <PlusIcon className="w-4 h-4" /> Insert Placeholder
            </button>
            {isOpen && (
                <div className="absolute z-10 bottom-full mb-2 w-full max-h-60 overflow-y-auto bg-[var(--bg-main)] border border-[var(--border-primary)] rounded-md shadow-lg">
                    {placeholderGroups.length <= 1 && (!placeholderGroups[0] || placeholderGroups[0].items.length <= 1) ? (
                        <div className="p-2 text-center text-sm text-[var(--text-tertiary)]">Select a source blueprint to see available placeholders.</div>
                    ) : (
                        placeholderGroups.map((group, i) => (
                            <div key={i}>
                                {group.items.length > 0 && (
                                    <>
                                        <div className="px-2 py-1 text-xs font-semibold text-[var(--text-secondary)] bg-[var(--bg-panel)] sticky top-0">{group.groupName}</div>
                                        <ul>
                                            {group.items.map(item => (
                                                <li key={item.value}>
                                                    <button onClick={() => handleSelect(item.value)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-[var(--bg-hover)]">
                                                        {item.name}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};


export const ChoiceEditor: React.FC<ChoiceEditorProps> = ({ initialChoice, onSave, onCancel, gameData, isNew, onGenerateImage, isGeneratingImage }) => {
    const [localChoice, setLocalChoice] = useState<PlayerChoice>(() => JSON.parse(JSON.stringify(initialChoice)));
    const [editingConditionState, setEditingConditionState] = useState<EditingConditionState>(null);
    const [editingOutcomeState, setEditingOutcomeState] = useState<EditingOutcomeState>(null);
    const [templateToAdd, setTemplateToAdd] = useState('');
    const [componentToAdd, setComponentToAdd] = useState('');
    const [componentToExclude, setComponentToExclude] = useState('');
    const bgInputRef = useRef<HTMLInputElement>(null);
    const fgInputRef = useRef<HTMLInputElement>(null);
    const optionTextareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        debugService.log('ChoiceEditor: Component mounted or received new props.', { initialChoice, isNew });
        setLocalChoice(JSON.parse(JSON.stringify(initialChoice)));
    }, [initialChoice, isNew]);
    
    useEffect(() => {
        debugService.log('ChoiceEditor: Editing condition state changed.', { editingConditionState });
    }, [editingConditionState]);

    useEffect(() => {
        debugService.log('ChoiceEditor: Editing outcome state changed.', { editingOutcomeState });
    }, [editingOutcomeState]);

    const updateField = (field: keyof PlayerChoice, value: any) => {
        setLocalChoice(prev => {
            const newState = { ...prev, [field]: value };
            debugService.log('ChoiceEditor: Updating simple field', { field, value, oldState: prev, newState });
            return newState;
        });
    };
    
    const updateStyle = (key: keyof NonNullable<PlayerChoice['styles']>, value: any) => {
        setLocalChoice(prev => {
             const newState = {
                ...prev,
                styles: {
                    ...(prev.styles || {}),
                    [key]: value
                }
            };
            debugService.log('ChoiceEditor: Updating style', { key, value, oldState: prev, newState });
            return newState;
        });
    };
    
     const updateFgStyle = (key: keyof NonNullable<PlayerChoice['styles']>['foregroundImageStyles'], value: any) => {
        setLocalChoice(prev => {
            const newState = {
                ...prev,
                styles: {
                    ...prev.styles,
                    foregroundImageStyles: {
                        ...(prev.styles?.foregroundImageStyles || {}),
                        [key]: value,
                    }
                }
            };
            debugService.log('ChoiceEditor: Updating foreground style', { key, value, oldState: prev, newState });
            return newState;
        });
    };

    const handleChoiceTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newType = e.target.value as PlayerChoice['choiceType'];
        debugService.log('ChoiceEditor: Choice type changing', { newType });
        setLocalChoice(prev => {
            let newState = { ...prev, choiceType: newType };
            if (newType === 'static' && !prev.staticOptions) {
                newState.staticOptions = [];
            }
            if (newType === 'dynamic_from_template' && !prev.dynamicConfig) {
                 newState.dynamicConfig = { sourceTemplateIds: [], requiredComponentIds: [], excludedComponentIds: [], optionTemplate: { text: '{entity.name}' }, outcomeTemplates: [], filterConditions: [] };
            }
            debugService.log('ChoiceEditor: Choice type changed', { oldState: prev, newState });
            return newState;
        })
    };

    const updateStaticOption = (optionId: string, newOptionData: Partial<ChoiceOption>) => {
        setLocalChoice(prev => {
            const newOptions = (prev.staticOptions || []).map(opt =>
                opt.id === optionId ? { ...opt, ...newOptionData } : opt
            );
            const newState = { ...prev, staticOptions: newOptions };
            debugService.log('ChoiceEditor: Updating static option', { optionId, newOptionData, oldState: prev, newState });
            return newState;
        });
    };

    const addStaticOption = () => {
        setLocalChoice(prev => {
            const newOption: ChoiceOption = {
                id: `opt_${Date.now()}`,
                text: 'New Option',
                outcomes: []
            };
            const newState = { ...prev, staticOptions: [...(prev.staticOptions || []), newOption] };
            debugService.log('ChoiceEditor: Adding static option', { newOption, oldState: prev, newState });
            return newState;
        });
    };

    const removeStaticOption = (optionId: string) => {
        setLocalChoice(prev => {
            const newState = {
                ...prev,
                staticOptions: (prev.staticOptions || []).filter(opt => opt.id !== optionId)
            };
            debugService.log('ChoiceEditor: Removing static option', { optionId, oldState: prev, newState });
            return newState;
        });
    };

    const handleGenerateImageClick = () => {
        if (localChoice.imagePrompt) {
            onGenerateImage(localChoice.imagePrompt, (base64) => {
                updateField('imageBase64', `data:image/jpeg;base64,${base64}`);
            });
        }
    };

    const handleFileUpload = (file: File | null, field: 'imageBase64' | 'foregroundImageBase64') => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (typeof e.target?.result === 'string') {
                    updateField(field, e.target.result);
                }
            };
            reader.readAsDataURL(file);
        } else if (file) {
            alert('Please select a valid image file.');
        }
    }
    
    const handleSaveCondition = (condition: Condition) => {
        debugService.log('ChoiceEditor: Saving condition from ConditionEditor', { condition, editingConditionState });
        if (!editingConditionState) return;

        if (editingConditionState.type === 'static') {
            const option = (localChoice.staticOptions || []).find(o => o.id === editingConditionState.optionId);
            if (!option) return;
            
            const newConditions = [...(option.conditions || [])];
            if (editingConditionState.conditionIndex !== undefined) {
                newConditions[editingConditionState.conditionIndex] = condition;
            } else {
                newConditions.push(condition);
            }
            updateStaticOption(editingConditionState.optionId, { conditions: newConditions });

        } else if (editingConditionState.type === 'dynamic') {
            const newConditions = [...(localChoice.dynamicConfig?.filterConditions || [])];
             if (editingConditionState.conditionIndex !== undefined) {
                newConditions[editingConditionState.conditionIndex] = condition;
            } else {
                newConditions.push(condition);
            }
            setLocalChoice(p => {
                if (!p.dynamicConfig) return p;
                const newState = { ...p, dynamicConfig: { ...p.dynamicConfig, filterConditions: newConditions }};
                debugService.log('ChoiceEditor: Updating dynamic filter conditions', { newConditions, oldState: p, newState });
                return newState;
            });
        }
        setEditingConditionState(null);
    };

    const handleRemoveCondition = (type: 'static' | 'dynamic', index: number, optionId?: string) => {
        debugService.log('ChoiceEditor: Removing condition', { type, index, optionId });
        if (type === 'static' && optionId) {
            const option = (localChoice.staticOptions || []).find(o => o.id === optionId);
            if (!option || !option.conditions) return;
            const newConditions = option.conditions.filter((_, i) => i !== index);
            updateStaticOption(optionId, { conditions: newConditions });
        } else if (type === 'dynamic') {
            if (!localChoice.dynamicConfig?.filterConditions) return;
            const newConditions = localChoice.dynamicConfig.filterConditions.filter((_, i) => i !== index);
            setLocalChoice(p => {
                 if (!p.dynamicConfig) return p;
                 const newState = { ...p, dynamicConfig: { ...p.dynamicConfig, filterConditions: newConditions }};
                 debugService.log('ChoiceEditor: Removing dynamic filter condition', { index, oldState: p, newState });
                 return newState;
            });
        }
    };
    
    const handleSaveOutcome = (outcome: ChoiceOutcome) => {
        debugService.log('ChoiceEditor: Saving outcome from OutcomeEditor', { outcome, editingOutcomeState });
        if (!editingOutcomeState) return;
        
        if (editingOutcomeState.type === 'static') {
            const option = (localChoice.staticOptions || []).find(o => o.id === editingOutcomeState.optionId);
            if (!option) return;
            const newOutcomes = [...(option.outcomes || [])];
            if (editingOutcomeState.outcomeIndex !== undefined) {
                newOutcomes[editingOutcomeState.outcomeIndex] = outcome;
            } else {
                newOutcomes.push(outcome);
            }
            updateStaticOption(editingOutcomeState.optionId, { outcomes: newOutcomes });
        } else if (editingOutcomeState.type === 'dynamic') {
            setLocalChoice(p => {
                if (!p.dynamicConfig) return p;
                const newOutcomes = [...p.dynamicConfig.outcomeTemplates];
                 if (editingOutcomeState.outcomeIndex !== undefined) {
                    newOutcomes[editingOutcomeState.outcomeIndex] = outcome;
                } else {
                    newOutcomes.push(outcome);
                }
                const newState = {...p, dynamicConfig: {...p.dynamicConfig, outcomeTemplates: newOutcomes }};
                debugService.log('ChoiceEditor: Updating dynamic outcomes', { newOutcomes, oldState: p, newState });
                return newState;
            });
        }

        setEditingOutcomeState(null);
    };
    
    const handleRemoveOutcome = (type: 'static' | 'dynamic', index: number, optionId?: string) => {
         debugService.log('ChoiceEditor: Removing outcome', { type, index, optionId });
         if (type === 'static' && optionId) {
            const option = (localChoice.staticOptions || []).find(o => o.id === optionId);
            if (!option || !option.outcomes) return;
            const newOutcomes = option.outcomes.filter((_, i) => i !== index);
            updateStaticOption(optionId, { outcomes: newOutcomes });
        } else if (type === 'dynamic') {
             setLocalChoice(p => {
                if (!p.dynamicConfig) return p;
                const newOutcomes = p.dynamicConfig.outcomeTemplates.filter((_, i) => i !== index);
                const newState = {...p, dynamicConfig: {...p.dynamicConfig, outcomeTemplates: newOutcomes }};
                debugService.log('ChoiceEditor: Removing dynamic outcome', { index, oldState: p, newState });
                return newState;
            });
        }
    }

    const handleSaveChanges = () => {
        debugService.log('ChoiceEditor: "Save Changes" button clicked. Calling onSave.', { finalChoiceState: localChoice });
        onSave(localChoice);
    };

    const handleCancelClick = () => {
        debugService.log('ChoiceEditor: "Cancel" button clicked.');
        onCancel();
    };

    const handleInsertPlaceholder = (placeholder: string) => {
        const textarea = optionTextareaRef.current;
        if (!textarea || !localChoice.dynamicConfig) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = localChoice.dynamicConfig.optionTemplate.text || '';

        const newText = text.substring(0, start) + placeholder + text.substring(end);
        
        updateField('dynamicConfig', { ...localChoice.dynamicConfig, optionTemplate: { text: newText }});

        // Focus and set cursor position after state update
        setTimeout(() => {
            textarea.focus();
            const newCursorPos = start + placeholder.length;
            textarea.selectionStart = newCursorPos;
            textarea.selectionEnd = newCursorPos;
        }, 0);
    };

    const styles = useMemo(() => {
        const s = localChoice.styles || {};
        const fgs = s.foregroundImageStyles || {};
        return {
            textPosition: s.textPosition || 'bottom',
            textAlign: s.textAlign || 'center',
            textColor: s.textColor || 'text-white',
            overlayStrength: s.overlayStrength || 'medium',
            backgroundAnimation: s.backgroundAnimation || 'kenburns-normal',
            backgroundAnimationDuration: s.backgroundAnimationDuration || 30,
            fontFamily: s.fontFamily || 'sans',
            fontSize: s.fontSize || 'normal',
            textWidth: s.textWidth || 'medium',
            backgroundEffect: s.backgroundEffect || 'none',
            cardTransition: s.cardTransition || 'fade',
            cardTransitionDuration: s.cardTransitionDuration || 0.6,
            textAnimation: s.textAnimation || 'fade-in',
            textAnimationDuration: s.textAnimationDuration || 1,
            textAnimationDelay: s.textAnimationDelay || 0.5,
            fg: {
                position: fgs.position || 'center',
                size: fgs.size || 'medium',
                animation: fgs.animation || 'fade-in',
                animationDuration: fgs.animationDuration || 1,
                animationDelay: fgs.animationDelay || 1,
            }
        }
    }, [localChoice.styles]);

    // Preview Classes
    const previewPositionClasses = { top: 'justify-start', middle: 'justify-center', bottom: 'justify-end' }[styles.textPosition];
    const previewTextAlignClasses = { left: 'text-left', center: 'text-center', right: 'text-right' }[styles.textAlign];
    const previewFlexAlignClasses = { left: 'items-start', center: 'items-center', right: 'items-end' }[styles.textAlign];
    const previewFontClass = { sans: 'font-sans', serif: 'font-serif', mono: 'font-mono' }[styles.fontFamily];
    const previewFontSizeClass = { normal: 'text-[0.5rem] leading-tight', large: 'text-[0.6rem] leading-tight', xlarge: 'text-[0.7rem] leading-tight', xxlarge: 'text-[0.8rem] leading-tight' }[styles.fontSize];
    const previewWidthClass = { narrow: 'w-1/2', medium: 'w-3/4', wide: 'w-full' }[styles.textWidth];
    const previewBgEffectClass = { none: '', blur: 'blur-sm', darken: 'brightness-75' }[styles.backgroundEffect];
    
    const previewFgPositionClass = { left: 'justify-start', center: 'justify-center', right: 'justify-end'}[styles.fg.position];
    const previewFgSizeClass = { small: 'w-1/4', medium: 'w-1/3', large: 'w-1/2'}[styles.fg.size];
    const previewFgAnimationClass = `anim-fg-${styles.fg.animation}`;
    const previewFgAnimationStyle = { animationDuration: `${styles.fg.animationDuration}s`, animationDelay: `${styles.fg.animationDelay}s`};
    const previewFgAnimationKey = `fg-anim-key-${styles.fg.animation}-${styles.fg.animationDuration}-${styles.fg.animationDelay}`;

    const isInteractive = localChoice.prompt !== undefined;

    const nextSceneSelectOptions = useMemo(() => (
        <>
            <option value="">-- End of Path --</option>
            {gameData.choiceChunks.map(chunk => (
                <optgroup key={chunk.id} label={chunk.name}>
                    {chunk.choiceIds
                        .map(id => gameData.allChoices.find(c => c.id === id))
                        .filter((c): c is PlayerChoice => c !== undefined && c.id !== localChoice.id)
                        .map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))
                    }
                </optgroup>
            ))}
        </>
    ), [gameData.choiceChunks, gameData.allChoices, localChoice.id]);

    return (
        <div className="flex-1 flex flex-col bg-[var(--bg-panel)] min-h-0">
            <header className="p-4 border-b border-[var(--border-primary)]">
                <h2 className="text-[length:var(--font-size-xl)] font-bold text-[var(--text-primary)]">{isNew ? 'Creating New Scene' : `Editing Scene: ${initialChoice.name}`}</h2>
            </header>
            <main className="flex-grow p-6 space-y-8 overflow-y-auto">
                <CollapsibleSection title="Core Details & Background" defaultOpen={true}>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)]">Scene Name (for Editor)</label>
                            <HelpTooltip title="Scene Name" content="The name of this scene as it appears in the editor's scene list. This is for your organizational purposes and is not shown to the player." />
                        </div>
                        <input type="text" value={localChoice.name} onChange={e => updateField('name', e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2"/>
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)]">Scene Description</label>
                            <HelpTooltip title="Scene Description" content="This is the main narrative text for the scene, which is displayed to the player. It sets the context for the choice or continues the story." />
                        </div>
                        <textarea value={localChoice.description} onChange={e => updateField('description', e.target.value)} rows={4} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2"/>
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)]">AI Background Prompt</label>
                            <HelpTooltip title="AI Background Prompt" content="Write a detailed, descriptive prompt for the AI to generate a background image for this scene. Mention themes (e.g., cyberpunk, noir), colors, lighting, and subject matter for best results." />
                        </div>
                        <textarea value={localChoice.imagePrompt} onChange={e => updateField('imagePrompt', e.target.value)} rows={2} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2" placeholder="e.g., A lone figure overlooking a vast cyberpunk city at night..."/>
                        <div className="flex space-x-2 mt-2">
                            <button onClick={handleGenerateImageClick} disabled={isGeneratingImage || !localChoice.imagePrompt} className="flex-1 bg-[var(--color-action-primary)] hover:opacity-90 disabled:bg-[var(--bg-panel-light)] text-[var(--text-on-accent)] font-bold py-2 px-4 rounded-md">
                                {isGeneratingImage ? 'Generating...' : 'Generate with AI'}
                            </button>
                            <button onClick={() => bgInputRef.current?.click()} className="flex-1 bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-bold py-2 px-4 rounded-md">Upload Background</button>
                            <input type="file" accept="image/*" ref={bgInputRef} onChange={e => handleFileUpload(e.target.files?.[0] ?? null, 'imageBase64')} className="hidden"/>
                            {localChoice.imageBase64 && <button onClick={() => updateField('imageBase64', undefined)} className="bg-[var(--color-action-destructive-bg)] hover:opacity-90 text-[var(--color-action-destructive-text)] font-bold py-2 px-4 rounded-md">Clear</button>}
                        </div>
                    </div>
                </CollapsibleSection>
                
                <CollapsibleSection title="Scene Styling">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <StyleSelect label="Text Position" help="Sets the vertical alignment of the scene text (top, middle, or bottom)." value={styles.textPosition} onChange={e => updateStyle('textPosition', e.target.value)}><option value="top">Top</option><option value="middle">Middle</option><option value="bottom">Bottom</option></StyleSelect>
                        <StyleSelect label="Text Alignment" help="Sets the horizontal alignment of the scene text (left, center, or right)." value={styles.textAlign} onChange={e => updateStyle('textAlign', e.target.value)}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></StyleSelect>
                        <div>
                            <label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)] mb-1">Text Color Class</label>
                            <HelpTooltip title="Text Color Class" content="Controls the color of the main description text. Use Tailwind CSS classes (e.g., 'text-white', 'text-cyan-200')." />
                            <input type="text" value={styles.textColor} onChange={e => updateStyle('textColor', e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2" placeholder="e.g. text-white"/>
                        </div>
                        <StyleSelect label="Font Family" help="Sets the font style for the scene's text." value={styles.fontFamily} onChange={e => updateStyle('fontFamily', e.target.value)}><option value="sans">Sans-Serif</option><option value="serif">Serif</option><option value="mono">Monospace</option></StyleSelect>
                        <StyleSelect label="Font Size" help="Controls the size of the main description text." value={styles.fontSize} onChange={e => updateStyle('fontSize', e.target.value)}><option value="normal">Normal</option><option value="large">Large</option><option value="xlarge">X-Large</option><option value="xxlarge">XX-Large</option></StyleSelect>
                        <StyleSelect label="Text Width" help="Controls the maximum width of the text block, useful for readability." value={styles.textWidth} onChange={e => updateStyle('textWidth', e.target.value)}><option value="narrow">Narrow</option><option value="medium">Medium</option><option value="wide">Wide</option></StyleSelect>
                        <StyleSelect label="Overlay Strength" help="Adds a semi-transparent black overlay on top of the background image to improve text readability." value={styles.overlayStrength} onChange={e => updateStyle('overlayStrength', e.target.value)}><option value="none">None</option><option value="light">Light</option><option value="medium">Medium</option><option value="heavy">Heavy</option></StyleSelect>
                        <StyleSelect label="Background Effect" help="Applies a visual effect to the entire background image." value={styles.backgroundEffect} onChange={e => updateStyle('backgroundEffect', e.target.value)}><option value="none">None</option><option value="blur">Blur</option><option value="darken">Darken</option></StyleSelect>
                        <div className="grid grid-cols-[2fr_1fr] gap-2"><StyleSelect wrapperClassName="col-span-2" help="Adds a subtle animation to the background image, like a slow zoom or pan." label="Background Animation" value={styles.backgroundAnimation} onChange={e => updateStyle('backgroundAnimation', e.target.value)}><option value="kenburns-normal">Ken Burns Normal</option><option value="kenburns-subtle">Ken Burns Subtle</option><option value="pan-left">Pan Left</option><option value="pan-right">Pan Right</option><option value="zoom-out">Zoom Out</option><option value="none">None</option></StyleSelect><StyleNumberInput wrapperClassName="col-span-2" label="Duration (s)" value={styles.backgroundAnimationDuration} onChange={e => updateStyle('backgroundAnimationDuration', e.target.valueAsNumber)} /></div>
                        <div className="grid grid-cols-[2fr_1fr] gap-2"><StyleSelect wrapperClassName="col-span-2" help="Controls how this scene appears and the previous one disappears." label="Scene Transition" value={styles.cardTransition} onChange={e => updateStyle('cardTransition', e.target.value)}><option value="fade">Fade</option><option value="dissolve">Dissolve</option><option value="slide-left">Slide Left</option><option value="slide-up">Slide Up</option><option value="zoom-in">Zoom In</option></StyleSelect><StyleNumberInput wrapperClassName="col-span-2" label="Duration (s)" value={styles.cardTransitionDuration} onChange={e => updateStyle('cardTransitionDuration', e.target.valueAsNumber)} /></div>
                        <div className="grid grid-cols-2 gap-2"><StyleSelect wrapperClassName="col-span-2" label="Text Animation" help="Controls how the main description text appears on screen." value={styles.textAnimation} onChange={e => updateStyle('textAnimation', e.target.value)}><option value="fade-in">Fade In</option><option value="rise-up">Rise Up</option><option value="typewriter">Typewriter</option><option value="none">None</option></StyleSelect><StyleNumberInput label="Duration (s)" value={styles.textAnimationDuration} onChange={e => updateStyle('textAnimationDuration', e.target.valueAsNumber)} /><StyleNumberInput label="Delay (s)" value={styles.textAnimationDelay} onChange={e => updateStyle('textAnimationDelay', e.target.valueAsNumber)} /></div>
                    </div>
                </CollapsibleSection>

                <CollapsibleSection title="Foreground Image">
                    <HelpTooltip title="Foreground Image" content="Upload an image (ideally with a transparent background, like a PNG) to be layered on top of the background. This is great for character sprites, objects, or UI elements." />
                    <div className="flex space-x-2">
                        <button onClick={() => fgInputRef.current?.click()} className="flex-1 bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-bold py-2 px-4 rounded-md">Upload Foreground</button>
                        <input type="file" accept="image/*" ref={fgInputRef} onChange={e => handleFileUpload(e.target.files?.[0] ?? null, 'foregroundImageBase64')} className="hidden"/>
                        {localChoice.foregroundImageBase64 && <button onClick={() => updateField('foregroundImageBase64', undefined)} className="bg-[var(--color-action-destructive-bg)] hover:opacity-90 text-[var(--color-action-destructive-text)] font-bold py-2 px-4 rounded-md">Clear</button>}
                    </div>
                    {localChoice.foregroundImageBase64 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                             <StyleSelect label="Position" help="The horizontal position of the foreground image." value={styles.fg.position} onChange={e => updateFgStyle('position', e.target.value)}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></StyleSelect>
                             <StyleSelect label="Size" help="The relative size of the foreground image." value={styles.fg.size} onChange={e => updateFgStyle('size', e.target.value)}><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></StyleSelect>
                             <div></div>
                             <div className="grid grid-cols-2 gap-2">
                                <StyleSelect wrapperClassName="col-span-2" label="Animation" help="How the foreground image appears on screen." value={styles.fg.animation} onChange={e => updateFgStyle('animation', e.target.value)}><option value="none">None</option><option value="fade-in">Fade In</option><option value="slide-in-left">Slide-in Left</option><option value="slide-in-right">Slide-in Right</option><option value="zoom-in">Zoom In</option></StyleSelect>
                                <StyleNumberInput label="Duration (s)" value={styles.fg.animationDuration} onChange={e => updateFgStyle('animationDuration', e.target.valueAsNumber)} />
                                <StyleNumberInput label="Delay (s)" value={styles.fg.animationDelay} onChange={e => updateFgStyle('animationDelay', e.target.valueAsNumber)} />
                             </div>
                        </div>
                    )}
                </CollapsibleSection>
                
                <CollapsibleSection title="Logic & Navigation" defaultOpen={true}>
                    {isInteractive ? (
                        <div className="space-y-6">
                             <div className="flex justify-between items-center pb-4 border-b border-[var(--border-primary)]">
                                <p className="text-[length:var(--font-size-sm)] font-medium text-[var(--text-primary)]">
                                    This scene presents choices to the player.
                                </p>
                                <button onClick={() => updateField('prompt', undefined)} className="text-[length:var(--font-size-sm)] text-[var(--text-accent)] hover:underline font-semibold">
                                    Make Linear Scene
                                </button>
                            </div>
                            <div>
                                <label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)] mb-1">Player Prompt</label>
                                <input type="text" value={localChoice.prompt || ''} onChange={e => updateField('prompt', e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2"/>
                            </div>
                            <div className="p-3 bg-[var(--bg-input)]/40 rounded-lg border border-[var(--border-primary)]">
                                <StyleRadio 
                                    label="Choice Type"
                                    name="choiceType"
                                    value={localChoice.choiceType}
                                    onChange={handleChoiceTypeChange}
                                    options={[{value: 'static', label: 'Static Options'}, {value: 'dynamic_from_template', label: 'Dynamic Options'}]}
                                    help={"Static Choices: You write each option by hand. Use this for specific dialogue, actions, or moral dilemmas.\n\nDynamic Choices: The game generates a list of options automatically from a template (e.g., list all available characters). Use this when the available options depend on the current game state."}
                                />
                                
                                {localChoice.choiceType === 'static' && (
                                    <div className="space-y-3 mt-4">
                                        {(localChoice.staticOptions || []).map(opt => (
                                            <div key={opt.id} className="bg-[var(--bg-input)]/50 p-3 rounded-md border border-[var(--border-primary)] space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-grow mr-2">
                                                        <label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)] mb-1">Option Text</label>
                                                        <input type="text" value={opt.text} onChange={e => updateStaticOption(opt.id, { text: e.target.value })} placeholder="Option Text" className="w-full bg-[var(--bg-panel)] border border-[var(--border-secondary)] rounded-md p-2"/>
                                                    </div>
                                                    <button onClick={() => removeStaticOption(opt.id)} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-danger)] self-end mb-2"><TrashIcon className="w-4 h-4"/></button>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="pt-2 border-t border-[var(--border-primary)] md:border-t-0 md:border-r md:pr-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <h4 className="text-[length:var(--font-size-sm)] font-semibold text-[var(--text-secondary)]">Conditions</h4>
                                                            <HelpTooltip title="Option Conditions" content="Conditions determine if this option is visible to the player. ALL conditions listed here must be true for the option to appear. If there are no conditions, the option is always visible." />
                                                        </div>
                                                        <div className="space-y-1">
                                                            {(opt.conditions || []).map((cond, index) => (
                                                                <div key={index} className="flex justify-between items-center bg-[var(--bg-panel)] p-1.5 rounded">
                                                                    <ConditionDisplay condition={cond} gameData={gameData} />
                                                                    <div className="flex-shrink-0 flex items-center">
                                                                    <button onClick={() => setEditingConditionState({ type: 'static', optionId: opt.id, condition: cond, conditionIndex: index })} className="p-1"><PencilIcon className="w-4 h-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] mx-1"/></button>
                                                                    <button onClick={() => handleRemoveCondition('static', index, opt.id)} className="p-1"><TrashIcon className="w-4 h-4 text-[var(--text-secondary)] hover:text-[var(--text-danger)]"/></button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <button onClick={() => setEditingConditionState({ type: 'static', optionId: opt.id, condition: null})} className="text-[length:var(--font-size-sm)] mt-2 text-[var(--text-primary)] hover:opacity-80 w-full text-left flex items-center gap-1"><PlusIcon className="w-4 h-4"/> Add Condition</button>
                                                    </div>
                                                    <div className="pt-2 border-t border-[var(--border-primary)] md:border-t-0">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <h4 className="text-[length:var(--font-size-sm)] font-semibold text-[var(--text-secondary)]">Outcomes</h4>
                                                            <HelpTooltip title="Option Outcomes" content="Outcomes are the consequences of choosing this option. They are executed immediately when the player clicks the option. You can use outcomes to create new entities, update existing ones, change character stats, etc." />
                                                        </div>
                                                        <div className="space-y-1">
                                                            {(opt.outcomes || []).map((outcome, index) => (
                                                                 <div key={index} className="flex justify-between items-center bg-[var(--bg-panel)] p-1.5 rounded">
                                                                    <OutcomeDisplay outcome={outcome} gameData={gameData} />
                                                                    <div className="flex-shrink-0 flex items-center">
                                                                        <button onClick={() => setEditingOutcomeState({ type: 'static', optionId: opt.id, outcome: outcome, outcomeIndex: index })} className="p-1"><PencilIcon className="w-4 h-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] mx-1"/></button>
                                                                        <button onClick={() => handleRemoveOutcome('static', index, opt.id)} className="p-1"><TrashIcon className="w-4 h-4 text-[var(--text-secondary)] hover:text-[var(--text-danger)]"/></button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <button onClick={() => setEditingOutcomeState({ type: 'static', optionId: opt.id, outcome: null })} className="text-[length:var(--font-size-sm)] mt-2 text-[var(--text-primary)] hover:opacity-80 w-full text-left flex items-center gap-1"><PlusIcon className="w-4 h-4"/> Add Outcome</button>
                                                    </div>
                                                </div>
                                                <div>
                                                    <StyleSelect 
                                                        label="Next Scene" 
                                                        value={opt.nextChoiceId || ''} 
                                                        onChange={e => updateStaticOption(opt.id, { nextChoiceId: e.target.value || null })}
                                                        help="The scene that will be shown after the player makes this choice and its outcomes are executed. If left as '-- End of Path --', this choice concludes this branch of the story."
                                                    >
                                                        {nextSceneSelectOptions}
                                                    </StyleSelect>
                                                </div>
                                            </div>
                                        ))}
                                        <button onClick={addStaticOption} className="mt-4 w-full bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-bold py-2 px-4 rounded transition duration-300 flex items-center justify-center gap-2"><PlusIcon className="w-4 h-4"/>Add Static Option</button>
                                    </div>
                                )}

                                {localChoice.choiceType === 'dynamic_from_template' && localChoice.dynamicConfig && (
                                    <div className="mt-4 space-y-6">
                                        
                                        <div className="p-4 rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-input)]">
                                            <h4 className="font-semibold text-lg text-[var(--text-primary)] mb-2">1. Find Entities</h4>
                                            <p className="text-[var(--text-secondary)] mb-3 text-[length:var(--font-size-sm)]">
                                                Create one choice option for each entity that matches the criteria below.
                                            </p>
                                            
                                            <div className="space-y-4">
                                                {/* Source Blueprints (OR) */}
                                                <div>
                                                     <div className="flex items-center gap-2 mb-2">
                                                        <label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)]">Find entities based on ANY of these blueprints:</label>
                                                        <HelpTooltip title="Source Blueprints" content="Select one or more blueprints. The system will find all entities that are based on ANY of the blueprints in this list (OR logic)." />
                                                    </div>
                                                    <div className="space-y-2 mb-2">
                                                        {(localChoice.dynamicConfig.sourceTemplateIds || []).map(id => {
                                                            const template = gameData.templates.find(t => t.id === id);
                                                            return template ? (
                                                                <div key={id} className="bg-[var(--bg-panel)] p-2 rounded-md flex justify-between items-center text-sm">
                                                                    <span className="text-[var(--text-primary)] font-medium">{template.name}</span>
                                                                    <button onClick={() => updateField('dynamicConfig', { ...localChoice.dynamicConfig, sourceTemplateIds: localChoice.dynamicConfig.sourceTemplateIds.filter(tid => tid !== id)})} className="p-1"><TrashIcon className="w-4 h-4 text-[var(--text-secondary)] hover:text-[var(--text-danger)]"/></button>
                                                                </div>
                                                            ) : null;
                                                        })}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <select value={templateToAdd} onChange={e => setTemplateToAdd(e.target.value)} className="flex-grow bg-[var(--bg-panel)] border border-[var(--border-secondary)] rounded-md p-2 text-[length:var(--font-size-sm)]">
                                                            <option value="">-- Select a blueprint to add --</option>
                                                            {gameData.templates.filter(t => !t.isComponent && !localChoice.dynamicConfig.sourceTemplateIds.includes(t.id)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                        </select>
                                                        <button onClick={() => { if(templateToAdd) { updateField('dynamicConfig', { ...localChoice.dynamicConfig, sourceTemplateIds: [...localChoice.dynamicConfig.sourceTemplateIds, templateToAdd]}); setTemplateToAdd(''); } }} disabled={!templateToAdd} className="bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-bold px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed">Add</button>
                                                    </div>
                                                </div>

                                                {/* Required Components (AND) */}
                                                <div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)]">AND must have ALL of these components:</label>
                                                        <HelpTooltip title="Required Components" content="Further filter the list. An entity will only be included if its blueprint (or any of its parents) includes ALL of the components listed here (AND logic)." />
                                                    </div>
                                                     <div className="space-y-2 mb-2">
                                                        {(localChoice.dynamicConfig.requiredComponentIds || []).map(id => {
                                                            const component = gameData.templates.find(t => t.id === id);
                                                            return component ? (
                                                                <div key={id} className="bg-[var(--bg-panel)] p-2 rounded-md flex justify-between items-center text-sm">
                                                                    <span className="text-[var(--text-primary)] font-medium">{component.name}</span>
                                                                    <button onClick={() => updateField('dynamicConfig', { ...localChoice.dynamicConfig, requiredComponentIds: (localChoice.dynamicConfig.requiredComponentIds || []).filter(cid => cid !== id)})} className="p-1"><TrashIcon className="w-4 h-4 text-[var(--text-secondary)] hover:text-[var(--text-danger)]"/></button>
                                                                </div>
                                                            ) : null;
                                                        })}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <select value={componentToAdd} onChange={e => setComponentToAdd(e.target.value)} className="flex-grow bg-[var(--bg-panel)] border border-[var(--border-secondary)] rounded-md p-2 text-[length:var(--font-size-sm)]">
                                                            <option value="">-- Select a component to require --</option>
                                                            {gameData.templates.filter(t => t.isComponent && !(localChoice.dynamicConfig.requiredComponentIds || []).includes(t.id)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                        </select>
                                                        <button onClick={() => { if(componentToAdd) { updateField('dynamicConfig', { ...localChoice.dynamicConfig, requiredComponentIds: [...(localChoice.dynamicConfig.requiredComponentIds || []), componentToAdd]}); setComponentToAdd(''); } }} disabled={!componentToAdd} className="bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-bold px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed">Add</button>
                                                    </div>
                                                </div>

                                                {/* Excluded Components (AND) */}
                                                <div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <label className="block text-[length:var(--font-size-sm)] font-medium text-[var(--text-secondary)]">AND must NOT have any of these components:</label>
                                                        <HelpTooltip title="Excluded Components" content="Further filter the list. An entity will be excluded if its blueprint (or any of its parents) includes ANY of the components listed here." />
                                                    </div>
                                                     <div className="space-y-2 mb-2">
                                                        {(localChoice.dynamicConfig.excludedComponentIds || []).map(id => {
                                                            const component = gameData.templates.find(t => t.id === id);
                                                            return component ? (
                                                                <div key={id} className="bg-[var(--bg-panel)] p-2 rounded-md flex justify-between items-center text-sm">
                                                                    <span className="text-[var(--text-primary)] font-medium">{component.name}</span>
                                                                    <button onClick={() => updateField('dynamicConfig', { ...localChoice.dynamicConfig, excludedComponentIds: (localChoice.dynamicConfig.excludedComponentIds || []).filter(cid => cid !== id)})} className="p-1"><TrashIcon className="w-4 h-4 text-[var(--text-secondary)] hover:text-[var(--text-danger)]"/></button>
                                                                </div>
                                                            ) : null;
                                                        })}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <select value={componentToExclude} onChange={e => setComponentToExclude(e.target.value)} className="flex-grow bg-[var(--bg-panel)] border border-[var(--border-secondary)] rounded-md p-2 text-[length:var(--font-size-sm)]">
                                                            <option value="">-- Select a component to exclude --</option>
                                                            {gameData.templates.filter(t => t.isComponent && !(localChoice.dynamicConfig.excludedComponentIds || []).includes(t.id)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                        </select>
                                                        <button onClick={() => { if(componentToExclude) { updateField('dynamicConfig', { ...localChoice.dynamicConfig, excludedComponentIds: [...(localChoice.dynamicConfig.excludedComponentIds || []), componentToExclude]}); setComponentToExclude(''); } }} disabled={!componentToExclude} className="bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-bold px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed">Add</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="p-4 rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-input)]">
                                            <div className="flex items-center gap-2 mb-2">
                                                 <h4 className="font-semibold text-lg text-[var(--text-primary)]">2. Filter The List <span className="text-sm font-normal text-[var(--text-secondary)]">(Optional)</span></h4>
                                                 <HelpTooltip title="Dynamic Option Filters" content="Add conditions here to filter which entities from the source template will be turned into options. For example, you could filter to only show 'Character' entities that have the 'Pilot' role." />
                                            </div>
                                            <p className="text-[var(--text-secondary)] mb-3 text-[length:var(--font-size-sm)]">
                                                Only show options if the source entity meets these conditions.
                                            </p>
                                            <div className="space-y-1">
                                                {(localChoice.dynamicConfig.filterConditions || []).map((cond, index) => (
                                                    <div key={index} className="flex justify-between items-center bg-[var(--bg-panel)] p-1.5 rounded">
                                                        <ConditionDisplay condition={cond} gameData={gameData} isFilter={true} />
                                                        <div className="flex-shrink-0 flex items-center">
                                                        <button onClick={() => setEditingConditionState({ type: 'dynamic', condition: cond, conditionIndex: index })} className="p-1"><PencilIcon className="w-4 h-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] mx-1"/></button>
                                                        <button onClick={() => handleRemoveCondition('dynamic', index)} className="p-1"><TrashIcon className="w-4 h-4 text-[var(--text-secondary)] hover:text-[var(--text-danger)]"/></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <button onClick={() => setEditingConditionState({ type: 'dynamic', condition: null })} className="text-[length:var(--font-size-sm)] mt-2 text-[var(--text-primary)] hover:opacity-80 w-full text-left flex items-center gap-1 p-2 rounded hover:bg-[var(--bg-hover)]">
                                                <PlusIcon className="w-4 h-4"/> Add Filter
                                            </button>
                                        </div>

                                        <div className="p-4 rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-input)]">
                                            <h4 className="font-semibold text-lg text-[var(--text-primary)] mb-2">3. Display Options to Player</h4>
                                            <p className="text-[var(--text-secondary)] mb-3 text-[length:var(--font-size-sm)]">
                                                For each found entity, show the player an option with this text:
                                            </p>
                                            <div className="relative">
                                                <textarea
                                                    ref={optionTextareaRef}
                                                    rows={3}
                                                    value={localChoice.dynamicConfig.optionTemplate.text}
                                                    onChange={e => updateField('dynamicConfig', { ...localChoice.dynamicConfig, optionTemplate: { text: e.target.value }})}
                                                    className="w-full bg-[var(--bg-panel)] border border-[var(--border-secondary)] rounded-md p-2"
                                                />
                                                <PlaceholderSelector
                                                    gameData={gameData}
                                                    sourceTemplateIds={localChoice.dynamicConfig.sourceTemplateIds}
                                                    onInsert={handleInsertPlaceholder}
                                                />
                                            </div>
                                        </div>

                                        <div className="p-4 rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-input)]">
                                             <div className="flex items-center gap-2 mb-2">
                                                <h4 className="font-semibold text-lg text-[var(--text-primary)]">4. Define Outcomes</h4>
                                                <HelpTooltip title="Dynamic Outcome Templates" content="Define the outcomes that will happen when a player picks ANY of the generated options. You can use special placeholders like '<The Chosen Entity>' to refer to the entity the player selected." />
                                            </div>
                                            <p className="text-[var(--text-secondary)] mb-3 text-[length:var(--font-size-sm)]">
                                                When the player chooses <em className="text-[var(--text-primary)]">any</em> of these generated options, the following will happen:
                                            </p>
                                            <div className="space-y-1">
                                                {(localChoice.dynamicConfig.outcomeTemplates || []).map((outcome, index) => (
                                                    <div key={index} className="flex justify-between items-center bg-[var(--bg-panel)] p-1.5 rounded">
                                                        <OutcomeDisplay outcome={outcome} gameData={gameData} isDynamicContext={true} />
                                                        <div className="flex-shrink-0 flex items-center">
                                                        <button onClick={() => setEditingOutcomeState({ type: 'dynamic', outcome: outcome, outcomeIndex: index })} className="p-1"><PencilIcon className="w-4 h-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] mx-1"/></button>
                                                        <button onClick={() => handleRemoveOutcome('dynamic', index)} className="p-1"><TrashIcon className="w-4 h-4 text-[var(--text-secondary)] hover:text-[var(--text-danger)]"/></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <button onClick={() => setEditingOutcomeState({ type: 'dynamic', outcome: null })} className="text-[length:var(--font-size-sm)] mt-2 text-[var(--text-primary)] hover:opacity-80 w-full text-left flex items-center gap-1 p-2 rounded hover:bg-[var(--bg-hover)]">
                                                <PlusIcon className="w-4 h-4"/> Add Outcome
                                            </button>
                                        </div>

                                        <div className="p-4 rounded-lg border border-[var(--border-secondary)] bg-[var(--bg-input)]">
                                            <h4 className="font-semibold text-lg text-[var(--text-primary)] mb-2">5. Go to Next Scene</h4>
                                            <p className="text-[var(--text-secondary)] mb-3 text-[length:var(--font-size-sm)]">
                                                After the player makes their choice, which scene should come next?
                                            </p>
                                            <StyleSelect 
                                                label="Next Scene"
                                                value={localChoice.dynamicConfig.nextChoiceId || ''}
                                                onChange={e => updateField('dynamicConfig', { ...localChoice.dynamicConfig, nextChoiceId: e.target.value || null })}
                                                help="The scene that will be shown after the player makes a dynamic choice."
                                            >
                                                {nextSceneSelectOptions}
                                            </StyleSelect>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex flex-col items-start gap-3 p-4 bg-[var(--bg-input)]/40 rounded-lg border border-[var(--border-primary)]">
                                <div className="flex items-center gap-2">
                                    <p className="text-[length:var(--font-size-sm)] font-medium text-[var(--text-primary)]">
                                        This is a linear scene with no player choices.
                                    </p>
                                    <HelpTooltip title="Linear Scene" content="A linear scene displays text and then automatically proceeds to the 'Next Scene' when the player clicks 'Continue'. Use this for story exposition or transitions."/>
                                </div>
                                <button 
                                    onClick={() => updateField('prompt', '')} 
                                    className="bg-[var(--bg-active)] hover:opacity-90 text-[var(--text-on-accent)] font-bold py-2 px-4 rounded transition duration-300 flex items-center justify-center gap-2 text-sm"
                                >
                                    <PlusIcon className="w-4 h-4"/>Add Choices
                                </button>
                            </div>
                            <div className="pt-4 border-t border-[var(--border-primary)]">
                                <StyleSelect 
                                    label="Next Scene" 
                                    value={localChoice.nextChoiceId || ''} 
                                    onChange={e => updateField('nextChoiceId', e.target.value || null)}
                                    help="The scene that will be shown after the player clicks 'Continue'."
                                >
                                    {nextSceneSelectOptions}
                                </StyleSelect>
                            </div>
                        </div>
                    )}
                </CollapsibleSection>

                <CollapsibleSection title="Live Preview">
                    <div className="relative aspect-video w-full max-w-lg bg-[var(--bg-main)] rounded-lg border border-[var(--border-secondary)] overflow-hidden">
                        {localChoice.imageBase64 && <img src={localChoice.imageBase64} className={`absolute inset-0 w-full h-full object-cover transition-all ${previewBgEffectClass}`} />}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
                        <div className={`absolute inset-0 flex p-2 ${previewPositionClasses} ${previewFlexAlignClasses}`}>
                            <div className={`${previewWidthClass} ${previewTextAlignClasses}`}>
                                <p className={`${localChoice.styles?.textColor || 'text-white'} ${previewFontClass} ${previewFontSizeClass} [text-shadow:0_1px_4px_rgba(0,0,0,0.8)]`}>
                                    {localChoice.description.substring(0, 100)}{localChoice.description.length > 100 ? '...' : ''}
                                </p>
                                {localChoice.prompt && (
                                    <div className="mt-4">
                                        <p className="text-cyan-200 text-[0.6rem] mb-2">{localChoice.prompt}</p>
                                        <div className="flex justify-center gap-2 flex-wrap">
                                            <button className="text-[0.5rem] bg-gray-800/60 text-white font-semibold py-1 px-3 rounded-md">Option 1</button>
                                            <button className="text-[0.5rem] bg-gray-800/60 text-white font-semibold py-1 px-3 rounded-md">Option 2</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        {localChoice.foregroundImageBase64 && (
                            <div className={`absolute inset-0 flex items-center p-4 ${previewFgPositionClass}`}>
                                <img 
                                    key={previewFgAnimationKey}
                                    src={localChoice.foregroundImageBase64} 
                                    className={`object-contain ${previewFgSizeClass} max-h-full ${previewFgAnimationClass}`}
                                    style={previewFgAnimationStyle}
                                    alt="Foreground Preview"/>
                            </div>
                        )}
                    </div>
                </CollapsibleSection>
            </main>
            <footer className="p-4 flex justify-end space-x-3 border-t border-[var(--border-primary)] bg-[var(--bg-panel)]/50">
                <button onClick={handleCancelClick} className="px-4 py-2 rounded-md bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-semibold transition-colors">Cancel</button>
                <button onClick={handleSaveChanges} className="px-4 py-2 rounded-md bg-[var(--color-action-primary)] hover:opacity-90 text-[var(--text-on-accent)] font-semibold transition-colors">Save Changes</button>
            </footer>

            {editingConditionState && (
                <ConditionEditor
                    isOpen={!!editingConditionState}
                    onClose={() => setEditingConditionState(null)}
                    onSave={handleSaveCondition}
                    gameData={gameData}
                    initialCondition={editingConditionState.condition}
                    isFilter={editingConditionState.type === 'dynamic'}
                />
            )}

            {editingOutcomeState && (
                <OutcomeEditor
                    isOpen={!!editingOutcomeState}
                    onClose={() => setEditingOutcomeState(null)}
                    onSave={handleSaveOutcome}
                    gameData={gameData}
                    initialOutcome={editingOutcomeState.outcome}
                    isDynamicContext={editingOutcomeState.type === 'dynamic'}
                />
            )}
        </div>
    );
}
