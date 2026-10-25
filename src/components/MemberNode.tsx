import React, { useState } from 'react';
import { FamilyMember } from '../types/family';
import { FemaleHeritageBadge } from './HeritageCrest';
import { SubFamilyBadge } from './SubFamilyBadge';
import { ChevronDown, ChevronUp, User, Heart, Users2, Sparkles, Eye } from 'lucide-react';

interface MemberNodeProps {
  member: FamilyMember;
  onSelect: (member: FamilyMember) => void;
  hasChildren?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isHighlighted?: boolean;
}

export const MemberNode: React.FC<MemberNodeProps> = ({
  member,
  onSelect,
  hasChildren = false,
  isCollapsed = false,
  onToggleCollapse,
  isHighlighted = false
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isMale = member.gender === 'male';

  // Get initials or first name token for monogram fallback
  const firstLetter = member.full_name.trim().charAt(0) || 'ب';

  return (
    <div
      className="relative group select-none transition-all duration-200"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Node Card */}
      <div
        onClick={() => onSelect(member)}
        className={`w-[260px] sm:w-[272px] md:w-72 rounded-2xl p-3 sm:p-3.5 cursor-pointer text-right transition-all duration-300 relative ${
          isMale ? 'glass-card' : 'glass-card-female'
        } ${
          isHighlighted
            ? 'ring-2 ring-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.4)] scale-105'
            : 'hover:scale-[1.02] active:scale-[0.98]'
        }`}
      >
        {/* Header row: Avatar / Badge + Name + Status */}
        <div className="flex items-start gap-3">
          {/* Avatar Area */}
          <div className="shrink-0 relative">
            {isMale ? (
              member.avatar_url ? (
                <img
                  src={member.avatar_url}
                  alt={member.full_name}
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-xl object-cover border border-emerald-400/40 shadow-inner"
                  onError={(e) => {
                    // Fallback to monogram if URL fails
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-800 to-emerald-950 border border-emerald-400/30 flex items-center justify-center text-emerald-200 font-bold text-lg shadow-inner">
                  {firstLetter}
                </div>
              )
            ) : (
              /* Strictly NO avatar for females: use dignified heritage rosette emblem */
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-950/70 to-rose-950/90 border border-pink-500/30 flex items-center justify-center shadow-inner">
                <FemaleHeritageBadge size={28} />
              </div>
            )}

            {/* Generational number badge in corner */}
            <span
              className={`absolute -bottom-1 -left-1 text-[10px] font-mono px-1.5 py-0.2 rounded-md font-semibold ${
                isMale
                  ? 'bg-emerald-900/90 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-950/90 text-pink-300 border border-rose-500/30'
              }`}
              title={`الجيل رقم ${member.generation || 1}`}
            >
              G{member.generation || 1}
            </span>
          </div>

          {/* Names and status */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  member.is_living
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800/80 text-slate-400 border border-slate-700/50'
                }`}
              >
                {member.is_living ? 'حي يرزق' : 'رحمه الله'}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {member.birth_date} {member.death_date ? `- ${member.death_date}` : ''}
              </span>
            </div>

            <h3 className="text-sm font-bold text-white truncate leading-tight" title={member.full_name}>
              {member.full_name}
            </h3>

            {member.nickname && (
              <p
                className={`text-xs font-medium truncate mt-0.5 ${
                  isMale ? 'text-emerald-400' : 'text-pink-300'
                }`}
                title={member.nickname}
              >
                {member.nickname}
              </p>
            )}

            {/* Sub-Family Tag Badge */}
            <div className="mt-1">
              <SubFamilyBadge member={member} size="xs" />
            </div>
          </div>
        </div>

        {/* Info Snippet preview */}
        <div className="mt-3 pt-2.5 border-t border-white/5 text-[11px] space-y-1">
          {isMale ? (
            <>
              {member.spouse_info && (
                <div className="flex items-center gap-1.5 text-slate-300 truncate">
                  <Heart className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="text-slate-400 shrink-0">الزوجات:</span>
                  <span className="truncate">{member.spouse_info}</span>
                </div>
              )}
              {member.bio && (
                <p className="text-slate-400 line-clamp-1 text-[11px]">
                  {member.bio}
                </p>
              )}
            </>
          ) : (
            <>
              {member.spouse_info && (
                <div className="flex items-center gap-1.5 text-slate-300 truncate">
                  <Heart className="w-3 h-3 text-pink-400 shrink-0" />
                  <span className="text-slate-400 shrink-0">الزوج:</span>
                  <span className="truncate">{member.spouse_info}</span>
                </div>
              )}
              {member.children_summary && (
                <div className="flex items-center gap-1.5 text-slate-300 truncate">
                  <Users2 className="w-3 h-3 text-pink-400 shrink-0" />
                  <span className="text-slate-400 shrink-0">الأبناء:</span>
                  <span className="truncate">{member.children_summary}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Click hint affordance */}
        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 pt-1">
          <span className="text-slate-400">{member.branch || 'الفرع العام'}</span>
          <span className="flex items-center gap-1 text-emerald-400 group-hover:underline">
            <Eye className="w-3 h-3" />
            <span>عرض السجل</span>
          </span>
        </div>
      </div>

      {/* Collapse / Expand Toggle Button on Node Base */}
      {hasChildren && onToggleCollapse && (
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse();
            }}
            title={isCollapsed ? 'توسيع الأبناء والذرية' : 'طي الأبناء والذرية'}
            className="w-6 h-6 rounded-full bg-emerald-900 border border-emerald-400/50 text-emerald-200 flex items-center justify-center hover:bg-emerald-800 hover:scale-110 shadow-md transition-transform"
          >
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* Rich Apple Hover Tooltip / Popover (Only on hover desktop) */}
      {isHovered && (
        <div
          className={`hidden md:block absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-80 p-4 rounded-2xl glass-panel shadow-2xl z-50 pointer-events-none text-right border ${
            isMale ? 'border-emerald-500/30' : 'border-pink-500/30'
          } animate-in fade-in duration-200`}
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
            <div>
              <h4 className="text-sm font-bold text-white">{member.full_name}</h4>
              <p className={`text-xs font-medium ${isMale ? 'text-emerald-400' : 'text-pink-300'}`}>
                {member.nickname || 'عائلة البوحسون'}
              </p>
              <div className="mt-1">
                <SubFamilyBadge member={member} size="xs" />
              </div>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full ${
                member.is_living
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {member.is_living ? 'على قيد الحياة' : 'متوفى'}
            </span>
          </div>

          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>فترة العمر:</span>
              <span className="font-mono text-slate-200">
                {member.birth_date} {member.death_date ? `— ${member.death_date}` : '(معاصر)'}
              </span>
            </div>

            {isMale ? (
              <>
                {member.spouse_info && (
                  <div>
                    <span className="text-slate-400 block text-[11px] font-semibold mb-0.5">أسماء الزوجات:</span>
                    <p className="text-slate-200 text-xs bg-slate-900/60 p-1.5 rounded-lg border border-emerald-500/10">
                      {member.spouse_info}
                    </p>
                  </div>
                )}
                {member.bio && (
                  <div>
                    <span className="text-slate-400 block text-[11px] font-semibold mb-0.5">السيرة الذاتية:</span>
                    <p className="text-slate-200 text-xs leading-relaxed bg-slate-900/60 p-2 rounded-lg border border-emerald-500/10 max-h-32 overflow-y-auto">
                      {member.bio}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                {member.spouse_info && (
                  <div>
                    <span className="text-slate-400 block text-[11px] font-semibold mb-0.5">اسم الزوج:</span>
                    <p className="text-slate-200 text-xs bg-slate-900/60 p-1.5 rounded-lg border border-pink-500/10">
                      {member.spouse_info}
                    </p>
                  </div>
                )}
                {member.children_summary && (
                  <div>
                    <span className="text-slate-400 block text-[11px] font-semibold mb-0.5">ملخص الأبناء:</span>
                    <p className="text-slate-200 text-xs bg-slate-900/60 p-1.5 rounded-lg border border-pink-500/10">
                      {member.children_summary}
                    </p>
                  </div>
                )}
                {member.notes && (
                  <div>
                    <span className="text-slate-400 block text-[11px] font-semibold mb-0.5">ملاحظات خاصة:</span>
                    <p className="text-slate-200 text-xs leading-relaxed bg-slate-900/60 p-2 rounded-lg border border-pink-500/10">
                      {member.notes}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
            <span>انقر لفتح الملف والنسب الكامل</span>
            <Sparkles className="w-3 h-3 text-emerald-400" />
          </div>
        </div>
      )}
    </div>
  );
};
