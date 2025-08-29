
import React, { useMemo, useState, useEffect, useRef } from 'react';
import type { GameData, Entity, Template, ChoiceOutcome, PlayerChoice, ChoiceOption, AttributeDefinition, Condition, ChoiceOutcomeUpdateEntity } from '../types';
import { evaluateCondition } from '../services/conditionEvaluator';
import { debugService } from '../services/debugService';
import { ArrowDownTrayIcon } from '../components/icons/ArrowDownTrayIcon';
import { ArrowUpTrayIcon } from '../components/icons/ArrowUpTrayIcon';
import { ArrowUturnLeftIcon } from '../components/icons/ArrowUturnLeftIcon';
import { ArrowUturnRightIcon } from '../components/icons/ArrowUturnRightIcon';
import { HelpTooltip } from '../components/HelpTooltip';
import { PlayIcon } from '../components/icons/PlayIcon';
import { NewspaperIcon } from '../components/icons/NewspaperIcon';
import { UserCircleIcon } from '../components/icons/UserCircleIcon';

interface ResolvedAttribute {
    definition: AttributeDefinition;
    value: string | number | null;
}

interface ResolvedComponent {
    componentName: string;
    attributes: ResolvedAttribute[];
}

interface ResolvedEntityAttributes {
    baseAttributes: ResolvedAttribute[];
    components: ResolvedComponent[];
}

const resolveEntityAttributes = (entity: Entity, gameData: GameData): ResolvedEntityAttributes => {
    const template = gameData.templates.find(t => t.id === entity.templateId);
    if (!template) {
        debugService.log("MegaWattGame: resolveEntityAttributes failed, template not found", { entityId: entity.id, templateId: entity.templateId });
        return { baseAttributes: [], components: [] };
    }

    // This needs to resolve the full hierarchy (parents) to be complete.
    // For now, it handles direct attributes and direct components.
    const baseAttributes: ResolvedAttribute[] = template.attributes.map(attrDef => ({
        definition: attrDef,
        value: entity.attributeValues[attrDef.id] ?? null
    }));

    const components: ResolvedComponent[] = (template.includedComponentIds || []).map(componentId => {
        const componentTemplate = gameData.templates.find(t => t.id === componentId);
        if (!componentTemplate) return null;

        const attributes: ResolvedAttribute[] = componentTemplate.attributes.map(attrDef => {
            const compositeKey = `${componentId}_${attrDef.id}`;
            return {
                definition: attrDef,
                value: entity.attributeValues[compositeKey] ?? null
            };
        });

        return { componentName: componentTemplate.name, attributes };
    }).filter((c): c is ResolvedComponent => c !== null);


    const resolvedData = { baseAttributes, components };
    debugService.log("MegaWattGame: Resolved entity attributes", { entityName: entity.name, resolvedData });
    return resolvedData;
};


