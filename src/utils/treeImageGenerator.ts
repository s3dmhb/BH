import { FamilyMember } from '../types/family';
import { matchesSubFamilyFilter, getSubFamilyTags } from './subFamilyUtils';

export type ExportTreeStyle = 'botanical' | 'vertical';
export type ExportTheme = 'parchment' | 'emerald' | 'classic';
export type ExportResolution = 'hd' | 'ultra_4k';

export interface TreeImageExportOptions {
  style: ExportTreeStyle;
  theme: ExportTheme;
  resolution: ExportResolution;
  selectedBranch: string; // 'all' or branch name
  selectedSubFamily: string; // 'all' or sub-family name
  genderFilter: 'all' | 'male' | 'female';
  showDates: boolean;
  showVerses: boolean;
  useFirstNameOnly?: boolean; // Defaults to true as requested
  scale?: number; // Internal scaling for preview vs download
}

export interface HierarchyExportNode {
  member: FamilyMember;
  firstName: string;
  children: HierarchyExportNode[];
  x: number;
  y: number;
  width: number;
  height: number;
  branchColor: string;
}

// Sub-family color accents
export const SUB_FAMILY_COLORS: Record<string, { bg: string; border: string; text: string; fill: string }> = {
  'البوحسون': { bg: '#854d0e', border: '#eab308', text: '#fef08a', fill: '#facc15' },
  'النصف': { bg: '#1e3a8a', border: '#3b82f6', text: '#bfdbfe', fill: '#60a5fa' },
  'الدرويش': { bg: '#713f12', border: '#f59e0b', text: '#fde68a', fill: '#fbbf24' },
  'الأزرق': { bg: '#134e4a', border: '#14b8a6', text: '#99f6e4', fill: '#2dd4bf' },
  'آل جابر': { bg: '#064e3b', border: '#10b981', text: '#a7f3d0', fill: '#34d399' },
  'النواصر': { bg: '#365314', border: '#84cc16', text: '#d9f99d', fill: '#a3e635' },
  'default': { bg: '#0f766e', border: '#14b8a6', text: '#ccfbf1', fill: '#2dd4bf' }
};

export function getSubFamilyColor(subFamily?: string) {
  if (!subFamily) return SUB_FAMILY_COLORS['default'];
  for (const [key, val] of Object.entries(SUB_FAMILY_COLORS)) {
    if (subFamily.includes(key)) return val;
  }
  return SUB_FAMILY_COLORS['default'];
}

/**
 * Extract first name cleanly, preserving Arabic compound names like عبد الله / عبد العزيز
 */
export function getFirstNameOnly(fullName: string): string {
  if (!fullName) return '';
  let clean = fullName.trim();

  // Strip prefixes like 'الجد ', 'الشيخ ', 'الوجيه ', 'النوخذة '
  const honorifics = ['الجد', 'الشيخ', 'الوجيه', 'النوخذة', 'الأديب', 'السيد', 'الحاج', 'د.', 'دكتور'];
  for (const h of honorifics) {
    if (clean.startsWith(h + ' ')) {
      clean = clean.slice(h.length + 1).trim();
      break;
    }
  }

  const parts = clean.split(/\s+/);
  if (parts.length === 0) return '';

  // Arabic compound name prefixes (e.g. عبد الله، عبد العزيز، سيف الدين)
  const compoundPrefixes = ['عبد', 'جار', 'ضيف', 'سيف', 'نور', 'شمس', 'محيي', 'صلاح', 'تقي', 'بدر', 'علاء'];
  if (compoundPrefixes.includes(parts[0]) && parts.length > 1) {
    return `${parts[0]} ${parts[1]}`;
  }

  return parts[0];
}

/**
 * Filter and construct tree hierarchy for rendering with intact ancestral lineage
 */
