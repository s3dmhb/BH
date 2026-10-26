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
  Shield,
  Award,
  Gem,
  Flame,
  Waves,
  FileImage
} from 'lucide-react';

interface TreeViewProps {
  members: FamilyMember[];
  onSelectMember: (member: FamilyMember) => void;
  onOpenExportImage?: () => void;
}

// Tree node structure for d3-hierarchy
interface TreeNodeData {
  id: string;
  member: FamilyMember;
  children?: TreeNodeData[];
}

export const TreeView: React.FC<TreeViewProps> = ({ members, onSelectMember, onOpenExportImage }) => {
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
  // Fixed card dimensions and clean generational tier heights
  const CARD_WIDTH = 270;
  const CARD_HEIGHT = 110;
  const LEVEL_GAP_Y = 120; // 120px clean gap between generation levels
  const LEVEL_HEIGHT = CARD_HEIGHT + LEVEL_GAP_Y; // 230px total height per generational tier
  const LEVEL_WIDTH = CARD_WIDTH + 110; // 380px total width per generational tier in horizontal

  const { nodes, links, bounds, distinctGenerations } = useMemo(() => {
    if (!d3TreeData) {
      return {
        nodes: [],
        links: [],
        bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 },
        distinctGenerations: []
      };
    }

    const rootHierarchy = hierarchy<TreeNodeData>(d3TreeData, d => d.children);

    let layout;
    let computedNodes: HierarchyPointNode<TreeNodeData>[] = [];
    let treeRoot: HierarchyPointNode<TreeNodeData>;

    if (layoutMode === 'horizontal') {
      // Horizontal Arab Kinship Layout (founders on right, branches flowing left)
      layout = tree<TreeNodeData>()
        .nodeSize([CARD_HEIGHT + 50, LEVEL_WIDTH])
        .separation((a, b) => (a.parent === b.parent ? 1.12 : 1.35));

      treeRoot = layout(rootHierarchy);
      computedNodes = treeRoot.descendants();
    } else {
      // Vertical Pedigree Layout (founders at top, branches descending)
      layout = tree<TreeNodeData>()
        .nodeSize([CARD_WIDTH + 60, LEVEL_HEIGHT])
        .separation((a, b) => (a.parent === b.parent ? 1.08 : 1.25));

      treeRoot = layout(rootHierarchy);
      computedNodes = treeRoot.descendants();
    }

    // STRICT GENERATIONAL PLACEMENT:
    // Ensure every single generation occupies its own level/tier without drift or cross-level pollution
    const hasVirtualRoot = rootMembers.length > 1;
    computedNodes.forEach(node => {
      const isVirtual = node.data.id === 'patriarch-virtual-root';
      const explicitGen = node.data.member.generation;
      const gen = isVirtual
        ? 0
        : (explicitGen && explicitGen >= 1 ? explicitGen : node.depth + (hasVirtualRoot ? 0 : 1));

      if (layoutMode === 'horizontal') {
        node.y = isVirtual ? -LEVEL_WIDTH : (gen - 1) * LEVEL_WIDTH;
      } else {
        node.y = isVirtual ? -LEVEL_HEIGHT : (gen - 1) * LEVEL_HEIGHT;
      }
    });

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

    // Collect distinct generation numbers for background guide ribbons
    const genSet = new Set<number>();
    computedNodes.forEach(n => {
      const isVirtual = n.data.id === 'patriarch-virtual-root';
      if (!isVirtual) {
        const explicitGen = n.data.member.generation;
        const g = explicitGen && explicitGen >= 1 ? explicitGen : n.depth + (hasVirtualRoot ? 0 : 1);
        genSet.add(g);
      }
    });
    const sortedGens = Array.from(genSet).sort((a, b) => a - b);

    // Links computed with clean card-edge connections (never slicing through card bodies)
    const computedLinks = treeRoot.links().map(l => {
      let sourceX = 0;
      let sourceY = 0;
      let targetX = 0;
      let targetY = 0;

      if (layoutMode === 'horizontal') {
        // Exit from parent LEFT edge, enter child RIGHT edge
        const sourceCenterPosX = -l.source.y;
        const sourceCenterPosY = l.source.x;
        const targetCenterPosX = -l.target.y;
        const targetCenterPosY = l.target.x;

        sourceX = sourceCenterPosX - CARD_WIDTH / 2;
        sourceY = sourceCenterPosY;
        targetX = targetCenterPosX + CARD_WIDTH / 2;
        targetY = targetCenterPosY;
      } else {
        // Exit from parent BOTTOM edge, enter child TOP edge
        sourceX = l.source.x;
        sourceY = l.source.y + CARD_HEIGHT / 2;
        targetX = l.target.x;
        targetY = l.target.y - CARD_HEIGHT / 2;
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
      bounds: { minX, maxX, minY, maxY, width, height },
      distinctGenerations: sortedGens
    };
  }, [d3TreeData, layoutMode, rootMembers.length]);

  // Generate SVG path for links using smooth, non-intersecting cubic bezier curves
  const generateLinkPath = useCallback(
    (link: { sourceX: number; sourceY: number; targetX: number; targetY: number }) => {
      if (layoutMode === 'horizontal') {
        // Horizontal curve from parent left edge to child right edge
        const { sourceX, sourceY, targetX, targetY } = link;
        const midX = (sourceX + targetX) / 2;
        return `M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`;
      } else {
        // Vertical curve from parent bottom edge to child top edge
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
              {/* Sub-Family Lineage Selector */}
              <select
                value={subFamilyFilter}
                onChange={(e) => setSubFamilyFilter(e.target.value)}
                className="bg-slate-900/90 border border-emerald-500/25 text-emerald-300 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none font-semibold cursor-pointer shadow-inner"
                title="تصفية حسب وسم العائلة الفرعية"
              >
                <option value="all">كافة الوسوم الفرعية</option>
                <option value="albuhasson">وسم: البوحسون</option>
                <option value="alnesf">وسم: النصف</option>
                <option value="aldarwish">وسم: الدرويش</option>
                <option value="alazraq">وسم: الأزرق</option>
                <option value="jaber">وسم: آل جابر</option>
                <option value="nawasir">وسم: النواصر</option>
              </select>

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

            {/* Export as Image Button */}
            {onOpenExportImage && (
              <button
                onClick={onOpenExportImage}
                title="تصدير شجرة العائلة كصورة (PNG) عالي الجودة للطباعة أو المشاركة"
                className="h-8 px-2.5 rounded-xl glass-btn text-xs font-semibold text-emerald-300 hover:text-white flex items-center gap-1.5 transition-all active:scale-95 shadow-md shadow-emerald-950/40 bg-emerald-950/60 border border-emerald-500/40"
              >
                <FileImage className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">تصدير كصورة</span>
              </button>
            )}
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

              {/* Generational Guide Ribbons (Background planar separation) */}
              {layoutMode === 'vertical' && distinctGenerations.map(gen => {
                const tierY = (gen - 1) * LEVEL_HEIGHT;
                const leftX = bounds.minX - 350;
                const rightX = bounds.maxX + 350;
                return (
                  <g key={`gen-guide-${gen}`} className="pointer-events-none opacity-50">
                    <line
                      x1={leftX}
                      y1={tierY}
                      x2={rightX}
                      y2={tierY}
                      stroke="#10b981"
                      strokeWidth={1}
                      strokeDasharray="6 6"
                      strokeOpacity={0.2}
                    />
                    <rect
                      x={rightX - 110}
                      y={tierY - 12}
                      width={100}
                      height={24}
                      rx={12}
                      fill="#032115"
                      stroke="#059669"
                      strokeWidth={1}
                      strokeOpacity={0.4}
                    />
                    <text
                      x={rightX - 60}
                      y={tierY + 4}
                      textAnchor="middle"
                      fill="#34d399"
                      fontSize={11}
                      fontWeight="bold"
                      fontFamily="Cairo, sans-serif"
                    >
                      الجيل {gen}
                    </text>
                  </g>
                );
              })}

              {layoutMode === 'horizontal' && distinctGenerations.map(gen => {
                const tierX = -((gen - 1) * LEVEL_WIDTH);
                const topY = bounds.minY - 200;
                const bottomY = bounds.maxY + 200;
                return (
                  <g key={`gen-guide-h-${gen}`} className="pointer-events-none opacity-50">
                    <line
                      x1={tierX}
                      y1={topY}
                      x2={tierX}
                      y2={bottomY}
                      stroke="#10b981"
                      strokeWidth={1}
                      strokeDasharray="6 6"
                      strokeOpacity={0.2}
                    />
                    <rect
                      x={tierX - 45}
                      y={topY - 26}
                      width={90}
                      height={22}
                      rx={11}
                      fill="#032115"
                      stroke="#059669"
                      strokeWidth={1}
                      strokeOpacity={0.4}
                    />
                    <text
                      x={tierX}
                      y={topY - 11}
                      textAnchor="middle"
                      fill="#34d399"
                      fontSize={11}
                      fontWeight="bold"
                      fontFamily="Cairo, sans-serif"
                    >
                      الجيل {gen}
                    </text>
                  </g>
                );
              })}

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
                      strokeOpacity={isActiveLink ? 1 : 0.45}
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

                    {/* Source Anchor Dot (Exit from parent card edge) */}
                    <circle
                      cx={link.sourceX}
                      cy={link.sourceY}
                      r={isActiveLink ? 3.5 : 2.5}
                      fill={isActiveLink ? '#fbbf24' : '#059669'}
                      className="transition-all duration-300"
                    />

                    {/* Target Junction Dot (Entry into child card edge) */}
                    <circle
                      cx={link.targetX}
                      cy={link.targetY}
                      r={isActiveLink ? 5 : 3.5}
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
                      isMale
                        ? member.is_living
                          ? 'glass-card border-emerald-500/30'
                          : 'bg-slate-900/85 border-amber-600/35 shadow-none'
                        : member.is_living
                        ? 'glass-card-female border-rose-400/40'
                        : 'bg-slate-900/85 border-pink-900/50 shadow-none'
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
                            className={`text-[9px] font-medium px-2 py-0.2 rounded-full ${
                              member.is_living
                                ? isMale
                                  ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-rose-950/90 text-rose-300 border border-rose-500/30'
                                : isMale
                                ? 'bg-amber-950/70 text-amber-300 border border-amber-600/40'
                                : 'bg-pink-950/70 text-pink-300/80 border border-pink-800/40'
                            }`}
                          >
                            {member.is_living
                              ? isMale ? '● حي يُرزق' : '● حفظها الله'
                              : isMale ? 'رحمه الله' : 'رحمها الله'}
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
              <span className="text-emerald-300 font-medium">رجال (أحياء)</span>
            </span>
            <span className="flex items-center gap-1.5 hidden sm:flex">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_6px_#f59e0b]" />
              <span className="text-amber-300">رجال (رحمه الله)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_6px_#fb7185]" />
              <span className="text-rose-300 font-medium">نساء (أحياء)</span>
            </span>
            <span className="flex items-center gap-1.5 hidden sm:flex">
              <span className="w-2.5 h-2.5 rounded-full bg-pink-600 shadow-[0_0_6px_#db2777]" />
              <span className="text-pink-300">نساء (رحمها الله)</span>
            </span>
            <span className="flex items-center gap-1.5 hidden md:flex border-r border-white/10 pr-3">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-[0_0_6px_#facc15]" />
              <span className="text-yellow-300 font-medium">سلسلة النسب المتصلة</span>
            </span>
            <span className="flex items-center gap-1.5 hidden lg:flex">
              <Flame className="w-3 h-3 text-orange-400" />
              <span className="text-orange-300 font-medium">الدرويش</span>
            </span>
            <span className="flex items-center gap-1.5 hidden lg:flex">
              <Waves className="w-3 h-3 text-cyan-300" />
              <span className="text-cyan-300 font-medium">الأزرق</span>
            </span>
            <span className="flex items-center gap-1.5 hidden xl:flex">
              <Crown className="w-3 h-3 text-amber-400" />
              <span className="text-amber-300 font-medium">آل جابر</span>
            </span>
            <span className="flex items-center gap-1.5 hidden xl:flex">
              <Shield className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-300 font-medium">النواصر</span>
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
