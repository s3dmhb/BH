import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { hierarchy, tree, HierarchyPointNode } from 'd3-hierarchy';
import { linkVertical, linkHorizontal } from 'd3-shape';
import { FamilyMember } from '../types/family';
import { FemaleHeritageBadge } from './HeritageCrest';
import { matchesArabic } from '../utils/arabicUtils';
import { SubFamilyBadge } from './SubFamilyBadge';
import { matchesSubFamilyFilter } from '../utils/subFamilyUtils';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  Maximize2,
  Minimize2,
  GitBranch,
  Compass,
  LayoutGrid,
  SlidersHorizontal,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Eye,
  Heart,
  Users2,
  Expand,
  Shrink,
  HelpCircle,
  CornerDownLeft,
  Navigation,
  Crown,
  Shield
} from 'lucide-react';

interface TreeViewProps {
  members: FamilyMember[];
  onSelectMember: (member: FamilyMember) => void;
}

// Tree node structure for d3-hierarchy
interface TreeNodeData {
  id: string;
  member: FamilyMember;
  children?: TreeNodeData[];
}

export const TreeView: React.FC<TreeViewProps> = ({ members, onSelectMember }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Diagram Layout Mode:
  // 'horizontal' (Arab Kinship Diagram - Right to Left)
  // 'vertical' (Vertical Pedigree Diagram - Top to Bottom)
  // 'flow' (Compact Generational Mobile List)
  const [layoutMode, setLayoutMode] = useState<'horizontal' | 'vertical' | 'flow'>('horizontal');

  // Canvas Pan & Zoom
  const [scale, setScale] = useState(0.85);
  const [position, setPosition] = useState({ x: 100, y: 150 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Touch gesture tracking for pinch zoom & pan
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchDistanceRef = useRef<number | null>(null);
  const initialScaleRef = useRef<number>(0.85);

  // Filters & Interactivity
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [subFamilyFilter, setSubFamilyFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'living' | 'deceased'>('all');
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Active Lineage Tracing (Hover / Selected)
  const [hoveredMemberId, setHoveredMemberId] = useState<string | null>(null);
  const [focusedMemberId, setFocusedMemberId] = useState<string | null>(null);

  // Responsive scale initialization
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 768) {
        setScale(0.6);
        setPosition({ x: 20, y: 120 });
      } else if (w >= 1440) {
        setScale(0.9);
        setPosition({ x: 150, y: 180 });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Quick lookup maps
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

  // Branches list
  const branches = useMemo(() => {
    const set = new Set<string>();
    members.forEach(m => {
      if (m.branch) set.add(m.branch);
    });
    return Array.from(set);
  }, [members]);

  // Search match IDs
  const searchMatchIds = useMemo(() => {
    const set = new Set<string>();
    if (!searchQuery.trim()) return set;
    members.forEach(m => {
      if (
        matchesArabic(m.full_name, searchQuery) ||
        matchesArabic(m.nickname, searchQuery) ||
        matchesArabic(m.spouse_info, searchQuery)
      ) {
        set.add(m.id);
      }
    });
    return set;
  }, [members, searchQuery]);

  // Active lineage chain computation
  const activeId = hoveredMemberId || focusedMemberId;

  const { ancestorIds, descendantIds, activeLineageChain, focusedMember } = useMemo(() => {
    const ancestors = new Set<string>();
    const descendants = new Set<string>();
    const chain: FamilyMember[] = [];

    const member = activeId ? memberMap.get(activeId) || null : null;

    if (member) {
      chain.push(member);

      // Ancestor paternal climb
      let currentFatherId = member.father_id;
      const visited = new Set<string>();
      while (currentFatherId && !visited.has(currentFatherId)) {
        visited.add(currentFatherId);
        ancestors.add(currentFatherId);
        const father = memberMap.get(currentFatherId);
        if (father) {
          chain.unshift(father);
          currentFatherId = father.father_id;
        } else {
          break;
        }
      }

      // Descendants recursive search
      const addDescendants = (id: string) => {
        const children = childrenMap.get(id) || [];
        children.forEach(c => {
          descendants.add(c.id);
          addDescendants(c.id);
        });
      };
      addDescendants(member.id);
    }

    return {
      ancestorIds: ancestors,
      descendantIds: descendants,
      activeLineageChain: chain,
      focusedMember: member
    };
  }, [activeId, memberMap, childrenMap]);

  // Determine kinship label relative to focused member
  const getKinshipLabel = useCallback(
    (targetId: string): string | null => {
      if (!focusedMember) return null;
      if (targetId === focusedMember.id) return 'الفرد المحدد';
      if (focusedMember.father_id === targetId) return 'الأب المباشر';
      if (ancestorIds.has(targetId)) return 'جد / سلف صاعد';
      if (descendantIds.has(targetId)) {
        const directChildren = childrenMap.get(focusedMember.id) || [];
        if (directChildren.some(c => c.id === targetId)) {
          const ch = memberMap.get(targetId);
          return ch?.gender === 'female' ? 'ابنة' : 'ابن';
        }
        return 'حفيد / ذرية';
      }
      if (focusedMember.father_id) {
        const siblings = childrenMap.get(focusedMember.father_id) || [];
        if (siblings.some(s => s.id === targetId)) {
          const sib = memberMap.get(targetId);
          return sib?.gender === 'female' ? 'أخت شقيقة' : 'أخ شقيق';
        }
      }
      return null;
    },
    [focusedMember, ancestorIds, descendantIds, childrenMap, memberMap]
  );

  // Toggle node collapse
  const handleToggleCollapse = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Expand all / Collapse all
  const handleExpandAll = () => setCollapsedIds(new Set());
  const handleCollapseAll = () => {
    const idsWithChildren = new Set<string>();
    childrenMap.forEach((_, parentId) => idsWithChildren.add(parentId));
    setCollapsedIds(idsWithChildren);
  };

  // Build D3 Hierarchical tree model
  const d3TreeData = useMemo(() => {
    if (rootMembers.length === 0) return null;

    // Filter helper
    const isMemberVisible = (m: FamilyMember): boolean => {
      if (selectedBranch !== 'all' && m.branch && m.branch !== selectedBranch) {
        // keep if any descendant matches the branch
        const hasMatchingChild = (cid: string): boolean => {
          const children = childrenMap.get(cid) || [];
          return children.some(c => c.branch === selectedBranch || hasMatchingChild(c.id));
        };
        if (!hasMatchingChild(m.id)) return false;
      }
      if (subFamilyFilter !== 'all') {
        const matches = matchesSubFamilyFilter(m, subFamilyFilter, memberMap);
        const hasMatchingSubFamilyChild = (cid: string): boolean => {
          const children = childrenMap.get(cid) || [];
          return children.some(c => matchesSubFamilyFilter(c, subFamilyFilter, memberMap) || hasMatchingSubFamilyChild(c.id));
        };
        if (!matches && !hasMatchingSubFamilyChild(m.id)) return false;
      }
      if (genderFilter !== 'all' && m.gender !== genderFilter) {
        // keep if has matching descendants
        const hasMatchingGender = (cid: string): boolean => {
          const children = childrenMap.get(cid) || [];
          return children.some(c => c.gender === genderFilter || hasMatchingGender(c.id));
        };
        if (!hasMatchingGender(m.id)) return false;
      }
      if (statusFilter === 'living' && !m.is_living) return false;
      if (statusFilter === 'deceased' && m.is_living) return false;
      return true;
    };

    const buildSubtree = (m: FamilyMember): TreeNodeData => {
      const isCollapsed = collapsedIds.has(m.id);
      if (isCollapsed) {
        return { id: m.id, member: m };
      }

      const rawChildren = childrenMap.get(m.id) || [];
      const visibleChildren = rawChildren.filter(isMemberVisible);

      return {
        id: m.id,
        member: m,
        children: visibleChildren.length > 0 ? visibleChildren.map(buildSubtree) : undefined
      };
    };

    // If single root patriarch
    if (rootMembers.length === 1) {
      return buildSubtree(rootMembers[0]);
    }

    // Virtual dynasty root if multiple roots exist
    const virtualPatriarch: FamilyMember = {
      id: 'patriarch-virtual-root',
      full_name: 'سلالة آل بوعينين (فخذ النواصر)',
      nickname: 'النسب الجامع والمؤسس',
      gender: 'male',
      father_id: null,
      birth_date: 'القرن 13 هـ',
      is_living: false,
      branch: 'الفرع الجامع',
      generation: 0,
      bio: 'شجرة أنساب وقرابة عائلة البوحسون المتصلة'
    };

    return {
      id: virtualPatriarch.id,
      member: virtualPatriarch,
      children: rootMembers.filter(isMemberVisible).map(buildSubtree)
    };
  }, [rootMembers, childrenMap, memberMap, selectedBranch, subFamilyFilter, genderFilter, statusFilter, collapsedIds]);

  // Compute D3 Tree Layout with D3-Hierarchy
  const { nodes, links, bounds } = useMemo(() => {
    if (!d3TreeData) {
      return { nodes: [], links: [], bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 } };
    }

    const rootHierarchy = hierarchy<TreeNodeData>(d3TreeData, d => d.children);

    let layout;
    let computedNodes: HierarchyPointNode<TreeNodeData>[] = [];
    let treeRoot: HierarchyPointNode<TreeNodeData>;

    const CARD_WIDTH = 280;
    const CARD_HEIGHT = 120;
    const GAP_X = 80;
    const GAP_Y = 60;

    if (layoutMode === 'horizontal') {
      // Horizontal Arab Kinship Layout (founders on right, branches flowing left)
      layout = tree<TreeNodeData>()
        .nodeSize([CARD_HEIGHT + GAP_Y, CARD_WIDTH + GAP_X])
        .separation((a, b) => (a.parent === b.parent ? 1.05 : 1.25));

      treeRoot = layout(rootHierarchy);
      computedNodes = treeRoot.descendants();
    } else {
      // Vertical Pedigree Layout (founders at top, branches descending)
      layout = tree<TreeNodeData>()
        .nodeSize([CARD_WIDTH + GAP_X, CARD_HEIGHT + GAP_Y])
        .separation((a, b) => (a.parent === b.parent ? 1.05 : 1.25));

      treeRoot = layout(rootHierarchy);
      computedNodes = treeRoot.descendants();
    }

    // Compute bounding box
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    computedNodes.forEach(node => {
      let x = 0;
      let y = 0;
      if (layoutMode === 'horizontal') {
        // In horizontal layout, founder on right (RTL Arab orientation): invert y axis
        x = -node.y;
        y = node.x;
      } else {
        x = node.x;
        y = node.y;
      }

      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    });

    if (minX === Infinity) {
      minX = 0; maxX = 0; minY = 0; maxY = 0;
    }

    const width = Math.max(maxX - minX + CARD_WIDTH * 2, 800);
    const height = Math.max(maxY - minY + CARD_HEIGHT * 2, 600);

    // Links computed from treeRoot with defined x and y coordinates
    const computedLinks = treeRoot.links().map(l => {
      let sourceX = 0;
      let sourceY = 0;
      let targetX = 0;
      let targetY = 0;

      if (layoutMode === 'horizontal') {
        sourceX = -l.source.y;
        sourceY = l.source.x;
        targetX = -l.target.y;
        targetY = l.target.x;
      } else {
        sourceX = l.source.x;
        sourceY = l.source.y;
        targetX = l.target.x;
        targetY = l.target.y;
      }

      return {
        source: l.source.data.member,
        target: l.target.data.member,
        sourceX,
        sourceY,
        targetX,
        targetY
      };
    });

    return {
      nodes: computedNodes,
      links: computedLinks,
      bounds: { minX, maxX, minY, maxY, width, height }
    };
  }, [d3TreeData, layoutMode]);

  // Generate SVG path for links using smooth cubic bezier curves
  const generateLinkPath = useCallback(
    (link: { sourceX: number; sourceY: number; targetX: number; targetY: number }) => {
      if (layoutMode === 'horizontal') {
        // Curve from right to left
        const { sourceX, sourceY, targetX, targetY } = link;
        const midX = (sourceX + targetX) / 2;
        return `M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`;
      } else {
        // Vertical curve from top to bottom
        const { sourceX, sourceY, targetX, targetY } = link;
        const midY = (sourceY + targetY) / 2;
        return `M ${sourceX} ${sourceY} C ${sourceX} ${midY}, ${targetX} ${midY}, ${targetX} ${targetY}`;
      }
    },
    [layoutMode]
  );

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button, input, select, a, .node-card')) return;
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

  // Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setScale(prev => Math.min(Math.max(0.2, prev * zoomFactor), 1.8));
  };

  // Touch Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select, a, .node-card')) return;

    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      };
      touchDistanceRef.current = null;
    } else if (e.touches.length === 2) {
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
      setScale(Math.min(Math.max(0.2, initialScaleRef.current * ratio), 1.8));
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
    touchDistanceRef.current = null;
  };

  // Reset & Center View
  const handleResetView = () => {
    const isMobile = window.innerWidth < 768;
    setScale(isMobile ? 0.6 : 0.85);
    if (layoutMode === 'horizontal') {
      setPosition({ x: isMobile ? 80 : 350, y: isMobile ? 120 : 250 });
    } else {
      setPosition({ x: window.innerWidth / 2, y: 140 });
    }
    setFocusedMemberId(null);
  };

  // Jump to specific member and center canvas
  const handleCenterOnMember = (memberId: string) => {
    const node = nodes.find(n => n.data.member.id === memberId);
    if (!node) return;

    let targetX = 0;
    let targetY = 0;
    if (layoutMode === 'horizontal') {
      targetX = -node.y;
      targetY = node.x;
    } else {
      targetX = node.x;
      targetY = node.y;
    }

    const containerW = containerRef.current?.clientWidth || window.innerWidth;
    const containerH = containerRef.current?.clientHeight || window.innerHeight;

    setPosition({
      x: containerW / 2 - targetX * scale,
      y: containerH / 2 - targetY * scale
    });
    setFocusedMemberId(memberId);
  };

  // Group by generation for the flow view
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

  const getGenerationLabel = (gen: number) => {
    switch (gen) {
      case 1:
        return 'الجيل الأول: الجد المؤسس وكبار الأعيان';
      case 2:
        return 'الجيل الثاني: الأبناء وأعلام العائلة';
      case 3:
        return 'الجيل الثالث: الأحفاد والوجهاء';
      case 4:
        return 'الجيل الرابع: جيل الكفاءات المعاصرة';
      case 5:
        return 'الجيل الخامس: الشباب والنشء المبارك';
      default:
        return `الجيل ${gen}`;
    }
  };

  return (
    <div
      className={`relative w-full h-[calc(100vh-125px)] min-h-[580px] overflow-hidden bg-radial from-emerald-950/25 via-[#03130c] to-[#010905] flex flex-col font-sans select-none ${
        isFullscreen ? 'fixed inset-0 z-50 h-screen' : ''
      }`}
    >
      {/* ---------------------------------------------------- */}
      {/* Top Floating Glass Navigation & Kinship Toolbar */}
      {/* ---------------------------------------------------- */}
      <div className="absolute top-3 right-3 left-3 z-30 flex flex-col gap-2 pointer-events-none">
        <div className="flex flex-wrap items-center justify-between gap-2">
          
          {/* Search Bar & Primary Filters */}
          <div className="pointer-events-auto flex items-center gap-1.5 glass-panel p-1.5 rounded-2xl shadow-xl border border-emerald-500/25 flex-1 max-w-xl">
            <div className="relative flex-1 min-w-[140px] sm:min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-emerald-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم أو اللقب لتتبع النسب..."
                className="w-full bg-slate-900/90 border border-emerald-500/20 rounded-xl pr-8 pl-2.5 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs px-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Desktop Filters */}
            <div className="hidden sm:flex items-center gap-1.5">
              {/* Sub-Family Lineage Pills */}
              <div className="flex items-center bg-slate-900/90 rounded-xl p-0.5 border border-emerald-500/20">
                <button
                  onClick={() => setSubFamilyFilter('all')}
                  className={`px-2 py-1 text-xs rounded-lg transition-all ${
                    subFamilyFilter === 'all'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  الكل
                </button>
                <button
                  onClick={() => setSubFamilyFilter('jaber')}
                  className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-all ${
                    subFamilyFilter === 'jaber'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                      : 'text-amber-300 hover:text-white'
                  }`}
                  title="تصفية حسب وسم آل جابر"
                >
                  <Crown className="w-3 h-3 text-amber-400" />
                  <span>آل جابر</span>
                </button>
                <button
                  onClick={() => setSubFamilyFilter('nawasir')}
                  className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-all ${
                    subFamilyFilter === 'nawasir'
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                      : 'text-emerald-300 hover:text-white'
                  }`}
                  title="تصفية حسب وسم النواصر"
                >
                  <Shield className="w-3 h-3 text-emerald-400" />
                  <span>النواصر</span>
                </button>
              </div>

              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="bg-slate-900/90 border border-emerald-500/20 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none"
              >
                <option value="all">كافة الفروع</option>
                {branches.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value as any)}
                className="bg-slate-900/90 border border-emerald-500/20 text-slate-200 text-xs rounded-xl px-2 py-1.5 focus:outline-none"
              >
                <option value="all">الكل</option>
                <option value="male">الذكور</option>
                <option value="female">الإناث</option>
              </select>
            </div>

            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setShowFiltersModal(!showFiltersModal)}
              className="sm:hidden w-8 h-8 rounded-xl glass-btn flex items-center justify-center text-slate-300"
              title="تصفية الفروع والحالات"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
            </button>
          </div>

          {/* Diagram Layout Mode & Zoom Controls */}
          <div className="pointer-events-auto flex items-center gap-1.5 glass-panel p-1.5 rounded-2xl shadow-xl border border-emerald-500/25">
            
            {/* Diagram Mode Switcher */}
            <div className="flex items-center bg-slate-900/90 rounded-xl p-0.5 border border-white/5">
              <button
                onClick={() => setLayoutMode('horizontal')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg transition-all ${
                  layoutMode === 'horizontal'
                    ? 'bg-emerald-600 text-white font-bold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="مخطط النسب الأفقي المتسلسل (الأنساب العربية من اليمين إلى اليسار)"
              >
                <Compass className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">أفقي متسلسل</span>
              </button>

              <button
                onClick={() => setLayoutMode('vertical')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg transition-all ${
                  layoutMode === 'vertical'
                    ? 'bg-emerald-600 text-white font-bold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="مخطط النسب الرأسي المتفرع (الشجرة الصاعدة والنازلة)"
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">رأسي متفرع</span>
              </button>

              <button
                onClick={() => setLayoutMode('flow')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg transition-all ${
                  layoutMode === 'flow'
                    ? 'bg-emerald-600 text-white font-bold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="قائمة الأجيال المتسلسلة (للجوال)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">الأجيال</span>
              </button>
            </div>

            {/* Canvas Zoom & Pan Actions */}
            {layoutMode !== 'flow' && (
              <>
                <button
                  onClick={() => setScale(prev => Math.min(prev + 0.15, 1.8))}
                  title="تكبير المخطط"
                  className="w-8 h-8 rounded-xl glass-btn flex items-center justify-center text-slate-200 hover:text-white active:scale-95"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setScale(prev => Math.max(prev - 0.15, 0.2))}
                  title="تصغير المخطط"
                  className="w-8 h-8 rounded-xl glass-btn flex items-center justify-center text-slate-200 hover:text-white active:scale-95"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleResetView}
                  title="إعادة التوسيط والتكبير الافتراضي"
                  className="w-8 h-8 rounded-xl glass-btn flex items-center justify-center text-slate-200 hover:text-white active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {/* Expand / Collapse All */}
            <button
              onClick={handleExpandAll}
              title="توسيع كافة فروع وذرية الشجرة"
              className="hidden lg:flex px-2 h-8 rounded-xl glass-btn text-[11px] font-medium text-emerald-300 items-center gap-1"
            >
              <Maximize2 className="w-3 h-3" />
              <span>توسيع</span>
            </button>
            <button
              onClick={handleCollapseAll}
              title="طي كافة الفروع"
              className="hidden lg:flex px-2 h-8 rounded-xl glass-btn text-[11px] font-medium text-slate-300 items-center gap-1"
            >
              <Minimize2 className="w-3 h-3" />
              <span>طي</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'تصغير الشاشة' : 'ملء الشاشة الكاملة'}
              className="w-8 h-8 rounded-xl glass-btn flex items-center justify-center text-slate-300 hover:text-white"
            >
              {isFullscreen ? <Shrink className="w-3.5 h-3.5 text-amber-400" /> : <Expand className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Mobile Filter Dropdown */}
        {showFiltersModal && (
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
            <div className="col-span-2 pt-1 border-t border-white/5">
              <label className="text-[10px] text-slate-400 block mb-1">وسم العائلة الفرعية:</label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setSubFamilyFilter('all')}
                  className={`flex-1 py-1 rounded-lg text-xs font-medium border ${
                    subFamilyFilter === 'all'
                      ? 'bg-emerald-600 border-emerald-400 text-white'
                      : 'bg-slate-900 border-white/10 text-slate-300'
                  }`}
                >
                  الكل
                </button>
                <button
                  type="button"
                  onClick={() => setSubFamilyFilter('jaber')}
                  className={`flex-1 py-1 rounded-lg text-xs font-bold border flex items-center justify-center gap-1 ${
                    subFamilyFilter === 'jaber'
                      ? 'bg-amber-500 border-amber-300 text-slate-950 shadow-sm'
                      : 'bg-slate-900 border-amber-500/30 text-amber-300'
                  }`}
                >
                  <Crown className="w-3 h-3" />
                  <span>آل جابر</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSubFamilyFilter('nawasir')}
                  className={`flex-1 py-1 rounded-lg text-xs font-bold border flex items-center justify-center gap-1 ${
                    subFamilyFilter === 'nawasir'
                      ? 'bg-emerald-500 border-emerald-300 text-slate-950 shadow-sm'
                      : 'bg-slate-900 border-emerald-500/30 text-emerald-300'
                  }`}
                >
                  <Shield className="w-3 h-3" />
                  <span>النواصر</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Active Lineage Breadcrumb Ribbon */}
        {activeLineageChain.length > 0 && (
          <div className="pointer-events-auto glass-panel px-3 sm:px-4 py-1.5 rounded-2xl border border-amber-500/40 shadow-xl flex items-center justify-between gap-2 max-w-4xl mx-auto overflow-hidden animate-in fade-in duration-200">
            <div className="flex items-center gap-1.5 shrink-0 text-amber-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>سلسلة النسب المتصلة:</span>
            </div>
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar text-xs">
              {activeLineageChain.map((item, idx) => {
                const isTarget = idx === activeLineageChain.length - 1;
                return (
                  <React.Fragment key={item.id}>
                    <button
                      onClick={() => {
                        handleCenterOnMember(item.id);
                        onSelectMember(item);
                      }}
                      className={`px-2.5 py-0.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 ${
                        isTarget
                          ? 'bg-emerald-600 text-white font-bold shadow-md'
                          : 'text-slate-300 hover:text-amber-200 hover:bg-slate-800/80'
                      }`}
                    >
                      <span>{item.full_name.split(' ')[0]}</span>
                      {isTarget && (
                        <span className="text-[10px] text-emerald-200 font-normal">
                          (الجيل {item.generation})
                        </span>
                      )}
                    </button>
                    {idx < activeLineageChain.length - 1 && (
                      <span className="text-amber-400/80 text-[10px] font-mono"> بن </span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* GRAPHICAL CANVAS: D3-Hierarchy Kinship Engine (Horizontal/Vertical) */}
      {/* ---------------------------------------------------- */}
      {layoutMode !== 'flow' ? (
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`w-full h-full flex-1 cursor-grab select-none relative touch-none overflow-hidden ${
            isDragging ? 'cursor-grabbing' : ''
          }`}
        >
          {/* Subtle Arabic Heritage Grid */}
          <div
            className="absolute inset-0 opacity-[0.06] pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle, #34d399 1.2px, transparent 1.2px)`,
              backgroundSize: '32px 32px'
            }}
          />

          {/* Canvas SVG and Nodes Layer */}
          <div
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: 'top center',
              transition: isDragging || touchDistanceRef.current ? 'none' : 'transform 0.12s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            className="absolute top-0 left-0 w-full h-full pointer-events-auto"
          >
            {/* SVG Connecting Cables Layer */}
            <svg
              className="absolute overflow-visible pointer-events-none"
              style={{
                left: 0,
                top: 0,
                width: '100%',
                height: '100%'
              }}
            >
              <defs>
                {/* Glow Filter for Active Lineage */}
                <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <linearGradient id="activeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
              </defs>

              {/* Draw All D3-Hierarchy Links */}
              {links.map((link, idx) => {
                const isAncestorLink =
                  ancestorIds.has(link.target.id) || (link.target.id === activeId && ancestorIds.has(link.source.id));
                const isDescendantLink =
                  descendantIds.has(link.target.id) || (link.source.id === activeId && descendantIds.has(link.target.id));
                const isActiveLink = isAncestorLink || isDescendantLink;

                const pathData = generateLinkPath(link);

                return (
                  <g key={`${link.source.id}-${link.target.id}-${idx}`}>
                    {/* Shadow / Base Stroke */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke={isActiveLink ? '#fbbf24' : '#059669'}
                      strokeWidth={isActiveLink ? 3.5 : 1.8}
                      strokeOpacity={isActiveLink ? 1 : 0.4}
                      strokeLinecap="round"
                      filter={isActiveLink ? 'url(#goldGlow)' : undefined}
                      className="transition-all duration-300"
                    />

                    {/* Animated Pulses on Active Path */}
                    {isActiveLink && (
                      <path
                        d={pathData}
                        fill="none"
                        stroke="#fef08a"
                        strokeWidth={2}
                        strokeDasharray="6 8"
                        className="animate-pulse"
                      />
                    )}

                    {/* Junction Point */}
                    <circle
                      cx={link.targetX}
                      cy={link.targetY}
                      r={isActiveLink ? 4.5 : 3}
                      fill={isActiveLink ? '#fbbf24' : '#10b981'}
                      className="transition-all duration-300"
                    />
                  </g>
                );
              })}
            </svg>

            {/* Render Member Node Cards */}
            {nodes.map(node => {
              const member = node.data.member;
              const hasChildren = (childrenMap.get(member.id) || []).length > 0;
              const isCollapsed = collapsedIds.has(member.id);
              const isMatch = searchMatchIds.has(member.id);
              const isTarget = activeId === member.id;
              const isAncestor = ancestorIds.has(member.id);
              const isDescendant = descendantIds.has(member.id);
              const kinshipTag = getKinshipLabel(member.id);

              const isMale = member.gender === 'male';
              const firstLetter = member.full_name.trim().charAt(0) || 'ب';

              let posX = 0;
              let posY = 0;
              if (layoutMode === 'horizontal') {
                posX = -node.y;
                posY = node.x;
              } else {
                posX = node.x;
                posY = node.y;
              }

              // Dimensions
              const CARD_WIDTH = 270;
              const CARD_HEIGHT = 110;

              return (
                <div
                  key={node.data.id}
                  style={{
                    position: 'absolute',
                    left: `${posX}px`,
                    top: `${posY}px`,
                    transform: 'translate(-50%, -50%)',
                    width: `${CARD_WIDTH}px`
                  }}
                  onMouseEnter={() => setHoveredMemberId(member.id)}
                  onMouseLeave={() => setHoveredMemberId(null)}
                  onClick={() => {
                    setFocusedMemberId(member.id);
                    onSelectMember(member);
                  }}
                  className={`node-card group cursor-pointer transition-all duration-300 ${
                    isTarget ? 'scale-105 z-20' : 'hover:scale-102 z-10'
                  }`}
                >
                  {/* Kinship Relationship Label */}
                  {kinshipTag && (
                    <div className="absolute -top-3.5 right-4 z-20">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950 shadow-md flex items-center gap-1 border border-amber-300">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>{kinshipTag}</span>
                      </span>
                    </div>
                  )}

                  {/* Main Glass Card */}
                  <div
                    className={`rounded-2xl p-3 text-right relative transition-all duration-300 border ${
                      isMale ? 'glass-card' : 'glass-card-female'
                    } ${
                      isTarget
                        ? 'ring-2 ring-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.5)] border-emerald-400'
                        : isAncestor
                        ? 'ring-2 ring-amber-400/80 shadow-[0_0_20px_rgba(251,191,36,0.35)] border-amber-400/60'
                        : isDescendant
                        ? 'ring-2 ring-cyan-400/80 shadow-[0_0_20px_rgba(34,211,238,0.35)] border-cyan-400/60'
                        : isMatch
                        ? 'ring-2 ring-emerald-300 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.4)]'
                        : ''
                    }`}
                  >
                    {/* Header: Badge/Photo + Names + Status */}
                    <div className="flex items-start gap-2.5">
                      {/* Avatar or Emblem */}
                      <div className="shrink-0 relative">
                        {isMale ? (
                          member.avatar_url ? (
                            <img
                              src={member.avatar_url}
                              alt={member.full_name}
                              referrerPolicy="no-referrer"
                              className="w-11 h-11 rounded-xl object-cover border border-emerald-400/40 shadow-sm"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-800 to-emerald-950 border border-emerald-400/30 flex items-center justify-center text-emerald-200 font-bold text-base shadow-inner">
                              {firstLetter}
                            </div>
                          )
                        ) : (
                          /* Female dignified crest badge (Strictly NO photo) */
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-pink-950/70 to-rose-950/90 border border-pink-500/30 flex items-center justify-center shadow-inner">
                            <FemaleHeritageBadge size={26} />
                          </div>
                        )}

                        <span
                          className={`absolute -bottom-1 -left-1 text-[9px] font-mono px-1 py-0.2 rounded font-semibold ${
                            isMale
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-950 text-pink-300 border border-rose-500/30'
                          }`}
                        >
                          G{member.generation || 1}
                        </span>
                      </div>

                      {/* Info & Names */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span
                            className={`text-[9px] font-medium px-1.5 py-0.2 rounded-full ${
                              member.is_living
                                ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/30'
                                : 'bg-slate-800/80 text-slate-400'
                            }`}
                          >
                            {member.is_living ? 'حي' : 'متوفى'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {member.birth_date || 'غير مدون'}
                          </span>
                        </div>

                        <h3 className="text-xs font-bold text-white truncate" title={member.full_name}>
                          {member.full_name}
                        </h3>

                        {member.nickname && (
                          <p className={`text-[11px] font-medium truncate ${isMale ? 'text-emerald-400' : 'text-pink-300'}`}>
                            {member.nickname}
                          </p>
                        )}

                        {/* Sub-Family Lineage Tag */}
                        <div className="mt-1">
                          <SubFamilyBadge member={member} memberMap={memberMap} size="xs" />
                        </div>
                      </div>
                    </div>

                    {/* Metadata Strip */}
                    <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-300">
                      <span className="truncate max-w-[140px] text-slate-400">
                        {member.branch || 'الفرع العام'}
                      </span>

                      {/* Expand / Collapse Subtree */}
                      {hasChildren ? (
                        <button
                          onClick={(e) => handleToggleCollapse(member.id, e)}
                          className="px-2 py-0.5 rounded-md bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 flex items-center gap-1 text-[10px] active:scale-95 transition-all"
                          title={isCollapsed ? 'توسيع فروع الذرية' : 'طي فروع الذرية'}
                        >
                          {isCollapsed ? (
                            <>
                              <ChevronDown className="w-3 h-3 text-emerald-400" />
                              <span>+{(childrenMap.get(member.id) || []).length} ذرية</span>
                            </>
                          ) : (
                            <>
                              <ChevronUp className="w-3 h-3 text-slate-300" />
                              <span>طي</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 group-hover:text-emerald-400">
                          <Eye className="w-3 h-3" />
                          <span>السجل</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ---------------------------------------------------- */
        /* COMPACT GENERATIONAL FLOW VIEW (Mobile & Accessibility) */
        /* ---------------------------------------------------- */
        <div className="w-full h-full flex-1 overflow-y-auto px-4 py-24 max-w-5xl mx-auto space-y-8">
          {Array.from({ length: generationTiers.maxGen }, (_, i) => i + 1).map(genNum => {
            const rawMembersInGen = generationTiers.tiers[genNum] || [];

            const filteredMembers = rawMembersInGen.filter(m => {
              if (selectedBranch !== 'all' && m.branch !== selectedBranch) return false;
              if (genderFilter !== 'all' && m.gender !== genderFilter) return false;
              if (statusFilter === 'living' && !m.is_living) return false;
              if (statusFilter === 'deceased' && m.is_living) return false;
              if (searchQuery.trim() && !matchesArabic(m.full_name, searchQuery)) return false;
              return true;
            });

            if (filteredMembers.length === 0) return null;

            return (
              <section key={genNum} className="space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      {getGenerationLabel(genNum)}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    {filteredMembers.length} فرد
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredMembers.map(member => {
                    const isMale = member.gender === 'male';
                    const hasChildren = (childrenMap.get(member.id) || []).length > 0;

                    return (
                      <div
                        key={member.id}
                        onClick={() => {
                          setFocusedMemberId(member.id);
                          onSelectMember(member);
                        }}
                        className={`rounded-2xl p-3.5 cursor-pointer border text-right transition-all hover:scale-102 ${
                          isMale ? 'glass-card' : 'glass-card-female'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="shrink-0 relative">
                            {isMale ? (
                              member.avatar_url ? (
                                <img
                                  src={member.avatar_url}
                                  alt={member.full_name}
                                  referrerPolicy="no-referrer"
                                  className="w-11 h-11 rounded-xl object-cover border border-emerald-400/40"
                                />
                              ) : (
                                <div className="w-11 h-11 rounded-xl bg-emerald-950 border border-emerald-500/30 flex items-center justify-center text-emerald-200 font-bold text-base">
                                  {member.full_name.charAt(0)}
                                </div>
                              )
                            ) : (
                              <div className="w-11 h-11 rounded-xl bg-rose-950/80 border border-pink-500/30 flex items-center justify-center">
                                <FemaleHeritageBadge size={26} />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-white truncate">{member.full_name}</h4>
                            {member.nickname && (
                              <p className={`text-xs ${isMale ? 'text-emerald-400' : 'text-pink-300'}`}>
                                {member.nickname}
                              </p>
                            )}
                            <div className="mt-1">
                              <SubFamilyBadge member={member} memberMap={memberMap} size="xs" />
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                              <span>{member.branch || 'الفرع العام'}</span>
                              <span className="font-mono">{member.birth_date || ''}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* Floating Canvas Footer Status & Kinship Legend */}
      {/* ---------------------------------------------------- */}
      {layoutMode !== 'flow' && (
        <div className="absolute bottom-3 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300 glass-panel px-4 py-2 rounded-2xl border border-emerald-500/20 pointer-events-none">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
              <span className="text-emerald-300 font-medium">سلسلة النسب المتصلة</span>
            </span>
            <span className="flex items-center gap-1.5 hidden sm:flex">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24]" />
              <span className="text-amber-300">سلسلة الأجداد الصاعدة</span>
            </span>
            <span className="flex items-center gap-1.5 hidden sm:flex">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
              <span className="text-cyan-300">سلسلة الذرية النازلة</span>
            </span>
            <span className="flex items-center gap-1.5 hidden lg:flex border-r border-white/10 pr-3">
              <Crown className="w-3 h-3 text-amber-400" />
              <span className="text-amber-300 font-medium">وسم آل جابر</span>
            </span>
            <span className="flex items-center gap-1.5 hidden lg:flex">
              <Shield className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-300 font-medium">وسم النواصر</span>
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-slate-400 text-[10px] hidden md:inline">
              اسحب للتنقل · قرّب بأصبعين أو العجلة · انقر لفتح السجل والحذف/التعديل
            </span>
            <span className="font-mono text-emerald-400 text-xs bg-emerald-950/80 px-2 py-0.5 rounded-lg border border-emerald-500/20">
              {Math.round(scale * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
