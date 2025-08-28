
import React, { useMemo, useState, useEffect } from 'react';
import type { GameData, Entity, Template, StoryCard } from '../types';

interface MegaWattGameProps {
  gameData: GameData;
}

const EntityCard: React.FC<{ 
    entity: Entity; 
    template: Template;
    entityMap: Map<string, Entity>;
}> = ({ entity, template, entityMap }) => (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6 shadow-lg transform hover:-translate-y-1 transition-transform duration-300 flex flex-col">
        <h3 className="text-xl font-bold text-cyan-300 mb-4">{entity.name}</h3>
        <div className="space-y-3 text-sm flex-grow">
        {template.attributes.map(attr => {
            const value = entity.attributeValues[attr.id];
            if (!value) return null;

            let displayValue: React.ReactNode = value;

            if (attr.type === 'entity_reference' && typeof value === 'string') {
                displayValue = entityMap.get(value)?.name || <span className="text-gray-500 italic">Unknown Reference</span>;
            } else if (typeof value === 'string' && value.length > 150) {
                 displayValue = <p className="text-gray-400 whitespace-pre-wrap">{value}</p>;
            } else {
                 displayValue = <span className="text-gray-200">{String(value)}</span>
            }

            return (
                <div key={attr.id} className="grid grid-cols-3 gap-2">
                    <span className="text-gray-500 font-semibold col-span-1">{attr.name}</span>
                    <div className="col-span-2">{displayValue}</div>
                </div>
            )
        })}
        </div>
    </div>
);

const IntroCard: React.FC<{ card: StoryCard; onContinue: () => void; animationState: 'in' | 'out'; isFirstCard: boolean }> = ({ card, onContinue, animationState, isFirstCard }) => {
    const styles = useMemo(() => {
        const s = card.styles || {};
        const fgs = s.foregroundImageStyles || {};
        return {
            textPosition: s.textPosition || 'bottom',
            textAlign: s.textAlign || 'center',
            textColor: s.textColor || 'light',
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
    const textColorClass = styles.textColor === 'light' ? 'text-white' : 'text-gray-900';
    const textShadowClass = styles.textColor === 'light' ? 'shadow-black [text-shadow:0_2px_10px_var(--tw-shadow-color)]' : 'shadow-white/50 [text-shadow:0_2px_10px_var(--tw-shadow-color)]';
    const overlayClass = { none: '', light: 'bg-gradient-to-t from-black/40 via-black/20 to-transparent', medium: 'bg-gradient-to-t from-black/80 via-black/50 to-transparent', heavy: 'bg-gradient-to-t from-black/95 via-black/70 to-black/20' }[styles.overlayStrength];
    const backgroundEffectClass = { none: '', blur: 'blur-md', darken: 'brightness-75' }[styles.backgroundEffect];
    const fontFamilyClass = { sans: 'font-sans', serif: 'font-serif', mono: 'font-mono' }[styles.fontFamily];
    const fontSizeClass = { normal: 'text-xl md:text-3xl lg:text-4xl', large: 'text-2xl md:text-4xl lg:text-5xl', xlarge: 'text-3xl md:text-5xl lg:text-6xl' }[styles.fontSize];
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
                    <button
                        onClick={onContinue}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-12 rounded-full transition-all duration-300 transform hover:scale-105 text-lg"
                    >
                        Continue
                    </button>
                </div>
            </div>
        </div>
    );
};


export const MegaWattGame: React.FC<MegaWattGameProps> = ({ gameData }) => {
    const { templates, entities, colonyName, story } = gameData;
    const [introStep, setIntroStep] = useState(story && story.length > 0 ? 0 : -1);
    const [animationState, setAnimationState] = useState<'in' | 'out'>('in');

    const handleIntroContinue = () => {
        const transitionDuration = story[introStep]?.styles?.cardTransitionDuration || 0.6;
        setAnimationState('out');
        setTimeout(() => {
            const nextStep = introStep + 1;
            if (nextStep < story.length) {
                setIntroStep(nextStep);
                setAnimationState('in');
            } else {
                setIntroStep(-1); // End of intro
            }
        }, transitionDuration * 1000 + 100); // Must be slightly longer than CSS animation duration
    };

    const entityMap = useMemo(() => {
        return new Map(entities.map(e => [e.id, e]));
    }, [entities]);

    const entitiesByTemplate = useMemo(() => {
        const grouped = new Map<string, Entity[]>();
        entities.forEach(entity => {
            const group = grouped.get(entity.templateId) || [];
            group.push(entity);
            grouped.set(entity.templateId, group);
        });
        return grouped;
    }, [entities]);

    if (introStep !== -1) {
        const currentCard = story[introStep];
        if (!currentCard) return null; // Should not happen
        return <IntroCard card={currentCard} onContinue={handleIntroContinue} animationState={animationState} isFirstCard={introStep === 0} />;
    }

    return (
        <div className="min-h-screen bg-gray-900 bg-grid-cyan-500/10 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="text-center mb-12">
                    <h1 className="text-5xl font-extrabold text-white tracking-wider">
                        Welcome to <span className="text-cyan-400">{colonyName || "The Colony"}</span>
                    </h1>
                    <p className="text-gray-400 mt-2">An interactive colony simulation.</p>
                </header>
                
                <main className="space-y-12">
                    {templates.map(template => {
                        const templateEntities = entitiesByTemplate.get(template.id) || [];
                        if (templateEntities.length === 0) return null;
                        
                        return (
                            <section key={template.id}>
                                <h2 className="text-3xl font-bold text-teal-300 border-b-2 border-teal-500/30 pb-2 mb-6">{template.name}s</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {templateEntities.map(entity => (
                                        <EntityCard key={entity.id} entity={entity} template={template} entityMap={entityMap} />
                                    ))}
                                </div>
                            </section>
                        )
                    })}

                    {entities.length === 0 && (
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