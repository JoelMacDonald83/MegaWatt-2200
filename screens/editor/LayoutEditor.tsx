
import React, { useState, useMemo } from 'react';
import type { Layout, LayoutRegion, ImageCredit, GameMenuContentComponent, GridTrack, LayoutRegionStyle } from '../../types';
import { CollapsibleSection } from '../../components/CollapsibleSection';
import { HelpTooltip } from '../../components/HelpTooltip';
import { ImageInput } from '../../components/editor/ImageInput';
import { StyleSelect } from '../../components/editor/StyleComponents';
import { TrashIcon } from '../../components/icons/TrashIcon';
import { PlusIcon } from '../../components/icons/PlusIcon';
import { ComputerDesktopIcon } from '../../components/icons/ComputerDesktopIcon';
import { DeviceTabletIcon } from '../../components/icons/DeviceTabletIcon';
import { DevicePhoneMobileIcon } from '../../components/icons/DevicePhoneMobileIcon';
import { PencilIcon } from '../../components/icons/PencilIcon';
import { Bars3BottomLeftIcon } from '../../components/icons/Bars3BottomLeftIcon';
import { TagIcon } from '../../components/icons/TagIcon';
import { PlayIcon } from '../../components/icons/PlayIcon';
import { Bars3Icon } from '../../components/icons/Bars3Icon';
import { NewspaperIcon } from '../../components/icons/NewspaperIcon';
import { UserCircleIcon } from '../../components/icons/UserCircleIcon';

interface LayoutEditorProps {
    initialLayout: Layout;
    onSave: (layout: Layout) => void;
    onCancel: () => void;
}

const gridTracksToString = (tracks?: GridTrack[]): string => {
    if (!tracks || tracks.length === 0) return 'none';
    return tracks.map(track => track.unit === 'auto' ? 'auto' : `${track.size}${track.unit}`).join(' ');
}

const ColorInput: React.FC<{ label: string; value: string; onChange: (color: string) => void; help?: string; }> = ({ label, value, onChange, help }) => (
    <div>
        <div className="flex items-center gap-2 mb-1">
            <label className="block text-xs font-medium text-[var(--text-secondary)]">{label}</label>
            {help && <HelpTooltip title={label} content={help} />}
        </div>
        <div className="flex items-center bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md">
            <input type="color" value={value.slice(0, 7)} onChange={e => onChange(e.target.value)} className="p-0 border-none bg-transparent h-8 w-8 rounded-l-md cursor-pointer" />
            <input type="text" value={value} onChange={e => onChange(e.target.value)} className="w-full bg-transparent p-2 text-sm focus:outline-none" placeholder="#RRGGBBAA" />
        </div>
    </div>
);

const GridTrackEditor: React.FC<{
    tracks: GridTrack[];
    onChange: (tracks: GridTrack[]) => void;
    type: 'Columns' | 'Rows';
}> = ({ tracks, onChange, type }) => {
    const handleUpdate = (index: number, field: keyof GridTrack, value: any) => {
        const newTracks = [...tracks];
        newTracks[index] = { ...newTracks[index], [field]: value };
        onChange(newTracks);
    };

    const handleAdd = () => onChange([...tracks, { size: 1, unit: 'fr' }]);
    const handleRemove = (index: number) => onChange(tracks.filter((_, i) => i !== index));

    return (
        <div>
            <div className="flex items-center gap-2 mb-1">
                <label className="block text-xs font-medium text-[var(--text-secondary)]">{type}</label>
                <HelpTooltip title={`Grid ${type}`} content={`Define the size and number of ${type.toLowerCase()} for your layout grid. 'fr' (fractional) units are flexible and share available space, while 'px' (pixels) and '%' are fixed sizes. 'auto' makes the track just big enough for its content.`} />
            </div>
            <div className="space-y-2">
                {tracks.map((track, index) => (
                    <div key={index} className="grid grid-cols-[1fr_80px_auto] gap-2 items-center">
                        <input type="number" value={track.size} onChange={e => handleUpdate(index, 'size', e.target.valueAsNumber)} disabled={track.unit === 'auto'} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-1.5 text-sm disabled:opacity-50" />
                        <select value={track.unit} onChange={e => handleUpdate(index, 'unit', e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-1.5 text-sm">
                            <option value="fr">fr</option><option value="px">px</option><option value="%">%</option><option value="auto">auto</option>
                        </select>
                        <button onClick={() => handleRemove(index)} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-danger)]"><TrashIcon className="w-4 h-4" /></button>
                    </div>
                ))}
            </div>
            <button onClick={handleAdd} className="w-full mt-2 text-xs flex items-center justify-center gap-1 bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] p-1.5 rounded">
                <PlusIcon className="w-3 h-3"/> Add {type === 'Columns' ? 'Column' : 'Row'}
            </button>
        </div>
    );
};