export function buildExportHierarchy(
  members: FamilyMember[],
  options: TreeImageExportOptions
): { root: HierarchyExportNode | null; totalNodes: number; maxDepth: number; filterTitle?: string } {
  const fullMemberMap = new Map<string, FamilyMember>();
  members.forEach(m => fullMemberMap.set(m.id, m));

  // 1. Identify members matching target filter criteria
  let targetSet = [...members];

  if (options.genderFilter !== 'all') {
    targetSet = targetSet.filter(m => m.gender === options.genderFilter);
  }

  if (options.selectedBranch !== 'all') {
    targetSet = targetSet.filter(m => m.branch === options.selectedBranch);
  }

  if (options.selectedSubFamily !== 'all') {
    targetSet = targetSet.filter(m => 
      matchesSubFamilyFilter(m, options.selectedSubFamily, fullMemberMap)
    );
  }

  // 2. Ensure lineage connection: collect matching members + all their ancestors up to root
  const includedIds = new Set<string>();
  targetSet.forEach(m => {
    includedIds.add(m.id);
    let curFatherId = m.father_id;
    while (curFatherId) {
      includedIds.add(curFatherId);
      const parent = fullMemberMap.get(curFatherId);
      curFatherId = parent ? parent.father_id : null;
    }
  });

  // Always include the patriarch to anchor the tree
  const patriarch = members.find(m => m.father_id === null);
  if (patriarch) includedIds.add(patriarch.id);

  const filtered = members.filter(m => includedIds.has(m.id));

  const childrenMap = new Map<string, FamilyMember[]>();
  filtered.forEach(m => {
    if (m.father_id) {
      if (!childrenMap.has(m.father_id)) {
        childrenMap.set(m.father_id, []);
      }
      childrenMap.get(m.father_id)!.push(m);
    }
  });

  // Sort children by birth date or generation
  childrenMap.forEach(list => {
    list.sort((a, b) => {
      const yearA = parseInt(a.birth_date || '0');
      const yearB = parseInt(b.birth_date || '0');
      return (yearA || 0) - (yearB || 0);
    });
  });

  // Find root ancestor in filtered set
  let rootMember = filtered.find(m => m.father_id === null);
  if (!rootMember && filtered.length > 0) {
    filtered.sort((a, b) => (a.generation || 1) - (b.generation || 1));
    rootMember = filtered[0];
  }

  if (!rootMember) return { root: null, totalNodes: 0, maxDepth: 0 };

  let count = 0;
  let maxGen = 1;

  function buildNode(m: FamilyMember, depth: number): HierarchyExportNode {
    count++;
    if (depth > maxGen) maxGen = depth;

    const children = (childrenMap.get(m.id) || []).map(child => buildNode(child, depth + 1));
    const subColor = getSubFamilyColor(m.sub_family);
    const firstName = getFirstNameOnly(m.full_name);

    return {
      member: m,
      firstName,
      children,
      x: 0,
      y: 0,
      width: 100,
      height: 44,
      branchColor: subColor.border
    };
  }

  const root = buildNode(rootMember, 1);
  return { root, totalNodes: count, maxDepth: maxGen };
}

/**
 * Draw decorative Islamic arched frame (Mihrab cartouche)
 */
function drawIslamicFrame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  lines: string[],
  accentColor: string,
  isDark: boolean
) {
  ctx.save();

  // Background
  ctx.fillStyle = isDark ? 'rgba(4, 28, 19, 0.88)' : 'rgba(255, 252, 243, 0.94)';
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2.5;

  // Path with pointed top arch
  const archH = 28;
  ctx.beginPath();
  ctx.moveTo(x + 16, y + archH);
  ctx.quadraticCurveTo(x + w / 2, y - 8, x + w - 16, y + archH);
  ctx.lineTo(x + w, y + h - 16);
  ctx.quadraticCurveTo(x + w, y + h, x + w - 16, y + h);
  ctx.lineTo(x + 16, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - 16);
  ctx.lineTo(x, y + archH);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Inner thin border
  ctx.strokeStyle = isDark ? 'rgba(212, 175, 55, 0.35)' : 'rgba(180, 140, 40, 0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 6, y + archH + 4, w - 12, h - archH - 10);

  // Title
  ctx.fillStyle = accentColor;
  ctx.font = 'bold 15px "Traditional Arabic", "Amiri", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(title, x + w / 2, y + archH + 6);

  // Content lines
  ctx.fillStyle = isDark ? '#e2e8f0' : '#2d241e';
  ctx.font = '13px "Traditional Arabic", "Amiri", "Tahoma", sans-serif';
  let curY = y + archH + 32;
  lines.forEach(line => {
    ctx.fillText(line, x + w / 2, curY);
    curY += 20;
  });

  ctx.restore();
}

/**
 * 1. BOTANICAL HERITAGE TREE RENDERER (من الأصل إلى الفروع بالساق والأغصان)
 */
