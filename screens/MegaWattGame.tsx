
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import type { GameData, Entity, Template, ChoiceOutcome, PlayerChoice, ChoiceOption, Condition, ChoiceOutcomeUpdateEntity, PhoenixProject, CompanyLauncherSettings, NewsItem, GameCardStyle, ShowcaseImage, GameListStyle, TextStyle, ImageCredit, ImageStyle, Layout, LayoutRegion, GridTrack } from '../types';
import { evaluateCondition } from '../services/conditionEvaluator';
import { debugService } from '../services/debugService';
import { PlayIcon } from '../components/icons/PlayIcon';
import { NewspaperIcon } from '../components/icons/NewspaperIcon';
import { UserCircleIcon } from '../components/icons/UserCircleIcon';
import { ArrowLeftIcon } from '../components/icons/ArrowLeftIcon';
import { HomeIcon } from '../components/icons/HomeIcon';
import { ChevronLeftIcon } from '../components/icons/ChevronLeftIcon';
import { ChevronRightIcon } from '../components/icons/ChevronRightIcon';
import { EntityCard } from '../components/cards/EntityCard';
import { CreditDisplay } from '../components/CreditDisplay';

// --- SHARED UTILS ---

const imageStyleToCss = (style?: ImageStyle): React.CSSProperties => {
    if (!style) return {};
    const filters = [
        style.filterGrayscale ? `grayscale(${style.filterGrayscale})` : '',
        style.filterSepia ? `sepia(${style.filterSepia})` : '',
        style.filterBlur ? `blur(${style.filterBlur}px)` : '',
        style.filterBrightness ? `brightness(${style.filterBrightness})` : '',
        style.filterContrast ? `contrast(${style.filterContrast})` : '',
    ].filter(Boolean).join(' ');

    return {
        objectFit: style.objectFit,
        objectPosition: style.objectPosition,
        opacity: style.opacity,
        borderRadius: style.borderRadius ? `${style.borderRadius}px` : undefined,
        filter: filters || undefined,
    };
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

// Converts the structured grid track array into a CSS string
const gridTracksToString = (tracks?: GridTrack[]): string => {
    if (!tracks || tracks.length === 0) return 'none';
    return tracks.map(track => track.unit === 'auto' ? 'auto' : `${track.size}${track.unit}`).join(' ');
}


const NewsDisplay: React.FC<{news: NewsItem[]}> = ({ news }) => {
    const publishedNews = [...(news || [])].filter(n => n.status === 'published').reverse();

    return (
        <div className="space-y-6 max-w-3xl">
            {publishedNews.length > 0 ? publishedNews.map(item => {
                const styleClasses = {
                    normal: { container: 'border-transparent', title: 'text-[var(--text-accent)]' },
                    urgent: { container: 'border-red-500/50', title: 'text-[var(--text-danger)]' },
                    lore: { container: 'border-yellow-600/50 bg-[var(--bg-panel)]/80', title: 'text-[var(--text-warning)]' }
                }[item.style || 'normal'];
                
                const layoutClasses = {
                    container: `flex flex-col ${item.layout !== 'image_top' ? 'md:flex-row' : ''} ${item.layout === 'image_right' ? 'md:flex-row-reverse' : ''} gap-6`,
                    image: `flex-shrink-0 rounded-md ${item.layout !== 'image_top' ? 'md:w-1/3' : 'w-full h-48'}`,
                };

                return (
                    <div key={item.id} className={`bg-[var(--bg-panel)]/50 rounded-lg overflow-hidden border ${styleClasses.container} transition-colors`}>
                        <div className="p-6">
                            <div className={layoutClasses.container}>
                                {item.src && (
                                    <div className="relative">
                                        <img src={item.src} alt={item.title} className={layoutClasses.image} style={imageStyleToCss(item.imageStyle)} />
                                        {item.imageCredit && <CreditDisplay credit={item.imageCredit} className="bottom-2 right-2" />}
                                    </div>
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
                                    <div className="prose prose-sm prose-invert max-w-none prose-p:my-2 prose-ul:my-2" dangerouslySetInnerHTML={{ __html: parseMarkdown(item.content) }} />
                                    
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
    );
};

const GameCard: React.FC<{
    game: GameData;
    style: Partial<GameCardStyle>;
    onClick: () => void;
}> = ({ game, style, onClick }) => {
    const [imageIndex, setImageIndex] = useState(0);
    const timeoutRef = useRef<number | null>(null);

    const coverImage = useMemo(() => {
        const showcase = game.menuSettings.showcaseImages || [];
        if (showcase.length === 0) return null;
        if (style.imageDisplay === 'slider') {
            return showcase[imageIndex];
        }
        const cover = showcase.find(img => img.id === game.cardCoverImageId) || showcase[0];
        return cover;
    }, [game, style.imageDisplay, imageIndex]);

    useEffect(() => {
        if (style.imageDisplay !== 'slider') return;

        timeoutRef.current = window.setTimeout(() => {
            setImageIndex(prev => (prev + 1) % (game.menuSettings.showcaseImages?.length || 1));
        }, 5000);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [imageIndex, style.imageDisplay, game.menuSettings.showcaseImages]);

    const parseText = (text: string | undefined) => {
        if (!text) return '';
        return text.replace(/{game.gameTitle}/g, game.gameTitle).replace(/{game.colonyName}/g, game.colonyName);
    }
    
    const hoverClasses = {
        'lift': 'hover:scale-105 hover:shadow-2xl hover:ring-2 hover:ring-[var(--border-accent)]',
        'glow': 'hover:shadow-2xl',
        'none': ''
    }[style.hoverEffect || 'lift'];

    return (
        <div 
            className={`rounded-lg overflow-hidden flex flex-col transition-all duration-300 ${hoverClasses}`}
            style={{ backgroundColor: style.backgroundColor, borderColor: style.borderColor, borderWidth: '1px' }}
        >
            <div className="relative" style={{ aspectRatio: style.imageAspectRatio }}>
                 {coverImage?.src ? <img src={coverImage.src} alt={game.gameTitle} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-[var(--bg-main)]/50" />}
            </div>
            <div className="p-4 flex-grow flex flex-col">
                <h3 style={style.headerStyle}>{parseText(style.headerText)}</h3>
                <p style={style.bodyStyle}>{parseText(style.bodyText)}</p>
                <button 
                    onClick={onClick}
                    style={{ backgroundColor: style.buttonColor, color: style.buttonTextColor }}
                    className="mt-auto ml-auto px-4 py-2 rounded-md font-bold text-sm"
                >
                    Play
                </button>
            </div>
        </div>
    );
};

export const MegaWattGame: React.FC<{ projectData: PhoenixProject, onStartSimulation: (game: GameData) => void, onChoiceMade: (outcomes: ChoiceOutcome[]) => void }> = ({ projectData, onStartSimulation }) => {
    const { launcherSettings, games } = projectData;
    const [selectedGameId, setSelectedGameId] = useState<string | null>(games[0]?.id || null);
    const [mainView, setMainView] = useState<'games' | 'news' | 'credits'>('games');
    
    const selectedGame = useMemo(() => games.find(g => g.id === selectedGameId), [games, selectedGameId]);

    const listStyle = launcherSettings.gameListStyle || {};
    const cardStyle = launcherSettings.gameCardStyle || {};
    
    let bgStyle: React.CSSProperties = {};
    if (listStyle.backgroundType === 'solid' && listStyle.backgroundColor1) {
        bgStyle.backgroundColor = listStyle.backgroundColor1;
    } else if (listStyle.backgroundType === 'gradient' && listStyle.backgroundColor1 && listStyle.backgroundColor2) {
        bgStyle.backgroundImage = `linear-gradient(to bottom right, ${listStyle.backgroundColor1}, ${listStyle.backgroundColor2})`;
    }

    return (
        <div className="h-full w-full flex flex-col relative" style={imageStyleToCss(launcherSettings.backgroundImageStyle)}>
            {launcherSettings.src && <img src={launcherSettings.src} alt="background" className="absolute inset-0 w-full h-full object-cover" />}
            <div className="absolute inset-0 bg-black/50" />
            
            <div className="relative z-10 flex-grow p-8 flex flex-col">
                <header className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-white">{launcherSettings.companyName}</h1>
                     <div className="flex items-center space-x-1 bg-[var(--bg-panel-light)] p-1 rounded-lg">
                        <button onClick={() => setMainView('games')} className={`px-3 py-1 text-sm rounded-md transition-colors ${mainView === 'games' ? 'bg-[var(--bg-active)] text-[var(--text-on-accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}>Games</button>
                        <button onClick={() => setMainView('news')} className={`px-3 py-1 text-sm rounded-md transition-colors ${mainView === 'news' ? 'bg-[var(--bg-active)] text-[var(--text-on-accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}>News</button>
                        <button onClick={() => setMainView('credits')} className={`px-3 py-1 text-sm rounded-md transition-colors ${mainView === 'credits' ? 'bg-[var(--bg-active)] text-[var(--text-on-accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}>Credits</button>
                    </div>
                </header>
                
                <main className="flex-grow overflow-y-auto">
                    {mainView === 'games' && (
                        <div style={{ ...bgStyle, padding: `${listStyle.padding || 0}px`, borderRadius: `${listStyle.borderRadius || 0}px` }}>
                            <div className={`grid gap-6 ${launcherSettings.gameListLayout === 'list' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
                                {games.map(game => (
                                    <GameCard key={game.id} game={game} style={cardStyle} onClick={() => onStartSimulation(game)} />
                                ))}
                            </div>
                        </div>
                    )}
                    {mainView === 'news' && <NewsDisplay news={launcherSettings.news} />}
                    {mainView === 'credits' && (
                        <div className="max-w-3xl prose prose-invert">
                            <div dangerouslySetInnerHTML={{ __html: parseMarkdown(selectedGame?.menuSettings.credits || '')}} />
                        </div>
                    )}
                </main>
            </div>
        </div>
    )
};


// --- SCENE PLAYER COMPONENT ---

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

const ChoiceEntityCard: React.FC<{
    option: ChoiceOption;
    gameData: GameData;
    onClick: () => void;
}> = ({ option, gameData, onClick }) => {
    const entity = useMemo(() => {
        if (!option.sourceEntityId) return null;
        return gameData.entities.find(e => e.id === option.sourceEntityId);
    }, [option.sourceEntityId, gameData.entities]);

    if (!entity) {
        // Fallback to a button if entity not found or for static options in a card layout
        return (
            <button onClick={onClick} className="bg-[var(--bg-panel)]/60 hover:bg-[var(--text-accent)]/80 border border-[var(--border-secondary)] hover:border-[var(--border-accent)] text-white font-semibold py-3 px-8 rounded-lg backdrop-blur-sm transition-all duration-300 transform hover:scale-105">
                {option.text}
            </button>
        );
    }
    
    return (
        <button onClick={onClick} className="w-48 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-cyan-400 rounded-lg">
            <EntityCard entity={entity} />
        </button>
    );
};

export const ScenePresenter: React.FC<{ choice: PlayerChoice; gameData: GameData; onComplete: (option?: ChoiceOption) => void; animationState: 'in' | 'out'; isFirstScene: boolean }> = ({ choice, gameData, onComplete, animationState, isFirstScene }) => {
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
            choiceLayout: s.choiceLayout || 'buttons',
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
        if (choice.choiceType === 'static') {
            const options = choice.staticOptions || [];
            return options.filter(opt => {
                if (!opt.conditions || opt.conditions.length === 0) return true;
                return opt.conditions.every(cond => evaluateCondition(cond, gameData));
            });
        }
        if (choice.choiceType === 'dynamic_from_template' && choice.dynamicConfig) {
            const { sourceTemplateIds, requiredComponentIds, excludedComponentIds, optionTemplate, outcomeTemplates, nextChoiceId, filterConditions } = choice.dynamicConfig;
            
            if (!sourceTemplateIds || sourceTemplateIds.length === 0) return [];

            // 1. Filter by base blueprint (OR logic)
            let sourceEntities = gameData.entities.filter(e => sourceTemplateIds.includes(e.templateId));

            // 2. Further filter by required/excluded components (AND logic), checking inheritance chain
            if ((requiredComponentIds && requiredComponentIds.length > 0) || (excludedComponentIds && excludedComponentIds.length > 0)) {
                sourceEntities = sourceEntities.filter(entity => {
                    const template = gameData.templates.find(t => t.id === entity.templateId);
                    if (!template) return false;

                    const allComponentIds = new Set<string>();
                    let current: Template | undefined = template;
                    while (current) {
                        (current.includedComponentIds || []).forEach(id => allComponentIds.add(id));
                        current = gameData.templates.find(t => t.id === current?.parentId);
                    }

                    const hasRequired = !requiredComponentIds || requiredComponentIds.length === 0 || requiredComponentIds.every(reqId => allComponentIds.has(reqId));
                    const hasExcluded = excludedComponentIds && excludedComponentIds.length > 0 && excludedComponentIds.some(exId => allComponentIds.has(exId));
                    
                    return hasRequired && !hasExcluded;
                });
            }

            // 3. Apply final filter conditions
            if (filterConditions && filterConditions.length > 0) {
                sourceEntities = sourceEntities.filter(entity => 
                    filterConditions.every(cond => {
                        if (cond.type === 'attribute' || cond.type === 'has_stuff') {
                            // For conditions that target a specific entity, we substitute the
                            // entity being iterated over as the target.
                            return evaluateCondition({ ...cond, targetEntityId: entity.id }, gameData);
                        }
                        return evaluateCondition(cond, gameData); // For global conditions like 'entity_exists'
                    })
                );
            }

            // 4. Map the final list of entities to choice options
            return sourceEntities.map((entity, index): ChoiceOption | null => {
                const entityTemplate = gameData.templates.find(t => t.id === entity.templateId);
                if (!entityTemplate) return null;

                return {
                    id: `dynamic_opt_${entity.id}_${index}`,
                    text: parsePlaceholders(optionTemplate.text, entity, entityTemplate),
                    outcomes: outcomeTemplates,
                    nextChoiceId: nextChoiceId || null,
                    sourceEntityId: entity.id,
                };
            }).filter((opt): opt is ChoiceOption => opt !== null);
        }
        return [];
    }, [choice, gameData]);

    const positionClass = { top: 'justify-start pt-12 md:pt-24', middle: 'justify-center', bottom: 'justify-end pb-12 md:pb-24' }[styles.textPosition];
    const textAlignClass = { left: 'text-left items-start', center: 'text-center items-center', right: 'text-right items-end' }[styles.textAlign];
    const overlayClass = { none: '', light: 'bg-gradient-to-t from-black/40 via-black/20 to-transparent', medium: 'bg-gradient-to-t from-black/80 via-black/50 to-transparent', heavy: 'bg-gradient-to-t from-black/95 via-black/70 to-black/20' }[styles.overlayStrength];
    const backgroundEffectClass = { none: '', blur: 'blur-md', darken: 'brightness-75' }[styles.backgroundEffect];
    const fontFamilyClass = { sans: 'font-sans', serif: 'font-serif', mono: 'font-mono' }[styles.fontFamily];
    const fontSizeClass = { normal: 'text-xl md:text-3xl lg:text-4xl', large: 'text-2xl md:text-4xl lg:text-5xl', xlarge: 'text-3xl md:text-5xl lg:text-6xl', xxlarge: 'text-4xl md:text-6xl lg:text-7xl' }[styles.fontSize];
    const textWidthClass = { narrow: 'max-w-2xl', medium: 'max-w-4xl', wide: 'max-w-7xl' }[styles.textWidth];
    const promptFontSizeClass = { normal: 'text-xl', large: 'text-2xl', xlarge: 'text-3xl', xxlarge: 'text-4xl' }[styles.prompt.fontSize];
    const fgContainerPositionClass = { left: 'justify-start', center: 'justify-center', right: 'justify-end'}[styles.fg.position];
    const fgSizeClass = { small: 'w-1/4 md:w-1/5', medium: 'w-1/3 md:w-1/4', large: 'w-1/2 md:w-1/3'}[styles.fg.size];
    const sceneTransitionClass = `card-transition-${styles.cardTransition}-${animationState}`;
    const textAnimationClass = animationState === 'in' ? `text-anim-${styles.textAnimation}` : 'opacity-0';
    const fgAnimationClass = animationState === 'in' ? `anim-fg-${styles.fg.animation}` : 'opacity-0';
    const sceneStyle = { animationDuration: `${styles.cardTransitionDuration}s` };
    const bgStyle: React.CSSProperties = {
        backgroundImage: choice.src ? `url(${choice.src})` : undefined,
        animationDuration: `${styles.backgroundAnimationDuration}s`,
        ...imageStyleToCss(choice.imageStyle)
    };
    const textStyle = { animationDuration: `${styles.textAnimationDuration}s`, animationDelay: `${styles.textAnimationDelay}s` };
    const fgStyle: React.CSSProperties = { 
        animationDuration: `${styles.fg.animationDuration}s`,
        animationDelay: `${styles.fg.animationDelay}s`,
        ...imageStyleToCss(choice.foregroundImageStyle)
    };


    return (
        <div className={`fixed inset-0 bg-black ${sceneTransitionClass} z-30`} style={sceneStyle}>
            {choice.src && <div className={`absolute inset-0 bg-cover bg-center ${styles.backgroundAnimation !== 'none' ? `anim-bg-${styles.backgroundAnimation}` : ''} ${backgroundEffectClass} transition-all duration-300`} style={bgStyle} />}
            {choice.imageCredit && <CreditDisplay credit={choice.imageCredit} className="bottom-2 right-2" />}
            <div className={`absolute inset-0 ${overlayClass}`} />
            {choice.foregroundImageSrc && 
                <div className={`absolute inset-0 flex items-center p-8 md:p-16 ${fgContainerPositionClass}`}>
                    <div className={`relative ${fgSizeClass}`}>
                         <img src={choice.foregroundImageSrc} style={fgStyle} className={`object-contain max-h-full w-full ${fgAnimationClass}`} alt="" />
                    </div>
                </div>
            }
            <div className={`relative z-10 flex flex-col h-full p-8 md:p-16 ${positionClass} ${textAlignClass}`}>
                <div className={`space-y-6 ${textWidthClass}`} style={textStyle}>
                    <p className={`${styles.textColor} ${fontFamilyClass} ${fontSizeClass} [text-shadow:0_2px_8px_rgba(0,0,0,0.8)] ${textAnimationClass}`} dangerouslySetInnerHTML={{ __html: parseMarkdown(choice.description) }} />

                    {choice.prompt && (
                        <div className="pt-4">
                            <p className={`${styles.prompt.textColor} ${promptFontSizeClass} font-semibold mb-6 [text-shadow:0_1px_4px_rgba(0,0,0,0.7)]`}>{choice.prompt}</p>
                            
                            {styles.choiceLayout === 'buttons' && (
                                <div className="flex flex-wrap gap-4" style={{ justifyContent: { left: 'flex-start', center: 'center', right: 'flex-end' }[styles.textAlign] }}>
                                    {choiceOptions.map(option => (
                                        <button key={option.id} onClick={() => onComplete(option)} className="bg-[var(--bg-panel)]/60 hover:bg-[var(--text-accent)]/80 border border-[var(--border-secondary)] hover:border-[var(--border-accent)] text-white font-semibold py-3 px-8 rounded-lg backdrop-blur-sm transition-all duration-300 transform hover:scale-105">
                                            {option.text}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {styles.choiceLayout === 'grid' && (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                    {choiceOptions.map(option => (
                                        <ChoiceEntityCard key={option.id} option={option} gameData={gameData} onClick={() => onComplete(option)} />
                                    ))}
                                </div>
                            )}

                             {styles.choiceLayout === 'carousel' && (
                                <div className="flex items-center justify-center gap-4">
                                    {/* Carousel implementation would go here. For now, a grid is a good fallback. */}
                                    {choiceOptions.map(option => (
                                         <ChoiceEntityCard key={option.id} option={option} gameData={gameData} onClick={() => onComplete(option)} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    
                    {!choice.prompt && (
                        <div className="pt-4" style={{ textAlign: styles.textAlign }}>
                            <button onClick={() => onComplete()} className="bg-[var(--bg-panel)]/60 hover:bg-[var(--text-accent)]/80 border border-[var(--border-secondary)] hover:border-[var(--border-accent)] text-white font-semibold py-3 px-8 rounded-lg backdrop-blur-sm transition-all duration-300 transform hover:scale-105">
                                Continue
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
