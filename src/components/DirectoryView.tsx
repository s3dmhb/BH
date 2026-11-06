import React, { useState, useMemo } from 'react';
import { FamilyMember } from '../types/family';
import { FemaleHeritageBadge } from './HeritageCrest';
import { matchesArabic } from '../utils/arabicUtils';
import { SubFamilyBadge } from './SubFamilyBadge';
import { matchesSubFamilyFilter } from '../utils/subFamilyUtils';
import {
  Search,
  Users,
  Filter,
  Eye,
  GitFork,
  Heart,
  Users2,
  Calendar,
  Layers,
  ArrowUpDown,
  Crown,
  Shield,
  Award,
  Gem,
  Flame,
  Waves
} from 'lucide-react';

interface DirectoryViewProps {
  members: FamilyMember[];
  memberMap: Map<string, FamilyMember>;
  onSelectMember: (member: FamilyMember) => void;
  onViewLineage: (member: FamilyMember) => void;
  onDelete?: (id: string) => void;
  isAdmin?: boolean;
}

export const DirectoryView: React.FC<DirectoryViewProps> = ({
  members,
  memberMap,
  onSelectMember,
  onViewLineage,
  onDelete,
  isAdmin
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'living' | 'deceased'>('all');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [subFamilyFilter, setSubFamilyFilter] = useState<string>('all');
  const [selectedGen, setSelectedGen] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'generation' | 'birth' | 'name'>('generation');

  // Extract branches
  const branches = useMemo(() => {
    const set = new Set<string>();
    members.forEach(m => {
      if (m.branch) set.add(m.branch);
    });
    return Array.from(set);
  }, [members]);

  // Extract generations
  const generations = useMemo(() => {
    const gens = new Set<number>();
    members.forEach(m => gens.add(m.generation || 1));
    return Array.from(gens).sort((a, b) => a - b);
  }, [members]);

  // Filtered and sorted members
  const filteredMembers = useMemo(() => {
    return members
      .filter(m => {
        // Gender filter
        if (genderFilter !== 'all' && m.gender !== genderFilter) return false;

        // Status filter
        if (statusFilter === 'living' && !m.is_living) return false;
        if (statusFilter === 'deceased' && m.is_living) return false;

        // Sub-Family tag filter
        if (subFamilyFilter !== 'all' && !matchesSubFamilyFilter(m, subFamilyFilter, memberMap)) {
          return false;
        }

        // Branch filter
        if (selectedBranch !== 'all' && m.branch !== selectedBranch) return false;

        // Generation filter
        if (selectedGen !== 'all' && String(m.generation || 1) !== selectedGen) return false;

        // Search query
        if (searchQuery.trim()) {
          const father = m.father_id ? memberMap.get(m.father_id) : null;
          const matchName = matchesArabic(m.full_name, searchQuery);
          const matchNick = matchesArabic(m.nickname, searchQuery);
          const matchBio = matchesArabic(m.bio, searchQuery);
          const matchSpouse = matchesArabic(m.spouse_info, searchQuery);
          const matchFather = father ? matchesArabic(father.full_name, searchQuery) : false;
          const matchChildren = matchesArabic(m.children_summary, searchQuery);

          if (!matchName && !matchNick && !matchBio && !matchSpouse && !matchFather && !matchChildren) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'generation') {
          return (a.generation || 1) - (b.generation || 1);
        }
        if (sortBy === 'birth') {
          return parseInt(a.birth_date || '0') - parseInt(b.birth_date || '0');
        }
        if (sortBy === 'name') {
          return a.full_name.localeCompare(b.full_name, 'ar');
        }
        return 0;
      });
  }, [members, memberMap, genderFilter, statusFilter, subFamilyFilter, selectedBranch, selectedGen, searchQuery, sortBy]);

  return (
    <div className="w-full max-w-7xl 2xl:max-w-[1700px] mx-auto px-3 sm:px-6 py-5 pb-24 md:pb-10">
      {/* Control & Search Bar */}
      <div className="glass-panel rounded-3xl p-4 sm:p-6 mb-6 sm:mb-8 border border-slate-200/90 shadow-sm space-y-4">
        
        {/* Title & Live Counter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-sky-600" />
              <span>دليل أفراد عائلة البوحسون</span>
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5">
              بحث متقدم وتصفية شاملة لجميع السجلات والبيانات الأسرية
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-600">النتائج المعروضة:</span>
            <span className="px-3 py-1 rounded-full bg-slate-100 text-sky-700 font-mono font-bold border border-slate-200">
              {filteredMembers.length} من {members.length} فرد
            </span>
          </div>
        </div>

        {/* Search input with live clear */}
        <div className="relative">
          <Search className="w-4 h-4 sm:w-5 sm:h-5 text-sky-600 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث بالاسم الكامل أو اسم الشهرة أو الأب أو الزوجة (مثال: الوجيه، أبو حسن، النوخذة)..."
            className="w-full bg-white border border-slate-300 rounded-2xl pr-10 sm:pr-12 pl-4 py-2.5 sm:py-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition-colors"
            >
              مسح
            </button>
          )}
        </div>

        {/* Filter Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          {/* Sub-Family Lineage Filter */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80 overflow-x-auto max-w-full">
            <button
              onClick={() => setSubFamilyFilter('all')}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                subFamilyFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              كافة الوسوم
            </button>
            <button
              onClick={() => setSubFamilyFilter('albuhasson')}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                subFamilyFilter === 'albuhasson'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-sky-800 hover:bg-white/60'
              }`}
              title="تصفية حسب وسم البوحسون"
            >
              <Award className="w-3.5 h-3.5 text-sky-600" />
              <span>البوحسون</span>
            </button>
            <button
              onClick={() => setSubFamilyFilter('alnesf')}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                subFamilyFilter === 'alnesf'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-indigo-800 hover:bg-white/60'
              }`}
              title="تصفية حسب وسم النصف"
            >
              <Gem className="w-3.5 h-3.5 text-indigo-600" />
              <span>النصف</span>
            </button>
            <button
              onClick={() => setSubFamilyFilter('aldarwish')}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                subFamilyFilter === 'aldarwish'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-amber-800 hover:bg-white/60'
              }`}
              title="تصفية حسب وسم الدرويش"
            >
              <Flame className="w-3.5 h-3.5 text-amber-600" />
              <span>الدرويش</span>
            </button>
            <button
              onClick={() => setSubFamilyFilter('alazraq')}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                subFamilyFilter === 'alazraq'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-cyan-800 hover:bg-white/60'
              }`}
              title="تصفية حسب وسم الأزرق"
            >
              <Waves className="w-3.5 h-3.5 text-cyan-600" />
              <span>الأزرق</span>
            </button>
            <button
              onClick={() => setSubFamilyFilter('jaber')}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                subFamilyFilter === 'jaber'
                  ? 'bg-amber-700 text-white shadow-sm'
                  : 'text-amber-900 hover:bg-white/60'
              }`}
              title="تصفية حسب وسم آل جابر"
            >
              <Crown className="w-3.5 h-3.5 text-amber-600" />
              <span>آل جابر</span>
            </button>
            <button
              onClick={() => setSubFamilyFilter('nawasir')}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                subFamilyFilter === 'nawasir'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-teal-800 hover:bg-white/60'
              }`}
              title="تصفية حسب وسم النواصر"
            >
              <Shield className="w-3.5 h-3.5 text-teal-600" />
              <span>النواصر</span>
            </button>
          </div>

          {/* Gender filters */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setGenderFilter('all')}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                genderFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setGenderFilter('male')}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                genderFilter === 'male' ? 'bg-sky-50 text-sky-800 border border-sky-300 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الذكور
            </button>
            <button
              onClick={() => setGenderFilter('female')}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                genderFilter === 'female' ? 'bg-rose-50 text-rose-800 border border-rose-300 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الإناث
            </button>
          </div>

          {/* Status filters */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              كافة الحالات
            </button>
            <button
              onClick={() => setStatusFilter('living')}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === 'living' ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              أحياء
            </button>
            <button
              onClick={() => setStatusFilter('deceased')}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === 'deceased' ? 'bg-slate-200 text-slate-800 border border-slate-300 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              متوفون
            </button>
          </div>

          {/* Dropdown selectors: Branch, Generation, Sort */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-white border border-slate-300 text-slate-800 text-xs rounded-xl px-2.5 sm:px-3 py-2 focus:outline-none focus:border-sky-500 shadow-sm"
            >
              <option value="all">كافة الفروع</option>
              {branches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            <select
              value={selectedGen}
              onChange={(e) => setSelectedGen(e.target.value)}
              className="bg-white border border-slate-300 text-slate-800 text-xs rounded-xl px-2.5 sm:px-3 py-2 focus:outline-none focus:border-sky-500 shadow-sm"
            >
              <option value="all">كافة الأجيال</option>
              {generations.map(g => (
                <option key={g} value={String(g)}>الجيل {g}</option>
              ))}
            </select>

            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 shadow-sm">
              <ArrowUpDown className="w-3.5 h-3.5 text-sky-600" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-slate-800 text-xs focus:outline-none font-medium"
              >
                <option value="generation">الأجيال</option>
                <option value="birth">الميلاد</option>
                <option value="name">أبجدي</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Members Cards Grid */}
      {filteredMembers.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 sm:p-16 text-center text-slate-600 border border-slate-200">
          <p className="text-base text-slate-800 font-semibold mb-2">لا توجد نتائج مطابقة لمعايير البحث الحالية.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setGenderFilter('all');
              setStatusFilter('all');
              setSelectedBranch('all');
              setSelectedGen('all');
            }}
            className="text-xs text-sky-700 hover:underline font-bold"
          >
            إعادة تعيين كافة المرشحات
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4 sm:gap-5">
          {filteredMembers.map(member => {
            const isMale = member.gender === 'male';
            const father = member.father_id ? memberMap.get(member.father_id) : null;

            return (
              <div
                key={member.id}
                className={`rounded-2xl p-5 flex flex-col justify-between border transition-all duration-300 hover:-translate-y-1 ${
                  isMale
                    ? member.is_living
                      ? 'glass-card border-sky-300/80 shadow-sm'
                      : 'bg-white border-slate-300 shadow-sm'
                    : member.is_living
                    ? 'glass-card-female border-rose-300/90 shadow-sm'
                    : 'bg-white border-purple-200 shadow-sm'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start gap-3.5 mb-3">
                    {/* Avatar */}
                    <div className="shrink-0 relative">
                      {isMale ? (
                        member.avatar_url ? (
                          <img
                            src={member.avatar_url}
                            alt={member.full_name}
                            referrerPolicy="no-referrer"
                            className="w-13 h-13 rounded-xl object-cover border border-sky-300 shadow-sm"
                          />
                        ) : (
                          <div className="w-13 h-13 rounded-xl bg-gradient-to-br from-sky-50 to-slate-100 border border-sky-200 flex items-center justify-center text-sky-800 font-bold text-lg shadow-inner">
                            {member.full_name.charAt(0)}
                          </div>
                        )
                      ) : (
                        /* Strictly NO photo for females */
                        <div className="w-13 h-13 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shadow-inner">
                          <FemaleHeritageBadge size={30} />
                        </div>
                      )}
                      <span className="absolute -bottom-1 -left-1 text-[9px] font-mono px-1.5 py-0.2 rounded font-bold bg-white border border-slate-300 text-slate-700 shadow-xs">
                        G{member.generation || 1}
                      </span>
                    </div>

                    {/* Titles & Status */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            member.is_living
                              ? isMale
                                ? 'bg-sky-50 text-sky-800 border border-sky-200'
                                : 'bg-rose-50 text-rose-800 border border-rose-200'
                              : isMale
                              ? 'bg-slate-100 text-amber-900 border border-amber-300'
                              : 'bg-slate-100 text-rose-900 border border-rose-300'
                          }`}
                        >
                          {member.is_living
                            ? isMale ? '● حي يُرزق' : '● حفظها الله'
                            : isMale ? 'رحمه الله' : 'رحمها الله'}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {member.birth_date} {member.death_date ? `- ${member.death_date}` : ''}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 truncate" title={member.full_name}>
                        {member.full_name}
                      </h3>

                      {member.nickname && (
                        <p className={`text-xs font-semibold truncate ${isMale ? 'text-sky-700' : 'text-rose-700'}`}>
                          {member.nickname}
                        </p>
                      )}

                      <div className="mt-1.5">
                        <SubFamilyBadge member={member} memberMap={memberMap} size="xs" />
                      </div>
                    </div>
                  </div>

                  {/* Father & Branch metadata */}
                  <div className="text-xs text-slate-700 space-y-1.5 mb-3 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/70">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">الأب:</span>
                      <span className="text-slate-900 font-semibold truncate max-w-[180px]">
                        {father ? father.full_name : 'الجد المؤسس (الأصل)'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">الفرع العائلي:</span>
                      <span className="text-sky-800 font-semibold">{member.branch || 'الفرع العام'}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">وسم النسب:</span>
                      <SubFamilyBadge member={member} memberMap={memberMap} size="xs" />
                    </div>

                    {isMale ? (
                      member.spouse_info && (
                        <div className="flex items-center justify-between text-[11px] truncate">
                          <span className="text-slate-500 shrink-0">الزوجات:</span>
                          <span className="text-slate-800 truncate">{member.spouse_info}</span>
                        </div>
                      )
                    ) : (
                      <>
                        {member.spouse_info && (
                          <div className="flex items-center justify-between text-[11px] truncate">
                            <span className="text-slate-500 shrink-0">الزوج:</span>
                            <span className="text-slate-800 truncate">{member.spouse_info}</span>
                          </div>
                        )}
                        {member.children_summary && (
                          <div className="flex items-center justify-between text-[11px] truncate">
                            <span className="text-slate-500 shrink-0">الأبناء:</span>
                            <span className="text-slate-800 truncate">{member.children_summary}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Bio or Notes Preview */}
                  {isMale && member.bio && (
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 mb-3">
                      {member.bio}
                    </p>
                  )}
                  {!isMale && member.notes && (
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 mb-3">
                      {member.notes}
                    </p>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200 text-xs">
                  <button
                    onClick={() => onViewLineage(member)}
                    title="تتبع مسار نسب الأجداد حتى المؤسس"
                    className="flex-1 py-1.5 px-2 rounded-xl glass-btn text-slate-700 hover:text-slate-900 flex items-center justify-center gap-1 text-[11px] font-semibold"
                  >
                    <GitFork className="w-3.5 h-3.5 text-sky-600" />
                    <span>مسار النسب</span>
                  </button>

                  <button
                    onClick={() => onSelectMember(member)}
                    className="flex-1 py-1.5 px-2 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-900 flex items-center justify-center gap-1 text-[11px] font-bold shadow-xs transition-all"
                  >
                    <Eye className="w-3.5 h-3.5 text-sky-700" />
                    <span>تفاصيل السجل</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
