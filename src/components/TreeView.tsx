import React, { useState, useRef, useMemo, useEffect } from 'react';
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
  ChevronRight,
  EyeOff
} from 'lucide-react';

interface TreeViewProps {
  members: FamilyMember[];
  onSelectMember: (member: FamilyMember) => void;
}

export const TreeView: React.FC<TreeViewProps> = ({ members, onSelectMember }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Pan & Zoom state
  const [scale, setScale] = useState(0.9);
  const [position, setPosition] = useState({ x: 0, y: 30 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Filtering & Tree controls
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

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

    // Sort roots & children by birth year
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

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only main left click
    // Don't drag if clicked on a button or node
    if ((e.target as HTMLElement).closest('button, input, select')) return;
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
    setScale(prev => Math.min(Math.max(0.4, prev * zoomFactor), 1.6));
  };

  const resetView = () => {
    setScale(0.9);
    setPosition({ x: 0, y: 30 });
  };

  // Generation label titles in Arabic
  const getGenerationLabel = (gen: number) => {
    switch (gen) {
      case 1:
        return 'الجيل الأول: الجد المؤسس';
      case 2:
        return 'الجيل الثاني: الأبناء وكبار العائلة';
      case 3:
        return 'الجيل الثالث: الأحفاد والوجهاء';
      case 4:
        return 'الجيل الرابع: جيل الكفاءات ورواد الأعمال';
      case 5:
        return 'الجيل الخامس: الشباب والنشء الواعد';
      default:
        return `الجيل ${gen}`;
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-140px)] min-h-[600px] overflow-hidden bg-radial from-emerald-950/20 via-slate-950 to-slate-950 flex flex-col">
      {/* Floating Toolbar (Apple Liquid Glass Controls) */}
      <div className="absolute top-4 right-4 left-4 z-30 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        
        {/* Search & Branch Filter bar */}
        <div className="pointer-events-auto flex items-center gap-2 glass-panel p-1.5 rounded-2xl max-w-xl shadow-lg border border-emerald-500/20">
          <div className="relative flex-1 min-w-[180px] md:min-w-[260px]">
            <Search className="w-4 h-4 text-emerald-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم أو اسم الشهرة..."
              className="w-full bg-slate-900/80 border border-emerald-500/20 rounded-xl pr-9 pl-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400/60"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="bg-slate-900/80 border border-emerald-500/20 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-emerald-400/60"
          >
            <option value="all">كافة الفروع</option>
            {branches.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value as any)}
            className="bg-slate-900/80 border border-emerald-500/20 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-emerald-400/60"
          >
            <option value="all">الكل</option>
            <option value="male">الذكور</option>
            <option value="female">الإناث</option>
          </select>
        </div>

        {/* Zoom & Canvas Navigation Controls */}
        <div className="pointer-events-auto flex items-center gap-1.5 glass-panel p-1.5 rounded-2xl shadow-lg border border-emerald-500/20">
          <button
            onClick={() => setScale(prev => Math.min(prev + 0.15, 1.6))}
            title="تكبير"
            className="w-8 h-8 rounded-xl glass-btn flex items-center justify-center text-slate-200 hover:text-white"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setScale(prev => Math.max(prev - 0.15, 0.4))}
            title="تصغير"
            className="w-8 h-8 rounded-xl glass-btn flex items-center justify-center text-slate-200 hover:text-white"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={resetView}
            title="إعادة التوسيط"
            className="w-8 h-8 rounded-xl glass-btn flex items-center justify-center text-slate-200 hover:text-white"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-5 bg-emerald-500/20 mx-0.5" />

          <button
            onClick={handleExpandAll}
            title="توسيع كافة الفروع"
            className="px-2.5 h-8 rounded-xl glass-btn text-[11px] font-medium text-emerald-300 flex items-center gap-1"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">توسيع الكل</span>
          </button>

          <button
            onClick={handleCollapseAll}
            title="طي الفروع"
            className="px-2.5 h-8 rounded-xl glass-btn text-[11px] font-medium text-slate-300 flex items-center gap-1"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">طي الكل</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Pan & Zoom Area */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className={`w-full h-full flex-1 cursor-grab select-none relative ${
          isDragging ? 'cursor-grabbing' : ''
        }`}
      >
        {/* Subtle grid pattern background */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, #34d399 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />

        {/* Transformed Canvas Container */}
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'top center',
            transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          className="min-w-[1200px] flex flex-col items-center py-16 px-12"
        >
          {/* Generations Stack */}
          {Array.from({ length: generationTiers.maxGen }, (_, i) => i + 1).map(genNum => {
            const rawMembersInGen = generationTiers.tiers[genNum] || [];

            // Apply filters
            const filteredMembers = rawMembersInGen.filter(m => {
              if (selectedBranch !== 'all' && m.branch !== selectedBranch) return false;
              if (genderFilter !== 'all' && m.gender !== genderFilter) return false;
              // Check if ancestor is collapsed
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
              <div key={genNum} className="w-full flex flex-col items-center mb-16 relative">
                
                {/* Generational Header Ribbon */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-[1px] w-24 bg-gradient-to-r from-transparent to-emerald-500/40" />
                  <div className="px-4 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 text-xs font-semibold tracking-wide shadow-sm flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{getGenerationLabel(genNum)}</span>
                    <span className="text-[10px] text-emerald-500 font-mono">({filteredMembers.length})</span>
                  </div>
                  <div className="h-[1px] w-24 bg-gradient-to-l from-transparent to-emerald-500/40" />
                </div>

                {/* Nodes Grid for this Generation */}
                <div className="flex flex-wrap items-center justify-center gap-6 max-w-7xl">
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

      {/* Bottom status bar indicator */}
      <div className="absolute bottom-3 left-6 right-6 z-20 flex items-center justify-between text-xs text-slate-400 glass-panel px-4 py-2 rounded-xl border border-emerald-500/15 pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>اسحب بالفأرة للتنقل · استخدم العجلة للتكبير · انقر على أي فرد لفتح التفاصيل</span>
        </div>
        <div className="font-mono text-emerald-400 text-xs">
          تكبير: {Math.round(scale * 100)}%
        </div>
      </div>
    </div>
  );
};
