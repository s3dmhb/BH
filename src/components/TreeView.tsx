import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { hierarchy, tree, HierarchyPointNode } from 'd3-hierarchy';
import { linkVertical, linkHorizontal } from 'd3-shape';
import { FamilyMember } from '../types/family';
import { FemaleHeritageBadge } from './HeritageCrest';
import { matchesArabic, getTreeCardDisplayName } from '../utils/arabicUtils';
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
  FileImage,
  Focus,
  ChevronLeft,
  Plus
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
  const [isTouchInteracting, setIsTouchInteracting] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Touch gesture tracking for fluid mobile pan, centered pinch zoom, inertia & double-tap
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchOriginClientRef = useRef<{ x: number; y: number } | null>(null);
  const touchMovedRef = useRef<boolean>(false);
  const suppressNextClickRef = useRef<boolean>(false);
  const mouseDownClientRef = useRef<{ x: number; y: number } | null>(null);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef<number>(0.85);
  const pinchCanvasCenterRef = useRef<{ x: number; y: number } | null>(null);
  const lastTouchSampleRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const touchVelocityRef = useRef<{ vx: number; vy: number }>({ vx: 0, vy: 0 });
  const inertiaRafRef = useRef<number | null>(null);
  const lastTapRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Filters & Interactivity (All descendants collapsed by default for clean mobile browsing)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [subFamilyFilter, setSubFamilyFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'living' | 'deceased'>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Refs for smart framing on initial load and branch expansion
  const hasCenteredInitialRef = useRef(false);
  const pendingFocusExpandIdRef = useRef<string | null>(null);
  const prevLayoutModeRef = useRef<'horizontal' | 'vertical' | 'flow'>(layoutMode);
  const lastCenteredSearchRef = useRef<string>('');

  // Active Lineage Tracing (Hover / Selected)
  const [hoveredMemberId, setHoveredMemberId] = useState<string | null>(null);
  const [focusedMemberId, setFocusedMemberId] = useState<string | null>(null);

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

  // Direct & total descendants count per member (used for continuation badges)
  const descendantsCountMap = useMemo(() => {
    const counts = new Map<string, { direct: number; total: number }>();

    const computeTotal = (id: string, visited = new Set<string>()): number => {
      if (counts.has(id)) return counts.get(id)!.total;
      if (visited.has(id)) return 0;
      visited.add(id);

      const directChildren = childrenMap.get(id) || [];
      let total = directChildren.length;
      for (const child of directChildren) {
        total += computeTotal(child.id, visited);
      }
      counts.set(id, { direct: directChildren.length, total });
      return total;
    };

    members.forEach(m => {
      computeTotal(m.id);
    });

    return counts;
  }, [members, childrenMap]);

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

  // Automatically open ancestor chains when searching or filtering so matches stay reachable
  const autoExpandedIds = useMemo(() => {
    const set = new Set<string>();
    const hasSearch = searchQuery.trim().length > 0;
    const hasFilter =
      selectedBranch !== 'all' ||
      subFamilyFilter !== 'all' ||
      genderFilter !== 'all' ||
      statusFilter !== 'all';

    if (!hasSearch && !hasFilter) return set;

    members.forEach(m => {
      const matchesSearch = !hasSearch || searchMatchIds.has(m.id);
      const matchesBranch = selectedBranch === 'all' || m.branch === selectedBranch;
      const matchesSubFamily = subFamilyFilter === 'all' || matchesSubFamilyFilter(m, subFamilyFilter, memberMap);
      const matchesGender = genderFilter === 'all' || m.gender === genderFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'living' && m.is_living) ||
        (statusFilter === 'deceased' && !m.is_living);

      if (matchesSearch && matchesBranch && matchesSubFamily && matchesGender && matchesStatus) {
        let currentFatherId = m.father_id;
        const visited = new Set<string>();
        while (currentFatherId && !visited.has(currentFatherId)) {
          visited.add(currentFatherId);
          set.add(currentFatherId);
          const father = memberMap.get(currentFatherId);
          currentFatherId = father?.father_id || null;
        }
      }
    });

    return set;
  }, [members, searchQuery, searchMatchIds, selectedBranch, subFamilyFilter, genderFilter, statusFilter, memberMap]);

  const effectiveExpandedIds = useMemo(() => {
    if (autoExpandedIds.size === 0) return expandedIds;
    const merged = new Set(expandedIds);
    autoExpandedIds.forEach(id => merged.add(id));
    return merged;
  }, [expandedIds, autoExpandedIds]);

  // Toggle node expand/collapse
  const handleToggleCollapse = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const isCurrentlyOpen = effectiveExpandedIds.has(id);

    setExpandedIds(prev => {
      const next = new Set(prev);
      if (isCurrentlyOpen) {
        next.delete(id);
      } else {
        next.add(id);
        pendingFocusExpandIdRef.current = id;
      }
      return next;
    });
  };

  // Expand all / Collapse all
  const handleExpandAll = () => {
    const idsWithChildren = new Set<string>();
    childrenMap.forEach((_, parentId) => idsWithChildren.add(parentId));
    setExpandedIds(idsWithChildren);
    pendingFocusExpandIdRef.current = '__FIT_ALL__';
  };

  const handleCollapseAll = () => {
    setExpandedIds(new Set());
    setFocusedMemberId(null);
    pendingFocusExpandIdRef.current = '__RESET_ROOT__';
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
      const isExpanded = effectiveExpandedIds.has(m.id);
      if (!isExpanded) {
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
  }, [rootMembers, childrenMap, memberMap, selectedBranch, subFamilyFilter, genderFilter, statusFilter, effectiveExpandedIds]);

  // Compute D3 Tree Layout with D3-Hierarchy
  // Compact card proportions tailored around first-name display so tree branches fit cleanly on mobile & desktop
  const CARD_WIDTH = 176;
  const CARD_HEIGHT = 110;
  const LEVEL_GAP_Y = 70; // Clean gap between generation levels (leaves room for +N continuation handles)
  const LEVEL_HEIGHT = CARD_HEIGHT + LEVEL_GAP_Y; // 180px total height per generational tier
  const LEVEL_WIDTH = CARD_WIDTH + 72; // 248px total width per generational tier in horizontal

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
        .nodeSize([CARD_HEIGHT + 34, LEVEL_WIDTH])
        .separation((a, b) => (a.parent === b.parent ? 1.1 : 1.3));

      treeRoot = layout(rootHierarchy);
      computedNodes = treeRoot.descendants();
    } else {
      // Vertical Pedigree Layout (founders at top, branches descending)
      layout = tree<TreeNodeData>()
        .nodeSize([CARD_WIDTH + 32, LEVEL_HEIGHT])
        .separation((a, b) => (a.parent === b.parent ? 1.08 : 1.28));

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

  // Cancel any active swipe momentum animation
  const stopInertia = useCallback(() => {
    if (inertiaRafRef.current !== null) {
      cancelAnimationFrame(inertiaRafRef.current);
      inertiaRafRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopInertia();
  }, [stopInertia]);

  // Pan handlers (Mouse — allows dragging even starting over a card; distinguishes click vs drag)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button, input, select, a')) return;
    stopInertia();
    mouseDownClientRef.current = { x: e.clientX, y: e.clientY };
    suppressNextClickRef.current = false;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    if (mouseDownClientRef.current) {
      const dist = Math.hypot(
        e.clientX - mouseDownClientRef.current.x,
        e.clientY - mouseDownClientRef.current.y
      );
      if (dist > 6) {
        suppressNextClickRef.current = true;
      }
    }
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    mouseDownClientRef.current = null;
    if (suppressNextClickRef.current) {
      setTimeout(() => {
        suppressNextClickRef.current = false;
      }, 60);
    }
  };

  // Anchor-Point Zoom Helper (Zooms smoothly around cursor or center of screen)
  const zoomAtPoint = useCallback((targetScale: number, screenPoint?: { x: number; y: number }) => {
    stopInertia();
    const clampedScale = Math.min(Math.max(0.2, targetScale), 2.2);
    const container = containerRef.current;
    if (!container) {
      setScale(clampedScale);
      return;
    }
    const rect = container.getBoundingClientRect();
    const sx = screenPoint ? screenPoint.x - rect.left : rect.width / 2;
    const sy = screenPoint ? screenPoint.y - rect.top : rect.height / 2;

    const cx = (sx - position.x) / scale;
    const cy = (sy - position.y) / scale;

    const newX = sx - cx * clampedScale;
    const newY = sy - cy * clampedScale;

    setScale(clampedScale);
    setPosition({ x: newX, y: newY });
  }, [position, scale, stopInertia]);

  // Non-passive Wheel / Trackpad Zoom listener (prevents page scroll while zooming canvas)
  useEffect(() => {
    const el = containerRef.current;
    if (!el || layoutMode === 'flow') return;

    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      zoomAtPoint(scale * zoomFactor, { x: e.clientX, y: e.clientY });
    };

    el.addEventListener('wheel', onWheelNative, { passive: false });
    return () => el.removeEventListener('wheel', onWheelNative);
  }, [layoutMode, scale, zoomAtPoint]);

  // Touch Handlers for Fluid Mobile Navigation:
  // - 1-Finger Pan anywhere on canvas (including over cards, with tap-vs-drag detection)
  // - 2-Finger Centered Pinch-to-Zoom + simultaneous pan
  // - Swipe Inertia / Momentum decay on release
  // - Double-tap on canvas to zoom in/out
  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select, a')) return;

    stopInertia();
    const container = containerRef.current;
    const rect = container
      ? container.getBoundingClientRect()
      : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };

    if (e.touches.length === 1) {
      const t = e.touches[0];
      touchStartRef.current = {
        x: t.clientX - position.x,
        y: t.clientY - position.y
      };
      touchOriginClientRef.current = { x: t.clientX, y: t.clientY };
      touchMovedRef.current = false;
      suppressNextClickRef.current = false;
      pinchStartDistRef.current = null;
      pinchCanvasCenterRef.current = null;
      lastTouchSampleRef.current = { x: t.clientX, y: t.clientY, time: performance.now() };
      touchVelocityRef.current = { vx: 0, vy: 0 };
      setIsTouchInteracting(true);
    } else if (e.touches.length >= 2) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
      pinchStartDistRef.current = dist > 0 ? dist : 1;
      pinchStartScaleRef.current = scale;
      touchMovedRef.current = true;
      suppressNextClickRef.current = true;
      touchVelocityRef.current = { vx: 0, vy: 0 };

      const midX = (t0.clientX + t1.clientX) / 2 - rect.left;
      const midY = (t0.clientY + t1.clientY) / 2 - rect.top;

      pinchCanvasCenterRef.current = {
        x: (midX - position.x) / scale,
        y: (midY - position.y) / scale
      };
      setIsTouchInteracting(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const container = containerRef.current;
    const rect = container
      ? container.getBoundingClientRect()
      : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };

    if (e.touches.length === 1 && touchStartRef.current) {
      const t = e.touches[0];
      if (touchOriginClientRef.current) {
        const movedDist = Math.hypot(
          t.clientX - touchOriginClientRef.current.x,
          t.clientY - touchOriginClientRef.current.y
        );
        if (movedDist > 8) {
          touchMovedRef.current = true;
          suppressNextClickRef.current = true;
        }
      }

      if (touchMovedRef.current) {
        const now = performance.now();
        if (lastTouchSampleRef.current) {
          const dt = Math.max(now - lastTouchSampleRef.current.time, 8);
          if (dt < 80) {
            const instVx = (t.clientX - lastTouchSampleRef.current.x) / dt;
            const instVy = (t.clientY - lastTouchSampleRef.current.y) / dt;
            touchVelocityRef.current = {
              vx: touchVelocityRef.current.vx * 0.4 + instVx * 0.6,
              vy: touchVelocityRef.current.vy * 0.4 + instVy * 0.6
            };
          }
        }
        lastTouchSampleRef.current = { x: t.clientX, y: t.clientY, time: now };

        setPosition({
          x: t.clientX - touchStartRef.current.x,
          y: t.clientY - touchStartRef.current.y
        });
      }
    } else if (e.touches.length >= 2 && pinchStartDistRef.current && pinchCanvasCenterRef.current) {
      // 2-Finger Pinch Zoom centered under fingers + smooth simultaneous pan
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
      const ratio = dist / pinchStartDistRef.current;
      const targetScale = Math.min(Math.max(0.2, pinchStartScaleRef.current * ratio), 2.2);

      const currMidX = (t0.clientX + t1.clientX) / 2 - rect.left;
      const currMidY = (t0.clientY + t1.clientY) / 2 - rect.top;

      const cx = pinchCanvasCenterRef.current.x;
      const cy = pinchCanvasCenterRef.current.y;

      touchMovedRef.current = true;
      suppressNextClickRef.current = true;

      setScale(targetScale);
      setPosition({
        x: currMidX - cx * targetScale,
        y: currMidY - cy * targetScale
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Transition cleanly from 2-finger pinch back to 1-finger pan without jumping
      const t = e.touches[0];
      touchStartRef.current = {
        x: t.clientX - position.x,
        y: t.clientY - position.y
      };
      touchOriginClientRef.current = { x: t.clientX, y: t.clientY };
      lastTouchSampleRef.current = { x: t.clientX, y: t.clientY, time: performance.now() };
      pinchStartDistRef.current = null;
      pinchCanvasCenterRef.current = null;
    } else if (e.touches.length === 0) {
      const wasMoved = touchMovedRef.current;
      const targetEl = e.target as HTMLElement;
      const tappedOnCard = Boolean(targetEl.closest('.node-card'));

      // Double-tap on empty canvas smoothly toggles zoom at tap point
      if (!wasMoved && !tappedOnCard && e.changedTouches.length === 1) {
        const ct = e.changedTouches[0];
        const now = performance.now();
        const prevTap = lastTapRef.current;
        if (
          prevTap &&
          now - prevTap.time < 300 &&
          Math.hypot(ct.clientX - prevTap.x, ct.clientY - prevTap.y) < 32
        ) {
          lastTapRef.current = null;
          setIsTouchInteracting(false);
          const nextScale = scale < 1.15 ? Math.min(scale * 1.45, 1.55) : 0.78;
          zoomAtPoint(nextScale, { x: ct.clientX, y: ct.clientY });
        } else {
          lastTapRef.current = { x: ct.clientX, y: ct.clientY, time: now };
        }
      }

      // Gentle inertial glide after quick swipe
      if (wasMoved && !pinchStartDistRef.current) {
        let { vx, vy } = touchVelocityRef.current;
        const speed = Math.hypot(vx, vy);
        if (speed > 0.15) {
          let lastTime = performance.now();
          const step = (now: number) => {
            const dt = Math.min(now - lastTime, 32);
            lastTime = now;
            const friction = Math.pow(0.92, dt / 16);
            vx *= friction;
            vy *= friction;
            if (Math.hypot(vx, vy) < 0.03) {
              inertiaRafRef.current = null;
              return;
            }
            setPosition(prev => ({
              x: prev.x + vx * dt,
              y: prev.y + vy * dt
            }));
            inertiaRafRef.current = requestAnimationFrame(step);
          };
          inertiaRafRef.current = requestAnimationFrame(step);
        }
      }

      touchStartRef.current = null;
      touchOriginClientRef.current = null;
      lastTouchSampleRef.current = null;
      pinchStartDistRef.current = null;
      pinchCanvasCenterRef.current = null;
      setIsTouchInteracting(false);

      if (suppressNextClickRef.current) {
        setTimeout(() => {
          suppressNextClickRef.current = false;
        }, 80);
      }
    }
  };

  // Fit Entire Family Tree into Viewport
  const handleFitView = useCallback(() => {
    const container = containerRef.current;
    const containerW = container?.clientWidth || window.innerWidth;
    const containerH = container?.clientHeight || window.innerHeight;

    const treeW = bounds.maxX - bounds.minX + CARD_WIDTH + 80;
    const treeH = bounds.maxY - bounds.minY + CARD_HEIGHT + 140;

    if (treeW <= 0 || treeH <= 0) return;

    const scaleX = (containerW - 40) / treeW;
    const scaleY = (containerH - 140) / treeH;
    const optimalScale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.25), 1.15);

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    setScale(optimalScale);
    setPosition({
      x: containerW / 2 - centerX * optimalScale,
      y: containerH / 2 - centerY * optimalScale + 25
    });
    setFocusedMemberId(null);
  }, [bounds]);

  // Reset & Center View (Centers collapsed root or fits current layout cleanly)
  const handleResetView = useCallback(() => {
    const container = containerRef.current;
    const containerW = container?.clientWidth || window.innerWidth;
    const containerH = container?.clientHeight || window.innerHeight;
    const isMobile = containerW < 768;

    if (nodes.length <= 1) {
      const targetScale = isMobile ? 0.92 : 1.0;
      setScale(targetScale);
      setPosition({
        x: containerW / 2,
        y: containerH / 2 - 10
      });
    } else {
      handleFitView();
    }
    setFocusedMemberId(null);
  }, [nodes.length, handleFitView]);

  // Smooth Auto-Framing: centers on initial mount, layout mode switch, and whenever a branch is expanded
  useEffect(() => {
    if (layoutMode === 'flow' || nodes.length === 0) {
      prevLayoutModeRef.current = layoutMode;
      return;
    }

    const container = containerRef.current;
    const containerW = container?.clientWidth || window.innerWidth;
    const containerH = container?.clientHeight || window.innerHeight;
    const isMobile = containerW < 768;

    const getNodeScreenCoords = (n: HierarchyPointNode<TreeNodeData>) =>
      layoutMode === 'horizontal' ? { x: -n.y, y: n.x } : { x: n.x, y: n.y };

    // 1) Initial mount framing (centers root card cleanly in viewport)
    if (!hasCenteredInitialRef.current) {
      hasCenteredInitialRef.current = true;
      const initialScale = isMobile ? 0.92 : 1.0;
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;
      setScale(initialScale);
      setPosition({
        x: containerW / 2 - centerX * initialScale,
        y: containerH / 2 - centerY * initialScale - 10
      });
      prevLayoutModeRef.current = layoutMode;
      return;
    }

    // 2) Layout mode switched (horizontal <-> vertical)
    if (prevLayoutModeRef.current !== layoutMode) {
      prevLayoutModeRef.current = layoutMode;
      handleResetView();
      return;
    }

    // 3) User triggered Expand All / Collapse All / Individual Node Expand
    const pendingId = pendingFocusExpandIdRef.current;
    if (!pendingId) return;
    pendingFocusExpandIdRef.current = null;

    if (pendingId === '__FIT_ALL__') {
      handleFitView();
      return;
    }

    if (pendingId === '__RESET_ROOT__') {
      const targetScale = isMobile ? 0.92 : 1.0;
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;
      setScale(targetScale);
      setPosition({
        x: containerW / 2 - centerX * targetScale,
        y: containerH / 2 - centerY * targetScale - 10
      });
      return;
    }

    // Frame the newly expanded parent together with its direct children inside the screen
    const parentNode = nodes.find(n => n.data.id === pendingId);
    if (!parentNode) return;
    const childNodes = nodes.filter(n => n.parent?.data.id === pendingId);
    const focusGroup = [parentNode, ...childNodes];

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    focusGroup.forEach(n => {
      const pt = getNodeScreenCoords(n);
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    });

    minX -= CARD_WIDTH / 2 + 40;
    maxX += CARD_WIDTH / 2 + 40;
    minY -= CARD_HEIGHT / 2 + 30;
    maxY += CARD_HEIGHT / 2 + 30;

    const boxW = Math.max(maxX - minX, CARD_WIDTH);
    const boxH = Math.max(maxY - minY, CARD_HEIGHT);

    const usableW = Math.max(containerW - 28, 260);
    const usableH = Math.max(containerH - (isMobile ? 210 : 160), 260);

    const fitScale = Math.min(usableW / boxW, usableH / boxH);
    const targetScale = Math.min(Math.max(Math.min(scale, fitScale), 0.42), 1.05);

    const boxCenterX = (minX + maxX) / 2;
    const boxCenterY = (minY + maxY) / 2;

    setScale(targetScale);
    setPosition({
      x: containerW / 2 - boxCenterX * targetScale,
      y: containerH / 2 - boxCenterY * targetScale + (isMobile ? 15 : 10)
    });
  }, [nodes, bounds, layoutMode, scale, handleFitView, handleResetView]);

  // Center on first search match whenever searchQuery changes
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      if (lastCenteredSearchRef.current) {
        lastCenteredSearchRef.current = '';
      }
      return;
    }
    if (trimmed === lastCenteredSearchRef.current || layoutMode === 'flow' || searchMatchIds.size === 0) return;

    const firstMatchId = Array.from(searchMatchIds)[0];
    const node = nodes.find(n => n.data.member.id === firstMatchId);
    if (!node) return;

    lastCenteredSearchRef.current = trimmed;
    const pt = layoutMode === 'horizontal' ? { x: -node.y, y: node.x } : { x: node.x, y: node.y };
    const containerW = containerRef.current?.clientWidth || window.innerWidth;
    const containerH = containerRef.current?.clientHeight || window.innerHeight;
    setPosition({
      x: containerW / 2 - pt.x * scale,
      y: containerH / 2 - pt.y * scale
    });
  }, [searchQuery, searchMatchIds, nodes, layoutMode, scale]);

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
      className={`relative w-full h-[calc(100vh-125px)] min-h-[580px] overflow-hidden bg-[#f8fafc] flex flex-col font-sans select-none ${
        isFullscreen ? 'fixed inset-0 z-50 h-screen' : ''
      }`}
    >
      {/* ---------------------------------------------------- */}
      {/* Top Floating Glass Navigation & Kinship Toolbar */}
      {/* ---------------------------------------------------- */}
      <div className="absolute top-3 right-3 left-3 z-30 flex flex-col gap-2 pointer-events-none">
        <div className="flex flex-wrap items-center justify-between gap-2">
          
          {/* Search Bar & Primary Filters */}
          <div className="pointer-events-auto flex items-center gap-1.5 glass-panel p-1.5 rounded-2xl shadow-md border border-slate-200/90 flex-1 max-w-xl">
            <div className="relative flex-1 min-w-[140px] sm:min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-sky-600 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم لتتبع النسب..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pr-8 pl-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-sky-500 shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs px-1"
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
                className="bg-slate-50 border border-slate-300 text-sky-900 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none font-semibold cursor-pointer shadow-xs"
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
                className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none shadow-xs"
              >
                <option value="all">كافة الفروع</option>
                {branches.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-xl px-2 py-1.5 focus:outline-none shadow-xs"
              >
                <option value="all">الكل</option>
                <option value="male">الذكور</option>
                <option value="female">الإناث</option>
              </select>
            </div>

            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setShowFiltersModal(!showFiltersModal)}
              className="sm:hidden min-h-[40px] min-w-[40px] rounded-xl glass-btn flex items-center justify-center text-slate-700"
              title="تصفية الفروع والحالات"
            >
              <SlidersHorizontal className="w-4 h-4 text-sky-600" />
            </button>
          </div>

          {/* Diagram Layout Mode & Zoom Controls */}
          <div className="pointer-events-auto flex items-center gap-1.5 glass-panel p-1.5 rounded-2xl shadow-md border border-slate-200/90">
            
            {/* Diagram Mode Switcher (Cupertino Segmented Control) */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 shadow-xs">
              <button
                onClick={() => setLayoutMode('horizontal')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all ${
                  layoutMode === 'horizontal'
                    ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="مخطط النسب الأفقي المتسلسل (الأنساب العربية من اليمين إلى اليسار)"
              >
                <Compass className="w-3.5 h-3.5 text-sky-600" />
                <span className="hidden sm:inline">أفقي متسلسل</span>
              </button>

              <button
                onClick={() => setLayoutMode('vertical')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all ${
                  layoutMode === 'vertical'
                    ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="مخطط النسب الرأسي المتفرع (الشجرة الصاعدة والنازلة)"
              >
                <GitBranch className="w-3.5 h-3.5 text-teal-600" />
                <span className="hidden sm:inline">رأسي متفرع</span>
              </button>

              <button
                onClick={() => setLayoutMode('flow')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all ${
                  layoutMode === 'flow'
                    ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="قائمة الأجيال المتسلسلة (للجوال)"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">الأجيال</span>
              </button>
            </div>

            {/* Canvas Zoom & Pan Actions (Desktop/Tablet; mobile has dedicated thumb dock) */}
            {layoutMode !== 'flow' && (
              <>
                <button
                  onClick={() => zoomAtPoint(scale + 0.18)}
                  title="تكبير المخطط"
                  className="hidden sm:flex w-8 h-8 rounded-xl bg-white/95 border border-slate-200/90 shadow-xs items-center justify-center text-slate-700 hover:text-sky-600 hover:border-sky-300 active:scale-95 transition-all"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => zoomAtPoint(scale - 0.18)}
                  title="تصغير المخطط"
                  className="hidden sm:flex w-8 h-8 rounded-xl bg-white/95 border border-slate-200/90 shadow-xs items-center justify-center text-slate-700 hover:text-sky-600 hover:border-sky-300 active:scale-95 transition-all"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleFitView}
                  title="ملاءمة كامل الشجرة للشاشة"
                  className="h-8 px-2 rounded-xl bg-white/95 border border-slate-200/90 shadow-xs hidden sm:flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-sky-600 hover:border-sky-300 active:scale-95 transition-all"
                >
                  <Focus className="w-3.5 h-3.5 text-sky-600" />
                  <span className="hidden md:inline">ملاءمة</span>
                </button>
                <button
                  onClick={handleResetView}
                  title="إعادة التوسيط والتكبير الافتراضي"
                  className="hidden sm:flex w-8 h-8 rounded-xl bg-white/95 border border-slate-200/90 shadow-xs items-center justify-center text-slate-700 hover:text-sky-600 hover:border-sky-300 active:scale-95 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {/* Expand / Collapse All (Always accessible on mobile & desktop) */}
            {layoutMode !== 'flow' && (
              <>
                {effectiveExpandedIds.size > 0 && (
                  <button
                    onClick={handleCollapseAll}
                    title="طي كافة الفروع والأعقاب"
                    className="flex px-2.5 h-8 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 shadow-xs text-[11px] font-bold text-amber-900 items-center gap-1 active:scale-95 transition-all whitespace-nowrap shrink-0"
                  >
                    <Minimize2 className="w-3.5 h-3.5 text-amber-700" />
                    <span>طي الكل</span>
                  </button>
                )}
                <button
                  onClick={handleExpandAll}
                  title="توسيع كافة فروع وذرية الشجرة"
                  className="hidden lg:flex px-2 h-8 rounded-xl bg-white/95 border border-slate-200/90 shadow-xs text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:border-emerald-300 items-center gap-1 active:scale-95 transition-all whitespace-nowrap shrink-0"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>فتح الكل</span>
                </button>
              </>
            )}

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'تصغير الشاشة' : 'ملء الشاشة الكاملة'}
              className="w-8 h-8 rounded-xl bg-white/95 border border-slate-200/90 shadow-xs flex items-center justify-center text-slate-700 hover:text-slate-900 active:scale-95 transition-all"
            >
              {isFullscreen ? <Shrink className="w-3.5 h-3.5 text-amber-500" /> : <Expand className="w-3.5 h-3.5" />}
            </button>

            {/* Export as Image Button */}
            {onOpenExportImage && (
              <button
                onClick={onOpenExportImage}
                title="تصدير شجرة العائلة كصورة (PNG) عالي الجودة للطباعة أو المشاركة"
                className="h-8 px-2.5 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 flex items-center gap-1.5 transition-all active:scale-95 shadow-xs"
              >
                <FileImage className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">تصدير كصورة</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Filter Dropdown */}
        {showFiltersModal && (
          <div className="sm:hidden pointer-events-auto bg-white/98 p-3 rounded-2xl border border-slate-200 shadow-xl grid grid-cols-2 gap-2 animate-in fade-in duration-150">
            <div>
              <label className="text-[10px] text-slate-500 block mb-1">الفرع العائلي:</label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-xl p-2 focus:outline-none"
              >
                <option value="all">كافة الفروع</option>
                {branches.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 block mb-1">الجنس:</label>
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-xl p-2 focus:outline-none"
              >
                <option value="all">الكل</option>
                <option value="male">الذكور</option>
                <option value="female">الإناث</option>
              </select>
            </div>
            <div className="col-span-2 pt-1 border-t border-slate-100">
              <label className="text-[10px] text-slate-500 block mb-1">وسم العائلة الفرعية:</label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setSubFamilyFilter('all')}
                  className={`flex-1 min-h-[38px] py-1 rounded-xl text-xs font-semibold border ${
                    subFamilyFilter === 'all'
                      ? 'bg-sky-600 border-sky-600 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  الكل
                </button>
                <button
                  type="button"
                  onClick={() => setSubFamilyFilter('jaber')}
                  className={`flex-1 min-h-[38px] py-1 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 ${
                    subFamilyFilter === 'jaber'
                      ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-xs'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  <Crown className="w-3 h-3" />
                  <span>آل جابر</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSubFamilyFilter('nawasir')}
                  className={`flex-1 min-h-[38px] py-1 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 ${
                    subFamilyFilter === 'nawasir'
                      ? 'bg-teal-600 border-teal-500 text-white shadow-xs'
                      : 'bg-teal-50 border-teal-200 text-teal-900'
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
          <div className="pointer-events-auto bg-white/95 backdrop-blur-md px-3 sm:px-4 py-2 rounded-2xl border border-amber-300 shadow-md flex items-center justify-between gap-2 max-w-4xl mx-auto overflow-hidden animate-in fade-in duration-200">
            <div className="flex items-center gap-1.5 shrink-0 text-amber-800 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
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
                      className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1 ${
                        isTarget
                          ? 'bg-amber-600 text-white font-bold shadow-xs'
                          : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <span>{item.full_name.split(' ')[0]}</span>
                      {isTarget && (
                        <span className="text-[10px] text-amber-100 font-normal">
                          (الجيل {item.generation})
                        </span>
                      )}
                    </button>
                    {idx < activeLineageChain.length - 1 && (
                      <span className="text-amber-700 font-bold text-[10px] font-mono"> بن </span>
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
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          className={`w-full h-full flex-1 cursor-grab select-none relative touch-none overflow-hidden ${
            isDragging ? 'cursor-grabbing' : ''
          }`}
        >
          {/* Eye-Comfort Pure Restful Light Canvas (No harsh dots) */}
          <div className="absolute inset-0 bg-[#f8fafc] pointer-events-none" />
          <div
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(to right, #cbd5e1 1px, transparent 1px), linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)`,
              backgroundSize: '48px 48px'
            }}
          />

          {/* Canvas SVG and Nodes Layer */}
          <div
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: '0 0',
              transition: isDragging || isTouchInteracting ? 'none' : 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
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
                  <feDropShadow dx="0" dy="1" stdDeviation="2.5" floodColor="#d97706" floodOpacity="0.5" />
                </filter>
                <linearGradient id="activeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#d97706" />
                  <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>
              </defs>

              {/* Generational Guide Ribbons (Clean Light Lanes) */}
              {layoutMode === 'vertical' && distinctGenerations.map(gen => {
                const tierY = (gen - 1) * LEVEL_HEIGHT;
                const leftX = bounds.minX - 350;
                const rightX = bounds.maxX + 350;
                return (
                  <g key={`gen-guide-${gen}`} className="pointer-events-none opacity-60">
                    <line
                      x1={leftX}
                      y1={tierY}
                      x2={rightX}
                      y2={tierY}
                      stroke="#cbd5e1"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      strokeOpacity={0.8}
                    />
                    <rect
                      x={rightX - 110}
                      y={tierY - 12}
                      width={100}
                      height={24}
                      rx={12}
                      fill="#ffffff"
                      stroke="#cbd5e1"
                      strokeWidth={1}
                    />
                    <text
                      x={rightX - 60}
                      y={tierY + 4}
                      textAnchor="middle"
                      fill="#475569"
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
                  <g key={`gen-guide-h-${gen}`} className="pointer-events-none opacity-60">
                    <line
                      x1={tierX}
                      y1={topY}
                      x2={tierX}
                      y2={bottomY}
                      stroke="#cbd5e1"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      strokeOpacity={0.8}
                    />
                    <rect
                      x={tierX - 45}
                      y={topY - 26}
                      width={90}
                      height={22}
                      rx={11}
                      fill="#ffffff"
                      stroke="#cbd5e1"
                      strokeWidth={1}
                    />
                    <text
                      x={tierX}
                      y={topY - 11}
                      textAnchor="middle"
                      fill="#475569"
                      fontSize={11}
                      fontWeight="bold"
                      fontFamily="Cairo, sans-serif"
                    >
                      الجيل {gen}
                    </text>
                  </g>
                );
              })}

              {/* Draw All D3-Hierarchy Links (Refined High-Legibility Cables) */}
              {links.map((link, idx) => {
                const isAncestorLink =
                  ancestorIds.has(link.target.id) || (link.target.id === activeId && ancestorIds.has(link.source.id));
                const isDescendantLink =
                  descendantIds.has(link.target.id) || (link.source.id === activeId && descendantIds.has(link.target.id));
                const isActiveLink = isAncestorLink || isDescendantLink;

                const pathData = generateLinkPath(link);

                return (
                  <g key={`${link.source.id}-${link.target.id}-${idx}`}>
                    {/* Main Lineage Cable */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke={isActiveLink ? '#b45309' : '#64748b'}
                      strokeWidth={isActiveLink ? 3.6 : 2.2}
                      strokeOpacity={isActiveLink ? 1 : 0.72}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter={isActiveLink ? 'url(#goldGlow)' : undefined}
                      className="transition-all duration-300"
                    />

                    {/* Animated Pulses on Active Path */}
                    {isActiveLink && (
                      <path
                        d={pathData}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        strokeDasharray="6 8"
                        className="animate-pulse"
                      />
                    )}

                    {/* Source Anchor Dot (Exit from parent card edge) */}
                    <circle
                      cx={link.sourceX}
                      cy={link.sourceY}
                      r={isActiveLink ? 4.5 : 3.5}
                      fill={isActiveLink ? '#d97706' : '#0284c7'}
                      stroke="#ffffff"
                      strokeWidth={1.5}
                      className="transition-all duration-300"
                    />

                    {/* Target Junction Dot (Entry into child card edge) */}
                    <circle
                      cx={link.targetX}
                      cy={link.targetY}
                      r={isActiveLink ? 4.5 : 3.5}
                      fill={isActiveLink ? '#d97706' : '#64748b'}
                      stroke="#ffffff"
                      strokeWidth={1.5}
                      className="transition-all duration-300"
                    />
                  </g>
                );
              })}
            </svg>

            {/* Render Member Node Cards */}
            {nodes.map(node => {
              const member = node.data.member;
              const counts = descendantsCountMap.get(member.id) || { direct: 0, total: 0 };
              const hasChildren = counts.direct > 0;
              const isCollapsed = hasChildren && !effectiveExpandedIds.has(member.id);
              const isMatch = searchMatchIds.has(member.id);
              const isTarget = activeId === member.id;
              const isAncestor = ancestorIds.has(member.id);
              const isDescendant = descendantIds.has(member.id);
              const kinshipTag = getKinshipLabel(member.id);

              const isMale = member.gender === 'male';
              const isRootNode = !member.father_id;
              const displayCardName = getTreeCardDisplayName(member);
              const firstLetter = displayCardName.trim().charAt(0) || 'ب';

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
                    if (suppressNextClickRef.current) {
                      suppressNextClickRef.current = false;
                      return;
                    }
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
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 shadow-md flex items-center gap-1 border border-amber-300">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>{kinshipTag}</span>
                      </span>
                    </div>
                  )}

                  {/* Folded Stack Silhouette (Subtle depth indicator showing hidden descendants) */}
                  {isCollapsed && (
                    <div
                      aria-hidden="true"
                      className={`absolute inset-0 rounded-2xl border pointer-events-none transition-transform ${
                        layoutMode === 'horizontal'
                          ? '-translate-x-1.5 translate-y-1.5'
                          : 'translate-y-1.5 scale-[0.97]'
                      } ${
                        isMale
                          ? 'bg-sky-50/90 border-sky-200/90'
                          : 'bg-rose-50/90 border-rose-200/90'
                      }`}
                    />
                  )}

                  {/* Outgoing Branch Continuation Stub & Tactile +N Handle */}
                  {isCollapsed && (
                    <button
                      type="button"
                      onClick={(e) => handleToggleCollapse(member.id, e)}
                      aria-label={`فتح ذرية ${member.full_name} (${counts.direct} مباشر)`}
                      title={`يوجد ${counts.direct} أبناء (${counts.total} ذرية) — اضغط للفتح`}
                      className={`absolute z-30 min-w-[44px] min-h-[44px] flex items-center justify-center group/stub focus:outline-none ${
                        layoutMode === 'horizontal'
                          ? '-left-8 top-1/2 -translate-y-1/2'
                          : '-bottom-8 left-1/2 -translate-x-1/2 flex-col'
                      }`}
                    >
                      {layoutMode === 'horizontal' ? (
                        <div className="flex items-center">
                          <span className="h-7 px-2 rounded-full bg-sky-600 group-hover/stub:bg-sky-700 text-white shadow-md border-2 border-white flex items-center gap-0.5 text-[11px] font-bold tabular-nums transition-transform group-hover/stub:scale-105 active:scale-95">
                            <ChevronLeft className="w-3.5 h-3.5 -mr-0.5" />
                            <span>+{counts.direct}</span>
                          </span>
                          <span className="w-2.5 h-0.5 bg-sky-500" />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <span className="w-0.5 h-2.5 bg-sky-500" />
                          <span className="h-7 px-2.5 rounded-full bg-sky-600 group-hover/stub:bg-sky-700 text-white shadow-md border-2 border-white flex items-center gap-0.5 text-[11px] font-bold tabular-nums transition-transform group-hover/stub:scale-105 active:scale-95">
                            <span>+{counts.direct}</span>
                            <ChevronDown className="w-3.5 h-3.5 -ml-0.5" />
                          </span>
                        </div>
                      )}
                    </button>
                  )}

                  {/* Main Compact Card (First-Name Focus for Tighter Tree Footprint) */}
                  <div
                    className={`relative z-10 h-[110px] flex flex-col justify-between rounded-2xl p-2.5 text-right transition-all duration-200 border ${
                      isMale
                        ? member.is_living
                          ? 'glass-card border-sky-300 hover:border-sky-500'
                          : 'bg-slate-50/95 border-slate-300 hover:border-slate-400 shadow-xs'
                        : member.is_living
                        ? 'glass-card-female border-rose-300 hover:border-rose-500'
                        : 'bg-rose-50/60 border-rose-200 hover:border-rose-300 shadow-xs'
                    } ${
                      isTarget
                        ? 'ring-2 ring-sky-600 shadow-[0_0_24px_rgba(2,132,199,0.25)] border-sky-600'
                        : isAncestor
                        ? 'ring-2 ring-amber-500 shadow-[0_0_20px_rgba(217,119,6,0.25)] border-amber-500'
                        : isDescendant
                        ? 'ring-2 ring-teal-500 shadow-[0_0_20px_rgba(13,148,136,0.25)] border-teal-500'
                        : isMatch
                        ? 'ring-2 ring-sky-400 border-sky-500 shadow-[0_0_20px_rgba(2,132,199,0.2)]'
                        : ''
                    }`}
                  >
                    {/* Header: Compact Emblem + First Name + Status */}
                    <div className="flex items-center gap-2">
                      {/* Avatar or Emblem */}
                      <div className="shrink-0 relative">
                        {isMale ? (
                          member.avatar_url ? (
                            <img
                              src={member.avatar_url}
                              alt={member.full_name}
                              referrerPolicy="no-referrer"
                              className="w-9 h-9 rounded-xl object-cover border border-sky-300 shadow-xs"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-sky-100 border border-sky-300 flex items-center justify-center text-sky-800 font-bold text-sm shadow-xs">
                              {firstLetter}
                            </div>
                          )
                        ) : (
                          /* Female dignified crest badge (Strictly NO photo) */
                          <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shadow-xs">
                            <FemaleHeritageBadge size={22} />
                          </div>
                        )}

                        <span
                          className={`absolute -bottom-1 -left-1 text-[8.5px] font-mono px-1 rounded font-semibold ${
                            isMale
                              ? 'bg-slate-100 text-sky-800 border border-sky-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          G{member.generation || 1}
                        </span>
                      </div>

                      {/* First Name & Quiet Metadata */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 text-[9.5px] leading-tight">
                          <span
                            className={`font-semibold truncate ${
                              member.is_living
                                ? isMale
                                  ? 'text-sky-700'
                                  : 'text-rose-700'
                                : 'text-slate-500'
                            }`}
                          >
                            {member.is_living
                              ? isMale ? 'حي يُرزق' : 'حفظها الله'
                              : isMale ? 'رحمه الله' : 'رحمها الله'}
                          </span>
                          {member.birth_date && (
                            <span className="text-slate-400 font-mono tabular-nums shrink-0">
                              {member.birth_date}
                            </span>
                          )}
                        </div>

                        <h3
                          className={`font-extrabold text-slate-900 leading-tight mt-0.5 truncate ${
                            isRootNode ? 'text-[12.5px]' : 'text-[14px]'
                          }`}
                          title={member.full_name}
                        >
                          {displayCardName}
                        </h3>

                        {/* Sub-Family Lineage Tag */}
                        <div className="mt-0.5 overflow-hidden">
                          <SubFamilyBadge
                            member={member}
                            memberMap={memberMap}
                            size="xs"
                            className="flex-nowrap overflow-hidden"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Compact Action & Continuation Strip */}
                    <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between gap-1.5 text-[10px] text-slate-600">
                      <span className="truncate max-w-[66px] text-slate-400">
                        {member.branch || 'العام'}
                      </span>

                      {hasChildren ? (
                        <button
                          type="button"
                          onClick={(e) => handleToggleCollapse(member.id, e)}
                          className={`min-h-[28px] px-2 py-0.5 rounded-lg border flex items-center gap-1 text-[10px] font-bold active:scale-95 transition-all whitespace-nowrap shrink-0 ${
                            isCollapsed
                              ? 'bg-sky-50 hover:bg-sky-100 border-sky-300 text-sky-800 shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                          }`}
                          title={isCollapsed ? 'فتح وعرض الذرية والأعقاب' : 'طي فروع الذرية'}
                        >
                          {isCollapsed ? (
                            <>
                              <Plus className="w-2.5 h-2.5 text-sky-600" />
                              <span className="tabular-nums">
                                الذرية ({counts.total > counts.direct ? `${counts.direct}·${counts.total}` : counts.direct})
                              </span>
                            </>
                          ) : (
                            <>
                              <Minimize2 className="w-2.5 h-2.5 text-slate-500" />
                              <span className="tabular-nums">طي ({counts.direct})</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-500 flex items-center gap-1 group-hover:text-sky-600 py-0.5">
                          <Eye className="w-3 h-3" />
                          <span>التفاصيل</span>
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
        <div
          key="flow-view"
          className="animate-apple-view w-full h-full flex-1 overflow-y-auto px-4 py-20 pb-28 max-w-5xl mx-auto space-y-8"
        >
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
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    {getGenerationLabel(genNum)}
                  </h3>
                  <span className="text-xs font-mono font-semibold text-sky-700 tabular-nums">
                    {filteredMembers.length} فرد
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
                  {filteredMembers.map(member => {
                    const isMale = member.gender === 'male';
                    const displayFlowName = getTreeCardDisplayName(member);

                    return (
                      <div
                        key={member.id}
                        onClick={() => {
                          setFocusedMemberId(member.id);
                          onSelectMember(member);
                        }}
                        className={`rounded-2xl p-2.5 sm:p-3 cursor-pointer border text-right transition-all hover:scale-102 active:scale-98 bg-white shadow-xs ${
                          isMale ? 'border-sky-300 hover:border-sky-500' : 'border-rose-300 hover:border-rose-500'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="shrink-0 relative">
                            {isMale ? (
                              member.avatar_url ? (
                                <img
                                  src={member.avatar_url}
                                  alt={member.full_name}
                                  referrerPolicy="no-referrer"
                                  className="w-9 h-9 rounded-xl object-cover border border-sky-300"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-xl bg-sky-100 border border-sky-300 flex items-center justify-center text-sky-800 font-bold text-sm">
                                  {displayFlowName.charAt(0)}
                                </div>
                              )
                            ) : (
                              <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center">
                                <FemaleHeritageBadge size={22} />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className="text-[14px] font-extrabold text-slate-900 truncate" title={member.full_name}>
                              {displayFlowName}
                            </h4>
                            <div className="mt-0.5 truncate">
                              <SubFamilyBadge member={member} memberMap={memberMap} size="xs" />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-500 mt-0.5">
                              <span className="truncate">{member.branch || 'الفرع العام'}</span>
                              {member.birth_date && <span className="font-mono tabular-nums">{member.birth_date}</span>}
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

      {/* Floating Canvas Quick Mobile Zoom & Collapse Control Dock */}
      {layoutMode !== 'flow' && (
        <aside
          aria-label="أدوات التكبير والتنقل السريع للجوال"
          className="sm:hidden absolute bottom-28 left-3 z-30 flex flex-col gap-1 bg-white/95 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/90 shadow-lg pointer-events-auto"
        >
          <button
            onClick={() => zoomAtPoint(scale + 0.2)}
            title="تكبير المخطط"
            className="w-11 h-11 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 font-bold active:scale-95 transition-all shadow-xs"
          >
            <ZoomIn className="w-5 h-5 text-sky-600" />
          </button>
          <button
            onClick={() => zoomAtPoint(1.0)}
            title="مقياس 100%"
            className="w-11 h-6 rounded-lg bg-sky-50 text-[10px] font-mono font-bold text-sky-800 flex items-center justify-center border border-sky-200 active:scale-95 tabular-nums"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            onClick={() => zoomAtPoint(scale - 0.2)}
            title="تصغير المخطط"
            className="w-11 h-11 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 font-bold active:scale-95 transition-all shadow-xs"
          >
            <ZoomOut className="w-5 h-5 text-sky-600" />
          </button>
          <div className="w-full h-px bg-slate-200 my-0.5" />
          <button
            onClick={handleFitView}
            title="ملاءمة المعروض للشاشة"
            className="w-11 h-11 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-700 active:scale-95 transition-all shadow-xs"
          >
            <Focus className="w-5 h-5 text-sky-600" />
          </button>
          {effectiveExpandedIds.size > 0 ? (
            <button
              onClick={handleCollapseAll}
              title="طي كافة الفروع المفتوحة"
              className="w-11 h-11 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 active:scale-95 transition-all shadow-xs"
            >
              <Minimize2 className="w-5 h-5 text-amber-700" />
            </button>
          ) : (
            <button
              onClick={handleResetView}
              title="إعادة التوسيط الافتراضي"
              className="w-11 h-11 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 active:scale-95 transition-all shadow-xs"
            >
              <RotateCcw className="w-4 h-4 text-slate-600" />
            </button>
          )}
        </aside>
      )}

      {/* ---------------------------------------------------- */}
      {/* Floating Canvas Footer Status & Kinship Legend */}
      {/* ---------------------------------------------------- */}
      {layoutMode !== 'flow' && (
        <div className="absolute bottom-20 md:bottom-3 left-3 right-3 sm:left-4 sm:right-4 z-20 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 bg-white/95 backdrop-blur-md px-3.5 py-1.5 sm:py-2 rounded-2xl border border-slate-200/90 shadow-md pointer-events-none">
          <div className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar">
            <span className="flex items-center gap-1.5 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
              <span className="text-sky-900 font-semibold">رجال (أحياء)</span>
            </span>
            <span className="flex items-center gap-1.5 hidden sm:flex shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <span className="text-slate-600 font-medium">رجال (رحمه الله)</span>
            </span>
            <span className="flex items-center gap-1.5 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="text-rose-900 font-semibold">نساء (أحياء)</span>
            </span>
            <span className="flex items-center gap-1.5 hidden sm:flex shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
              <span className="text-purple-800 font-medium">نساء (رحمها الله)</span>
            </span>
            <span className="flex items-center gap-1.5 hidden md:flex border-r border-slate-200 pr-3 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-amber-800 font-bold">سلسلة النسب المتصلة</span>
            </span>
            <span className="flex items-center gap-1 hidden lg:flex shrink-0">
              <Flame className="w-3 h-3 text-orange-500" />
              <span className="text-orange-800 font-semibold">الدرويش</span>
            </span>
            <span className="flex items-center gap-1 hidden lg:flex shrink-0">
              <Waves className="w-3 h-3 text-sky-500" />
              <span className="text-sky-800 font-semibold">الأزرق</span>
            </span>
            <span className="flex items-center gap-1 hidden xl:flex shrink-0">
              <Crown className="w-3 h-3 text-amber-500" />
              <span className="text-amber-800 font-semibold">آل جابر</span>
            </span>
            <span className="flex items-center gap-1 hidden xl:flex shrink-0">
              <Shield className="w-3 h-3 text-teal-600" />
              <span className="text-teal-800 font-semibold">النواصر</span>
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-slate-400 text-[10px] hidden md:inline">
              اسحب للتنقل · قرّب بأصبعين · انقر لفتح السجل
            </span>
            <span className="font-mono text-slate-700 text-xs bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 font-semibold">
              {Math.round(scale * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