export function renderBotanicalHeritageTree(
  canvas: HTMLCanvasElement,
  members: FamilyMember[],
  options: TreeImageExportOptions
) {
  const context = canvas.getContext('2d');
  if (!context) return;
  const ctx: CanvasRenderingContext2D = context;

  const isUltra = options.resolution === 'ultra_4k';
  const width = isUltra ? 3200 : 2000;
  const height = isUltra ? 4400 : 2800;

  canvas.width = width;
  canvas.height = height;

  const isDark = options.theme === 'emerald';
  const isClassic = options.theme === 'classic';

  // Palette
  const gold = '#d4af37';
  const goldLight = '#fae17d';
  const woodDark = '#382012';
  const woodMid = '#54341d';
  const woodLight = '#7c4f2e';
  const leafGreen = '#2e6f40';
  const leafGreenLight = '#499a5e';
  const leafDark = '#1a472a';

  // 1. Draw Background
  if (isDark) {
    const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 200, width / 2, height / 2, width);
    bgGrad.addColorStop(0, '#06261c');
    bgGrad.addColorStop(0.6, '#031912');
    bgGrad.addColorStop(1, '#010c08');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
  } else if (isClassic) {
    ctx.fillStyle = '#fcfdfd';
    ctx.fillRect(0, 0, width, height);
  } else {
    // Royal Parchment Background
    const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 300, width / 2, height / 2, width * 0.95);
    bgGrad.addColorStop(0, '#faf7f0');
    bgGrad.addColorStop(0.5, '#f4ebe0');
    bgGrad.addColorStop(0.85, '#ece0cf');
    bgGrad.addColorStop(1, '#ddcbb3');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
  }

  // 2. Poster Outer Ornamental Border
  const pad = 42;
  ctx.save();
  ctx.strokeStyle = gold;
  ctx.lineWidth = 6;
  ctx.strokeRect(pad, pad, width - pad * 2, height - pad * 2);

  ctx.strokeStyle = isDark ? '#065f46' : '#8b5a2b';
  ctx.lineWidth = 2;
  ctx.strokeRect(pad + 12, pad + 12, width - (pad + 12) * 2, height - (pad + 12) * 2);

  // Corner ornaments
  const corners = [
    [pad, pad],
    [width - pad, pad],
    [pad, height - pad],
    [width - pad, height - pad]
  ];
  corners.forEach(([cx, cy]) => {
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = woodDark;
    ctx.lineWidth = 3;
    ctx.stroke();
  });
  ctx.restore();

  // 3. Header Section
  const headerY = 100;
  ctx.save();
  ctx.textAlign = 'center';

  // Basmala cartouche medallion
  const basmalaW = 340;
  const basmalaH = 62;
  const basmalaX = width / 2 - basmalaW / 2;
  const basmalaY = headerY;

  ctx.fillStyle = isDark ? 'rgba(6, 78, 59, 0.75)' : '#f3e7ce';
  ctx.strokeStyle = gold;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(basmalaX, basmalaY, basmalaW, basmalaH, 30);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = gold;
  ctx.font = 'bold 28px "Traditional Arabic", "Amiri", "Scheherazade", serif';
  ctx.fillText('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', width / 2, basmalaY + 42);

  // Determine dynamic title based on active filter
  let mainTitle = 'شَجَرَةُ عَائِلَةِ آلِ بُوحَسُّونَ (آلِ بُوعَيْنَيْنِ)';
  if (options.selectedSubFamily !== 'all') {
    mainTitle = `شَجَرَةُ عَائِلَةِ آلِ بُوحَسُّونَ · ${options.selectedSubFamily}`;
  } else if (options.selectedBranch !== 'all') {
    mainTitle = `شَجَرَةُ عَائِلَةِ آلِ بُوحَسُّونَ · ${options.selectedBranch}`;
  }

  // Main Title
  ctx.fillStyle = isDark ? '#f8fafc' : '#2b1b11';
  ctx.font = 'bold 54px "Traditional Arabic", "Amiri", serif';
  ctx.fillText(mainTitle, width / 2, basmalaY + 135);

  // Subtitle Lineage
  ctx.fillStyle = gold;
  ctx.font = 'bold 34px "Traditional Arabic", "Amiri", serif';
  ctx.fillText('فَخِذُ النَّوَاصِرِ · آلِ جَابِرٍ الكِرَامِ', width / 2, basmalaY + 185);

  ctx.fillStyle = isDark ? '#94a3b8' : '#654321';
  ctx.font = '22px "Traditional Arabic", "Amiri", "Tahoma", sans-serif';
  ctx.fillText('ذُرِّيَّةُ الجَدِّ المُؤَسِّسِ / حَسَنِ بْنِ مُحَمَّدِ بْنِ جَابِرٍ آلِ بُوعَيْنَيْنِ رَحِمَهُ اللَّهُ', width / 2, basmalaY + 225);
  ctx.restore();

  // 4. Side Mihrab Cartouches (Quran & Hadith)
  if (options.showVerses) {
    const sideW = 380;
    const sideH = 260;

    // Right Cartouche: Quranic Ayah
    drawIslamicFrame(
      ctx,
      width - pad - sideW - 40,
      headerY + 50,
      sideW,
      sideH,
      'قالَ اللَّهُ تَعَالَى',
      [
        '﴿ يَا أَيُّهَا النَّاسُ إِنَّا خَلَقْنَاكُم مِّن ذَكَرٍ وَأُنثَىٰ',
        'وَجَعَلْنَاكُمْ شُعُوبًا وَقَبَائِلَ لِتَعَارَفُوا',
        'إِنَّ أَكْرَمَكُمْ عِندَ اللَّهِ أَتْقَاكُمْ',
        'إِنَّ اللَّهَ عَلِيمٌ خَبِيرٌ ﴾',
        '[سورة الحجرات: 13]'
      ],
      gold,
      isDark
    );

    // Left Cartouche: Prophetic Hadith
    drawIslamicFrame(
      ctx,
      pad + 40,
      headerY + 50,
      sideW,
      sideH,
      'قَالَ رَسُولُ اللَّهِ ﷺ',
      [
        '« تَعَلَّمُوا مِنْ أَنْسَابِكُمْ',
        'مَا تَصِلُونَ بِهِ أَرْحَامَكُمْ،',
        'فَإِنَّ صِلَةَ الرَّحِمِ مَحَبَّةٌ فِي الأَهْلِ،',
        'مَثْرَاةٌ فِي المَالِ،',
        'مَنْسَأَةٌ فِي الأَثَرِ »',
        '[رواه الترمذي وأحمد]'
      ],
      gold,
      isDark
    );
  }

  // 5. Build Tree Hierarchy Data
  const { root, totalNodes, maxDepth } = buildExportHierarchy(members, options);
  if (!root) return;

  // 6. Tree Layout Geometry (من الأصل إلى الفروع)
  const treeBaseY = height - 520; // Base of the trunk on ground
  const treeTrunkForkY = height - 1400; // Primary fork where limbs radiate
  const treeTopCanopyY = 500; // Apex of the tree canopy
  const treeCenterX = width / 2;
  const canopyRadiusX = width * 0.43;
  const canopyRadiusY = (treeTrunkForkY - treeTopCanopyY) * 1.15;

  // 7. Ground Base & Roots (الجذور والتربة)
  ctx.save();
  const groundGrad = ctx.createLinearGradient(0, treeBaseY - 40, 0, height - 340);
  groundGrad.addColorStop(0, '#3a7d44');
  groundGrad.addColorStop(0.5, '#22552c');
  groundGrad.addColorStop(1, '#113317');
  ctx.fillStyle = groundGrad;

  ctx.beginPath();
  ctx.ellipse(treeCenterX, treeBaseY + 60, 520, 100, 0, 0, Math.PI * 2);
  ctx.fill();

  // Root lines
  ctx.strokeStyle = woodDark;
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  for (let angle = -0.75; angle <= 0.75; angle += 0.25) {
    const rx = treeCenterX + Math.sin(angle) * 160;
    const ry = treeBaseY + 115 + Math.cos(angle) * 35;
    ctx.beginPath();
    ctx.moveTo(treeCenterX, treeBaseY);
    ctx.quadraticCurveTo(treeCenterX + Math.sin(angle) * 80, treeBaseY + 50, rx, ry);
    ctx.stroke();
  }
  ctx.restore();

  // 8. Draw Grand Wooden Tree Trunk (الساق الخشبي العريض)
  ctx.save();
  const trunkGrad = ctx.createLinearGradient(treeCenterX - 110, 0, treeCenterX + 110, 0);
  trunkGrad.addColorStop(0, '#23140a');
  trunkGrad.addColorStop(0.3, woodDark);
  trunkGrad.addColorStop(0.5, woodMid);
  trunkGrad.addColorStop(0.7, woodLight);
  trunkGrad.addColorStop(1, '#23140a');

  ctx.fillStyle = trunkGrad;
  ctx.beginPath();
  ctx.moveTo(treeCenterX - 120, treeBaseY);
  ctx.quadraticCurveTo(treeCenterX - 90, (treeBaseY + treeTrunkForkY) / 2, treeCenterX - 85, treeTrunkForkY);
  ctx.lineTo(treeCenterX + 85, treeTrunkForkY);
  ctx.quadraticCurveTo(treeCenterX + 90, (treeBaseY + treeTrunkForkY) / 2, treeCenterX + 120, treeBaseY);
  ctx.closePath();
  ctx.fill();

  // Bark Texture Lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 3;
  for (let i = -60; i <= 60; i += 25) {
    ctx.beginPath();
    ctx.moveTo(treeCenterX + i, treeBaseY - 10);
    ctx.quadraticCurveTo(treeCenterX + i * 0.8, (treeBaseY + treeTrunkForkY) / 2, treeCenterX + i * 0.9, treeTrunkForkY + 10);
    ctx.stroke();
  }
  ctx.restore();

  // 9. Position Nodes across the Canopy
  // Patriarch is placed at base of trunk in the golden sunburst medallion
  root.x = treeCenterX;
  root.y = treeBaseY - 260;

  // Distribute children by generation and branch angles
  const nodesByDepth: HierarchyExportNode[][] = [];
  function collectDepth(node: HierarchyExportNode, d: number) {
    if (!nodesByDepth[d]) nodesByDepth[d] = [];
    nodesByDepth[d].push(node);
    node.children.forEach(c => collectDepth(c, d + 1));
  }
  collectDepth(root, 0);

  // Position generation 1 (immediate sons of patriarch) along primary limbs
  const gen1 = nodesByDepth[1] || [];
  const gen1Count = Math.max(gen1.length, 1);

  gen1.forEach((son, i) => {
    const factor = gen1Count === 1 ? 0 : (i / (gen1Count - 1)) * 2 - 1; // from -1 to 1
    const angle = factor * 1.25; // radians
    const dist = 430;
    son.x = treeCenterX + Math.sin(angle) * dist * 1.35;
    son.y = treeTrunkForkY - Math.cos(angle) * (dist * 0.58) + 90;
  });

  // Position subsequent generations recursively outwards
  function positionSubtree(parent: HierarchyExportNode, d: number, minAngle: number, maxAngle: number) {
    if (!parent.children || parent.children.length === 0) return;

    const count = parent.children.length;
    const angleStep = (maxAngle - minAngle) / (count + 1);

    parent.children.forEach((child, idx) => {
      const childAngle = minAngle + angleStep * (idx + 1);
      const branchLen = Math.max(150, 310 - d * 35);
      
      child.x = parent.x + Math.sin(childAngle) * branchLen;
      child.y = parent.y - Math.cos(childAngle) * (branchLen * 0.78);

      // Clamp within canopy boundary
      const dx = child.x - treeCenterX;
      const dy = child.y - (treeTopCanopyY + canopyRadiusY * 0.5);
      const distNorm = Math.sqrt((dx * dx) / (canopyRadiusX * canopyRadiusX) + (dy * dy) / (canopyRadiusY * canopyRadiusY));
      if (distNorm > 0.95) {
        child.x = treeCenterX + (dx / distNorm) * 0.95;
        child.y = (treeTopCanopyY + canopyRadiusY * 0.5) + (dy / distNorm) * 0.95;
      }

      // Fan out for grandchildren
      const spread = (maxAngle - minAngle) * 0.55;
      positionSubtree(child, d + 1, childAngle - spread, childAngle + spread);
    });
  }

  gen1.forEach((son, i) => {
    const factor = gen1Count === 1 ? 0 : (i / (gen1Count - 1)) * 2 - 1;
    const centerAngle = factor * 1.25;
    const spread = 0.85;
    positionSubtree(son, 2, centerAngle - spread, centerAngle + spread);
  });

  // 10. Draw Botanical Branches & Leaves (الأغصان والأوراق)
  function drawBranchAndLeaves(parent: HierarchyExportNode, child: HierarchyExportNode, d: number) {
    ctx.save();
    const branchThickness = Math.max(4, 36 - d * 6);

    // Wooden branch
    ctx.strokeStyle = woodMid;
    ctx.lineWidth = branchThickness;
    ctx.lineCap = 'round';

    const midX = (parent.x + child.x) / 2 + (d % 2 === 0 ? 18 : -18);
    const midY = (parent.y + child.y) / 2 - 25;

    ctx.beginPath();
    ctx.moveTo(parent.x, parent.y);
    ctx.quadraticCurveTo(midX, midY, child.x, child.y);
    ctx.stroke();

    // Wood highlight
    ctx.strokeStyle = woodLight;
    ctx.lineWidth = Math.max(1.5, branchThickness * 0.25);
    ctx.stroke();

    // Leaves along the branch
    const numLeaves = Math.max(2, 6 - d);
    for (let l = 1; l <= numLeaves; l++) {
      const t = l / (numLeaves + 1);
      const lx = (1 - t) * (1 - t) * parent.x + 2 * (1 - t) * t * midX + t * t * child.x;
      const ly = (1 - t) * (1 - t) * parent.y + 2 * (1 - t) * t * midY + t * t * child.y;

      const leafSide = (l % 2 === 0 ? 1 : -1);
      const leafAngle = Math.atan2(child.y - parent.y, child.x - parent.x) + (leafSide * Math.PI) / 3;

      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(leafAngle);

      // Leaf body
      ctx.fillStyle = l % 3 === 0 ? leafGreenLight : leafGreen;
      ctx.beginPath();
      ctx.ellipse(14, 0, 16, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Center leaf vein
      ctx.strokeStyle = leafDark;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(26, 0);
      ctx.stroke();

      ctx.restore();
    }
    ctx.restore();

    child.children.forEach(c => drawBranchAndLeaves(child, c, d + 1));
  }

  // Draw main trunk limbs connecting to Gen 1
  gen1.forEach(son => {
    ctx.save();
    ctx.strokeStyle = woodDark;
    ctx.lineWidth = 55;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(treeCenterX, treeTrunkForkY);
    ctx.quadraticCurveTo(treeCenterX + (son.x - treeCenterX) * 0.35, treeTrunkForkY - 60, son.x, son.y);
    ctx.stroke();

    ctx.strokeStyle = woodLight;
    ctx.lineWidth = 14;
    ctx.stroke();
    ctx.restore();

    son.children.forEach(grandchild => drawBranchAndLeaves(son, grandchild, 2));
  });

  // 11. Draw Member Medallions with FIRST NAME ONLY
  function drawMemberMedallion(node: HierarchyExportNode, isPatriarch: boolean) {
    ctx.save();
    const isMale = node.member.gender === 'male';
    const subColor = getSubFamilyColor(node.member.sub_family);

    if (isPatriarch) {
      // 🌟 Grand Golden Sunburst Rosette Medallion for Patriarch
      const r = 88;
      const cx = node.x;
      const cy = node.y;

      // Sunburst radiant rays
      ctx.save();
      ctx.strokeStyle = gold;
      ctx.lineWidth = 3;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 16) {
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * (r + 4), cy + Math.sin(a) * (r + 4));
        ctx.lineTo(cx + Math.cos(a) * (r + 24), cy + Math.sin(a) * (r + 24));
        ctx.stroke();
      }
      ctx.restore();

      // Outer gold circle
      ctx.fillStyle = gold;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
      ctx.fill();

      // Middle emerald circle
      ctx.fillStyle = '#064e3b';
      ctx.beginPath();
      ctx.arc(cx, cy, r - 4, 0, Math.PI * 2);
      ctx.fill();

      // Inner medallion
      const innerGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, r - 12);
      innerGrad.addColorStop(0, '#fffbeb');
      innerGrad.addColorStop(0.7, '#fef3c7');
      innerGrad.addColorStop(1, '#fde68a');
      ctx.fillStyle = innerGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, r - 12, 0, Math.PI * 2);
      ctx.fill();

      // Gold border inside
      ctx.strokeStyle = gold;
      ctx.lineWidth = 4;
      ctx.stroke();

      // Patriarch Title & First Name
      ctx.textAlign = 'center';
      ctx.fillStyle = '#78350f';
      ctx.font = 'bold 15px "Traditional Arabic", "Amiri", sans-serif';
      ctx.fillText('الْجَدُّ الْمُؤَسِّسُ', cx, cy - 32);

      // Prominent First Name "حسن"
      ctx.fillStyle = '#1e1b4b';
      ctx.font = 'bold 32px "Traditional Arabic", "Amiri", serif';
      ctx.fillText(node.firstName || 'حَسَن', cx, cy - 2);

      ctx.fillStyle = '#047857';
      ctx.font = 'bold 15px "Traditional Arabic", "Amiri", sans-serif';
      ctx.fillText('آل بوعينين (البوحسون)', cx, cy + 26);

      if (options.showDates && node.member.birth_date) {
        ctx.fillStyle = '#475569';
        ctx.font = '13px "Tahoma", sans-serif';
        ctx.fillText(`(${node.member.birth_date} - ${node.member.death_date || 'ت'})`, cx, cy + 46);
      }
    } else {
      // 🌿 Member Medallion / Rectangle perfectly fitted for the FIRST NAME
      const mw = 105;
      const mh = 44;
      const cx = node.x;
      const cy = node.y;

      // Drop shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 3;

      // Outer gold rim
      ctx.fillStyle = gold;
      ctx.beginPath();
      ctx.roundRect(cx - mw / 2 - 2, cy - mh / 2 - 2, mw + 4, mh + 4, 18);
      ctx.fill();

      ctx.shadowColor = 'transparent';

      // Inner background
      const fillGrad = ctx.createLinearGradient(cx, cy - mh / 2, cx, cy + mh / 2);
      if (isDark) {
        fillGrad.addColorStop(0, '#0f291e');
        fillGrad.addColorStop(1, '#061a12');
      } else {
        fillGrad.addColorStop(0, '#ffffff');
        fillGrad.addColorStop(0.6, '#fef9ee');
        fillGrad.addColorStop(1, '#faecd4');
      }
      ctx.fillStyle = fillGrad;
      ctx.beginPath();
      ctx.roundRect(cx - mw / 2, cy - mh / 2, mw, mh, 16);
      ctx.fill();

      // Sub-family inner rim accent
      ctx.strokeStyle = subColor.border;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Sub-family indicator dot / living status
      ctx.fillStyle = node.member.is_living ? '#22c55e' : subColor.fill;
      ctx.beginPath();
      ctx.arc(cx - mw / 2 + 10, cy, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // FIRST NAME ONLY (Fitted cleanly in rectangle)
      ctx.textAlign = 'center';
      ctx.fillStyle = isDark ? '#f8fafc' : '#1c1917';
      ctx.font = 'bold 18px "Traditional Arabic", "Amiri", "Cairo", serif';
      ctx.fillText(node.firstName, cx + 4, cy + (options.showDates && node.member.birth_date ? -4 : 5));

      if (options.showDates && node.member.birth_date) {
        ctx.fillStyle = isDark ? '#94a3b8' : '#78716c';
        ctx.font = '10px "Tahoma", sans-serif';
        ctx.fillText(node.member.birth_date, cx + 4, cy + 12);
      }
    }
    ctx.restore();

    node.children.forEach(c => drawMemberMedallion(c, false));
  }

  drawMemberMedallion(root, true);

  // 12. Lower Ancestral Inscriptions inside the Main Trunk
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = goldLight;
  ctx.font = 'bold 22px "Traditional Arabic", "Amiri", serif';

  const trunkAncestors = ['عَبْدُاللَّهِ', 'مُبَارَكٌ', 'جَابِرٌ', 'آلُ بُوعَيْنَيْنِ'];
  let ancY = treeBaseY - 140;
  trunkAncestors.forEach(anc => {
    ctx.fillText(anc, treeCenterX, ancY);
    ancY += 40;
  });
  ctx.restore();

  // 13. Bottom Historical & Documentation Panels
  const footerY = height - 310;
  const panelW = (width - pad * 2 - 120) / 2;
  const panelH = 220;

  // Active filter description in right panel
  const filterSummary = options.selectedSubFamily !== 'all' 
    ? `تفرع العائلة المختار: [${options.selectedSubFamily}] المتصل بسند الجد المؤسس.`
    : 'تتفرع العائلة إلى عدة أسر مباركة منها: البوحسون، النصف، الدرويش، والأزرق.';

  // Right Panel: Family Lineage & Heritage Summary
  drawIslamicFrame(
    ctx,
    width - pad - panelW - 40,
    footerY,
    panelW,
    panelH,
    'نُبْذَةٌ عَنْ نَسَبِ وَتَارِيخِ آلِ بُوحَسُّونَ',
    [
      'يعود نسب العائلة الكريمة إلى فخذ النواصر من آل جابر من قبيلة آل بوعينين،',
      'ذرية الجد المؤسس حسن بن محمد بن جابر آل بوعينين رحمه الله.',
      'سكنت العائلة حواضر وثغور الخليج العربي التاريخية واشتهر رجالاتها',
      'بالأمانة، وتجارة اللؤلؤ والملاحة البحرية، والشجاعة، والتمسك بالقيم الإسلامية.',
      filterSummary
    ],
    gold,
    isDark
  );

  // Left Panel: Documentation, Statistics & Authentication
  drawIslamicFrame(
    ctx,
    pad + 40,
    footerY,
    panelW,
    panelH,
    'التَّوْثِيقُ الإِحْصَائِيُّ وَالتَّحْقِيقُ',
    [
      `إجمالي عدد الأفراد المعروضين: (${totalNodes}) فرداً مباركاً`,
      `عمق الأجيال المتعاقبة: (${maxDepth}) أجيال موثقة متصلة السند`,
      `العائلة الفرعية: ${options.selectedSubFamily === 'all' ? 'كافة العائلات الفرعية' : options.selectedSubFamily}`,
      `تاريخ الإصدار: ${new Date().toLocaleDateString('ar-SA')} م`,
      'حُفِظَتْ وَوُثِّقَتْ بِقَاعِدَةِ بَيَانَاتِ شَجَرَةِ عَائِلَةِ آلِ بُوحَسُّونَ السَّحَابِيَّةِ'
    ],
    gold,
    isDark
  );

  // 14. Bottom Center Seal Banner
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = gold;
  ctx.font = 'bold 20px "Traditional Arabic", "Amiri", serif';
  ctx.fillText('« قَبِيلَةُ آلِ بُوعَيْنَيْنِ - فَخِذُ النَّوَاصِرِ - آلِ جَابِرٍ »', width / 2, height - pad - 20);
  ctx.restore();
}

