import React, { useState, useMemo } from 'react';
import { FamilyMember } from '../types/family';
import { HeritageCrest, FemaleHeritageBadge } from './HeritageCrest';
import { SubFamilyBadge } from './SubFamilyBadge';
import { Search, GitFork, ArrowDown, Copy, Check, Calendar, Heart, Shield } from 'lucide-react';
import { matchesArabic } from '../utils/arabicUtils';

interface LineagePathViewProps {
  members: FamilyMember[];
  memberMap: Map<string, FamilyMember>;
  getPaternalLineage: (id: string) => FamilyMember[];
  onSelectMember: (member: FamilyMember) => void;
}

export const LineagePathView: React.FC<LineagePathViewProps> = ({
  members,
  memberMap,
  getPaternalLineage,
  onSelectMember
}) => {
  // Default to a 4th or 5th generation member to show a rich multi-step lineage
  const defaultMember = useMemo(() => {
    return members.find(m => m.generation === 5) || members.find(m => m.generation === 4) || members[0];
  }, [members]);

  const [selectedId, setSelectedId] = useState<string>(defaultMember ? defaultMember.id : '');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  // Filtered members for selector
  const selectableMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    return members.filter(m =>
      matchesArabic(m.full_name, searchQuery) ||
      matchesArabic(m.nickname, searchQuery)
    );
  }, [members, searchQuery]);

  // Compute unbroken ancestral chain
  const chain = useMemo(() => {
    if (!selectedId) return [];
    return getPaternalLineage(selectedId);
  }, [selectedId, getPaternalLineage]);

  // Selected member object
  const targetMember = useMemo(() => memberMap.get(selectedId), [selectedId, memberMap]);

  // Full lineage prose string
  const fullLineageProse = useMemo(() => {
    if (chain.length === 0) return '';
    const names = chain.map((m, idx) => {
      // Extract first name for chain except root
      if (idx === chain.length - 1) return m.full_name;
      const parts = m.full_name.trim().split(' ');
      return parts[0];
    });
    return names.join(' بن ');
  }, [chain]);

  const handleCopyLineage = () => {
    if (!fullLineageProse) return;
    navigator.clipboard.writeText(fullLineageProse);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getRelationshipName = (depth: number, total: number, gender: 'male' | 'female') => {
    if (depth === 0) return gender === 'male' ? 'صاحب النسب المختار' : 'صاحبة النسب المختارة';
    if (depth === 1) return 'الأب المباشر';
    if (depth === 2) return 'الجد (والد الأب)';
    if (depth === 3) return 'والد الجد (الجد الثاني)';
    if (depth === total - 1) return 'الجد المؤسس (رأس النسب)';
    return `الجد السابق (مرتبة ${depth})`;
  };

  return (
    <div className="w-full max-w-5xl 2xl:max-w-6xl mx-auto px-3 sm:px-6 py-6 pb-24 md:pb-10">
      {/* Top Banner / Selection */}
      <div className="bg-white/95 rounded-3xl p-4 sm:p-6 md:p-8 mb-6 sm:mb-8 border border-slate-200/90 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700 shrink-0 shadow-xs">
              <GitFork className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                مسار النسب وسلسلة الأجداد
              </h2>
              <p className="text-[11px] sm:text-xs md:text-sm text-slate-500 font-medium">
                تتبّع السلسلة الأبوية المتصلة صعوداً من أي فرد حتى الجد المؤسس
              </p>
            </div>
          </div>

          {/* Member Search & Selector */}
          <div className="flex-1 max-w-md">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              اختر فرداً لاستعراض مسار نسبه:
            </label>
            <div className="relative">
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-4 py-2.5 text-xs md:text-sm focus:outline-none focus:border-sky-500 focus:bg-white shadow-xs"
              >
                {selectableMembers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.nickname || (m.gender === 'male' ? 'ابن' : 'ابنة')}) - الجيل {m.generation}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Full Lineage String Card */}
        {targetMember && (
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wider block mb-1">
                سلسلة النسب المتصلة:
              </span>
              <p className="text-sm md:text-base font-bold text-slate-900 font-serif leading-relaxed">
                {fullLineageProse}
              </p>
            </div>
            <button
              onClick={handleCopyLineage}
              className="glass-btn px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
              <span>{copied ? 'تم النسخ!' : 'نسخ سلسلة النسب'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Vertical Pedigree Chain Timeline */}
      <div className="relative flex flex-col items-center">
        {/* Continuous vertical connecting line */}
        <div className="absolute top-10 bottom-10 right-1/2 translate-x-1/2 w-0.5 bg-gradient-to-b from-sky-400 via-indigo-400 to-amber-500 z-0 opacity-60" />

        {chain.map((member, index) => {
          const isTarget = index === 0;
          const isRoot = index === chain.length - 1;
          const isMale = member.gender === 'male';

          return (
            <React.Fragment key={member.id}>
              {/* Node Card */}
              <div className="relative z-10 w-full max-w-2xl my-3 group">
                <div
                  onClick={() => onSelectMember(member)}
                  className={`rounded-2xl p-5 md:p-6 cursor-pointer border transition-all duration-300 ${
                    isRoot
                      ? 'bg-amber-50/90 border-amber-300 shadow-md'
                      : isTarget
                      ? isMale
                        ? 'bg-white border-sky-400 shadow-md ring-2 ring-sky-400/30'
                        : 'bg-white border-rose-400 shadow-md ring-2 ring-rose-400/30'
                      : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {/* Avatar / Badge */}
                      <div className="shrink-0">
                        {isRoot ? (
                          <HeritageCrest size={56} className="drop-shadow-sm" />
                        ) : isMale ? (
                          member.avatar_url ? (
                            <img
                              src={member.avatar_url}
                              alt={member.full_name}
                              referrerPolicy="no-referrer"
                              className="w-14 h-14 rounded-2xl object-cover border border-sky-300 shadow-xs"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-2xl bg-sky-100 border border-sky-300 flex items-center justify-center text-sky-800 font-bold text-xl shadow-xs">
                              {member.full_name.charAt(0)}
                            </div>
                          )
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center shadow-xs">
                            <FemaleHeritageBadge size={34} />
                          </div>
                        )}
                      </div>

                      {/* Information */}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                              isRoot
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : isTarget
                                ? 'bg-sky-100 text-sky-900 border border-sky-300'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {getRelationshipName(index, chain.length, member.gender)}
                          </span>
                          <span className="text-xs text-slate-500 font-mono">
                            الجيل {member.generation || 1}
                          </span>
                        </div>

                        <h3 className="text-base md:text-lg font-bold text-slate-900 mb-0.5">
                          {member.full_name}
                        </h3>

                        {member.nickname && (
                          <p className={`text-xs font-semibold mb-1 ${isMale ? 'text-sky-700' : 'text-rose-700'}`}>
                            {member.nickname}
                          </p>
                        )}

                        <div className="mb-2">
                          <SubFamilyBadge member={member} memberMap={memberMap} size="xs" />
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 mt-2">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {member.birth_date} {member.death_date ? `- ${member.death_date}` : '(معاصر)'}
                            </span>
                          </div>

                          {member.spouse_info && (
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <Heart className={`w-3.5 h-3.5 ${isMale ? 'text-sky-600' : 'text-rose-600'}`} />
                              <span>{isMale ? 'الزوجات: ' : 'الزوج: '}{member.spouse_info}</span>
                            </div>
                          )}
                        </div>

                        {member.bio && (
                          <p className="text-xs text-slate-600 leading-relaxed mt-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                            {member.bio}
                          </p>
                        )}
                      </div>
                    </div>

                    <span className="text-xs text-sky-600 group-hover:text-sky-800 shrink-0 font-medium hidden sm:inline">
                      عرض الملف الكامل ←
                    </span>
                  </div>
                </div>
              </div>

              {/* Down Arrow separator between ancestors */}
              {!isRoot && (
                <div className="relative z-10 my-1 flex items-center justify-center">
                  <div className="w-7 h-7 rounded-full bg-white border border-slate-300 text-sky-600 flex items-center justify-center shadow-xs">
                    <ArrowDown className="w-4 h-4" />
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
