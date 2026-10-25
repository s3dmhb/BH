import React from 'react';
import { FamilyMember } from '../types/family';
import { getSubFamilyTags, SubFamilyTag } from '../utils/subFamilyUtils';
import { Crown, Shield, Sparkles, Compass, Award, Gem, Flame, Waves } from 'lucide-react';

interface SubFamilyBadgeProps {
  member?: FamilyMember;
  tags?: SubFamilyTag[];
  memberMap?: Map<string, FamilyMember>;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  onTagClick?: (tag: SubFamilyTag) => void;
}

export const SubFamilyBadge: React.FC<SubFamilyBadgeProps> = ({
  member,
  tags: propTags,
  memberMap,
  size = 'sm',
  className = '',
  onTagClick
}) => {
  const resolvedTags = propTags || (member ? getSubFamilyTags(member, memberMap) : []);

  if (!resolvedTags || resolvedTags.length === 0) return null;

  const sizeClasses = {
    xs: 'text-[9px] px-1.5 py-0.2 gap-1 rounded-md',
    sm: 'text-[10px] px-2 py-0.5 gap-1.2 rounded-lg',
    md: 'text-xs px-2.5 py-1 gap-1.5 rounded-xl'
  }[size];

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5'
  }[size];

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      {resolvedTags.map(tag => {
        const isJaber = tag.category === 'jaber';
        const isNawasir = tag.category === 'nawasir';
        const isBoth = tag.category === 'both';
        const isAlbuhasson = tag.category === 'albuhasson';
        const isAlnesf = tag.category === 'alnesf';
        const isAldarwish = tag.category === 'aldarwish';
        const isAlazraq = tag.category === 'alazraq';

        return (
          <span
            key={tag.id}
            onClick={e => {
              if (onTagClick) {
                e.stopPropagation();
                onTagClick(tag);
              }
            }}
            title={tag.description}
            className={`inline-flex items-center backdrop-blur-md transition-all duration-200 border shadow-sm ${tag.bgClass} ${tag.borderClass} ${tag.textClass} ${tag.glowClass} ${sizeClasses} ${
              onTagClick ? 'cursor-pointer hover:scale-105 active:scale-95' : ''
            }`}
          >
            {/* Visual Icon according to lineage */}
            {isAlbuhasson && <Award className={`${iconSizes} text-emerald-300 shrink-0`} />}
            {isAlnesf && <Gem className={`${iconSizes} text-indigo-300 shrink-0`} />}
            {isAldarwish && <Flame className={`${iconSizes} text-orange-400 shrink-0`} />}
            {isAlazraq && <Waves className={`${iconSizes} text-cyan-300 shrink-0`} />}
            {isJaber && <Crown className={`${iconSizes} text-amber-400 shrink-0`} />}
            {isNawasir && <Shield className={`${iconSizes} text-emerald-400 shrink-0`} />}
            {isBoth && <Sparkles className={`${iconSizes} text-amber-300 shrink-0`} />}
            {!isAlbuhasson && !isAlnesf && !isAldarwish && !isAlazraq && !isJaber && !isNawasir && !isBoth && (
              <Compass className={`${iconSizes} text-cyan-300 shrink-0`} />
            )}

            <span className="tracking-tight whitespace-nowrap">{tag.label}</span>
          </span>
        );
      })}
    </div>
  );
};