/**
 * 2. VERTICAL HIERARCHICAL BRANCHING CHART (المخطط الهيكلي الرأسي المتفرع)
 */
export function renderVerticalBranchingChart(
  canvas: HTMLCanvasElement,
  members: FamilyMember[],
  options: TreeImageExportOptions
) {
  const context = canvas.getContext('2d');
  if (!context) return;
  const ctx: CanvasRenderingContext2D = context;

  const isUltra = options.resolution === 'ultra_4k';
  const width = isUltra ? 3400 : 2200;
  const height = isUltra ? 4600 : 3000;

  canvas.width = width;
  canvas.height = height;

  const isDark = options.theme === 'emerald';
  const isClassic = options.theme === 'classic';
  const gold = '#d4af37';

  // 1. Background
  if (isDark) {
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#041c15');
    bgGrad.addColorStop(0.5, '#02120d');
    bgGrad.addColorStop(1, '#010906');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
  } else if (isClassic) {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);
  } else {
    // Parchment
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#f9f6ef');
    bgGrad.addColorStop(0.5, '#f3ece2');
    bgGrad.addColorStop(1, '#e9decb');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
  }

  // Outer Border
  const pad = 40;
  ctx.strokeStyle = gold;
  ctx.lineWidth = 4;
  ctx.strokeRect(pad, pad, width - pad * 2, height - pad * 2);

  // 2. Header
  const headerY = 90;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = gold;
  ctx.font = 'bold 24px "Traditional Arabic", "Amiri", serif';
  ctx.fillText('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', width / 2, headerY + 20);

  let chartTitle = 'شَجَرَةُ نَسَبِ وَذُرِّيَّةِ آلِ بُوحَسُّونَ (المخطط الهيكلي الرأسي)';
  if (options.selectedSubFamily !== 'all') {
    chartTitle = `المخطط الهيكلي الرأسي · تفرع عائلة ${options.selectedSubFamily}`;
  }

  ctx.fillStyle = isDark ? '#ffffff' : '#1c1917';
  ctx.font = 'bold 48px "Traditional Arabic", "Amiri", serif';
  ctx.fillText(chartTitle, width / 2, headerY + 75);

  ctx.fillStyle = isDark ? '#34d399' : '#047857';
  ctx.font = 'bold 24px "Traditional Arabic", "Amiri", sans-serif';
  ctx.fillText('آلِ بوعينين · فخذ النواصر · آلِ جابر', width / 2, headerY + 120);
  ctx.restore();

  // 3. Build Tree
  const { root, totalNodes, maxDepth } = buildExportHierarchy(members, options);
  if (!root) return;

  // Level positioning
  const topY = headerY + 210;
  const bottomY = height - 250;
  const levelH = (bottomY - topY) / Math.max(maxDepth, 1);

  // Group nodes by depth
  const depthNodes: HierarchyExportNode[][] = [];
  function assignDepth(n: HierarchyExportNode, d: number) {
    if (!depthNodes[d]) depthNodes[d] = [];
    depthNodes[d].push(n);
    n.children.forEach(c => assignDepth(c, d + 1));
  }
  assignDepth(root, 0);

  // Layout X positions evenly across available width per generation
  depthNodes.forEach((nodesInLevel, d) => {
    const curY = topY + d * levelH;
    const count = nodesInLevel.length;
    const margin = 120;
    const usableW = width - margin * 2;
    const step = usableW / (count + 1);

    nodesInLevel.forEach((n, idx) => {
      n.y = curY;
      n.x = margin + step * (idx + 1);
    });
  });

  // 4. Draw Connecting Lines (Parent to Children)
  ctx.save();
  function drawConnector(n: HierarchyExportNode) {
    n.children.forEach(child => {
      ctx.strokeStyle = isDark ? 'rgba(52, 211, 153, 0.45)' : 'rgba(180, 140, 40, 0.6)';
      ctx.lineWidth = 2.5;

      const startX = n.x;
      const startY = n.y + 30;
      const endX = child.x;
      const endY = child.y - 30;
      const midY = (startY + endY) / 2;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.bezierCurveTo(startX, midY, endX, midY, endX, endY);
      ctx.stroke();

      drawConnector(child);
    });
  }
  drawConnector(root);
  ctx.restore();

  // 5. Draw Member Cards with FIRST NAME ONLY (Fits cleanly in rectangle)
  function drawCard(n: HierarchyExportNode, isPatriarch: boolean) {
    ctx.save();
    // Fitted dimensions for first name
    const cardW = isPatriarch ? 180 : 130;
    const cardH = isPatriarch ? 65 : 54;
    const x = n.x - cardW / 2;
    const y = n.y - cardH / 2;
    const subColor = getSubFamilyColor(n.member.sub_family);

    // Card background
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;

    ctx.fillStyle = isDark ? '#06261c' : '#ffffff';
    ctx.strokeStyle = isPatriarch ? gold : subColor.border;
    ctx.lineWidth = isPatriarch ? 3 : 2;

    ctx.beginPath();
    ctx.roundRect(x, y, cardW, cardH, 14);
    ctx.fill();
    ctx.stroke();

    ctx.shadowColor = 'transparent';

    // Top color band for sub-family
    ctx.fillStyle = isPatriarch ? gold : subColor.fill;
    ctx.beginPath();
    ctx.roundRect(x, y, cardW, 6, [14, 14, 0, 0]);
    ctx.fill();

    // FIRST NAME ONLY
    ctx.textAlign = 'center';
    ctx.fillStyle = isDark ? '#f8fafc' : '#1c1917';
    ctx.font = `bold ${isPatriarch ? 22 : 18}px "Traditional Arabic", "Amiri", "Cairo", serif`;
    ctx.fillText(n.firstName, n.x, y + (isPatriarch ? 32 : 26));

    // Sub-family badge or date
    ctx.fillStyle = isPatriarch ? '#b45309' : subColor.border;
    ctx.font = 'bold 11px "Traditional Arabic", "Amiri", sans-serif';
    const subText = isPatriarch ? 'الجد المؤسس' : (n.member.sub_family || n.member.branch || 'آل بوعينين');
    ctx.fillText(subText, n.x, y + (isPatriarch ? 50 : 42));

    ctx.restore();

    n.children.forEach(c => drawCard(c, false));
  }
  drawCard(root, true);

  // 6. Bottom Legend & Footer
  const legendY = height - 120;
  ctx.save();
  ctx.textAlign = 'center';

  // Sub-families legend badges
  const legendItems = ['البوحسون', 'النصف', 'الدرويش', 'الأزرق'];
  const totalLegendW = legendItems.length * 160;
  let legX = (width - totalLegendW) / 2 + 80;

  legendItems.forEach(item => {
    const col = getSubFamilyColor(item);
    ctx.fillStyle = col.fill;
    ctx.beginPath();
    ctx.arc(legX - 45, legendY, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isDark ? '#e2e8f0' : '#334155';
    ctx.font = 'bold 15px "Traditional Arabic", "Amiri", sans-serif';
    ctx.fillText(item, legX, legendY + 5);

    legX += 160;
  });

  // Bottom info
  ctx.fillStyle = isDark ? '#64748b' : '#64748b';
  ctx.font = '13px "Tahoma", sans-serif';
  ctx.fillText(`إجمالي الأفراد: ${totalNodes} | الأجيال: ${maxDepth} | تم التصدير بتاريخ: ${new Date().toLocaleDateString('ar-SA')}`, width / 2, height - 55);
  ctx.restore();
}

/**
 * Trigger high quality PNG download from canvas
 */
export function downloadCanvasAsPNG(canvas: HTMLCanvasElement, filename: string) {
  canvas.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 'image/png');
}
