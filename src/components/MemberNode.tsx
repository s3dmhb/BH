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
        className={`w-[260px] sm:w-[272px] md:w-72 rounded-2xl p-3 sm:p-3.5 cursor-pointer text-right transition-all duration-300 relative border ${
          isMale
            ? member.is_living
              ? 'glass-card border-sky-300'
              : 'bg-slate-50/95 border-slate-300 shadow-xs'
            : member.is_living
            ? 'glass-card-female border-rose-300'
            : 'bg-rose-50/60 border-rose-200 shadow-xs'
        } ${
          isHighlighted
            ? 'ring-2 ring-sky-500 shadow-[0_0_24px_rgba(2,132,199,0.25)] scale-102'
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
                  className="w-12 h-12 rounded-xl object-cover border border-sky-300 shadow-xs"
                  onError={(e) => {
                    // Fallback to monogram if URL fails
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-sky-100 border border-sky-300 flex items-center justify-center text-sky-800 font-bold text-lg shadow-xs">
                  {firstLetter}
                </div>
              )
            ) : (
              /* Strictly NO avatar for females: use dignified heritage rosette emblem */
              <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shadow-xs">
                <FemaleHeritageBadge size={28} />
              </div>
            )}

            {/* Generational number badge in corner */}
            <span
              className={`absolute -bottom-1 -left-1 text-[10px] font-mono px-1.5 py-0.2 rounded-md font-semibold ${
                isMale
                  ? 'bg-slate-100 text-sky-800 border border-sky-200'
                  : 'bg-rose-100 text-rose-800 border border-rose-200'
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
                    ? isMale
                      ? 'bg-sky-50 text-sky-800 border border-sky-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                    : isMale
                    ? 'bg-slate-100 text-slate-700 border border-slate-300'
                    : 'bg-rose-100/60 text-rose-800 border border-rose-200'
                }`}
              >
                {member.is_living
                  ? isMale ? 'حي يُرزق' : 'حفظها الله'
                  : isMale ? 'رحمه الله' : 'رحمها الله'}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {member.birth_date} {member.death_date ? `- ${member.death_date}` : ''}
              </span>
            </div>

            <h3 className="text-sm font-bold text-slate-900 truncate leading-tight" title={member.full_name}>
              {member.full_name}
            </h3>

            {member.nickname && (
              <p
                className={`text-xs font-semibold truncate mt-0.5 ${
                  isMale ? 'text-sky-700' : 'text-rose-700'
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
        <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] space-y-1">
          {isMale ? (
            <>
              {member.spouse_info && (
                <div className="flex items-center gap-1.5 text-slate-700 truncate">
                  <Heart className="w-3 h-3 text-sky-600 shrink-0" />
                  <span className="text-slate-500 shrink-0">الزوجات:</span>
                  <span className="truncate">{member.spouse_info}</span>
                </div>
              )}
              {member.bio && (
                <p className="text-slate-500 line-clamp-1 text-[11px]">
                  {member.bio}
                </p>
              )}
            </>
          ) : (
            <>
              {member.spouse_info && (
                <div className="flex items-center gap-1.5 text-slate-700 truncate">
                  <Heart className="w-3 h-3 text-rose-600 shrink-0" />
                  <span className="text-slate-500 shrink-0">الزوج:</span>
                  <span className="truncate">{member.spouse_info}</span>
                </div>
              )}
              {member.children_summary && (
                <div className="flex items-center gap-1.5 text-slate-700 truncate">
                  <Users2 className="w-3 h-3 text-rose-600 shrink-0" />
                  <span className="text-slate-500 shrink-0">الأبناء:</span>
                  <span className="truncate">{member.children_summary}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Click hint affordance */}
        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
          <span className="text-slate-500">{member.branch || 'الفرع العام'}</span>
          <span className="flex items-center gap-1 text-sky-600 font-semibold group-hover:underline">
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
            className="w-6 h-6 rounded-full bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 flex items-center justify-center hover:scale-110 shadow-sm transition-all"
          >
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* Rich Apple Hover Tooltip / Popover (Only on hover desktop) */}
      {isHovered && (
        <div
          className={`hidden md:block absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-80 p-4 rounded-2xl bg-white/98 shadow-2xl z-50 pointer-events-none text-right border ${
            isMale ? 'border-sky-300' : 'border-rose-300'
          } animate-in fade-in duration-200`}
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
            <div>
              <h4 className="text-sm font-bold text-slate-900">{member.full_name}</h4>
              <p className={`text-xs font-semibold ${isMale ? 'text-sky-700' : 'text-rose-700'}`}>
                {member.nickname || 'عائلة البوحسون'}
              </p>
              <div className="mt-1">
                <SubFamilyBadge member={member} size="xs" />
              </div>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                member.is_living
                  ? isMale
                    ? 'bg-sky-50 text-sky-800 border border-sky-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {member.is_living ? 'على قيد الحياة' : 'متوفى'}
            </span>
          </div>

          <div className="space-y-2 text-xs text-slate-700">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>فترة العمر:</span>
              <span className="font-mono text-slate-800 font-semibold">
                {member.birth_date} {member.death_date ? `— ${member.death_date}` : '(معاصر)'}
              </span>
            </div>

            {isMale ? (
              <>
                {member.spouse_info && (
                  <div>
                    <span className="text-slate-500 block text-[11px] font-semibold mb-0.5">أسماء الزوجات:</span>
                    <p className="text-slate-800 text-xs bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                      {member.spouse_info}
                    </p>
                  </div>
                )}
                {member.bio && (
                  <div>
                    <span className="text-slate-500 block text-[11px] font-semibold mb-0.5">السيرة الذاتية:</span>
                    <p className="text-slate-800 text-xs leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-200 max-h-32 overflow-y-auto">
                      {member.bio}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                {member.spouse_info && (
                  <div>
                    <span className="text-slate-500 block text-[11px] font-semibold mb-0.5">اسم الزوج:</span>
                    <p className="text-slate-800 text-xs bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                      {member.spouse_info}
                    </p>
                  </div>
                )}
                {member.children_summary && (
                  <div>
                    <span className="text-slate-500 block text-[11px] font-semibold mb-0.5">ملخص الأبناء:</span>
                    <p className="text-slate-800 text-xs bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                      {member.children_summary}
                    </p>
                  </div>
                )}
                {member.notes && (
                  <div>
                    <span className="text-slate-500 block text-[11px] font-semibold mb-0.5">ملاحظات خاصة:</span>
                    <p className="text-slate-800 text-xs leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-200">
                      {member.notes}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <span>انقر لفتح الملف والنسب الكامل</span>
            <Sparkles className="w-3 h-3 text-sky-600" />
          </div>
        </div>
      )}
    </div>
  );
};