interface MegaWattGameProps {
  gameData: GameData;
  onChoiceMade: (outcomes: ChoiceOutcome[]) => void;
  onSaveGame: () => void;
  onLoadGame: (jsonString: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

type MenuSection = 'main' | 'news' | 'load' | 'credits';

const AttributeDisplay: React.FC<{
    resolvedAttribute: ResolvedAttribute,
    entityMap: Map<string, Entity>
}> = ({ resolvedAttribute, entityMap }) => {
    const { definition, value } = resolvedAttribute;
    if (value === null || value === undefined) return null;


    let displayValue: React.ReactNode = value;

    if (definition.type === 'entity_reference' && typeof value === 'string') {
        displayValue = entityMap.get(value)?.name || <span className="text-[var(--text-tertiary)] italic">Unknown Reference</span>;
    } else if (typeof value === 'string' && value.length > 150) {
            displayValue = <p className="text-[var(--text-secondary)] whitespace-pre-wrap">{value}</p>;
    } else {
            displayValue = <span className="text-[var(--text-primary)]">{String(value)}</span>
    }

    return (
        <div className="grid grid-cols-3 gap-2">
            <span className="text-[var(--text-tertiary)] font-semibold col-span-1">{definition.name}</span>
            <div className="col-span-2">{displayValue}</div>
        </div>
    );
};

const EntityCard: React.FC<{
    entity: Entity;
    gameData: GameData;
    entityMap: Map<string, Entity>;
}> = ({ entity, gameData, entityMap }) => {

    const resolvedAttributes = useMemo(() => resolveEntityAttributes(entity, gameData), [entity, gameData]);

    const styles = useMemo(() => {
        const s = entity.styles || {};
        const hasBgImage = !!entity.imageBase64;
        return {
            borderColor: s.borderColor ? `border-${s.borderColor}` : 'border-[var(--border-primary)]',
            borderWidth: { none: 'border-0', sm: 'border', md: 'border-2', lg: 'border-4' }[s.borderWidth || 'md'],
            shadow: { none: 'shadow-none', sm: 'shadow-sm', md: 'shadow-md', lg: 'shadow-lg', xl: 'shadow-xl' }[s.shadow || 'lg'],
            titleColor: s.titleColor || 'text-[var(--text-accent)]',
            backgroundColor: s.backgroundColor || 'bg-[var(--bg-panel)]/50',
            overlay: { none: '', light: 'bg-black/20', medium: 'bg-black/50', heavy: 'bg-black/70' }[s.backgroundOverlayStrength || (hasBgImage ? 'medium' : 'none')],
        };
    }, [entity.styles, entity.imageBase64]);

    return (
        <div className={`relative ${styles.backgroundColor} ${styles.borderWidth} ${styles.borderColor} ${styles.shadow} rounded-lg backdrop-blur-sm transform hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden`}>
            {entity.imageBase64 && (
                <>
                    <img src={entity.imageBase64} alt={entity.name} className="absolute inset-0 w-full h-full object-cover"/>
                    <div className={`absolute inset-0 ${styles.overlay}`} />
                </>
            )}
            <div className="relative z-10 p-6 flex flex-col flex-grow">
                <h3 className={`text-xl font-bold ${styles.titleColor} mb-4`}>{entity.name}</h3>
                <div className="space-y-3 text-sm flex-grow">
                    {resolvedAttributes.baseAttributes.map(resAttr => (
                        <AttributeDisplay key={resAttr.definition.id} resolvedAttribute={resAttr} entityMap={entityMap} />
                    ))}

                    {resolvedAttributes.components.map(component => (
                        <div key={component.componentName} className="pt-3 mt-3 border-t border-[var(--border-primary)]/50">
                            <h4 className="text-[var(--text-teal)] font-semibold text-base mb-2">{component.componentName}</h4>
                            <div className="space-y-3 pl-2">
                                {component.attributes.map(resAttr => (
                                    <AttributeDisplay key={resAttr.definition.id} resolvedAttribute={resAttr} entityMap={entityMap} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};


const parsePlaceholders = (text: string | undefined, entity: Entity, template: Template): string => {
    if (!text) return '';
    let processedText = text;
    processedText = processedText.replace(/{entity.name}/g, entity.name);
    processedText = processedText.replace(/{template.name}/g, template.name);

    const attrRegex = /{entity.attributeValues\.([^}]+)}/g;
    processedText = processedText.replace(attrRegex, (match, attrId) => {
        const value = entity.attributeValues[attrId];
        return value ? String(value) : `[No ${attrId}]`;
    });
    
    return processedText;
}

const ScenePresenter: React.FC<{ choice: PlayerChoice; gameData: GameData; onComplete: (option?: ChoiceOption) => void; animationState: 'in' | 'out'; isFirstScene: boolean }> = ({ choice, gameData, onComplete, animationState, isFirstScene }) => {
    const styles = useMemo(() => {
        const s = choice.styles || {};
        const fgs = s.foregroundImageStyles || {};
        const ps = s.promptStyles || {};
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
            cardTransition: isFirstScene ? 'fade' : (s.cardTransition || 'fade'),
            cardTransitionDuration: s.cardTransitionDuration || 0.6,
            textAnimation: s.textAnimation || 'fade-in',
            textAnimationDuration: s.textAnimationDuration || 1,
            textAnimationDelay: s.textAnimationDelay || 0.5,
            prompt: {
                fontSize: ps.fontSize || 'normal',
                textColor: ps.textColor || 'text-cyan-200',
            },
            fg: {
                position: fgs.position || 'center',
                size: fgs.size || 'medium',
                animation: fgs.animation || 'fade-in',
                animationDuration: fgs.animationDuration || 1,
                animationDelay: fgs.animationDelay || 1,
            }
        };
    }, [choice.styles, isFirstScene]);

    const choiceOptions = useMemo((): ChoiceOption[] => {
        if (!choice.prompt) return []; // No options if it's a linear scene

        debugService.log("ScenePresenter: Calculating choice options", { choice });
        
        if (choice.choiceType === 'static') {
            const options = choice.staticOptions || [];
            const finalOptions = options.filter(opt => {
                if (!opt.conditions || opt.conditions.length === 0) return true;
                return opt.conditions.every(cond => evaluateCondition(cond, gameData));
            });
            debugService.log("ScenePresenter: Final static options", { options: finalOptions });
            return finalOptions;
        }
        
        if (choice.choiceType === 'dynamic_from_template' && choice.dynamicConfig) {
            const { sourceTemplateId, optionTemplate, outcomeTemplates, nextChoiceId, filterConditions } = choice.dynamicConfig;
            const sourceTemplate = gameData.templates.find(t => t.id === sourceTemplateId);
            if (!sourceTemplate) return [];
            
            let sourceEntities = gameData.entities.filter(e => e.templateId === sourceTemplateId);

            if (filterConditions && filterConditions.length > 0) {
                sourceEntities = sourceEntities.filter(entity => {
                    return filterConditions.every(cond => {
                         if (cond.type === 'attribute') {
                            const conditionForEntity: Condition = { ...cond, targetEntityId: entity.id };
                            return evaluateCondition(conditionForEntity, gameData);
                         }
                        return evaluateCondition(cond, gameData);
                    })
                });
            }

            const finalOptions: ChoiceOption[] = sourceEntities.map((entity, index) => ({
                id: `dynamic_opt_${entity.id}_${index}`,
                text: parsePlaceholders(optionTemplate.text, entity, sourceTemplate),
                outcomes: outcomeTemplates, // Pass outcomes with placeholders
                nextChoiceId: nextChoiceId || null,
                sourceEntityId: entity.id, // Store the source entity ID
            }));
            debugService.log("ScenePresenter: Final dynamic options", { options: finalOptions });
            return finalOptions;
        }
        return [];
    }, [choice, gameData]);

    // CSS Classes
    const positionClass = { top: 'justify-start pt-12 md:pt-24', middle: 'justify-center', bottom: 'justify-end pb-12 md:pb-24' }[styles.textPosition];
    const textAlignClass = { left: 'text-left items-start', center: 'text-center items-center', right: 'text-right items-end' }[styles.textAlign];
    const overlayClass = { none: '', light: 'bg-gradient-to-t from-black/40 via-black/20 to-transparent', medium: 'bg-gradient-to-t from-black/80 via-black/50 to-transparent', heavy: 'bg-gradient-to-t from-black/95 via-black/70 to-black/20' }[styles.overlayStrength];
    const backgroundEffectClass = { none: '', blur: 'blur-md', darken: 'brightness-75' }[styles.backgroundEffect];
    const fontFamilyClass = { sans: 'font-sans', serif: 'font-serif', mono: 'font-mono' }[styles.fontFamily];
    const fontSizeClass = { normal: 'text-xl md:text-3xl lg:text-4xl', large: 'text-2xl md:text-4xl lg:text-5xl', xlarge: 'text-3xl md:text-5xl lg:text-6xl', xxlarge: 'text-4xl md:text-6xl lg:text-7xl' }[styles.fontSize];
    const textWidthClass = { narrow: 'max-w-2xl', medium: 'max-w-4xl', wide: 'max-w-7xl' }[styles.textWidth];
    const promptFontSizeClass = { normal: 'text-xl', large: 'text-2xl', xlarge: 'text-3xl', xxlarge: 'text-4xl' }[styles.prompt.fontSize];
    
    // Foreground Image Classes
    const fgContainerPositionClass = { left: 'justify-start', center: 'justify-center', right: 'justify-end'}[styles.fg.position];
    const fgSizeClass = { small: 'w-1/4 md:w-1/5', medium: 'w-1/3 md:w-1/4', large: 'w-1/2 md:w-1/3'}[styles.fg.size];

    // Animation Classes & Styles
    const sceneTransitionClass = `card-transition-${styles.cardTransition}-${animationState}`;
    const textAnimationClass = animationState === 'in' ? `text-anim-${styles.textAnimation}` : 'opacity-0';
    const fgAnimationClass = animationState === 'in' ? `anim-fg-${styles.fg.animation}` : 'opacity-0';

    const sceneStyle = { animationDuration: `${styles.cardTransitionDuration}s` };
    const bgStyle = { backgroundImage: choice.imageBase64 ? `url(${choice.imageBase64})` : undefined, animationDuration: `${styles.backgroundAnimationDuration}s`};
    const textStyle = { animationDuration: `${styles.textAnimationDuration}s`, animationDelay: `${styles.textAnimationDelay}s` };
    const fgStyle = { animationDuration: `${styles.fg.animationDuration}s`, animationDelay: `${styles.fg.animationDelay}s` };


    return (
        <div className={`fixed inset-0 bg-black ${sceneTransitionClass}`} style={sceneStyle}>
            {choice.imageBase64 && (
                <div
                    className={`absolute inset-0 bg-cover bg-center ${styles.backgroundAnimation !== 'none' ? `anim-bg-${styles.backgroundAnimation}` : ''} ${backgroundEffectClass} transition-all duration-300`}
                    style={bgStyle}
                />
            )}
            <div className={`absolute inset-0 ${overlayClass}`} />

            {choice.foregroundImageBase64 && (
                 <div className={`absolute inset-0 flex items-center p-8 md:p-16 ${fgContainerPositionClass}`}>
                    <img src={choice.foregroundImageBase64} style={fgStyle} className={`object-contain max-h-full ${fgSizeClass} ${fgAnimationClass}`} alt="Foreground Element"/>
                </div>
            )}

            <div className={`relative z-10 flex flex-col h-full p-8 md:p-16 ${positionClass} ${textAlignClass}`}>
                <div className={`w-full ${textWidthClass}`}>
                    <p style={textStyle} className={`leading-relaxed mb-12 ${styles.textColor} [text-shadow:0_2px_10px_rgba(0,0,0,0.5)] ${fontFamilyClass} ${fontSizeClass} ${textAnimationClass}`}>
                        {choice.description}
                    </p>
                    {choice.prompt ? (
                        <div className="space-y-6">
                            <p className={`transition-colors duration-300 ${promptFontSizeClass} ${styles.prompt.textColor}`}>{choice.prompt}</p>
                            <div className="flex justify-center flex-wrap gap-4">
                                {choiceOptions.map((option) => (
                                    <button
                                        key={option.id}
                                        onClick={() => onComplete(option)}
                                        className="bg-gray-800/60 hover:bg-cyan-600/80 border border-gray-600 hover:border-cyan-400 text-white font-semibold py-3 px-8 rounded-lg backdrop-blur-sm transition-all duration-300 transform hover:scale-105"
                                    >
                                        {option.text}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => onComplete()}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-12 rounded-full transition-all duration-300 transform hover:scale-105 text-lg"
                        >
                            Continue
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const parseMarkdown = (text: string): string => {
  if (!text) return '';

  let processedText = text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[var(--text-accent)] hover:underline">$1</a>');
  
  const lines = processedText.split('\n');
  let html = '';
  let inList = false;

  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      html += `<li>${trimmedLine.substring(2)}</li>`;
    } else {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      if (trimmedLine) {
        html += `<p>${line}</p>`;
      }
    }
  });

  if (inList) {
    html += '</ul>';
  }

  return html;
};

export const MegaWattGame: React.FC<MegaWattGameProps> = ({ gameData, onChoiceMade, onSaveGame, onLoadGame, onUndo, onRedo, canUndo, canRedo }) => {
    const { choices, startChoiceId } = gameData;
    const [currentChoiceId, setCurrentChoiceId] = useState<string | null>(null);
    const [animationState, setAnimationState] = useState<'in' | 'out'>('in');
    const [view, setView] = useState<'menu' | 'game'>('menu');
    const [activeMenu, setActiveMenu] = useState<MenuSection>('main');
    const loadInputRef = useRef<HTMLInputElement>(null);
    const isInitialRender = useRef(true);

    useEffect(() => {
        debugService.log("MegaWattGame: Component mounted", { gameData });
        setCurrentChoiceId(gameData.startChoiceId);
    }, [gameData.startChoiceId]);

    useEffect(() => {
        // When gameData changes from an undo/redo/load, reset the story to the start
        if (!isInitialRender.current) {
            debugService.log("MegaWattGame: GameData changed, resetting story flow.", { newStartChoiceId: gameData.startChoiceId });
            setCurrentChoiceId(gameData.startChoiceId);
            setAnimationState('in');
            setView('menu');
            setActiveMenu('main');
        } else {
            isInitialRender.current = false;
        }
    }, [gameData]);

    useEffect(() => {
        debugService.log("MegaWattGame: Scene state changed", { currentChoiceId, animationState });
    }, [currentChoiceId, animationState]);

    const handleSceneCompletion = (option?: ChoiceOption) => {
        debugService.log("MegaWattGame: Scene completion triggered", { currentChoiceId, option });
        const currentChoice = choices.find(c => c.id === currentChoiceId);
        if (!currentChoice) return;

        if (option) {
            let resolvedOutcomes = option.outcomes;
            // If this was a dynamic choice, resolve its placeholder outcomes
            if (option.sourceEntityId) {
                debugService.log("MegaWattGame: Resolving outcomes for dynamic choice", { option });
                resolvedOutcomes = option.outcomes.map(outcome => {
                    if (outcome.type === 'update_entity') {
                        const newOutcome: ChoiceOutcomeUpdateEntity = {...outcome};
                        if (newOutcome.targetEntityId === '<chosen_entity>') {
                            newOutcome.targetEntityId = option.sourceEntityId!;
                        }
                        if (newOutcome.value === '<chosen_entity_id>') {
                            newOutcome.value = option.sourceEntityId!;
                        }
                        return newOutcome;
                    }
                    // Can add resolution for other outcome types here if needed
                    return outcome;
                });
                debugService.log("MegaWattGame: Outcomes resolved", { resolvedOutcomes });
            }
            onChoiceMade(resolvedOutcomes);
        }
        
        const transitionDuration = currentChoice.styles?.cardTransitionDuration || 0.6;
        setAnimationState('out');
        
        setTimeout(() => {
            const nextChoiceId = option ? option.nextChoiceId : currentChoice.nextChoiceId;
            if (nextChoiceId && choices.find(c => c.id === nextChoiceId)) {
                setCurrentChoiceId(nextChoiceId);
                setAnimationState('in');
            } else {
                setCurrentChoiceId(null); // End of this story branch
                debugService.log("MegaWattGame: Story branch finished.");
            }
        }, transitionDuration * 1000 + 100); // Must be slightly longer than CSS animation duration
    };

    const handleLoadClick = () => {
        loadInputRef.current?.click();
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result;
            if (typeof text === 'string') {
                onLoadGame(text);
            }
        };
        reader.readAsText(file);

        if(event.target) {
            event.target.value = '';
        }
    };


    const entityMap = useMemo(() => {
        return new Map(gameData.entities.map(e => [e.id, e]));
    }, [gameData.entities]);

    const entitiesByTemplate = useMemo(() => {
        const grouped = new Map<string, Entity[]>();
        gameData.entities.forEach(entity => {
            const group = grouped.get(entity.templateId) || [];
            group.push(entity);
            grouped.set(entity.templateId, group);
        });
        return grouped;
    }, [gameData.entities]);
    
    const currentChoice = useMemo(() => choices.find(c => c.id === currentChoiceId), [choices, currentChoiceId]);

    if (view === 'menu') {
        const { menuSettings } = gameData;

        const MenuButton: React.FC<{ section: MenuSection; icon: React.ReactNode; label: string; }> = ({ section, icon, label }) => (
            <button
                onClick={() => setActiveMenu(section)}
                className={`flex items-center gap-3 w-full p-3 text-left rounded-md transition-colors text-[length:var(--font-size-sm)] ${activeMenu === section ? 'bg-[var(--text-accent)]/20 text-[var(--text-accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'}`}
            >
                {icon}
                <span>{label}</span>
            </button>
        );

        return (
            <div className="relative min-h-screen bg-black text-white flex">
                {menuSettings.backgroundImageBase64 && (
                     <div
                        className="absolute inset-0 bg-cover bg-center anim-bg-kenburns-subtle"
                        style={{ backgroundImage: `url(${menuSettings.backgroundImageBase64})`, animationDuration: '45s' }}
                    />
                )}
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                
                <aside className="relative z-10 w-64 bg-[var(--bg-panel)]/30 p-4 flex flex-col space-y-2 border-r border-[var(--border-primary)]/50">
                    <h1 className="text-2xl font-bold text-[var(--text-accent-bright)] tracking-wider px-2 py-4 text-center">
                        {gameData.colonyName || "The Colony"}
                    </h1>
                    <MenuButton section="main" icon={<PlayIcon className="w-5 h-5" />} label="Play" />
                    <MenuButton section="news" icon={<NewspaperIcon className="w-5 h-5" />} label="News & Updates" />
                    <MenuButton section="load" icon={<ArrowUpTrayIcon className="w-5 h-5" />} label="Load Game" />
                    <MenuButton section="credits" icon={<UserCircleIcon className="w-5 h-5" />} label="Credits" />
                </aside>

                <main className="relative z-10 flex-1 p-8 overflow-y-auto">
                    {activeMenu === 'main' && (
                         <div className="text-center max-w-4xl mx-auto flex flex-col items-center h-full justify-center">
                            <div className="flex flex-wrap justify-center gap-2 mb-6">
                                {menuSettings.tags.map(tag => (
                                    <span key={tag} className="bg-[var(--bg-panel-light)]/50 text-[var(--text-accent)] text-sm font-medium px-3 py-1 rounded-full">{tag}</span>
                                ))}
                            </div>
                            <p className="text-lg text-gray-200 leading-relaxed my-4 whitespace-pre-wrap">
                                {menuSettings.description}
                            </p>
                            <button 
                                onClick={() => setView('game')}
                                className="mt-8 bg-[var(--bg-active)] hover:opacity-90 text-[var(--text-on-accent)] font-bold py-4 px-16 rounded-full transition-all duration-300 transform hover:scale-105 text-xl tracking-wider shadow-lg shadow-cyan-500/20"
                            >
                                Start Simulation
                            </button>
                        </div>
                    )}
                    {activeMenu === 'news' && (
                        <div>
                            <h2 className="text-4xl font-bold text-[var(--text-accent-bright)] mb-8">News & Updates</h2>
                            <div className="space-y-6 max-w-3xl">
                                {[...menuSettings.news].filter(n => n.status === 'published').reverse().map(item => {
                                    const styleClasses = {
                                        normal: { container: 'border-transparent', title: 'text-[var(--text-accent)]' },
                                        urgent: { container: 'border-red-500/50', title: 'text-red-400' },
                                        lore: { container: 'border-yellow-600/50 bg-[var(--bg-panel)]/80', title: 'text-yellow-400' }
                                    }[item.style || 'normal'];
                                    
                                    const layoutClasses = {
                                        container: `flex flex-col ${item.layout !== 'image_top' ? 'md:flex-row' : ''} ${item.layout === 'image_right' ? 'md:flex-row-reverse' : ''} gap-6`,
                                        image: `flex-shrink-0 ${item.layout !== 'image_top' ? 'md:w-1/3' : 'w-full h-40'} object-cover`,
                                    };

                                    return (
                                        <div key={item.id} className={`bg-[var(--bg-panel)]/50 rounded-lg overflow-hidden border ${styleClasses.container} transition-colors p-6`}>
                                            <div className={layoutClasses.container}>
                                                {item.imageBase64 && (
                                                    <img src={item.imageBase64} alt={item.title} className={layoutClasses.image} />
                                                )}
                                                <div className="flex-grow">
                                                    <div className="flex justify-between items-start mb-1 text-[var(--text-secondary)] text-sm">
                                                        <p>{item.date}</p>
                                                        {item.author && <p className="italic">from {item.author}</p>}
                                                    </div>
                                                    <h3 className={`text-2xl font-semibold mb-2 ${styleClasses.title}`}>{item.title}</h3>
                                                    {item.tags && item.tags.length > 0 && (
                                                        <div className="flex flex-wrap gap-2 mb-4">
                                                            {item.tags.map(tag => (
                                                                <span key={tag} className="bg-[var(--bg-panel-light)]/50 text-[var(--text-secondary)] text-xs font-medium px-2.5 py-1 rounded-full">{tag}</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <div className="text-gray-300 prose prose-invert max-w-none prose-p:my-2 prose-ul:my-2" dangerouslySetInnerHTML={{ __html: parseMarkdown(item.content) }} />
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
                                    );
                                }).length > 0 ? [...menuSettings.news].filter(n => n.status === 'published').reverse().map(item => {
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
                                        <div key={item.id} className={`bg-[var(--bg-panel)]/50 rounded-lg overflow-hidden border ${styleClasses.container} transition-colors`}>
                                            <div className="p-6">
                                                <div className={layoutClasses.container}>
                                                    {item.imageBase64 && (
                                                        <img src={item.imageBase64} alt={item.title} className={layoutClasses.image} />
                                                    )}
                                                    <div className="flex-grow">
                                                        <div className="flex justify-between items-start mb-1 text-[var(--text-secondary)] text-sm">
                                                            <p>{item.date}</p>
                                                            {item.author && <p className="italic">from {item.author}</p>}
                                                        </div>
                                                        <h3 className={`text-2xl font-semibold mb-2 ${styleClasses.title}`}>{item.title}</h3>
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
                                }) : <p className="text-[var(--text-secondary)]">No news items have been posted.</p>}
                            </div>
                        </div>
                    )}
                    {activeMenu === 'load' && (
                         <div>
                            <h2 className="text-4xl font-bold text-[var(--text-accent-bright)] mb-8">Load Game</h2>
                            <div className="max-w-md">
                                <p className="text-[var(--text-secondary)] mb-4">Load a previously saved game file to continue your progress.</p>
                                <button onClick={handleLoadClick} className="flex items-center justify-center gap-2 w-full bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-accent)] font-bold py-3 px-6 rounded-md transition duration-300">
                                    <ArrowUpTrayIcon className="w-5 h-5" />
                                    Select Save File...
                                </button>
                                <input type="file" accept=".json" ref={loadInputRef} onChange={handleFileChange} className="hidden" />
                            </div>
                        </div>
                    )}
                    {activeMenu === 'credits' && (
                        <div>
                            <h2 className="text-4xl font-bold text-[var(--text-accent-bright)] mb-8">Credits</h2>
                            <div className="max-w-3xl bg-[var(--bg-panel)]/50 p-6 rounded-lg">
                                <p className="text-gray-300 whitespace-pre-wrap">{menuSettings.credits}</p>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        );
    }

    if (currentChoiceId && currentChoice) {
        return <ScenePresenter choice={currentChoice} onComplete={handleSceneCompletion} animationState={animationState} isFirstScene={currentChoiceId === startChoiceId} gameData={gameData} />;
    }

    // This is the main game view when no story scene is active
    return (
        <div className="min-h-screen bg-[var(--bg-main)] bg-grid p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="relative text-center mb-12">
                     <div className="flex items-center justify-center gap-2">
                        <h1 className="text-5xl font-extrabold text-[var(--text-primary)] tracking-wider">
                            Welcome to <span className="text-[var(--text-accent-bright)]">{gameData.colonyName || "The Colony"}</span>
                        </h1>
                        <div className="pt-2">
                            <HelpTooltip 
                                title={`About ${gameData.colonyName || "The Colony"}`} 
                                content="This is the main view of your colony's current state. The cards below represent all the people, places, and active systems in your simulation.\n\nYour choices during gameplay scenes can create new cards or change the values on existing ones." 
                            />
                        </div>
                    </div>
                    <p className="text-[var(--text-secondary)] mt-2">An interactive colony simulation.</p>

                    <div className="absolute top-0 right-0 flex flex-col sm:flex-row gap-2">
                        <button onClick={onUndo} disabled={!canUndo} className="flex items-center justify-center gap-2 bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-accent)] font-semibold py-2 px-4 rounded-md transition duration-300 text-sm disabled:text-[var(--text-tertiary)] disabled:bg-[var(--bg-panel)] disabled:cursor-not-allowed" title="Undo Last Choice">
                            <ArrowUturnLeftIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Undo</span>
                        </button>
                        <button onClick={onRedo} disabled={!canRedo} className="flex items-center justify-center gap-2 bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-accent)] font-semibold py-2 px-4 rounded-md transition duration-300 text-sm disabled:text-[var(--text-tertiary)] disabled:bg-[var(--bg-panel)] disabled:cursor-not-allowed" title="Redo Last Choice">
                            <ArrowUturnRightIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Redo</span>
                        </button>
                        <button 
                            onClick={onSaveGame} 
                            className="flex items-center justify-center gap-2 bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-accent)] font-semibold py-2 px-4 rounded-md transition duration-300 text-sm"
                            title="Save Game Progress"
                        >
                            <ArrowDownTrayIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Save</span>
                        </button>
                        <button 
                            onClick={handleLoadClick} 
                            className="flex items-center justify-center gap-2 bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-accent)] font-semibold py-2 px-4 rounded-md transition duration-300 text-sm"
                            title="Load Game Progress"
                        >
                            <ArrowUpTrayIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Load</span>
                        </button>
                        <input type="file" accept=".json" ref={loadInputRef} onChange={handleFileChange} className="hidden" />
                    </div>
                </header>
                
                <main className="space-y-12">
                    {gameData.templates.filter(t => !t.isComponent).map(template => {
                        const templateEntities = entitiesByTemplate.get(template.id) || [];
                        if (templateEntities.length === 0) return null;
                        
                        return (
                            <section key={template.id}>
                                <h2 className="text-3xl font-bold text-[var(--text-teal)] border-b-2 border-[var(--text-teal)]/30 pb-2 mb-6">{template.name}s</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {templateEntities.map(entity => (
                                        <EntityCard key={entity.id} entity={entity} gameData={gameData} entityMap={entityMap} />
                                    ))}
                                </div>
                            </section>
                        )
                    })}

                    {gameData.entities.length === 0 && (
                         <div className="text-center py-20 bg-[var(--bg-panel)]/30 rounded-lg">
                            <p className="text-[var(--text-tertiary)] text-lg">No entities have been defined for this colony yet.</p>
                        </div>
                    )}
                </main>

            </div>
        </div>
    );
};

// Helper style to add a subtle grid background and animations
const style = document.createElement('style');
style.innerHTML = `
.bg-grid {
  background-image: linear-gradient(var(--grid-bg-color) 1px, transparent 1px), linear-gradient(to right, var(--grid-bg-color) 1px, transparent 1px);
  background-size: 2rem 2rem;
}
.prose-invert a { color: var(--text-accent); }
.prose-invert a:hover { color: var(--text-accent-bright); }
.prose-invert strong { color: var(--text-primary); }
.prose-invert em { color: var(--text-primary); }
.prose-invert ul > li::before { background-color: var(--text-secondary); }

/* Background Animations */
@keyframes kenburns-normal { 0% { transform: scale(1.0) translate(0, 0); } 100% { transform: scale(1.1) translate(-1%, 2%); } }
@keyframes kenburns-subtle { 0% { transform: scale(1.0) translate(0, 0); } 100% { transform: scale(1.03) translate(0, 0); } }
@keyframes pan-left { 0% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
@keyframes pan-right { 0% { background-position: 0% 50%; } 100% { background-position: 100% 50%; } }
@keyframes zoom-out { 0% { transform: scale(1.1); } 100% { transform: scale(1.0); } }

.anim-bg-kenburns-normal { animation: kenburns-normal ease-out forwards; }
.anim-bg-kenburns-subtle { animation: kenburns-subtle ease-out forwards; }
.anim-bg-pan-left { animation: pan-left linear forwards; }
.anim-bg-pan-right { animation: pan-right linear forwards; }
.anim-bg-zoom-out { animation: zoom-out ease-out forwards; }

/* Text Animations */
@keyframes text-fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
@keyframes text-rise-up { 0% { opacity: 0; transform: translateY(30px); } 100% { opacity: 1; transform: translateY(0); } }
@keyframes typewriter { from { width: 0; } to { width: 100%; } }
@keyframes blink-caret { from, to { border-color: transparent } 50% { border-color: white; } }

.text-anim-none { visibility: visible; }
.text-anim-fade-in { animation-name: text-fade-in; animation-timing-function: ease-in-out; animation-fill-mode: forwards; opacity: 0; }
.text-anim-rise-up { animation-name: text-rise-up; animation-timing-function: ease-out; animation-fill-mode: forwards; opacity: 0; }
.text-anim-typewriter {
  display: inline-block;
  overflow: hidden; 
  white-space: nowrap;
  border-right: .15em solid white;
  animation: typewriter steps(40, end) forwards, blink-caret .75s step-end infinite;
  animation-iteration-count: 1;
  max-width: 100%;
}

/* Foreground Image Animations */
@keyframes fg-fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
@keyframes fg-zoom-in { 0% { opacity: 0; transform: scale(0.8); } 100% { opacity: 1; transform: scale(1); } }
@keyframes fg-slide-in-left { 0% { opacity: 0; transform: translateX(-100%); } 100% { opacity: 1; transform: translateX(0); } }
@keyframes fg-slide-in-right { 0% { opacity: 0; transform: translateX(100%); } 100% { opacity: 1; transform: translateX(0); } }

.anim-fg-none { visibility: visible; }
.anim-fg-fade-in { animation: fg-fade-in ease-out forwards; opacity: 0; }
.anim-fg-zoom-in { animation: fg-zoom-in ease-out forwards; opacity: 0; }
.anim-fg-slide-in-left { animation: fg-slide-in-left ease-out forwards; opacity: 0; }
.anim-fg-slide-in-right { animation: fg-slide-in-right ease-out forwards; opacity: 0; }


/* Card Transitions */
.card-transition-fade-in { animation: fade-in ease-in forwards; }
.card-transition-fade-out { animation: fade-out ease-out forwards; }
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes fade-out { from { opacity: 1; } to { opacity: 0; } }

.card-transition-dissolve-in { animation: dissolve-in ease-in forwards; }
.card-transition-dissolve-out { animation: dissolve-out ease-out forwards; }
@keyframes dissolve-in { from { opacity: 0; filter: blur(10px); } to { opacity: 1; filter: blur(0); } }
@keyframes dissolve-out { from { opacity: 1; filter: blur(0); } to { opacity: 0; filter: blur(10px); } }

.card-transition-zoom-in-in { animation: zoom-in-enter ease-out forwards; }
.card-transition-zoom-in-out { animation: zoom-out-exit ease-in forwards; }
@keyframes zoom-in-enter { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes zoom-out-exit { from { transform: scale(1); opacity: 1; } to { transform: scale(0.9); opacity: 0; } }

.card-transition-slide-left-in { animation: slide-left-in ease-out forwards; }
.card-transition-slide-left-out { animation: slide-left-out ease-in forwards; }
@keyframes slide-left-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
@keyframes slide-left-out { from { transform: translateX(0); } to { transform: translateX(-100%); } }

.card-transition-slide-up-in { animation: slide-up-in ease-out forwards; }
.card-transition-slide-up-out { animation: slide-up-out ease-in forwards; }
@keyframes slide-up-in { from { transform: translateY(100%); } to { transform: translateY(0); } }
@keyframes slide-up-out { from { transform: translateY(0); } to { transform: translateY(-100%); } }

`;
document.head.appendChild(style);
// Tailwind JIT support for dynamic classes
const safeList = document.createElement('div');
safeList.className = 'border-cyan-500 border-teal-500 border-red-500 border-yellow-500 hidden';
document.body.appendChild(safeList);
