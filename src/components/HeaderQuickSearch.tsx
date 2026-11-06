import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FamilyMember } from '../types/family';
import { matchesArabic } from '../utils/arabicUtils';
import { FemaleHeritageBadge } from './HeritageCrest';
import { SubFamilyBadge } from './SubFamilyBadge';
import { Search, X, User, Heart, Sparkles, ArrowLeft, Command } from 'lucide-react';

interface HeaderQuickSearchProps {
  members: FamilyMember[];
  memberMap?: Map<string, FamilyMember>;
  onSelectMember: (member: FamilyMember) => void;
  className?: string;
}

export const HeaderQuickSearch: React.FC<HeaderQuickSearchProps> = ({
  members,
  memberMap,
  onSelectMember,
  className = ''
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (inputRef.current) {
          inputRef.current.focus();
          setIsOpen(true);
        } else if (mobileInputRef.current) {
          setIsMobileSearchOpen(true);
          setTimeout(() => mobileInputRef.current?.focus(), 50);
        }
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        setIsMobileSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter members based on search query
  const filteredResults = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return [];

    return members
      .filter((m) => {
        if (matchesArabic(m.full_name, trimmed)) return true;
        if (m.nickname && matchesArabic(m.nickname, trimmed)) return true;
        if (m.branch && matchesArabic(m.branch, trimmed)) return true;
        if (m.spouse_info && matchesArabic(m.spouse_info, trimmed)) return true;
        if (m.sub_family && matchesArabic(m.sub_family, trimmed)) return true;
        return false;
      })
      .sort((a, b) => {
        // Exact / start-of-name match gets top priority
        const aName = matchesArabic(a.full_name, trimmed);
        const bName = matchesArabic(b.full_name, trimmed);
        if (aName && !bName) return -1;
        if (!aName && bName) return 1;
        // Then sort by generation
        return (a.generation || 1) - (b.generation || 1);
      });
  }, [members, query]);

  const displayedResults = useMemo(() => {
    return filteredResults.slice(0, 10);
  }, [filteredResults]);

  const handleSelect = (member: FamilyMember) => {
    onSelectMember(member);
    setIsOpen(false);
    setIsMobileSearchOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || displayedResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < displayedResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : displayedResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < displayedResults.length) {
        handleSelect(displayedResults[selectedIndex]);
      } else if (displayedResults.length > 0) {
        handleSelect(displayedResults[0]);
      }
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Desktop & Tablet Search Bar */}
      <div className="hidden sm:block relative w-full">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-sky-600 absolute right-3 pointer-events-none transition-colors" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
              setSelectedIndex(-1);
            }}
            onFocus={() => {
              if (query.trim()) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="بحث سريع بالاسم أو الشهرة..."
            className="w-full bg-slate-50/90 hover:bg-slate-100/70 focus:bg-white text-xs text-slate-900 placeholder-slate-400 pl-8 pr-9 py-1.5 sm:py-2 rounded-xl border border-slate-300 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all shadow-xs"
          />

          {/* Clear Button or Cmd+K Badge */}
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              className="absolute left-2.5 p-0.5 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
              title="مسح البحث"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden lg:flex items-center gap-0.5 absolute left-2 px-1.5 py-0.5 text-[9px] font-mono text-slate-500 bg-slate-100 border border-slate-200 rounded pointer-events-none">
              <Command className="w-2.5 h-2.5" />
              <span>K</span>
            </kbd>
          )}
        </div>
      </div>

      {/* Mobile Search Icon Trigger */}
      <div className="sm:hidden">
        <button
          type="button"
          onClick={() => {
            setIsMobileSearchOpen(true);
            setTimeout(() => mobileInputRef.current?.focus(), 80);
          }}
          className="min-h-[44px] min-w-[44px] rounded-xl glass-btn text-sky-600 hover:text-sky-800 flex items-center justify-center transition-all"
          title="بحث سريع بالاسم"
        >
          <Search className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile Expandable Search Drawer / Fullscreen Bar */}
      {isMobileSearchOpen && (
        <div className="fixed inset-x-0 top-0 z-50 p-3 sm:hidden bg-white/98 border-b border-slate-200/90 backdrop-blur-2xl shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsMobileSearchOpen(false);
                setQuery('');
              }}
              className="min-h-[44px] min-w-[44px] rounded-xl glass-btn text-slate-700 hover:text-slate-900 flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="relative flex-1 flex items-center">
              <Search className="w-4 h-4 text-sky-600 absolute right-3 pointer-events-none" />
              <input
                ref={mobileInputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setIsOpen(true);
                }}
                placeholder="ابحث بالاسم أو اسم الشهرة..."
                className="w-full bg-slate-50 text-sm text-slate-900 placeholder-slate-400 pr-9 pl-8 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-sky-500 focus:bg-white shadow-xs"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    mobileInputRef.current?.focus();
                  }}
                  className="absolute left-2.5 p-1 rounded-md text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Mobile Instant Results List */}
          {query.trim().length > 0 && (
            <div className="mt-3 max-h-[70vh] overflow-y-auto space-y-1.5 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between px-1 pb-1 text-[11px] text-slate-500 font-medium">
                <span>نتائج البحث ({filteredResults.length})</span>
                {filteredResults.length > 10 && <span>عرض أول 10 أفراد</span>}
              </div>

              {filteredResults.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  <p>لا توجد نتائج مطابقة لـ "{query}"</p>
                  <p className="text-[11px] text-slate-400 mt-1">جرّب البحث باسم آخر أو اسم الشهرة</p>
                </div>
              ) : (
                displayedResults.map((m) => {
                  const isMale = m.gender === 'male';
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleSelect(m)}
                      className="w-full min-h-[52px] flex items-center gap-3 p-2.5 rounded-xl text-right transition-all bg-slate-50 hover:bg-slate-100 border border-slate-200 active:scale-[0.99]"
                    >
                      {/* Avatar */}
                      <div className="shrink-0 relative">
                        {isMale ? (
                          m.avatar_url ? (
                            <img
                              src={m.avatar_url}
                              alt={m.full_name}
                              className="w-9 h-9 rounded-lg object-cover border border-sky-300"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-sky-100 border border-sky-300 flex items-center justify-center text-sky-800 font-bold text-xs">
                              {m.full_name.charAt(0)}
                            </div>
                          )
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center">
                            <FemaleHeritageBadge size={22} />
                          </div>
                        )}
                        <span className="absolute -bottom-1 -left-1 text-[8px] font-mono px-1 rounded bg-slate-100 border border-slate-300 text-slate-700">
                          G{m.generation || 1}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-xs font-bold text-slate-900 truncate">{m.full_name}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded-full font-medium shrink-0 ${
                              m.is_living
                                ? isMale
                                  ? 'bg-sky-50 text-sky-800 border border-sky-200'
                                  : 'bg-rose-50 text-rose-800 border border-rose-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {m.is_living ? (isMale ? 'حي' : 'حية') : isMale ? 'رحمه الله' : 'رحمها الله'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 truncate">
                          {m.nickname && (
                            <span className={isMale ? 'text-sky-700 font-medium' : 'text-rose-700 font-medium'}>{m.nickname}</span>
                          )}
                          <span>·</span>
                          <span>{m.branch || 'الفرع العام'}</span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* Desktop Instant Dropdown Popover */}
      {isOpen && query.trim().length > 0 && (
        <div className="hidden sm:block absolute top-full right-0 mt-2 w-80 md:w-96 glass-panel rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150 text-right">
          <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-slate-100 text-[11px] text-slate-500">
            <span className="font-semibold text-sky-700 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-sky-600" />
              <span>نتائج البحث الفورية ({filteredResults.length})</span>
            </span>
            <span className="text-[10px] text-slate-400">اختر بالأسهم ↵ أو انقر</span>
          </div>

          <div className="max-h-[380px] overflow-y-auto mt-1 space-y-1 pr-0.5">
            {filteredResults.length === 0 ? (
              <div className="py-6 px-3 text-center text-xs text-slate-500">
                <p>لا توجد نتائج مطابقة لـ "{query}"</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  يمكنك البحث بالاسم الأول أو اسم الشهرة (مثال: الوجيه، النوخذة)
                </p>
              </div>
            ) : (
              displayedResults.map((m, idx) => {
                const isMale = m.gender === 'male';
                const isSelected = selectedIndex === idx;

                return (
                  <div
                    key={m.id}
                    onClick={() => handleSelect(m)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between gap-3 p-2 rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? isMale
                          ? 'bg-sky-50 border-sky-300 text-slate-900'
                          : 'bg-rose-50 border-rose-300 text-slate-900'
                        : 'border-transparent hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Avatar */}
                      <div className="shrink-0 relative">
                        {isMale ? (
                          m.avatar_url ? (
                            <img
                              src={m.avatar_url}
                              alt={m.full_name}
                              className="w-9 h-9 rounded-lg object-cover border border-sky-300"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-sky-100 border border-sky-300 flex items-center justify-center text-sky-800 font-bold text-xs shadow-xs">
                              {m.full_name.charAt(0)}
                            </div>
                          )
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center shadow-xs">
                            <FemaleHeritageBadge size={22} />
                          </div>
                        )}
                        <span className="absolute -bottom-1 -left-1 text-[8px] font-mono px-1 rounded bg-slate-100 border border-slate-300 text-slate-700">
                          G{m.generation || 1}
                        </span>
                      </div>

                      {/* Name & Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <h4 className="text-xs font-bold text-slate-900 truncate leading-tight">
                            {m.full_name}
                          </h4>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded-full font-medium shrink-0 ${
                              m.is_living
                                ? isMale
                                  ? 'bg-sky-50 text-sky-800 border border-sky-200'
                                  : 'bg-rose-50 text-rose-800 border border-rose-200'
                                : isMale
                                ? 'bg-slate-100 text-slate-700 border border-slate-300'
                                : 'bg-rose-100/60 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {m.is_living
                              ? isMale ? 'حي يُرزق' : 'حفظها الله'
                              : isMale ? 'رحمه الله' : 'رحمها الله'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                          {m.nickname && (
                            <span className={`font-semibold ${isMale ? 'text-sky-700' : 'text-rose-700'}`}>
                              {m.nickname}
                            </span>
                          )}
                          <span>·</span>
                          <span className="truncate max-w-[110px]">{m.branch || 'الفرع العام'}</span>
                          {m.birth_date && (
                            <>
                              <span>·</span>
                              <span className="font-mono text-slate-400">{m.birth_date}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] text-sky-600 shrink-0 font-medium">
                      فتح ←
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {filteredResults.length > 10 && (
            <div className="pt-1.5 mt-1 border-t border-slate-100 text-center text-[10px] text-slate-400">
              يوجد {filteredResults.length - 10} نتائج إضافية، حدد بحثك لرؤيتها
            </div>
          )}
        </div>
      )}
    </div>
  );
};
