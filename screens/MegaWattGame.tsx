
import React, { useMemo, useState, useEffect, useRef } from 'react';
import type { GameData, Entity, Template, StoryCard, ChoiceOutcome, PlayerChoice, ChoiceOption, AttributeDefinition, StuffSet, Condition } from '../types';
import { evaluateCondition } from '../services/conditionEvaluator';
import { debugService } from '../services/debugService';
import { ArrowDownTrayIcon } from '../components/icons/ArrowDownTrayIcon';
import { ArrowUpTrayIcon } from '../components/icons/ArrowUpTrayIcon';
import { ArrowUturnLeftIcon } from '../components/icons/ArrowUturnLeftIcon';
import { ArrowUturnRightIcon } from '../components/icons/ArrowUturnRightIcon';

interface ResolvedAttribute {
    definition: AttributeDefinition;
    value: string | number | null;
}

interface ResolvedStuffItem {
    name: string;
    attributes: ResolvedAttribute[];
}
interface ResolvedEntityAttributes {
    templateAttributes: ResolvedAttribute[];
    stuff: {
        setName: string;
        items: ResolvedStuffItem[];
    }[];
}

const resolveEntityAttributes = (entity: Entity, gameData: GameData): ResolvedEntityAttributes => {
    const template = gameData.templates.find(t => t.id === entity.templateId);
    if (!template) {
        debugService.log("MegaWattGame: resolveEntityAttributes failed, template not found", { entityId: entity.id, templateId: entity.templateId });
        return { templateAttributes: [], stuff: [] };
    }

    const templateAttributes: ResolvedAttribute[] = template.attributes.map(attrDef => ({
        definition: attrDef,
        value: entity.attributeValues[attrDef.id] ?? null
    }));

    const stuff: ResolvedEntityAttributes['stuff'] = (template.includedStuff || []).map(included => {
        const stuffSet = gameData.stuff.find(s => s.id === included.setId);
        if (!stuffSet) return null;

        const items: ResolvedStuffItem[] = included.itemIds.map(itemId => {
            const item = stuffSet.items.find(i => i.id === itemId);
            if (!item) return null;

            const attributes: ResolvedAttribute[] = item.attributes.map(attrDef => ({
                definition: attrDef,
                value: entity.attributeValues[`${item.id}_${attrDef.id}`] ?? null
            }));

            return { name: item.name, attributes };
        }).filter((i): i is ResolvedStuffItem => i !== null);

        return { setName: stuffSet.name, items };

    }).filter((s): s is { setName: string; items: ResolvedStuffItem[] } => s !== null);

    const resolvedData = { templateAttributes, stuff };
    debugService.log("MegaWattGame: Resolved entity attributes", { entityName: entity.name, resolvedData });
    return resolvedData;
};


