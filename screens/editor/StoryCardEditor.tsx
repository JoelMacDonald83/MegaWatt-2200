
import React, { useState, useMemo, useRef } from 'react';
import type { StoryCard, PlayerChoice } from '../../types';
import { StyleSelect, StyleNumberInput, StyleRadio } from '../../components/editor/StyleComponents';

interface StoryCardEditorProps {
    initialCard: StoryCard;
    onSave: (c: StoryCard) => void;
    onCancel: () => void;
    onGenerateImage: (prompt: string, onUpdate: (base64: string) => void) => void;
    isGenerating: boolean;
    isNew: boolean;
    choices?: PlayerChoice[];
    isChoiceCard?: boolean;
}


export const StoryCardEditor: React.FC<StoryCardEditorProps> = ({ initialCard, onSave, onCancel, onGenerateImage, isGenerating, isNew, choices, isChoiceCard = false }) => {
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
    
    const styles = useMemo(() => {
        const s = localCard.styles || {};
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
            cardTransition: s.cardTransition || 'fade',
            cardTransitionDuration: s.cardTransitionDuration || 0.6,
            textAnimation: s.textAnimation || 'fade-in',
            textAnimationDuration: s.textAnimationDuration || 1,
            textAnimationDelay: s.textAnimationDelay || 0.5,
            borderWidth: s.borderWidth || 'none',
            borderColor: s.borderColor || 'cyan-500',
            fg: {
                position: fgs.position || 'center',
                size: fgs.size || 'medium',
                animation: fgs.animation || 'fade-in',
                animationDuration: fgs.animationDuration || 1,
                animationDelay: fgs.animationDelay || 1,
            }
        }
    }, [localCard.styles]);

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

    const previewFgAnimationClass = `anim-fg-${styles.fg.animation}`;
    const previewFgAnimationStyle = {
        animationDuration: `${styles.fg.animationDuration}s`,
        animationDelay: `${styles.fg.animationDelay}s`,
    };
    const previewFgAnimationKey = `fg-anim-key-${styles.fg.animation}-${styles.fg.animationDuration}-${styles.fg.animationDelay}`;


    return (
        <div className="flex-1 flex flex-col bg-gray-800">
            <header className="p-4 border-b border-gray-700">
                <h2 className="text-xl font-bold text-cyan-300">{isNew ? (isChoiceCard ? 'Creating New Choice Card' : 'Creating New Story Card') : `Editing Card`}</h2>
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
                        
                         {/* Card Styles */}
                        {isChoiceCard && (
                          <div className="grid grid-cols-2 gap-2">
                            <StyleSelect label="Border Width" value={styles.borderWidth} onChange={e => updateStyle('borderWidth', e.target.value)}><option value="none">None</option><option value="sm">Small</option><option value="md">Medium</option><option value="lg">Large</option></StyleSelect>
                             <input type="text" value={styles.borderColor} onChange={e => updateStyle('borderColor', e.target.value)} className="self-end bg-gray-900 border border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm" placeholder="e.g. cyan-500"/>
                          </div>
                        )}
                        
                        {/* Animations */}
                        <div className="grid grid-cols-[2fr_1fr] gap-2"><StyleSelect wrapperClassName="col-span-2" label="Background Animation" value={styles.backgroundAnimation} onChange={e => updateStyle('backgroundAnimation', e.target.value)}><option value="kenburns-normal">Ken Burns Normal</option><option value="kenburns-subtle">Ken Burns Subtle</option><option value="pan-left">Pan Left</option><option value="pan-right">Pan Right</option><option value="zoom-out">Zoom Out</option><option value="none">None</option></StyleSelect><StyleNumberInput wrapperClassName="col-span-2" label="Duration (s)" value={styles.backgroundAnimationDuration} onChange={e => updateStyle('backgroundAnimationDuration', e.target.valueAsNumber)} /></div>
                        {!isChoiceCard && <div className="grid grid-cols-[2fr_1fr] gap-2"><StyleSelect wrapperClassName="col-span-2" label="Card Transition" value={styles.cardTransition} onChange={e => updateStyle('cardTransition', e.target.value)}><option value="fade">Fade</option><option value="dissolve">Dissolve</option><option value="slide-left">Slide Left</option><option value="slide-up">Slide Up</option><option value="zoom-in">Zoom In</option></StyleSelect><StyleNumberInput wrapperClassName="col-span-2" label="Duration (s)" value={styles.cardTransitionDuration} onChange={e => updateStyle('cardTransitionDuration', e.target.valueAsNumber)} /></div>}
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
                
                 {choices && !isChoiceCard && (
                    <fieldset className="space-y-4 pt-4 border-t border-gray-700">
                        <legend className="text-lg font-semibold text-gray-300 px-1">Player Choice</legend>
                        <StyleSelect label="Link to Choice" value={localCard.choiceId} onChange={e => setLocalCard(p => ({ ...p, choiceId: e.target.value || undefined }))}>
                            <option value="">-- No Choice --</option>
                            {choices.map(choice => (
                                <option key={choice.id} value={choice.id}>{choice.name}</option>
                            ))}
                        </StyleSelect>
                    </fieldset>
                 )}


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
                                    <img 
                                        key={previewFgAnimationKey}
                                        src={localCard.foregroundImageBase64} 
                                        className={`object-contain ${previewFgSizeClass} max-h-full ${previewFgAnimationClass}`}
                                        style={previewFgAnimationStyle}
                                        alt="Foreground Preview"/>
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