const componentMap: Record<GameMenuContentComponent, { name: string; icon: React.ReactNode }> = {
    title: { name: 'Game Title', icon: <PencilIcon/> },
    description: { name: 'Description', icon: <Bars3BottomLeftIcon/> },
    tags: { name: 'Tags', icon: <TagIcon/> },
    play_button: { name: 'Play Button', icon: <PlayIcon/> },
    menu_buttons: { name: 'Menu Buttons', icon: <Bars3Icon/> },
    news: { name: 'News Feed', icon: <NewspaperIcon/> },
    credits: { name: 'Credits', icon: <UserCircleIcon/> },
};

export const LayoutEditor: React.FC<LayoutEditorProps> = ({ initialLayout, onSave, onCancel }) => {
    const [layout, setLayout] = useState<Layout>(initialLayout);
    const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
    const [previewSize, setPreviewSize] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

    const selectedRegion = useMemo(() => layout.regions.find(r => r.id === selectedRegionId), [layout.regions, selectedRegionId]);

    const handleLayoutChange = (field: keyof Layout, value: any) => setLayout(prev => ({ ...prev, [field]: value }));
    const handleAddRegion = () => {
        const num = layout.regions.length + 1;
        const newRegion: LayoutRegion = {
            id: `region_${Date.now()}`, name: `Region ${num}`, gridArea: `region${num}`, style: {}, contains: [],
        };
        setLayout(prev => ({ ...prev, regions: [...prev.regions, newRegion] }));
        setSelectedRegionId(newRegion.id);
    };
    const handleRemoveRegion = (regionId: string) => {
        setLayout(prev => ({ ...prev, regions: prev.regions.filter(r => r.id !== regionId) }));
        if (selectedRegionId === regionId) setSelectedRegionId(null);
    };
    const handleRegionChange = (regionId: string, field: keyof LayoutRegion, value: any) => setLayout(prev => ({...prev, regions: prev.regions.map(r => r.id === regionId ? { ...r, [field]: value } : r)}));
    const handleRegionStyleChange = (regionId: string, field: keyof LayoutRegionStyle, value: any) => setLayout(prev => ({...prev, regions: prev.regions.map(r => r.id === regionId ? { ...r, style: { ...r.style, [field]: value }} : r)}));
    
    const handlePreset = (preset: 'simple' | 'sidebar-left' | 'header-footer') => {
        let newLayout: Layout = {...layout};
        if (preset === 'simple') {
            newLayout = {
                ...newLayout,
                gridColumns: [{ size: 1, unit: 'fr' }],
                gridRows: [{ size: 1, unit: 'fr' }],
                gridTemplateAreas: '"main"',
                regions: [{ id: 'r_main', name: 'Main Content', gridArea: 'main', style: { justifyContent: 'center', alignItems: 'center' }, contains: ['title', 'description', 'play_button'] }]
            }
        } else if (preset === 'sidebar-left') {
             newLayout = {
                ...newLayout,
                gridColumns: [{ size: 250, unit: 'px' }, { size: 1, unit: 'fr' }],
                gridRows: [{ size: 1, unit: 'fr' }],
                gridTemplateAreas: '"sidebar main"',
                regions: [
                    { id: 'r_sidebar', name: 'Sidebar', gridArea: 'sidebar', style: { padding: 20 }, contains: ['title', 'tags', 'menu_buttons'] },
                    { id: 'r_main', name: 'Main Content', gridArea: 'main', style: { padding: 20 }, contains: ['description', 'play_button', 'news'] }
                ]
            }
        } else if (preset === 'header-footer') {
            newLayout = {
                ...newLayout,
                gridColumns: [{ size: 1, unit: 'fr' }],
                gridRows: [{ size: 100, unit: 'px' }, { size: 1, unit: 'fr' }, { size: 60, unit: 'px' }],
                gridTemplateAreas: '"header"\n"main"\n"footer"',
                regions: [
                    { id: 'r_header', name: 'Header', gridArea: 'header', style: { alignItems: 'center', padding: 20 }, contains: ['title'] },
                    { id: 'r_main', name: 'Main Content', gridArea: 'main', style: { padding: 20 }, contains: ['description', 'play_button', 'news'] },
                    { id: 'r_footer', name: 'Footer', gridArea: 'footer', style: { alignItems: 'center', justifyContent: 'center' }, contains: ['credits'] }
                ]
            }
        }
        setLayout(newLayout);
    };

    const dynamicGridStyles: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: gridTracksToString(layout.gridColumns),
        gridTemplateRows: gridTracksToString(layout.gridRows),
        gridTemplateAreas: layout.gridTemplateAreas,
        gap: layout.gap ? `${layout.gap}px` : undefined,
        backgroundColor: layout.backgroundColor,
        position: 'relative',
        height: '100%', width: '100%',
    };

    const previewSizeClass = {
        desktop: 'w-full h-full max-w-full max-h-full',
        tablet: 'w-[768px] h-[1024px] max-w-full max-h-full',
        mobile: 'w-[375px] h-[667px] max-w-full max-h-full'
    }[previewSize];

    return (
        <div className="flex-1 flex h-full text-sm">
            {/* Left Panel: Properties */}
            <aside className="w-[350px] bg-[var(--bg-panel)] border-r border-[var(--border-primary)] flex flex-col">
                <header className="p-4 border-b border-[var(--border-primary)]">
                    <input type="text" value={layout.name} onChange={e => handleLayoutChange('name', e.target.value)} className="w-full bg-transparent text-xl font-bold text-[var(--text-accent)] focus:outline-none" />
                </header>
                <div className="flex-grow overflow-y-auto p-4 space-y-4">
                     <CollapsibleSection title="Layout Presets">
                        <HelpTooltip title="Layout Presets" content="Get started quickly by choosing a common layout structure. This will automatically set up the grid and create some basic regions for you." />
                        <div className="grid grid-cols-1 gap-2 mt-2">
                           <button onClick={() => handlePreset('simple')} className="text-left p-2 rounded bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)]">Simple Landing</button>
                           <button onClick={() => handlePreset('sidebar-left')} className="text-left p-2 rounded bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)]">Sidebar Left</button>
                           <button onClick={() => handlePreset('header-footer')} className="text-left p-2 rounded bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)]">Header & Footer</button>
                        </div>
                    </CollapsibleSection>
                    <CollapsibleSection title="Grid Structure">
                        <GridTrackEditor tracks={layout.gridColumns || []} onChange={v => handleLayoutChange('gridColumns', v)} type="Columns" />
                        <GridTrackEditor tracks={layout.gridRows || []} onChange={v => handleLayoutChange('gridRows', v)} type="Rows" />
                        <div>
                             <div className="flex items-center gap-2 mb-1">
                                <label className="block text-xs font-medium text-[var(--text-secondary)]">Areas</label>
                                <HelpTooltip title="Grid Template Areas" content={'Define the layout using region names. Each name must correspond to a region\'s "Grid Area Name".\n\n- Each line in quotes is a row.\n- Names separated by spaces are columns.\n- Use a period `.` for an empty cell.\n\nExample:\n"header header"\n"sidebar main"\n"sidebar ."'}/>
                            </div>
                            <textarea value={layout.gridTemplateAreas || ''} onChange={e => handleLayoutChange('gridTemplateAreas', e.target.value)} rows={3} placeholder={'"header" "main" "footer"'} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2 text-xs font-mono" />
                        </div>
                         <div>
                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Gap (px)</label>
                            <input type="number" value={layout.gap || 0} onChange={e => handleLayoutChange('gap', e.target.valueAsNumber)} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2 text-sm" />
                        </div>
                    </CollapsibleSection>
                    <CollapsibleSection title="Page Background">
                         <ColorInput label="Background Color" value={layout.backgroundColor || '#111827'} onChange={val => handleLayoutChange('backgroundColor', val)} help="A solid color for the page background. This will be visible if no background image is set, or if the image doesn't cover the whole screen."/>
                         <ColorInput label="Overlay Color" value={layout.overlayColor || 'rgba(0,0,0,0.5)'} onChange={val => handleLayoutChange('overlayColor', val)} help="A semi-transparent color layer placed on top of the background image. Useful for improving text readability." />
                         <ImageInput 
                            src={layout.backgroundImageSrc} credit={layout.backgroundImageCredit} style={layout.backgroundImageStyle}
                            onUpdate={(updates) => setLayout(p => ({...p, backgroundImageSrc: updates.src, backgroundImageCredit: updates.credit, backgroundImageStyle: updates.style, }))}
                            onGenerateImage={() => {alert("AI Image Generation is not available for Layout backgrounds at this time.")}}
                            isGeneratingImage={false} showPrompt={false}
                         />
                    </CollapsibleSection>
                     <CollapsibleSection title="Regions">
                        <HelpTooltip title="Regions" content="Regions are the containers for your content, positioned by the Grid Areas you defined. Select a region here to edit its properties in the right-hand panel." />
                        <div className="space-y-2 mt-2">
                        {layout.regions.map(region => (
                            <div key={region.id} className={`p-2 rounded-md flex justify-between items-center cursor-pointer ${selectedRegionId === region.id ? 'bg-[var(--bg-active)]/20' : 'bg-[var(--bg-input)] hover:bg-[var(--bg-hover)]'}`} onClick={() => setSelectedRegionId(region.id)}>
                                <span className={selectedRegionId === region.id ? 'text-[var(--text-accent)]' : ''}>{region.name}</span>
                                <button onClick={(e) => { e.stopPropagation(); handleRemoveRegion(region.id); }} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-danger)]"><TrashIcon className="w-4 h-4" /></button>
                            </div>
                        ))}
                        </div>
                        <button onClick={handleAddRegion} className="w-full mt-3 flex items-center justify-center gap-2 bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-bold py-2 px-4 rounded transition duration-300">
                            <PlusIcon className="w-4 h-4" /> Add Region
                        </button>
                    </CollapsibleSection>
                </div>
            </aside>

            {/* Center Panel: Visual Preview */}
            <main className="flex-1 flex flex-col bg-black/20 p-4">
                 <div className="flex-shrink-0 flex items-center justify-center gap-2 mb-4">
                    <button onClick={() => setPreviewSize('desktop')} className={`p-2 rounded ${previewSize === 'desktop' ? 'text-[var(--text-accent)]' : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-panel)]'}`}><ComputerDesktopIcon className="w-5 h-5"/></button>
                    <button onClick={() => setPreviewSize('tablet')} className={`p-2 rounded ${previewSize === 'tablet' ? 'text-[var(--text-accent)]' : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-panel)]'}`}><DeviceTabletIcon className="w-5 h-5"/></button>
                    <button onClick={() => setPreviewSize('mobile')} className={`p-2 rounded ${previewSize === 'mobile' ? 'text-[var(--text-accent)]' : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-panel)]'}`}><DevicePhoneMobileIcon className="w-5 h-5"/></button>
                 </div>
                 <div className="flex-1 relative flex items-center justify-center overflow-auto" style={{ background: 'repeating-conic-gradient(var(--bg-panel-light) 0% 25%, var(--bg-panel) 0% 50%) top left / 1rem 1rem'}}>
                    <div className={`relative shadow-2xl transition-all duration-300 ${previewSizeClass}`}>
                        <div style={dynamicGridStyles}>
                            {layout.backgroundImageSrc && <img src={layout.backgroundImageSrc} alt="background" className="absolute inset-0 w-full h-full object-cover" style={layout.backgroundImageStyle} />}
                            {layout.overlayColor && <div className="absolute inset-0" style={{backgroundColor: layout.overlayColor}} />}
                            {layout.regions.map(region => (
                                <div key={region.id} style={{ gridArea: region.gridArea, backgroundColor: region.style.backgroundColor, padding: region.style.padding ? `${region.style.padding}px` : undefined, borderRadius: region.style.borderRadius ? `${region.style.borderRadius}px` : undefined, display: 'flex', justifyContent: region.style.justifyContent, alignItems: region.style.alignItems, flexDirection: region.style.flexDirection, gap: region.style.gap ? `${region.style.gap}px` : undefined }} 
                                    className={`border-2 transition-colors outline-none ${selectedRegionId === region.id ? 'border-[var(--text-accent)]' : 'border-dashed border-white/10'}`}
                                    onClick={() => setSelectedRegionId(region.id)}
                                >
                                    <div className="flex flex-col gap-2 items-center justify-center w-full h-full overflow-hidden">
                                        {(region.contains && region.contains.length > 0) ? region.contains.map(c => (
                                            <div key={c} className="flex items-center gap-2 text-xs bg-white/5 text-white/50 p-1.5 rounded-md">
                                                <span className="w-4 h-4">{componentMap[c].icon}</span>
                                                <span>{componentMap[c].name}</span>
                                            </div>
                                        )) : <span className="text-xs text-white/30">(Empty)</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                 </div>
                 <footer className="p-4 flex-shrink-0 flex justify-end space-x-3 border-t border-[var(--border-primary)] bg-[var(--bg-panel)]/50 -m-4 mt-4">
                    <button onClick={onCancel} className="px-4 py-2 rounded-md bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-semibold transition-colors">Cancel</button>
                    <button onClick={() => onSave(layout)} className="px-4 py-2 rounded-md bg-[var(--bg-active)] hover:opacity-90 text-[var(--text-on-accent)] font-semibold transition-colors">Save Layout</button>
                </footer>
            </main>

            {/* Right Panel: Selected Region Styles */}
            <aside className="w-80 bg-[var(--bg-panel)] border-l border-[var(--border-primary)] flex flex-col">
                {!selectedRegion ? (
                     <div className="m-auto text-center text-[var(--text-tertiary)] px-4">Select a region in the list or in the preview to edit its properties.</div>
                ) : (
                    <>
                        <header className="p-4 border-b border-[var(--border-primary)] flex-shrink-0">
                            <h3 className="text-lg font-bold text-[var(--text-primary)]">Editing: {selectedRegion.name}</h3>
                        </header>
                        <div className="overflow-y-auto p-4 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Region Name</label>
                                <input type="text" value={selectedRegion.name} onChange={e => handleRegionChange(selectedRegion.id, 'name', e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2 text-sm" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <label className="block text-xs font-medium text-[var(--text-secondary)]">Grid Area Name</label>
                                    <HelpTooltip title="Grid Area Name" content="This name MUST match one of the names used in the 'Grid Template Areas' definition to position this region correctly." />
                                </div>
                                <input type="text" value={selectedRegion.gridArea} onChange={e => handleRegionChange(selectedRegion.id, 'gridArea', e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2 text-sm" />
                            </div>

                            <CollapsibleSection title="Component Library">
                                 <HelpTooltip title="Component Library" content="Select which pieces of the game menu content should appear inside this region." />
                                 <div className="space-y-2 mt-2">
                                    {Object.entries(componentMap).map(([key, {name, icon}]) => (
                                        <label key={key} className="flex items-center gap-2 p-2 rounded-md hover:bg-[var(--bg-hover)] cursor-pointer">
                                            <input type="checkbox"
                                                checked={selectedRegion.contains.includes(key as GameMenuContentComponent)}
                                                onChange={e => {
                                                    const current = selectedRegion.contains;
                                                    const newContains = e.target.checked
                                                        ? [...current, key as GameMenuContentComponent]
                                                        : current.filter(c => c !== key);
                                                    handleRegionChange(selectedRegion.id, 'contains', newContains);
                                                }}
                                                className="h-4 w-4 rounded bg-[var(--bg-input)] border-[var(--border-secondary)] text-[var(--bg-active)] focus:ring-[var(--border-accent)]"
                                            />
                                            <span className="w-4 h-4 text-[var(--text-secondary)]">{icon}</span>
                                            <span>{name}</span>
                                        </label>
                                    ))}
                                 </div>
                            </CollapsibleSection>

                            <CollapsibleSection title="Styling">
                                <ColorInput label="Background Color" value={selectedRegion.style.backgroundColor || ''} onChange={val => handleRegionStyleChange(selectedRegion.id, 'backgroundColor', val)} />
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Padding (px)</label><input type="number" value={selectedRegion.style.padding || 0} onChange={e => handleRegionStyleChange(selectedRegion.id, 'padding', e.target.valueAsNumber)} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2 text-sm" /></div>
                                    <div><label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Radius (px)</label><input type="number" value={selectedRegion.style.borderRadius || 0} onChange={e => handleRegionStyleChange(selectedRegion.id, 'borderRadius', e.target.valueAsNumber)} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2 text-sm" /></div>
                                </div>
                            </CollapsibleSection>
                            <CollapsibleSection title="Flexbox Layout">
                                <HelpTooltip title="Flexbox Layout" content="These controls determine how multiple components inside this region are arranged (e.g., stacked vertically, centered, spaced apart)." />
                                <StyleSelect label="Direction" value={selectedRegion.style.flexDirection || 'column'} onChange={e => handleRegionStyleChange(selectedRegion.id, 'flexDirection', e.target.value)}><option value="column">Column</option><option value="row">Row</option></StyleSelect>
                                <StyleSelect label="Justify Content" value={selectedRegion.style.justifyContent || 'flex-start'} onChange={e => handleRegionStyleChange(selectedRegion.id, 'justifyContent', e.target.value)}><option value="flex-start">Start</option><option value="center">Center</option><option value="flex-end">End</option><option value="space-between">Space Between</option><option value="space-around">Space Around</option></StyleSelect>
                                <StyleSelect label="Align Items" value={selectedRegion.style.alignItems || 'stretch'} onChange={e => handleRegionStyleChange(selectedRegion.id, 'alignItems', e.target.value)}><option value="stretch">Stretch</option><option value="flex-start">Start</option><option value="center">Center</option><option value="flex-end">End</option></StyleSelect>
                                <div><label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Gap (px)</label><input type="number" value={selectedRegion.style.gap || 0} onChange={e => handleRegionStyleChange(selectedRegion.id, 'gap', e.target.valueAsNumber)} className="w-full bg-[var(--bg-input)] border border-[var(--border-secondary)] rounded-md p-2 text-sm" /></div>
                            </CollapsibleSection>
                        </div>
                    </>
                )}
            </aside>
        </div>
    );
};