interface MegaWattGameProps {
  gameData: GameData;
  onChoiceMade: (outcome: ChoiceOutcome) => void;
  onSaveGame: () => void;
  onLoadGame: (jsonString: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const AttributeDisplay: React.FC<{
    resolvedAttribute: ResolvedAttribute,
    entityMap: Map<string, Entity>
}> = ({ resolvedAttribute, entityMap }) => {
    const { definition, value } = resolvedAttribute;
    if (value === null || value === undefined) return null;


    let displayValue: React.ReactNode = value;

    if (definition.type === 'entity_reference' && typeof value === 'string') {
        displayValue = entityMap.get(value)?.name || <span className="text-gray-500 italic">Unknown Reference</span>;
    } else if (typeof value === 'string' && value.length > 150) {
            displayValue = <p className="text-gray-400 whitespace-pre-wrap">{value}</p>;
    } else {
            displayValue = <span className="text-gray-200">{String(value)}</span>
    }

    return (
        <div className="grid grid-cols-3 gap-2">
            <span className="text-gray-500 font-semibold col-span-1">{definition.name}</span>
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
            borderColor: s.borderColor ? `border-${s.borderColor}` : 'border-gray-700',
            borderWidth: { none: 'border-0', sm: 'border', md: 'border-2', lg: 'border-4' }[s.borderWidth || 'md'],
            shadow: { none: 'shadow-none', sm: 'shadow-sm', md: 'shadow-md', lg: 'shadow-lg', xl: 'shadow-xl' }[s.shadow || 'lg'],
            titleColor: s.titleColor || 'text-cyan-300',
            backgroundColor: s.backgroundColor || 'bg-gray-800/50',
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
                    {resolvedAttributes.templateAttributes.map(resAttr => (
                        <AttributeDisplay key={resAttr.definition.id} resolvedAttribute={resAttr} entityMap={entityMap} />
                    ))}

                    {resolvedAttributes.stuff.map(stuffGroup => (
                        <div key={stuffGroup.setName} className="pt-3 mt-3 border-t border-gray-700/50">
                            <h4 className="text-teal-400 font-semibold text-base mb-2">{stuffGroup.setName}</h4>
                            <div className="space-y-3 pl-2">
                                {stuffGroup.items.map(item => (
                                    <div key={item.name}>
                                        <p className="text-gray-300 font-bold mb-1">{item.name}</p>
                                        <div className="space-y-2 pl-2 border-l border-gray-600">
                                          {item.attributes.map(resAttr => (
                                              <AttributeDisplay key={resAttr.definition.id} resolvedAttribute={resAttr} entityMap={entityMap} />
                                          ))}
                                        </div>
                                    </div>
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

const SelectableCard: React.FC<{ card: Omit<StoryCard, 'id'>, onClick: () => void }> = ({ card, onClick }) => {
    const styles = useMemo(() => {
        const s = card.styles || {};
        return {
            textColor: s.textColor || 'text-white',
            fontFamily: s.fontFamily || 'sans',
            fontSize: { normal: 'text-base', large: 'text-lg', xlarge: 'text-xl', xxlarge: 'text-2xl' }[s.fontSize || 'normal'],
            textAlign: { left: 'text-left', center: 'text-center', right: 'text-right' }[s.textAlign || 'center'],
            borderWidth: { none: 'border-0', sm: 'border', md: 'border-2', lg: 'border-4' }[s.borderWidth || 'md'],
            borderColor: `border-${s.borderColor || 'cyan-500'}`
        };
    }, [card.styles]);
    
    return (
        <button onClick={onClick} className={`relative aspect-[3/4] w-full rounded-lg overflow-hidden group transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/30 ${styles.borderWidth} ${styles.borderColor}`}>
            {card.imageBase64 && <img src={card.imageBase64} alt={card.description} className="absolute inset-0 w-full h-full object-cover group-hover:brightness-110 transition-all duration-300"/>}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
            <div className="relative z-10 flex flex-col justify-end h-full p-4">
                <p className={`font-bold ${styles.textColor} ${styles.fontFamily} ${styles.fontSize} ${styles.textAlign}`}>
                    {card.description}
                </p>
            </div>
        </button>
    );
};


const ChoicePresenter: React.FC<{
    choice: PlayerChoice;
    gameData: GameData;
    onComplete: (outcome: ChoiceOutcome) => void;
}> = ({ choice, gameData, onComplete }) => {
    
    const promptFontSizeClass = {
        normal: 'text-xl',
        large: 'text-2xl',
        xlarge: 'text-3xl',
        xxlarge: 'text-4xl',
    }[choice.styles?.promptStyles?.fontSize || 'normal'];

    const promptTextColorClass = choice.styles?.promptStyles?.textColor || 'text-cyan-200';

    const choiceOptions = useMemo((): { card: Omit<StoryCard, 'id' | 'choiceId'>, outcome: ChoiceOutcome }[] => {
        debugService.log("ChoicePresenter: Calculating choice options", { choice });
        
        if (choice.choiceType === 'static') {
            const options = choice.staticOptions || [];
            const finalOptions = options.filter(opt => {
                if (!opt.conditions || opt.conditions.length === 0) {
                    debugService.log("ChoicePresenter: Static option included (no conditions)", { optionId: opt.id });
                    return true;
                }
                const allConditionsMet = opt.conditions.every(cond => evaluateCondition(cond, gameData));
                debugService.log("ChoicePresenter: Static option evaluated", { optionId: opt.id, allConditionsMet });
                return allConditionsMet;
            });
            debugService.log("ChoicePresenter: Final static options", { options: finalOptions });
            return finalOptions;
        }
        
        if (choice.choiceType === 'dynamic_from_template' && choice.dynamicConfig) {
            const { sourceTemplateId, cardTemplate, outcomeTemplate, filterConditions } = choice.dynamicConfig;
            const sourceTemplate = gameData.templates.find(t => t.id === sourceTemplateId);
            if (!sourceTemplate) {
                 debugService.log("ChoicePresenter: Dynamic choice failed, source template not found", { sourceTemplateId });
                return [];
            }
            
            let sourceEntities = gameData.entities.filter(e => e.templateId === sourceTemplateId);
            debugService.log("ChoicePresenter: Found initial dynamic entities", { count: sourceEntities.length, entities: sourceEntities.map(e => e.name) });

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
                debugService.log("ChoicePresenter: Entities after filtering", { count: sourceEntities.length, entities: sourceEntities.map(e => e.name) });
            }

            const finalOptions = sourceEntities.map(entity => {
                const parsedCard: Omit<StoryCard, 'id' | 'choiceId'> = {
                    ...cardTemplate,
                    description: parsePlaceholders(cardTemplate.description, entity, sourceTemplate),
                    imagePrompt: parsePlaceholders(cardTemplate.imagePrompt, entity, sourceTemplate),
                };

                const outcome: ChoiceOutcome = {
                    ...outcomeTemplate,
                    value: entity.id
                };
                return { card: parsedCard, outcome };
            });
            debugService.log("ChoicePresenter: Final dynamic options", { options: finalOptions });
            return finalOptions;
        }

        return [];
    }, [choice, gameData]);
    
    return (
        <div className="space-y-8">
            <p className={`text-center transition-colors duration-300 ${promptFontSizeClass} ${promptTextColorClass}`}>{choice.prompt}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
                {choiceOptions.map((option, index) => (
                    <SelectableCard key={index} card={option.card} onClick={() => onComplete(option.outcome)} />
                ))}
            </div>
        </div>
    );
};


const IntroCard: React.FC<{ card: StoryCard; choice?: PlayerChoice; gameData: GameData; onComplete: (outcome?: ChoiceOutcome) => void; animationState: 'in' | 'out'; isFirstCard: boolean }> = ({ card, choice, gameData, onComplete, animationState, isFirstCard }) => {
    const styles = useMemo(() => {
        const s = card.styles || {};
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
            cardTransition: isFirstCard ? 'fade' : (s.cardTransition || 'fade'),
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
        };
    }, [card.styles, isFirstCard]);

    // CSS Classes
    const positionClass = { top: 'justify-start pt-12 md:pt-24', middle: 'justify-center', bottom: 'justify-end pb-12 md:pb-24' }[styles.textPosition];
    const textAlignClass = { left: 'text-left items-start', center: 'text-center items-center', right: 'text-right items-end' }[styles.textAlign];
    const textColorClass = styles.textColor;
    const textShadowClass = '[text-shadow:0_2px_10px_rgba(0,0,0,0.5)]';
    const overlayClass = { none: '', light: 'bg-gradient-to-t from-black/40 via-black/20 to-transparent', medium: 'bg-gradient-to-t from-black/80 via-black/50 to-transparent', heavy: 'bg-gradient-to-t from-black/95 via-black/70 to-black/20' }[styles.overlayStrength];
    const backgroundEffectClass = { none: '', blur: 'blur-md', darken: 'brightness-75' }[styles.backgroundEffect];
    const fontFamilyClass = { sans: 'font-sans', serif: 'font-serif', mono: 'font-mono' }[styles.fontFamily];
    const fontSizeClass = { normal: 'text-xl md:text-3xl lg:text-4xl', large: 'text-2xl md:text-4xl lg:text-5xl', xlarge: 'text-3xl md:text-5xl lg:text-6xl', xxlarge: 'text-4xl md:text-6xl lg:text-7xl' }[styles.fontSize];
    const textWidthClass = { narrow: 'max-w-2xl', medium: 'max-w-4xl', wide: 'max-w-7xl' }[styles.textWidth];
    
    // Foreground Image Classes
    const fgContainerPositionClass = { left: 'justify-start', center: 'justify-center', right: 'justify-end'}[styles.fg.position];
    const fgSizeClass = { small: 'w-1/4 md:w-1/5', medium: 'w-1/3 md:w-1/4', large: 'w-1/2 md:w-1/3'}[styles.fg.size];

    // Animation Classes & Styles
    const cardTransitionClass = `card-transition-${styles.cardTransition}-${animationState}`;
    const textAnimationClass = animationState === 'in' ? `text-anim-${styles.textAnimation}` : 'opacity-0';
    const fgAnimationClass = animationState === 'in' ? `anim-fg-${styles.fg.animation}` : 'opacity-0';

    const cardStyle = { animationDuration: `${styles.cardTransitionDuration}s` };
    const bgStyle = { backgroundImage: card.imageBase64 ? `url(${card.imageBase64})` : undefined, animationDuration: `${styles.backgroundAnimationDuration}s`};
    const textStyle = { animationDuration: `${styles.textAnimationDuration}s`, animationDelay: `${styles.textAnimationDelay}s` };
    const fgStyle = { animationDuration: `${styles.fg.animationDuration}s`, animationDelay: `${styles.fg.animationDelay}s` };


    return (
        <div className={`fixed inset-0 bg-black ${cardTransitionClass}`} style={cardStyle}>
            {card.imageBase64 && (
                <div
                    className={`absolute inset-0 bg-cover bg-center ${styles.backgroundAnimation !== 'none' ? `anim-bg-${styles.backgroundAnimation}` : ''} ${backgroundEffectClass} transition-all duration-300`}
                    style={bgStyle}
                />
            )}
            <div className={`absolute inset-0 ${overlayClass}`} />

            {card.foregroundImageBase64 && (
                 <div className={`absolute inset-0 flex items-center p-8 md:p-16 ${fgContainerPositionClass}`}>
                    <img src={card.foregroundImageBase64} style={fgStyle} className={`object-contain max-h-full ${fgSizeClass} ${fgAnimationClass}`} alt="Foreground Element"/>
                </div>
            )}

            <div className={`relative z-10 flex flex-col h-full p-8 md:p-16 ${positionClass} ${textAlignClass}`}>
                <div className={`w-full ${textWidthClass}`}>
                    <p style={textStyle} className={`leading-relaxed mb-12 ${textColorClass} ${textShadowClass} ${fontFamilyClass} ${fontSizeClass} ${textAnimationClass}`}>
                        {card.description}
                    </p>
                    {choice ? (
                        <ChoicePresenter choice={choice} gameData={gameData} onComplete={onComplete as (outcome: ChoiceOutcome) => void} />
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


export const MegaWattGame: React.FC<MegaWattGameProps> = ({ gameData, onChoiceMade, onSaveGame, onLoadGame, onUndo, onRedo, canUndo, canRedo }) => {
    const { story, choices } = gameData;
    const [introStep, setIntroStep] = useState(story && story.length > 0 ? 0 : -1);
    const [animationState, setAnimationState] = useState<'in' | 'out'>('in');
    const loadInputRef = useRef<HTMLInputElement>(null);
    
    useEffect(() => {
        debugService.log("MegaWattGame: Component mounted", { gameData });
    }, []);

    useEffect(() => {
        debugService.log("MegaWattGame: Intro step changed", { introStep, animationState });
    }, [introStep, animationState]);

    const handleIntroCompletion = (outcome?: ChoiceOutcome) => {
        debugService.log("MegaWattGame: Intro card completed", { introStep, outcome });
        if (outcome) {
            onChoiceMade(outcome);
        }
        
        const transitionDuration = story[introStep]?.styles?.cardTransitionDuration || 0.6;
        setAnimationState('out');
        setTimeout(() => {
            const nextStep = introStep + 1;
            if (nextStep < story.length) {
                setIntroStep(nextStep);
                setAnimationState('in');
            } else {
                setIntroStep(-1); // End of intro
                debugService.log("MegaWattGame: Intro sequence finished.");
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

        // Reset file input value to allow loading the same file again
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

    if (introStep !== -1) {
        const currentCard = story[introStep];
        if (!currentCard) return null; // Should not happen

        const choiceForCard = currentCard.choiceId ? choices.find(c => c.id === currentCard.choiceId) : undefined;

        return <IntroCard card={currentCard} choice={choiceForCard} onComplete={handleIntroCompletion} animationState={animationState} isFirstCard={introStep === 0} gameData={gameData} />;
    }

    return (
        <div className="min-h-screen bg-gray-900 bg-grid-cyan-500/10 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="relative text-center mb-12">
                    <h1 className="text-5xl font-extrabold text-white tracking-wider">
                        Welcome to <span className="text-cyan-400">{gameData.colonyName || "The Colony"}</span>
                    </h1>
                    <p className="text-gray-400 mt-2">An interactive colony simulation.</p>

                    <div className="absolute top-0 right-0 flex flex-col sm:flex-row gap-2">
                        <button onClick={onUndo} disabled={!canUndo} className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-cyan-300 font-semibold py-2 px-4 rounded-md transition duration-300 text-sm disabled:text-gray-500 disabled:bg-gray-800 disabled:cursor-not-allowed" title="Undo Last Choice">
                            <ArrowUturnLeftIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Undo</span>
                        </button>
                        <button onClick={onRedo} disabled={!canRedo} className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-cyan-300 font-semibold py-2 px-4 rounded-md transition duration-300 text-sm disabled:text-gray-500 disabled:bg-gray-800 disabled:cursor-not-allowed" title="Redo Last Choice">
                            <ArrowUturnRightIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Redo</span>
                        </button>
                        <button 
                            onClick={onSaveGame} 
                            className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-cyan-300 font-semibold py-2 px-4 rounded-md transition duration-300 text-sm"
                            title="Save Game Progress"
                        >
                            <ArrowDownTrayIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Save</span>
                        </button>
                        <button 
                            onClick={handleLoadClick} 
                            className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-cyan-300 font-semibold py-2 px-4 rounded-md transition duration-300 text-sm"
                            title="Load Game Progress"
                        >
                            <ArrowUpTrayIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Load</span>
                        </button>
                        <input type="file" accept=".json" ref={loadInputRef} onChange={handleFileChange} className="hidden" />
                    </div>
                </header>
                
                <main className="space-y-12">
                    {gameData.templates.map(template => {
                        const templateEntities = entitiesByTemplate.get(template.id) || [];
                        if (templateEntities.length === 0) return null;
                        
                        return (
                            <section key={template.id}>
                                <h2 className="text-3xl font-bold text-teal-300 border-b-2 border-teal-500/30 pb-2 mb-6">{template.name}s</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {templateEntities.map(entity => (
                                        <EntityCard key={entity.id} entity={entity} gameData={gameData} entityMap={entityMap} />
                                    ))}
                                </div>
                            </section>
                        )
                    })}

                    {gameData.entities.length === 0 && (
                         <div className="text-center py-20 bg-gray-800/30 rounded-lg">
                            <p className="text-gray-500 text-lg">No entities have been defined for this colony yet.</p>
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
.bg-grid-cyan-500\\/10 {
  background-image: linear-gradient(rgba(45, 212, 191, 0.05) 1px, transparent 1px), linear-gradient(to right, rgba(45, 212, 191, 0.05) 1px, transparent 1px);
  background-size: 2rem 2rem;
}

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
