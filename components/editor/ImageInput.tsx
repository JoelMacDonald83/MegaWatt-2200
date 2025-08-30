
import React, { useState } from 'react';
import { ImageCredit, ImageStyle } from '../../types';
import { CollapsibleSection } from '../CollapsibleSection';
import { HelpTooltip } from '../HelpTooltip';
import { StyleNumberInput, StyleSelect } from './StyleComponents';
import { TrashIcon } from '../icons/TrashIcon';

interface ImageInputProps {
    src?: string;
    prompt?: string;
    credit?: ImageCredit;
    style?: ImageStyle;
    onUpdate: (updates: {
        src?: string;
        prompt?: string;
        credit?: ImageCredit;
        style?: ImageStyle;
    }) => void;
    onGenerateImage: (prompt: string, onUpdateBase64: (base64: string) => void) => void;
    isGeneratingImage: boolean;
    showPrompt?: boolean;
}

type ImageTab = 'ai' | 'upload' | 'url';

const ImageCreditEditor: React.FC<{
  credit?: ImageCredit;
  onUpdate: (credit: ImageCredit) => void;
}> = ({ credit, onUpdate }) => {
  const handleChange = (field: keyof ImageCredit, value: string) => {
    onUpdate({ ...credit, [field]: value || undefined });
  };

  const InstagramIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.85s-.012 3.584-.07 4.85c-.148 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07s-3.584-.012-4.85-.07c-3.252-.148-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.85s.012-3.584.07-4.85c.148-3.227 1.664-4.771 4.919-4.919C8.416 2.175 8.796 2.163 12 2.163m0-2.163C8.74 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.74 0 12s.014 3.667.072 4.947c.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.74 24 12 24s3.667-.014 4.947-.072c4.358-.2 6.78-2.618 6.98-6.98C23.986 15.667 24 15.26 24 12s-.014-3.667-.072-4.947c-.2-4.358-2.618-6.78-6.98-6.98C15.667.014 15.26 0 12 0Z"/><path d="M12 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324Zm0 10.162a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z"/><path d="M18.402 3.846a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88Z"/></svg>);
  const PinterestIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M12.017 2c-5.12 0-9.267 4.148-9.267 9.267 0 4.113 2.673 7.625 6.32 8.87.126.022.28-.05.32-.182.043-.133.15-.55.203-.75.053-.203.023-.292-.08-.488-.23-.42-.85-.98-.85-2.07 0-1.923 1.34-3.326 3.013-3.326 1.417 0 2.13.96 2.13 2.128 0 1.284-.823 3.19-1.242 4.96-.343 1.488 1.05 2.686 2.53 2.686 3.045 0 5.02-3.81 5.02-7.51 0-3.45-2.583-6.2-6.2-6.2-4.223 0-6.63 3.1-6.63 6.02 0 .96.34 1.98.78 2.58.243.332.273.45.19.782-.09.34-.303 1.222-.393 1.522-.122.404-.542.544-.863.382-1.95-.98-3.085-3.04-3.085-5.343 0-4.04 3.3-7.75 8-7.75 4.41 0 7.84 3.18 7.84 7.23 0 4.42-2.73 7.9-6.4 7.9-1.21 0-2.36-.63-2.74-1.37-.433-.826-.348-1.81.183-2.658.555-.88 1.14-1.8 1.14-2.92 0-1.37-.775-2.55-2.2-2.55-1.72 0-2.92 1.74-2.92 3.45 0 .8.22 1.47.5 1.94.04.07.03.14-.02.26-.14.34-.36.75-.49 1.05-.23.51-.35.75-.58 1.22-.16.32-.3.6-.44.83a9.206 9.206 0 0 1-1.46-5.42C2.75 6.15 6.9 2 12.017 2Z"/></svg>);
  const DeviantArtIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M6.22 2.05H12l.62 1.25H18v5.5h-5.78L11.6 8.18H6.22V2.05m8.39 7.6h5.39v5.5h-5.5l-.62-1.24H12v5.74h-5.78v-6.19h5.16l.62-1.25M0 2.05v19.9h11.82l.62-1.24H6.22v-5.5h5.78l.62-1.24h5.39V8.18H12l-.62-1.25H6.22V2.05H0Z"/></svg>);
  const BehanceIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M8.28,10.32h4.44c0-2.28-1.56-3-3-3s-2.76,1.08-1.44,3M22.2,5.28A2.4,2.4,0,0,0,19.92,4.8H3.36V4.8A2.27,2.27,0,0,0,1.8,5.28v.72h1.56v.72H1.8v1.56H3.36v.72h-1.56v1.56H3.36v.72h-1.56v.72A2.4,2.4,0,0,0,3.36,19.2H20.64a2.4,2.4,0,0,0,2.28-2.28V6A2.4,2.4,0,0,0,22.2,5.28M15.12,14.64H10.8a.72.72,0,0,1-.72-.72h0a.72.72,0,0,1,.72-.72h4.32a.72.72,0,0,1,.72.72h0A.72.72,0,0,1,15.12,14.64M15.48,12H8.28a2.64,2.64,0,0,1,0-5.28h3.36a3.24,3.24,0,0,1,3.24,3.24,2.75,2.75,0,0,1-.12,1,2,2,0,0,1-.6,1Zm-2.64-5.28H8.28a.72.72,0,0,0,0,1.44h4.56a.72.72,0,1,0,0-1.44Z"/></svg>);
  const LinkedInIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>);
  const VimeoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M23.52,8.232c-.172,2.028-1.636,4.416-4.4,7.164-2.748,2.748-5.028,4.122-6.84,4.122-1.308,0-2.484-.96-3.528-2.88-.636-1.5-1.284-3.792-1.944-6.876C6.1,7.032,5.292,5.208,4.356,5.208a.71.71,0,0,1-.6.288c-.528,0-1.032-.78-1.512-2.34L1.8,1.44C1.224.168.732,0,.324,0H.18A.45.45,0,0,1,0,.432c.324,1.452.84,2.784,1.548,4,.696,1.224,1.416,1.944,2.16,2.16.828.264,1.488-.132,1.98-1.176.324-.768.6-1.908.828-3.432.324-2.184.816-3.276,1.476-3.276.54,0,1.152.792,1.836,2.376,1.176,2.688,2.22,4.032,3.132,4.032.504,0,1.2-.6,2.088-1.8.876-1.2,1.38-2.088,1.512-2.664.216-1.248-.3-1.872-1.548-1.872-.9,0-1.656.324-2.268.972-.54.54-.924,1.356-1.152,2.448-.432,1.632-1.02,2.448-1.764,2.448-.48,0-1.02-.624-1.62-1.872s-.9-2.652-.9-4.212c0-2.16.516-3.888,1.548-5.184,1.032-1.308,2.424-1.962,4.176-1.962,1.8,0,3.036.888,3.708,2.664Z"/></svg>);
  const YouTubeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M10,15L15.19,12L10,9V15M21.56,7.17C21.69,7.64 21.78,8.27 21.84,9.07C21.91,9.87 21.94,10.56 21.94,11.16L22,12C22,14.19 21.84,15.8 21.56,16.83C21.31,17.73 20.73,18.31 19.83,18.56C19.36,18.69 18.73,18.78 17.93,18.84C17.13,18.91 16.44,18.94 15.84,18.94L15,19C12.81,19 11.2,18.84 10.17,18.56C9.27,18.31 8.69,17.73 8.44,16.83C8.31,16.36 8.22,15.73 8.16,14.93C8.09,14.13 8.06,13.44 8.06,12.84L8,12C8,9.81 8.16,8.2 8.44,7.17C8.69,6.27 9.27,5.69 10.17,5.44C11.2,5.16 12.81,5 15,5L15.84,5.06C16.44,5.06 17.13,5.09 17.93,5.16C18.73,5.22 19.36,5.31 19.83,5.44C20.73,5.69 21.31,6.27 21.56,7.17Z"/></svg>);
  const PixivIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M13.23.03h-2.4v4.3h2.4c2.89 0 4.38 1.83 4.38 4.02v.06c0 2.2-1.49 4.01-4.38 4.01h-2.4v8.13c4.19 1.05 6.95-1.94 6.95-5.32v-.06c0-2.9-1.95-4.63-4.52-4.63h-2.42V.03m-2.4 4.3H6.77c-.42 0-.8.3-.8.74v.05c0 .44.38.74.8.74h4.06V4.33Z"/></svg>);
  const DribbbleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M17.3,16.2C16.5,17.4 15,18.5 13.4,19.2C13.2,19.3 11.9,18.8 11.5,18.7C11.1,18.6 11.2,18.1 11.3,17.8C11.4,17.5 12.3,16.2 12.6,15.8C13,15.4 13.1,15.2 12,14.3C10.9,13.4 8.7,13.2 8.3,13.1C7.9,13 7.5,13.2 7.3,13.6C7.1,14 6.9,14.9 6.8,15.2C6.7,15.5 6.2,15.8 5.9,15.6C4.8,15 3.8,14.1 3.2,12.9C3.1,12.5 3.5,12.2 3.8,12.1C4.1,12 4.9,11.8 5.3,11.9C5.7,12 5.9,12.2 6.1,12.6C6.3,13 7,14.2 7.1,14.4C7.2,14.6 8.4,15.2 9.1,15.2C10.2,15.2 11.8,14.5 12.5,13.8C12.5,13.8 12.5,13.8 12.5,13.7C12.5,13.7 12.5,13.7 12.5,13.7C14,11.7 14.3,9.5 13.4,7.6C12.8,6.4 11.7,5.5 10.4,5C10,4.9 10.3,4.2 10.5,4.1C10.7,4 11,4.1 11.2,4.2C13.2,5 14.8,6.4 15.8,8.3C16.9,10.2 16.9,12.5 15.8,14.5C15.8,14.5 16.8,14.8 17,14.9C17.2,15 17.5,15.2 17.6,15.5C17.7,15.8 17.5,16 17.3,16.2M20,11.9C19.8,12.1 19.5,12.2 19.3,12.1C19,12 18.3,11.4 18.3,11.4C17.4,9.1 16,7.1 14.2,5.6C13.8,5.3 13.7,4.7 14,4.4C14.3,4.1 14.9,4 15.2,4.4C17.3,6.1 18.9,8.4 20,11.1C20.1,11.4 20.1,11.7 20,11.9Z"/></svg>);
  const ItchioIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M20.88 0L3.12 0L0 5.438V24h24V5.438L20.88 0zM9 13.5c-.825 0-1.5-.675-1.5-1.5s.675-1.5 1.5-1.5c.825 0 1.5.675 1.5 1.5s-.675 1.5-1.5 1.5zm6 0c-.825 0-1.5-.675-1.5-1.5s.675-1.5 1.5-1.5c.825 0 1.5.675 1.5 1.5s-.675 1.5-1.5 1.5z"/></svg>);
  

  const SocialInput: React.FC<{ field: keyof ImageCredit, placeholder: string, children: React.ReactNode }> = ({ field, placeholder, children }) => (
      <div className="relative flex-1">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)] pointer-events-none">
              {children}
          </span>
          <input 
              type="url" 
              placeholder={placeholder} 
              value={credit?.[field] || ''} 
              onChange={(e) => handleChange(field, e.target.value)} 
              className="w-full bg-[var(--bg-panel)] border border-[var(--border-secondary)] rounded-md p-1.5 pl-8 text-sm"
          />
      </div>
  );

  return (
    <div className="mt-2 p-2 border-t border-[var(--border-secondary)] space-y-2">
       <div className="flex items-center gap-2">
          <h5 className="text-xs font-semibold text-[var(--text-secondary)]">Image Credits (Optional)</h5>
          <HelpTooltip title="Image Credits" content="Optionally, provide credit for the image. This information will be accessible to players who view the image." />
       </div>
        <input type="text" placeholder="Image Title" value={credit?.title || ''} onChange={(e) => handleChange('title', e.target.value)} className="w-full bg-[var(--bg-panel)] border border-[var(--border-secondary)] rounded-md p-1.5 text-sm"/>
        <input type="text" placeholder="Artist Name" value={credit?.artistName || ''} onChange={(e) => handleChange('artistName', e.target.value)} className="w-full bg-[var(--bg-panel)] border border-[var(--border-secondary)] rounded-md p-1.5 text-sm"/>
        <input type="url" placeholder="Source URL (e.g., from Unsplash)" value={credit?.sourceUrl || ''} onChange={(e) => handleChange('sourceUrl', e.target.value)} className="w-full bg-[var(--bg-panel)] border border-[var(--border-secondary)] rounded-md p-1.5 text-sm"/>
        
        <div className="space-y-2 pt-2 border-t border-[var(--border-secondary)]">
             <h6 className="text-xs font-semibold text-[var(--text-tertiary)]">Artist Links</h6>
             <div className="flex flex-col sm:flex-row gap-2">
                <SocialInput field="websiteUrl" placeholder="Website/Portfolio">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m17.432 0A12.016 12.016 0 0 1 12 15c-1.614 0-3.13-.31-4.5-.865" /></svg>
                </SocialInput>
                <SocialInput field="twitterUrl" placeholder="Twitter (X)">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path d="M9.294 6.928L14.357 1h-1.2L8.762 6.116L5.33 1H1.242l5.363 7.64L1.242 15h1.2l4.6-5.4L11.67 15h4.089l-5.736-8.072h-.729Z"/></svg>
                </SocialInput>
             </div>
             <div className="flex flex-col sm:flex-row gap-2">
                 <SocialInput field="artstationUrl" placeholder="ArtStation">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M2 12.356L8.351 2h1.6L16 16.273l-2.121 4.242L2 12.356zM15.449 2L22 12.569l-4.242 8.485L15.449 2z"/></svg>
                </SocialInput>
                <SocialInput field="facebookUrl" placeholder="Facebook">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5Z"/></svg>
                </SocialInput>
             </div>
              <div className="flex flex-col sm:flex-row gap-2">
                 <SocialInput field="tumblrUrl" placeholder="Tumblr">
                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M14.563 21c-3.59 0-6.149-2.2-6.149-5.543V9.923H6V8.012h2.414V5.127c1.314-1.2 3.2-1.85 5.086-1.85h2.829v3.007h-2.143c-.43 0-.686.2-.686.643v2.09h2.829l-.43 1.91h-2.4v5.337c0 1.987 1.286 3.097 3.2 3.097h1.5v2.828h-2.414Z"/></svg>
                </SocialInput>
                <SocialInput field="instagramUrl" placeholder="Instagram"><InstagramIcon /></SocialInput>
             </div>
             <div className="flex flex-col sm:flex-row gap-2">
                <SocialInput field="pinterestUrl" placeholder="Pinterest"><PinterestIcon /></SocialInput>
                <SocialInput field="deviantartUrl" placeholder="DeviantArt"><DeviantArtIcon /></SocialInput>
             </div>
             <div className="flex flex-col sm:flex-row gap-2">
                <SocialInput field="behanceUrl" placeholder="Behance"><BehanceIcon /></SocialInput>
                <SocialInput field="linkedinUrl" placeholder="LinkedIn"><LinkedInIcon /></SocialInput>
             </div>
             <div className="flex flex-col sm:flex-row gap-2">
                <SocialInput field="vimeoUrl" placeholder="Vimeo"><VimeoIcon /></SocialInput>
                <SocialInput field="youtubeUrl" placeholder="YouTube"><YouTubeIcon /></SocialInput>
             </div>
             <div className="flex flex-col sm:flex-row gap-2">
                <SocialInput field="pixivUrl" placeholder="Pixiv"><PixivIcon /></SocialInput>
                <SocialInput field="dribbbleUrl" placeholder="Dribbble"><DribbbleIcon /></SocialInput>
             </div>
             <div className="flex flex-col sm:flex-row gap-2">
                <SocialInput field="itchioUrl" placeholder="Itch.io"><ItchioIcon /></SocialInput>
                <SocialInput field="otherUrl" placeholder="Other Link">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" /></svg>
                </SocialInput>
             </div>
        </div>
    </div>
  )
};

