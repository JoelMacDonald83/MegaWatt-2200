
import React, { useMemo } from 'react';
import type { Entity, ImageStyle } from '../../types';
import { CreditDisplay } from '../CreditDisplay';

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

interface EntityCardProps {
  entity: Entity;
}

export const EntityCard: React.FC<EntityCardProps> = ({ entity }) => {
  const styles = useMemo(() => {
    const s = entity.styles || {};
    const hasBgImage = !!entity.src;
    return {
      borderColor: s.borderColor || 'cyan-500',
      borderWidth: s.borderWidth || 'md',
      shadow: s.shadow || 'lg',
      titleColor: s.titleColor || 'text-[var(--text-accent)]',
      backgroundColor: s.backgroundColor || 'bg-[var(--bg-panel)]/50',
      overlay: s.backgroundOverlayStrength || (hasBgImage ? 'medium' : 'none'),
    };
  }, [entity.styles, entity.src]);

  const cardClasses = useMemo(() => {
    return [
      `border-${styles.borderColor}`,
      { none: 'border-0', sm: 'border', md: 'border-2', lg: 'border-4' }[styles.borderWidth],
      { none: 'shadow-none', sm: 'shadow-sm', md: 'shadow-md', lg: 'shadow-lg', xl: 'shadow-xl' }[styles.shadow],
      `shadow-black/50`,
      styles.backgroundColor,
    ].join(' ');
  }, [styles]);

  const overlayClass = { none: '', light: 'bg-black/20', medium: 'bg-black/50', heavy: 'bg-black/70' }[styles.overlay];

  return (
    <div className={`relative h-48 rounded-lg flex flex-col justify-end overflow-hidden backdrop-blur-sm transition-all duration-300 ${cardClasses}`}>
      {entity.src && (
        <div className="absolute inset-0">
          <img src={entity.src} alt={entity.name} className="w-full h-full" style={imageStyleToCss(entity.imageStyle)} />
          <div className={`absolute inset-0 ${overlayClass}`} />
        </div>
      )}
      {entity.imageCredit && <CreditDisplay credit={entity.imageCredit} className="bottom-1 right-1" />}
      <div className="relative z-10 p-3 bg-gradient-to-t from-black/80 via-black/50 to-transparent">
        <h3 className={`font-bold text-lg leading-tight ${styles.titleColor}`}>{entity.name}</h3>
      </div>
    </div>
  );
};
