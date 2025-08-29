
import React, { useMemo, useState, useEffect, useRef } from 'react';
import type { GameData, Entity, Template, ChoiceOutcome, PlayerChoice, ChoiceOption, Condition, ChoiceOutcomeUpdateEntity, PhoenixProject, CompanyLauncherSettings, NewsItem } from '../types';
import { evaluateCondition } from '../services/conditionEvaluator';
import { debugService } from '../services/debugService';
import { PlayIcon } from '../components/icons/PlayIcon';
import { NewspaperIcon } from '../components/icons/NewspaperIcon';
import { UserCircleIcon } from '../components/icons/UserCircleIcon';
import { ArrowLeftIcon } from '../components/icons/ArrowLeftIcon';
import { HomeIcon } from '../components/icons/HomeIcon';

// --- SHARED UTILS ---

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

const NewsDisplay: React.FC<{news: NewsItem[]}> = ({ news }) => {
    const publishedNews = [...news].filter(n => n.status === 'published').reverse();

    return (
        <div className="space-y-6 max-w-3xl">
            {publishedNews.length > 0 ? publishedNews.map(item => {
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
    );
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
        if (choice.choiceType === 'static') {
            const options = choice.staticOptions || [];
            return options.filter(opt => {
                if (!opt.conditions || opt.conditions.length === 0) return true;
                return opt.conditions.every(cond => evaluateCondition(cond, gameData));
            });
        }
        if (choice.choiceType === 'dynamic_from_template' && choice.dynamicConfig) {
            const { sourceTemplateId, optionTemplate, outcomeTemplates, nextChoiceId, filterConditions } = choice.dynamicConfig;
            const sourceTemplate = gameData.templates.find(t => t.id === sourceTemplateId);
            if (!sourceTemplate) return [];
            
            let sourceEntities = gameData.entities.filter(e => e.templateId === sourceTemplateId);

            if (filterConditions && filterConditions.length > 0) {
                sourceEntities = sourceEntities.filter(entity => 
                    filterConditions.every(cond => {
                         if (cond.type === 'attribute') {
                            return evaluateCondition({ ...cond, targetEntityId: entity.id }, gameData);
                         }
                        return evaluateCondition(cond, gameData);
                    })
                );
            }

            return sourceEntities.map((entity, index) => ({
                id: `dynamic_opt_${entity.id}_${index}`,
                text: parsePlaceholders(optionTemplate.text, entity, sourceTemplate),
                outcomes: outcomeTemplates,
                nextChoiceId: nextChoiceId || null,
                sourceEntityId: entity.id,
            }));
        }
        return [];
    }, [choice, gameData]);

    // CSS Classes & Styles omitted for brevity but they are the same as before
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
    const bgStyle = { backgroundImage: choice.imageBase64 ? `url(${choice.imageBase64})` : undefined, animationDuration: `${styles.backgroundAnimationDuration}s`};
    const textStyle = { animationDuration: `${styles.textAnimationDuration}s`, animationDelay: `${styles.textAnimationDelay}s` };
    const fgStyle = { animationDuration: `${styles.fg.animationDuration}s`, animationDelay: `${styles.fg.animationDelay}s` };


    return (
        <div className={`fixed inset-0 bg-black ${sceneTransitionClass}`} style={sceneStyle}>
            {choice.imageBase64 && <div className={`absolute inset-0 bg-cover bg-center ${styles.backgroundAnimation !== 'none' ? `anim-bg-${styles.backgroundAnimation}` : ''} ${backgroundEffectClass} transition-all duration-300`} style={bgStyle} />}
            <div className={`absolute inset-0 ${overlayClass}`} />
            {choice.foregroundImageBase64 && <div className={`absolute inset-0 flex items-center p-8 md:p-16 ${fgContainerPositionClass}`}><img src={choice.foregroundImageBase64} style={fgStyle} className={`object-contain max-h-full ${fgSizeClass} ${fgAnimationClass}`} alt="Foreground Element"/></div>}
            <div className={`relative z-10 flex flex-col h-full p-8 md:p-16 ${positionClass} ${textAlignClass}`}>
                <div className={`w-full ${textWidthClass}`}>
                    <p style={textStyle} className={`leading-relaxed mb-12 ${styles.textColor} [text-shadow:0_2px_10px_rgba(0,0,0,0.5)] ${fontFamilyClass} ${fontSizeClass} ${textAnimationClass}`}>{choice.description}</p>
                    {choice.prompt ? (
                        <div className="space-y-6">
                            <p className={`transition-colors duration-300 ${promptFontSizeClass} ${styles.prompt.textColor}`}>{choice.prompt}</p>
                            <div className="flex justify-center flex-wrap gap-4">
                                {choiceOptions.map(option => (<button key={option.id} onClick={() => onComplete(option)} className="bg-gray-800/60 hover:bg-cyan-600/80 border border-gray-600 hover:border-cyan-400 text-white font-semibold py-3 px-8 rounded-lg backdrop-blur-sm transition-all duration-300 transform hover:scale-105">{option.text}</button>))}
                            </div>
                        </div>
                    ) : ( <button onClick={() => onComplete()} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-12 rounded-full transition-all duration-300 transform hover:scale-105 text-lg">Continue</button> )}
                </div>
            </div>
        </div>
    );
};

const GamePlayer: React.FC<{gameData: GameData, onChoiceMade: (outcomes: ChoiceOutcome[]) => void, onExit: () => void}> = ({ gameData, onChoiceMade, onExit }) => {
    const { choices, startChoiceId } = gameData;
    const [currentChoiceId, setCurrentChoiceId] = useState<string | null>(startChoiceId);
    const [animationState, setAnimationState] = useState<'in' | 'out'>('in');

    useEffect(() => {
        setCurrentChoiceId(startChoiceId);
        setAnimationState('in');
    }, [startChoiceId]);

    const handleSceneCompletion = (option?: ChoiceOption) => {
        const currentChoice = choices.find(c => c.id === currentChoiceId);
        if (!currentChoice) return;

        if (option) {
            let resolvedOutcomes = option.outcomes;
            if (option.sourceEntityId) {
                resolvedOutcomes = option.outcomes.map(outcome => {
                    if (outcome.type === 'update_entity') {
                        const newOutcome: ChoiceOutcomeUpdateEntity = {...outcome};
                        if (newOutcome.targetEntityId === '<chosen_entity>') newOutcome.targetEntityId = option.sourceEntityId!;
                        if (newOutcome.value === '<chosen_entity_id>') newOutcome.value = option.sourceEntityId!;
                        return newOutcome;
                    }
                    return outcome;
                });
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
                onExit(); // No next choice, exit gameplay
            }
        }, transitionDuration * 1000 + 100);
    };
    
    const currentChoice = useMemo(() => choices.find(c => c.id === currentChoiceId), [choices, currentChoiceId]);

    if (!currentChoiceId || !currentChoice) {
        return (
            <div className="flex items-center justify-center h-full bg-black">
                <p className="text-red-500">Error: Starting scene not found.</p>
                <button onClick={onExit} className="ml-4 text-white underline">Return to Menu</button>
            </div>
        );
    }
    
    return <ScenePresenter choice={currentChoice} onComplete={handleSceneCompletion} animationState={animationState} isFirstScene={currentChoiceId === startChoiceId} gameData={gameData} />;
};


// --- GAME LAUNCHER COMPONENT ---

const GameLauncher: React.FC<{gameData: GameData, onPlay: () => void, onBack: () => void}> = ({ gameData, onPlay, onBack }) => {
    const [activeMenu, setActiveMenu] = useState<'main' | 'news' | 'credits'>('main');
    const { menuSettings } = gameData;

    const MenuButton: React.FC<{ section: any; icon: React.ReactNode; label: string; }> = ({ section, icon, label }) => (
        <button onClick={() => setActiveMenu(section)} className={`flex items-center gap-3 w-full p-3 text-left rounded-md transition-colors text-[length:var(--font-size-sm)] ${activeMenu === section ? 'bg-[var(--text-accent)]/20 text-[var(--text-accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'}`}>
            {icon}
            <span>{label}</span>
        </button>
    );

    return (
        <div className="relative min-h-screen bg-black text-white flex">
            {menuSettings.backgroundImageBase64 && <div className="absolute inset-0 bg-cover bg-center anim-bg-kenburns-subtle" style={{ backgroundImage: `url(${menuSettings.backgroundImageBase64})`, animationDuration: '45s' }} />}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            
            <aside className="relative z-10 w-64 bg-[var(--bg-panel)]/30 p-4 flex flex-col space-y-2 border-r border-[var(--border-primary)]/50">
                <h1 className="text-2xl font-bold text-[var(--text-accent-bright)] tracking-wider px-2 py-4 text-center">{gameData.gameTitle}</h1>
                <MenuButton section="main" icon={<PlayIcon className="w-5 h-5" />} label="Play" />
                <MenuButton section="news" icon={<NewspaperIcon className="w-5 h-5" />} label="News & Updates" />
                <MenuButton section="credits" icon={<UserCircleIcon className="w-5 h-5" />} label="Credits" />
                <div className="!mt-auto">
                    <button onClick={onBack} className="flex items-center gap-3 w-full p-3 text-left rounded-md transition-colors text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] text-[length:var(--font-size-sm)]">
                        <ArrowLeftIcon className="w-5 h-5" />
                        <span>Back to Launcher</span>
                    </button>
                </div>
            </aside>

            <main className="relative z-10 flex-1 p-8 overflow-y-auto">
                {activeMenu === 'main' && (
                     <div className="text-center max-w-4xl mx-auto flex flex-col items-center h-full justify-center">
                        <h2 className="text-5xl font-extrabold text-white tracking-wider mb-4">{gameData.colonyName}</h2>
                        <div className="flex flex-wrap justify-center gap-2 mb-6">
                            {menuSettings.tags.map(tag => <span key={tag} className="bg-[var(--bg-panel-light)]/50 text-[var(--text-accent)] text-sm font-medium px-3 py-1 rounded-full">{tag}</span>)}
                        </div>
                        <p className="text-lg text-gray-200 leading-relaxed my-4 whitespace-pre-wrap">{menuSettings.description}</p>
                        <button onClick={onPlay} className="mt-8 bg-[var(--bg-active)] hover:opacity-90 text-[var(--text-on-accent)] font-bold py-4 px-16 rounded-full transition-all duration-300 transform hover:scale-105 text-xl tracking-wider shadow-lg shadow-cyan-500/20">
                            Start Simulation
                        </button>
                    </div>
                )}
                {activeMenu === 'news' && (
                    <div>
                        <h2 className="text-4xl font-bold text-[var(--text-accent-bright)] mb-8">News & Updates</h2>
                        <NewsDisplay news={menuSettings.news} />
                    </div>
                )}
                {activeMenu === 'credits' && (
                    <div>
                        <h2 className="text-4xl font-bold text-[var(--text-accent-bright)] mb-8">Credits</h2>
                        <div className="max-w-3xl bg-[var(--bg-panel)]/50 p-6 rounded-lg"><p className="text-gray-300 whitespace-pre-wrap">{menuSettings.credits}</p></div>
                    </div>
                )}
            </main>
        </div>
    );
};


// --- COMPANY LAUNCHER COMPONENT ---

const CompanyLauncher: React.FC<{settings: CompanyLauncherSettings, games: GameData[], onSelectGame: (gameId: string) => void}> = ({ settings, games, onSelectGame }) => {
    return (
        <div className="relative min-h-screen bg-black text-white flex flex-col">
            {settings.backgroundImageBase64 && <div className="absolute inset-0 bg-cover bg-center anim-bg-kenburns-subtle" style={{ backgroundImage: `url(${settings.backgroundImageBase64})` }} />}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

            <header className="relative z-10 p-4 text-center border-b border-[var(--border-primary)]/50">
                <h1 className="text-3xl font-bold text-[var(--text-accent-bright)] tracking-widest">{settings.companyName}</h1>
            </header>
            
            <div className="relative z-10 flex-1 flex">
                <main className="flex-1 p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 overflow-y-auto">
                    {games.map(game => (
                        <div key={game.id} className="bg-[var(--bg-panel)]/50 border border-[var(--border-secondary)] rounded-lg overflow-hidden flex flex-col group transform hover:-translate-y-1 transition-transform duration-300">
                            <div className="h-48 bg-cover bg-center" style={{backgroundImage: game.menuSettings.backgroundImageBase64 ? `url(${game.menuSettings.backgroundImageBase64})` : 'none', backgroundColor: '#111'}}></div>
                            <div className="p-4 flex flex-col flex-grow">
                                <h2 className="text-xl font-bold text-white">{game.gameTitle}</h2>
                                <p className="text-sm text-[var(--text-secondary)] mt-1">{game.colonyName}</p>
                                <button onClick={() => onSelectGame(game.id)} className="w-full mt-auto bg-[var(--bg-active)] hover:opacity-90 text-[var(--text-on-accent)] font-bold py-2 px-4 rounded-md transition-all duration-300 transform group-hover:scale-105">
                                    Launch
                                </button>
                            </div>
                        </div>
                    ))}
                </main>

                <aside className="w-96 bg-[var(--bg-panel)]/30 p-6 border-l border-[var(--border-primary)]/50 overflow-y-auto flex-shrink-0">
                    <h2 className="text-2xl font-bold text-[var(--text-accent-bright)] mb-6">Company News</h2>
                    <NewsDisplay news={settings.news} />
                </aside>
            </div>
        </div>
    );
};


// --- MAIN FLOW CONTROLLER ---

type LauncherFlowView = 'company_launcher' | 'game_launcher' | 'gameplay';

interface LauncherFlowProps {
  projectData: PhoenixProject;
  onChoiceMade: (gameId: string, outcomes: ChoiceOutcome[]) => void;
}

export const MegaWattGame: React.FC<LauncherFlowProps> = ({ projectData, onChoiceMade }) => {
    const [currentView, setCurrentView] = useState<LauncherFlowView>('company_launcher');
    const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

    const selectedGame = useMemo(() => {
        if (!selectedGameId) return null;
        return projectData.games.find(g => g.id === selectedGameId) || null;
    }, [selectedGameId, projectData.games]);

    const handleSelectGame = (gameId: string) => {
        setSelectedGameId(gameId);
        setCurrentView('game_launcher');
    };

    const handlePlayGame = () => {
        if (selectedGame) setCurrentView('gameplay');
    };

    const handleExitGame = () => {
        setCurrentView('game_launcher');
    };
    
    const handleBackToCompanyLauncher = () => {
        setSelectedGameId(null);
        setCurrentView('company_launcher');
    };

    switch (currentView) {
        case 'game_launcher':
            if (selectedGame) return <GameLauncher gameData={selectedGame} onPlay={handlePlayGame} onBack={handleBackToCompanyLauncher} />;
            setCurrentView('company_launcher'); return null; // Fallback
        case 'gameplay':
            if (selectedGame) return <GamePlayer gameData={selectedGame} onExit={handleExitGame} onChoiceMade={(outcomes) => onChoiceMade(selectedGame.id, outcomes)} />;
            setCurrentView('company_launcher'); return null; // Fallback
        case 'company_launcher':
        default:
            return <CompanyLauncher settings={projectData.launcherSettings} games={projectData.games} onSelectGame={handleSelectGame} />;
    }
};

// --- GLOBAL STYLES ---

const style = document.createElement('style');
style.innerHTML = `
.bg-grid { background-image: linear-gradient(var(--grid-bg-color) 1px, transparent 1px), linear-gradient(to right, var(--grid-bg-color) 1px, transparent 1px); background-size: 2rem 2rem; }
.prose-invert a { color: var(--text-accent); } .prose-invert a:hover { color: var(--text-accent-bright); } .prose-invert strong { color: var(--text-primary); } .prose-invert em { color: var(--text-primary); } .prose-invert ul > li::before { background-color: var(--text-secondary); }
/* Background Animations */
@keyframes kenburns-normal { 0% { transform: scale(1.0) translate(0, 0); } 100% { transform: scale(1.1) translate(-1%, 2%); } }
@keyframes kenburns-subtle { 0% { transform: scale(1.0) translate(0, 0); } 100% { transform: scale(1.03) translate(0, 0); } }
.anim-bg-kenburns-normal { animation: kenburns-normal ease-out forwards; } .anim-bg-kenburns-subtle { animation: kenburns-subtle ease-out forwards; }
/* Text Animations */
@keyframes text-fade-in { 0% { opacity: 0; } 100% { opacity: 1; } } @keyframes text-rise-up { 0% { opacity: 0; transform: translateY(30px); } 100% { opacity: 1; transform: translateY(0); } }
.text-anim-fade-in { animation-name: text-fade-in; animation-timing-function: ease-in-out; animation-fill-mode: forwards; opacity: 0; }
.text-anim-rise-up { animation-name: text-rise-up; animation-timing-function: ease-out; animation-fill-mode: forwards; opacity: 0; }
/* Card Transitions */
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } } @keyframes fade-out { from { opacity: 1; } to { opacity: 0; } }
.card-transition-fade-in { animation: fade-in ease-in forwards; } .card-transition-fade-out { animation: fade-out ease-out forwards; }
@keyframes slide-left-in { from { transform: translateX(100%); } to { transform: translateX(0); } } @keyframes slide-left-out { from { transform: translateX(0); } to { transform: translateX(-100%); } }
.card-transition-slide-left-in { animation: slide-left-in ease-out forwards; } .card-transition-slide-left-out { animation: slide-left-out ease-in forwards; }
/* Add other animation keyframes and classes as needed */
`;
document.head.appendChild(style);
