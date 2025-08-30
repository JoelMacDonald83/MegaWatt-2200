
import React, { useMemo } from 'react';
import type { Entity } from '../../types';
import { CreditDisplay } from '../CreditDisplay';

interface EntityCardProps {
  entity: Entity;
}

export const EntityCard: React.FC<EntityCardProps> = ({ entity }) => {
  const styles = useMemo(() => {
    const s = entity.styles || {};
    const hasBgImage = !!entity.imageBase64;
    return {
      borderColor: s.borderColor || 'cyan-500',
      borderWidth: s.borderWidth || 'md',
      shadow: s.shadow || 'lg',
      titleColor: s.titleColor || 'text-[var(--text-accent)]',
      backgroundColor: s.backgroundColor || 'bg-[var(--bg-panel)]/50',
      overlay: s.backgroundOverlayStrength || (hasBgImage ? 'medium' : 'none'),
    };
  }, [entity.styles, entity.imageBase64]);

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
      {entity.imageBase64 && (
        <div className="absolute inset-0">
          <img src={entity.imageBase64} alt={entity.name} className="w-full h-full object-cover" />
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
