import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { FamilyMember } from '../types/family';
import { MemberNode } from './MemberNode';
import { matchesArabic } from '../utils/arabicUtils';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  Filter,
  Maximize2,
  Minimize2,
  Layers,
  LayoutGrid,
  Network,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface TreeViewProps {
  members: FamilyMember[];
  onSelectMember: (member: FamilyMember) => void;
}

export const TreeView: React.FC<TreeViewProps> = ({ members, onSelectMember }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Layout presentation mode: 'canvas' (2D interactive Pan/Zoom) | 'flow' (Responsive cascading hierarchy)
  const [layoutMode, setLayoutMode] = useState<'canvas' | 'flow'>('canvas');

  // Pan & Zoom state
  const [scale, setScale] = useState(0.85);
  const [position, setPosition] = useState({ x: 0, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Touch gesture state for pinch-to-zoom
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchDistanceRef = useRef<number | null>(null);
  const initialScaleRef = useRef<number>(0.85);

  // Filtering & Tree controls
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Adapt initial scale for mobile screen sizes
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 640) {
        setScale(prev => (prev === 0.85 ? 0.65 : prev));
      } else if (w >= 1440) {
        setScale(prev => (prev === 0.85 ? 0.95 : prev));
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Distinct branches
  const branches = useMemo(() => {
    const set = new Set<string>();
    members.forEach(m => {
      if (m.branch) set.add(m.branch);
    });
    return Array.from(set);
  }, [members]);

  // Build lookup maps
  const { memberMap, childrenMap, rootMembers } = useMemo(() => {
    const map = new Map<string, FamilyMember>();
    const cMap = new Map<string, FamilyMember[]>();
    const roots: FamilyMember[] = [];

    members.forEach(m => {
      map.set(m.id, m);
      if (!m.father_id) {
        roots.push(m);
      } else {
        const arr = cMap.get(m.father_id) || [];
        arr.push(m);
        cMap.set(m.father_id, arr);
      }
    });

    roots.sort((a, b) => parseInt(a.birth_date || '0') - parseInt(b.birth_date || '0'));
    cMap.forEach(arr => arr.sort((a, b) => parseInt(a.birth_date || '0') - parseInt(b.birth_date || '0')));

    return { memberMap: map, childrenMap: cMap, rootMembers: roots };
  }, [members]);

  // Group members into generational tiers
  const generationTiers = useMemo(() => {
    const tiers: Record<number, FamilyMember[]> = {};
    let maxGen = 1;

    members.forEach(m => {
      const g = m.generation || 1;
      if (g > maxGen) maxGen = g;
      if (!tiers[g]) tiers[g] = [];
      tiers[g].push(m);
    });

    return { tiers, maxGen };
  }, [members]);

  // Toggle node collapse
  const handleToggleCollapse = (id: string) => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExpandAll = () => setCollapsedIds(new Set());
  const handleCollapseAll = () => {
    const idsWithChildren = new Set<string>();
    childrenMap.forEach((_, parentId) => idsWithChildren.add(parentId));
    setCollapsedIds(idsWithChildren);
  };

  // Mouse Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button, input, select, a')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setScale(prev => Math.min(Math.max(0.35, prev * zoomFactor), 1.6));
  };

  // Touch Handlers (1-finger pan, 2-finger pinch zoom)
  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select, a')) return;

    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      };
      touchDistanceRef.current = null;
    } else if (e.touches.length === 2) {
      // 2 fingers pinch
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchDistanceRef.current = Math.hypot(dx, dy);
      initialScaleRef.current = scale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && touchStartRef.current) {
      setPosition({
        x: e.touches[0].clientX - touchStartRef.current.x,
        y: e.touches[0].clientY - touchStartRef.current.y
      });
    } else if (e.touches.length === 2 && touchDistanceRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDistance = Math.hypot(dx, dy);
      const ratio = newDistance / touchDistanceRef.current;
      setScale(Math.min(Math.max(0.35, initialScaleRef.current * ratio), 1.6));
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
    touchDistanceRef.current = null;
  };

  const resetView = () => {
    const isMobile = window.innerWidth < 640;
    setScale(isMobile ? 0.65 : 0.85);
    setPosition({ x: 0, y: 20 });
  };

  const getGenerationLabel = (gen: number) => {
    switch (gen) {
      case 1:
        return 'الجيل الأول: الجد المؤسس';
      case 2:
        return 'الجيل الثاني: الأبناء وكبار العائلة';
      case 3:
        return 'الجيل الثالث: الأحفاد والوجهاء';
      case 4:
        return 'الجيل الرابع: جيل الكفاءات المعاصرة';
      case 5:
        return 'الجيل الخامس: الشباب والنشء الواعد';
      default:
        return `الجيل ${gen}`;
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-130px)] min-h-[580px] overflow-hidden bg-radial from-emerald-950/20 via-slate-950 to-slate-950 flex flex-col">
      
      {/* Floating Dynamic Toolbar (Apple Liquid Glass Controls) */}
      <div className="absolute top-3 right-3 left-3 z-30 flex flex-col gap-2 pointer-events-none">
        
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Search bar + filter toggle */}
          <div className="pointer-events-auto flex items-center gap-1.5 glass-panel p-1.5 rounded-2xl shadow-lg border border-emerald-500/20 flex-1 max-w-xl">
            <div className="relative flex-1 min-w-[140px] sm:min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-emerald-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم أو اللقب..."
                className="w-full bg-slate-900/80 border border-emerald-500/20 rounded-xl pr-8 pl-2.5 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400/60"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Desktop Branch & Gender selects */}
            <div className="hidden sm:flex items-center gap-1.5">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="bg-slate-900/80 border border-emerald-500/20 text-slate-200 text-xs rounded-xl px-2 py-1.5 focus:outline-none"
              >
                <option value="all">كافة الفروع</option>
                {branches.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value as any)}
                className="bg-slate-900/80 border border-emerald-500/20 text-slate-200 text-xs rounded-xl px-2 py-1.5 focus:outline-none"
              >
                <option value="all">الكل</option>
                <option value="male">الذكور</option>
                <option value="female">الإناث</option>
              </select>
            </div>

            {/* Mobile filters toggle button */}
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="sm:hidden w-8 h-8 rounded-xl glass-btn flex items-center justify-center text-slate-300"
              title="تصفية الفروع والجنس"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
            </button>
          </div>

          {/* Right Toolbar: View Mode Toggle & Zoom Controls */}
          <div className="pointer-events-auto flex items-center gap-1.5 glass-panel p-1.5 rounded-2xl shadow-lg border border-emerald-500/20">
            
            {/* Layout Mode Switcher */}
            <div className="flex items-center bg-slate-900/80 rounded-xl p-0.5 border border-white/5">
              <button
                onClick={() => setLayoutMode('canvas')}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg transition-colors ${
                  layoutMode === 'canvas'
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="عرض القماش الشجري الحر (Pan & Zoom)"
              >
                <Network className="w-3.5 h-3.5" />
                <span className="hidden md:inline">مخطط حر</span>
              </button>
              <button
                onClick={() => setLayoutMode('flow')}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg transition-colors ${
                  layoutMode === 'flow'
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="عرض التدفق الهرمي السلس (مثالي للجوال)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden md:inline">تدفق سلس</span>
              </button>
            </div>

            {/* Zoom Controls (only active in canvas mode) */}
            {layoutMode === 'canvas' && (
              <>
                <button
                  onClick={() => setScale(prev => Math.min(prev + 0.15, 1.6))}
                  title="تكبير"
                  className="w-8 h-8 rounded-xl glass-btn flex items-center justify-center text-slate-200 hover:text-white active:scale-95"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setScale(prev => Math.max(prev - 0.15, 0.35))}
                  title="تصغير"
                  className="w-8 h-8 rounded-xl glass-btn flex items-center justify-center text-slate-200 hover:text-white active:scale-95"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={resetView}
                  title="إعادة التوسيط"
                  className="w-8 h-8 rounded-xl glass-btn flex items-center justify-center text-slate-200 hover:text-white active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            <button
              onClick={handleExpandAll}
              title="توسيع كافة الفروع"
              className="hidden lg:flex px-2 h-8 rounded-xl glass-btn text-[11px] font-medium text-emerald-300 items-center gap-1"
            >
              <Maximize2 className="w-3 h-3" />
              <span>توسيع</span>
            </button>
          </div>
        </div>

        {/* Collapsible Mobile Filters Dropdown */}
        {showMobileFilters && (
          <div className="sm:hidden pointer-events-auto glass-panel p-3 rounded-2xl border border-emerald-500/25 grid grid-cols-2 gap-2 animate-in fade-in duration-150">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">الفرع العائلي:</label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full bg-slate-900 border border-emerald-500/30 text-white text-xs rounded-lg p-1.5 focus:outline-none"
              >
                <option value="all">كافة الفروع</option>
                {branches.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">الجنس:</label>
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value as any)}
                className="w-full bg-slate-900 border border-emerald-500/30 text-white text-xs rounded-lg p-1.5 focus:outline-none"
              >
                <option value="all">الكل</option>
                <option value="male">الذكور</option>
                <option value="female">الإناث</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area based on Layout Mode */}
      {layoutMode === 'canvas' ? (
        /* MODE A: 2D Interactive Pan & Zoom Canvas with Touch Gestures */
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`w-full h-full flex-1 cursor-grab select-none relative touch-none ${
            isDragging ? 'cursor-grabbing' : ''
          }`}
        >
          {/* Dot Grid Background */}
          <div
            className="absolute inset-0 opacity-[0.06] pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle, #34d399 1px, transparent 1px)`,
              backgroundSize: '24px 24px'
            }}
          />

          {/* Transformed Content */}
          <div
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: 'top center',
              transition: isDragging || touchDistanceRef.current ? 'none' : 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            className="w-max min-w-[900px] md:min-w-[1200px] flex flex-col items-center py-20 px-6 sm:px-12"
          >
            {Array.from({ length: generationTiers.maxGen }, (_, i) => i + 1).map(genNum => {
              const rawMembersInGen = generationTiers.tiers[genNum] || [];

              const filteredMembers = rawMembersInGen.filter(m => {
                if (selectedBranch !== 'all' && m.branch !== selectedBranch) return false;
                if (genderFilter !== 'all' && m.gender !== genderFilter) return false;
                let curFatherId = m.father_id;
                while (curFatherId) {
                  if (collapsedIds.has(curFatherId)) return false;
                  const parent = memberMap.get(curFatherId);
                  curFatherId = parent ? parent.father_id : null;
                }
                return true;
              });

              if (filteredMembers.length === 0) return null;

              return (
                <div key={genNum} className="w-full flex flex-col items-center mb-14 relative">
                  
                  {/* Generational Header Ribbon */}
                  <div className="flex items-center gap-2 sm:gap-3 mb-6">
                    <div className="h-[1px] w-12 sm:w-24 bg-gradient-to-r from-transparent to-emerald-500/40" />
                    <div className="px-3 sm:px-4 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs font-semibold tracking-wide shadow-sm flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{getGenerationLabel(genNum)}</span>
                      <span className="text-[10px] text-emerald-500 font-mono">({filteredMembers.length})</span>
                    </div>
                    <div className="h-[1px] w-12 sm:w-24 bg-gradient-to-l from-transparent to-emerald-500/40" />
                  </div>

                  {/* Nodes Grid */}
                  <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 max-w-7xl">
                    {filteredMembers.map(member => {
                      const hasChildren = (childrenMap.get(member.id)?.length || 0) > 0;
                      const isCollapsed = collapsedIds.has(member.id);
                      const isMatch = searchQuery
                        ? matchesArabic(member.full_name, searchQuery) ||
                          matchesArabic(member.nickname, searchQuery)
                        : false;

                      return (
                        <MemberNode
                          key={member.id}
                          member={member}
                          onSelect={onSelectMember}
                          hasChildren={hasChildren}
                          isCollapsed={isCollapsed}
                          onToggleCollapse={() => handleToggleCollapse(member.id)}
                          isHighlighted={isMatch}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* MODE B: Responsive Cascading Flow (Optimized for Mobile thumb scroll & fluid resize) */
        <div className="w-full h-full flex-1 overflow-y-auto px-4 py-20 max-w-5xl mx-auto space-y-10">
          {Array.from({ length: generationTiers.maxGen }, (_, i) => i + 1).map(genNum => {
            const rawMembersInGen = generationTiers.tiers[genNum] || [];

            const filteredMembers = rawMembersInGen.filter(m => {
              if (selectedBranch !== 'all' && m.branch !== selectedBranch) return false;
              if (genderFilter !== 'all' && m.gender !== genderFilter) return false;
              return true;
            });

            if (filteredMembers.length === 0) return null;

            return (
              <section key={genNum} className="space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      {getGenerationLabel(genNum)}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    {filteredMembers.length} فرد
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredMembers.map(member => {
                    const isMatch = searchQuery
                      ? matchesArabic(member.full_name, searchQuery) ||
                        matchesArabic(member.nickname, searchQuery)
                      : false;

                    return (
                      <div key={member.id} className="flex justify-center">
                        <MemberNode
                          member={member}
                          onSelect={onSelectMember}
                          isHighlighted={isMatch}
                        />
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Floating Bottom Canvas Status Hint */}
      {layoutMode === 'canvas' && (
        <div className="absolute bottom-3 left-4 right-4 z-20 flex items-center justify-between text-[11px] text-slate-400 glass-panel px-3.5 py-1.5 rounded-xl border border-emerald-500/15 pointer-events-none">
          <span className="truncate">اسحب للتنقل · قرّب بأصبعين للتكبير · انقر لفتح السجل</span>
          <span className="font-mono text-emerald-400 text-xs shrink-0 mr-2">
            {Math.round(scale * 100)}%
          </span>
        </div>
      )}
    </div>
  );
};