export const ImageInput: React.FC<ImageInputProps> = ({
    src,
    prompt,
    credit,
    style,
    onUpdate,
    onGenerateImage,
    isGeneratingImage,
    showPrompt = true,
}) => {
    const [activeTab, setActiveTab] = useState<ImageTab>(showPrompt ? 'ai' : 'upload');
    const [urlInput, setUrlInput] = useState('');

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (typeof event.target?.result === 'string') {
                    onUpdate({ src: event.target.result as string });
                }
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    };

    const handleGenerateClick = () => {
        if (!prompt) return;
        onGenerateImage(prompt, (base64) => {
            onUpdate({ src: `data:image/jpeg;base64,${base64}` });
        });
    };

    const handleUrlApply = () => {
        if (urlInput.trim()) {
            onUpdate({ src: urlInput.trim() });
        }
    };
    
    const updateStyle = (key: keyof ImageStyle, value: any) => {
        onUpdate({ style: { ...style, [key]: value } });
    };

    const TabButton: React.FC<{tab: ImageTab, label: string}> = ({ tab, label }) => (
        <button
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 text-center text-sm px-2 py-1.5 rounded-md transition-colors ${
                activeTab === tab ? 'bg-[var(--bg-active)] text-[var(--text-on-accent)]' : 'hover:bg-[var(--bg-hover)]'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="bg-[var(--bg-input)]/50 p-3 rounded-md border border-[var(--border-secondary)] space-y-3">
            <div className="flex gap-3">
                {src ? (
                    <img src={src} className="w-24 h-24 object-cover rounded-md flex-shrink-0" alt="Image preview"/>
                ) : (
                    <div className="w-24 h-24 bg-[var(--bg-input)] rounded-md flex items-center justify-center text-[var(--text-tertiary)] text-xs flex-shrink-0">No Image</div>
                )}
                <div className="flex-grow space-y-2">
                    <div className="flex items-center space-x-1 bg-[var(--bg-panel)] border border-[var(--border-secondary)] rounded-md p-1">
                        {showPrompt && <TabButton tab="ai" label="AI Prompt" />}
                        <TabButton tab="upload" label="Upload" />
                        <TabButton tab="url" label="URL" />
                    </div>
                    <div className="relative">
                        {activeTab === 'ai' && showPrompt && (
                             <>
                                <textarea value={prompt || ''} onChange={(e) => onUpdate({ prompt: e.target.value })} placeholder="AI Image Prompt..." rows={2} className="w-full bg-[var(--bg-panel)] border border-[var(--border-secondary)] rounded-md p-2"/>
                                <button onClick={handleGenerateClick} disabled={!prompt || isGeneratingImage} className="w-full text-center mt-2 bg-[var(--text-accent-bright)] hover:opacity-90 disabled:bg-[var(--bg-panel-light)] text-[var(--text-on-accent)] font-bold py-1.5 px-4 rounded-md text-sm">
                                    {isGeneratingImage ? 'Generating...' : 'Generate Image'}
                                </button>
                             </>
                        )}
                        {activeTab === 'upload' && (
                             <div className="flex flex-col items-center justify-center h-full">
                                <label className="w-full text-center cursor-pointer bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-bold py-4 px-4 rounded-md text-sm block">
                                    <span>Choose File...</span>
                                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                                </label>
                            </div>
                        )}
                        {activeTab === 'url' && (
                             <div className="flex items-center h-full">
                                <div className="flex gap-2 w-full">
                                    <input 
                                        type="url" 
                                        value={urlInput}
                                        onChange={(e) => setUrlInput(e.target.value)}
                                        placeholder="https://..."
                                        className="flex-grow bg-[var(--bg-panel)] border border-[var(--border-secondary)] rounded-md p-2 text-sm"
                                    />
                                    <button onClick={handleUrlApply} className="bg-[var(--bg-panel-light)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-bold px-4 rounded text-sm">Apply</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {src && <button onClick={() => onUpdate({ src: undefined })} className="w-full flex items-center justify-center gap-2 text-xs py-1 text-[var(--text-secondary)] hover:text-[var(--text-danger)] bg-[var(--bg-input)] rounded-md">
                <TrashIcon className="w-3 h-3" /> Clear Image
            </button>}
            
            <CollapsibleSection title="Styling & Credits">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <StyleSelect label="Object Fit" value={style?.objectFit || 'cover'} onChange={(e) => updateStyle('objectFit', e.target.value)}><option value="cover">Cover</option><option value="contain">Contain</option><option value="fill">Fill</option><option value="none">None</option><option value="scale-down">Scale Down</option></StyleSelect>
                        <div>
                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Object Position</label>
                            <input type="text" placeholder="e.g. center, 50% 25%" value={style?.objectPosition || ''} onChange={(e) => updateStyle('objectPosition', e.target.value)} className="w-full bg-[var(--bg-panel)] border border-[var(--border-secondary)] rounded-md p-1.5 text-sm"/>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <StyleNumberInput label="Opacity" value={style?.opacity ?? 1} onChange={(e) => updateStyle('opacity', e.target.valueAsNumber)} max={1} step={0.1}/>
                        <StyleNumberInput label="Radius (px)" value={style?.borderRadius ?? 0} onChange={(e) => updateStyle('borderRadius', e.target.valueAsNumber)} step={1}/>
                        <StyleNumberInput label="Blur (px)" value={style?.filterBlur ?? 0} onChange={(e) => updateStyle('filterBlur', e.target.valueAsNumber)} step={1}/>
                        <StyleNumberInput label="Grayscale" value={style?.filterGrayscale ?? 0} onChange={(e) => updateStyle('filterGrayscale', e.target.valueAsNumber)} max={1} step={0.1}/>
                    </div>
                    <ImageCreditEditor credit={credit} onUpdate={(c) => onUpdate({ credit: c })} />
                </div>
            </CollapsibleSection>
        </div>
    );
};
