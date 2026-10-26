import { FamilyMember } from '../types/family';
import { matchesSubFamilyFilter, getSubFamilyTags } from './subFamilyUtils';
import { hierarchy, tree, HierarchyPointNode } from 'd3-hierarchy';

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
  useFirstNameOnly?: boolean;
  scale?: number;
}

export interface HierarchyExportNode {
  id: string;
  member: FamilyMember;
  firstName: string;
  generation: number;
  children?: HierarchyExportNode[];
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
): { root: HierarchyExportNode | null; totalNodes: number; maxDepth: number } {
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

    const rawChildren = childrenMap.get(m.id) || [];
    const children = rawChildren.length > 0 ? rawChildren.map(child => buildNode(child, depth + 1)) : undefined;
    const subColor = getSubFamilyColor(m.sub_family);
    const firstName = getFirstNameOnly(m.full_name);

    return {
      id: m.id,
      member: m,
      firstName,
      generation: m.generation || depth,
      children,
      x: 0,
      y: 0,
      width: 140,
      height: 60,
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
  ctx.fillStyle = isDark ? 'rgba(4, 28, 19, 0.92)' : 'rgba(255, 252, 243, 0.96)';
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2.5;

  // Path with pointed top arch
  const archH = 26;
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
 * 1. DYNAMIC BOTANICAL HERITAGE TREE RENDERER (شجرة صاعدة من الأصل إلى الفروع)
 * Dynamically computes branch paths based on actual input nodes,
 * with prominent visual differentiation between Men and Women, and Living vs Deceased!
 */
export function renderBotanicalHeritageTree(
  canvas: HTMLCanvasElement,
  members: FamilyMember[],
  options: TreeImageExportOptions
) {
  const context = canvas.getContext('2d');
  if (!context) return;
  const ctx: CanvasRenderingContext2D = context;

  // 1. Build dynamic tree hierarchy
  const { root, totalNodes, maxDepth } = buildExportHierarchy(members, options);
  if (!root) return;

  // 2. Use D3 tree layout to calculate collision-free organic X coordinates
  const CARD_W = 120;
  const CARD_H = 50;
  const GAP_X = 50;
  const GAP_Y = 160;

  const rootHierarchy = hierarchy<HierarchyExportNode>(root, d => d.children);
  const treeLayout = tree<HierarchyExportNode>()
    .nodeSize([CARD_W + GAP_X, GAP_Y])
    .separation((a, b) => (a.parent === b.parent ? 1.15 : 1.35));

  const treeRoot = treeLayout(rootHierarchy);
  const layoutNodes = treeRoot.descendants();

  // Find natural bounding box
  let minX = Infinity;
  let maxX = -Infinity;
  layoutNodes.forEach(n => {
    if (n.x < minX) minX = n.x;
    if (n.x > maxX) maxX = n.x;
  });

  const spanX = Math.max(maxX - minX, 1000);
  const isUltra = options.resolution === 'ultra_4k';
  const width = Math.max(isUltra ? 3400 : 2200, Math.round(spanX + 800));
  const height = Math.max(isUltra ? 4400 : 2800, (maxDepth + 1) * 230 + 900);

  canvas.width = width;
  canvas.height = height;

  const isDark = options.theme === 'emerald';
  const isClassic = options.theme === 'classic';

  // Palette
  const gold = '#d4af37';
  const goldLight = '#fae17d';
  const woodDark = '#321c10';
  const woodMid = '#4e301b';
  const woodLight = '#754b2d';
  const leafGreen = '#2e6f40';
  const leafGreenLight = '#499a5e';
  const leafDark = '#1a472a';

  // 3. Draw Background
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
    // Royal Parchment
    const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 300, width / 2, height / 2, width * 0.95);
    bgGrad.addColorStop(0, '#faf7f0');
    bgGrad.addColorStop(0.5, '#f4ebe0');
    bgGrad.addColorStop(0.85, '#ece0cf');
    bgGrad.addColorStop(1, '#ddcbb3');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
  }

  // 4. Outer Border
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

  // 5. Header Section
  const headerY = 95;
  ctx.save();
  ctx.textAlign = 'center';

  // Basmala cartouche
  const basmalaW = 340;
  const basmalaH = 60;
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
  ctx.fillText('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', width / 2, basmalaY + 40);

  // Dynamic Main Title
  let mainTitle = 'شَجَرَةُ عَائِلَةِ آلِ بُوحَسُّونَ (آلِ بُوعَيْنَيْنِ)';
  if (options.selectedSubFamily !== 'all') {
    mainTitle = `شَجَرَةُ عَائِلَةِ آلِ بُوحَسُّونَ · ${options.selectedSubFamily}`;
  } else if (options.selectedBranch !== 'all') {
    mainTitle = `شَجَرَةُ عَائِلَةِ آلِ بُوحَسُّونَ · ${options.selectedBranch}`;
  }

  ctx.fillStyle = isDark ? '#f8fafc' : '#2b1b11';
  ctx.font = 'bold 54px "Traditional Arabic", "Amiri", serif';
  ctx.fillText(mainTitle, width / 2, basmalaY + 130);

  // Subtitle
  ctx.fillStyle = gold;
  ctx.font = 'bold 34px "Traditional Arabic", "Amiri", serif';
  ctx.fillText('فَخِذُ النَّوَاصِرِ · آلِ جَابِرٍ الكِرَامِ', width / 2, basmalaY + 180);

  ctx.fillStyle = isDark ? '#94a3b8' : '#654321';
  ctx.font = '22px "Traditional Arabic", "Amiri", "Tahoma", sans-serif';
  ctx.fillText('ذُرِّيَّةُ الجَدِّ المُؤَسِّسِ / حَسَنِ بْنِ مُحَمَّدِ بْنِ جَابِرٍ آلِ بُوعَيْنَيْنِ رَحِمَهُ اللَّهُ', width / 2, basmalaY + 220);
  ctx.restore();

  // 6. Side Mihrab Cartouches
  if (options.showVerses) {
    const sideW = 380;
    const sideH = 260;

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

  // 7. Calculate Node Coordinates (Ascending: Base is root, ascending to canopy)
  const treeBaseY = height - 500; // Ground level
  const treeTopY = headerY + 360;  // Top canopy level
  const levelStepY = (treeBaseY - 140 - treeTopY) / Math.max(maxDepth, 1);
  const centerX = width / 2;
  const xOffset = centerX - (minX + maxX) / 2;

  layoutNodes.forEach(n => {
    n.data.x = n.x + xOffset;
    // Invert: Generation 1 at bottom, deeper generations rise higher
    const gen = n.data.generation || (n.depth + 1);
    n.data.y = treeBaseY - 100 - (gen - 1) * levelStepY;
  });

  // 8. Ground & Roots
  ctx.save();
  const groundGrad = ctx.createLinearGradient(0, treeBaseY - 40, 0, height - 340);
  groundGrad.addColorStop(0, '#3a7d44');
  groundGrad.addColorStop(0.5, '#22552c');
  groundGrad.addColorStop(1, '#113317');
  ctx.fillStyle = groundGrad;

  ctx.beginPath();
  ctx.ellipse(centerX, treeBaseY + 60, Math.min(width * 0.45, 600), 100, 0, 0, Math.PI * 2);
  ctx.fill();

  // Root lines
  ctx.strokeStyle = woodDark;
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  for (let angle = -0.75; angle <= 0.75; angle += 0.25) {
    const rx = centerX + Math.sin(angle) * 180;
    const ry = treeBaseY + 115 + Math.cos(angle) * 35;
    ctx.beginPath();
    ctx.moveTo(centerX, treeBaseY);
    ctx.quadraticCurveTo(centerX + Math.sin(angle) * 90, treeBaseY + 50, rx, ry);
    ctx.stroke();
  }
  ctx.restore();

  // 9. Draw Ascending Wooden Trunk & Organic Branches
  // Main Trunk connecting ground to root patriarch
  ctx.save();
  const rootNode = layoutNodes[0];
  const trunkGrad = ctx.createLinearGradient(centerX - 100, 0, centerX + 100, 0);
  trunkGrad.addColorStop(0, '#23140a');
  trunkGrad.addColorStop(0.3, woodDark);
  trunkGrad.addColorStop(0.5, woodMid);
  trunkGrad.addColorStop(0.7, woodLight);
  trunkGrad.addColorStop(1, '#23140a');

  ctx.fillStyle = trunkGrad;
  ctx.beginPath();
  ctx.moveTo(centerX - 110, treeBaseY);
  ctx.quadraticCurveTo(centerX - 80, (treeBaseY + rootNode.data.y) / 2, centerX - 70, rootNode.data.y + 40);
  ctx.lineTo(centerX + 70, rootNode.data.y + 40);
  ctx.quadraticCurveTo(centerX + 80, (treeBaseY + rootNode.data.y) / 2, centerX + 110, treeBaseY);
  ctx.closePath();
  ctx.fill();

  // Bark Texture Lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 3;
  for (let i = -50; i <= 50; i += 25) {
    ctx.beginPath();
    ctx.moveTo(centerX + i, treeBaseY - 10);
    ctx.quadraticCurveTo(centerX + i * 0.8, (treeBaseY + rootNode.data.y) / 2, centerX + i * 0.85, rootNode.data.y + 45);
    ctx.stroke();
  }
  ctx.restore();

  // Draw Dynamic Branches (From Parent up to Children)
  ctx.save();
  treeRoot.links().forEach(link => {
    const pNode = link.source.data;
    const cNode = link.target.data;
    const depth = link.target.depth;
    const branchThickness = Math.max(4, 38 - depth * 6);

    // Smooth organic branch
    ctx.strokeStyle = woodMid;
    ctx.lineWidth = branchThickness;
    ctx.lineCap = 'round';

    const startX = pNode.x;
    const startY = pNode.y - 25; // Top of parent card
    const endX = cNode.x;
    const endY = cNode.y + 25;   // Bottom of child card
    const midY = (startY + endY) / 2;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(startX, midY, endX, midY, endX, endY);
    ctx.stroke();

    // Wood highlight
    ctx.strokeStyle = woodLight;
    ctx.lineWidth = Math.max(1.5, branchThickness * 0.25);
    ctx.stroke();

    // Natural leaves along the branch
    const numLeaves = Math.max(2, 5 - depth);
    for (let l = 1; l <= numLeaves; l++) {
      const t = l / (numLeaves + 1);
      const lx = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * ((startX + endX) / 2) + t * t * endX;
      const ly = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * midY + t * t * endY;

      const leafSide = (l % 2 === 0 ? 1 : -1);
      const leafAngle = Math.atan2(endY - startY, endX - startX) + (leafSide * Math.PI) / 3;

      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(leafAngle);

      ctx.fillStyle = l % 3 === 0 ? leafGreenLight : leafGreen;
      ctx.beginPath();
      ctx.ellipse(14, 0, 15, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = leafDark;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(24, 0);
      ctx.stroke();

      ctx.restore();
    }
  });
  ctx.restore();

  // 10. Draw Distinct Member Cards (Men vs Women, Living vs Deceased)
  layoutNodes.forEach(n => {
    const d = n.data;
    const isPatriarch = d.member.father_id === null;
    const isMale = d.member.gender === 'male';
    const isLiving = d.member.is_living;
    const subColor = getSubFamilyColor(d.member.sub_family);

    ctx.save();
    if (isPatriarch) {
      // 🌟 Patriarch Sunburst Medallion
      const r = 85;
      const cx = d.x;
      const cy = d.y;

      // Radiant rays
      ctx.strokeStyle = gold;
      ctx.lineWidth = 3;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 16) {
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * (r + 4), cy + Math.sin(a) * (r + 4));
        ctx.lineTo(cx + Math.cos(a) * (r + 22), cy + Math.sin(a) * (r + 22));
        ctx.stroke();
      }

      ctx.fillStyle = gold;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#064e3b';
      ctx.beginPath();
      ctx.arc(cx, cy, r - 4, 0, Math.PI * 2);
      ctx.fill();

      const innerGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, r - 12);
      innerGrad.addColorStop(0, '#fffbeb');
      innerGrad.addColorStop(0.7, '#fef3c7');
      innerGrad.addColorStop(1, '#fde68a');
      ctx.fillStyle = innerGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, r - 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = gold;
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = '#78350f';
      ctx.font = 'bold 15px "Traditional Arabic", "Amiri", sans-serif';
      ctx.fillText('الْجَدُّ الْمُؤَسِّسُ', cx, cy - 30);

      ctx.fillStyle = '#1e1b4b';
      ctx.font = 'bold 34px "Traditional Arabic", "Amiri", serif';
      ctx.fillText(d.firstName || 'حَسَن', cx, cy);

      ctx.fillStyle = '#047857';
      ctx.font = 'bold 15px "Traditional Arabic", "Amiri", sans-serif';
      ctx.fillText('آل بوعينين (البوحسون)', cx, cy + 28);

      if (options.showDates && d.member.birth_date) {
        ctx.fillStyle = '#475569';
        ctx.font = '12px "Tahoma", sans-serif';
        ctx.fillText(`(${d.member.birth_date} - ${d.member.death_date || 'ت'})`, cx, cy + 48);
      }
    } else {
      // 🌿 Distinct Member Card:
      // Men: Emerald & Gold / White
      // Women: Elegant Rose-Gold / Coral Blossom (#f43f5e, #fb7185, #fff1f2)
      // Living vs Deceased: Clear status badge & border tint
      const mw = 120;
      const mh = 50;
      const cx = d.x;
      const cy = d.y;
      const x = cx - mw / 2;
      const y = cy - mh / 2;

      // Shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 3;

      // Outer gender border color
      const borderColor = isMale 
        ? (isLiving ? '#10b981' : '#b45309') 
        : (isLiving ? '#f43f5e' : '#be185d');

      // Card Fill Gradient
      const fillGrad = ctx.createLinearGradient(cx, y, cx, y + mh);
      if (isDark) {
        if (isMale) {
          fillGrad.addColorStop(0, isLiving ? '#0d3326' : '#1c2826');
          fillGrad.addColorStop(1, '#051912');
        } else {
          fillGrad.addColorStop(0, isLiving ? '#3b121e' : '#28171f');
          fillGrad.addColorStop(1, '#18070d');
        }
      } else {
        if (isMale) {
          // Men: Crisp white or warm sepia for deceased
          if (isLiving) {
            fillGrad.addColorStop(0, '#ffffff');
            fillGrad.addColorStop(1, '#f0fdf4');
          } else {
            fillGrad.addColorStop(0, '#fefaf2');
            fillGrad.addColorStop(1, '#f4ece1');
          }
        } else {
          // Women: Soft rose-blossom tint
          if (isLiving) {
            fillGrad.addColorStop(0, '#ffffff');
            fillGrad.addColorStop(1, '#fff1f2');
          } else {
            fillGrad.addColorStop(0, '#fdf4f5');
            fillGrad.addColorStop(1, '#fae8eb');
          }
        }
      }

      ctx.fillStyle = fillGrad;
      ctx.beginPath();
      ctx.roundRect(x, y, mw, mh, 14);
      ctx.fill();

      ctx.shadowColor = 'transparent';

      // Border with gender & deceased accent
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = isLiving ? 2.5 : 2;
      if (!isLiving) {
        ctx.setLineDash([6, 3]); // Subtle dashed accent for deceased
      } else {
        ctx.setLineDash([]);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Top color ribbon indicating Sub-Family
      ctx.fillStyle = subColor.fill;
      ctx.beginPath();
      ctx.roundRect(x, y, mw, 5, [14, 14, 0, 0]);
      ctx.fill();

      // Gender + Living / Deceased indicator pill
      const statusText = isLiving 
        ? (isMale ? 'حي' : 'حية') 
        : (isMale ? 'رحمه الله' : 'رحمها الله');
      
      const statusColor = isLiving 
        ? '#16a34a' 
        : (isMale ? '#b45309' : '#be185d');

      ctx.textAlign = 'center';

      // FIRST NAME (Centered & prominent)
      ctx.fillStyle = isDark ? '#f8fafc' : (isMale ? '#0f172a' : '#881337');
      ctx.font = 'bold 18px "Traditional Arabic", "Amiri", "Cairo", serif';
      ctx.fillText(d.firstName, cx, y + 26);

      // Status Prayer / Living Pill
      ctx.font = 'bold 10px "Traditional Arabic", "Amiri", sans-serif';
      ctx.fillStyle = statusColor;
      ctx.fillText(statusText, cx, y + 40);

      // Gender marker tag (left side badge)
      ctx.fillStyle = isMale ? '#059669' : '#e11d48';
      ctx.beginPath();
      ctx.arc(x + 10, cy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });

  // 11. Ancestral trunk inscriptions
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = goldLight;
  ctx.font = 'bold 22px "Traditional Arabic", "Amiri", serif';
  const trunkAncestors = ['عَبْدُاللَّهِ', 'مُبَارَكٌ', 'جَابِرٌ', 'آلُ بُوعَيْنَيْنِ'];
  let ancY = treeBaseY - 140;
  trunkAncestors.forEach(anc => {
    ctx.fillText(anc, centerX, ancY);
    ancY += 40;
  });
  ctx.restore();

  // 12. Bottom Historical Panels with Full Legend (Men/Women & Living/Deceased)
  const footerY = height - 310;
  const panelW = (width - pad * 2 - 120) / 2;
  const panelH = 220;

  const filterSummary = options.selectedSubFamily !== 'all' 
    ? `تفرع العائلة المختار: [${options.selectedSubFamily}] المتصل بسند الجد المؤسس.`
    : 'تتفرع العائلة إلى عدة أسر مباركة منها: البوحسون، النصف، الدرويش، والأزرق.';

  // Right Panel: Lineage
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
      'سكنت العائلة حواضر وثغور الخليج العربي واشتهر رجالاتها بالأمانة،',
      'وتجارة اللؤلؤ والملاحة البحرية، والشجاعة، والتمسك بالقيم الإسلامية.',
      filterSummary
    ],
    gold,
    isDark
  );

  // Left Panel: Documentation & Legend
  drawIslamicFrame(
    ctx,
    pad + 40,
    footerY,
    panelW,
    panelH,
    'مِفْتَاحُ الرُّمُوزِ وَالتَّوْثِيقِ الإِحْصَائِيِّ',
    [
      `إجمالي عدد الأفراد المعروضين: (${totalNodes}) فرداً مباركاً | الأجيال: (${maxDepth}) أجيال`,
      'دلالات الألوان: 🟩 رجال (أحياء) · 🟫 رجال (متوفون: رحمه الله)',
      '              🌸 نساء (أحياء) · 🟪 نساء (متوفيات: رحمها الله)',
      `العائلة الفرعية: ${options.selectedSubFamily === 'all' ? 'كافة العائلات' : options.selectedSubFamily}`,
      `تاريخ الإصدار: ${new Date().toLocaleDateString('ar-SA')} م · شجرة آل بوحسون`
    ],
    gold,
    isDark
  );

  // Bottom Center Seal Banner
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = gold;
  ctx.font = 'bold 20px "Traditional Arabic", "Amiri", serif';
  ctx.fillText('« قَبِيلَةُ آلِ بُوعَيْنَيْنِ - فَخِذُ النَّوَاصِرِ - آلِ جَابِرٍ »', width / 2, height - pad - 20);
  ctx.restore();
}

/**
 * 2. VERTICAL HIERARCHICAL BRANCHING CHART (المخطط الهيكلي الرأسي المتفرع)
 * With strict generational tier levels, distinct Men vs Women colors,
 * and prominent Living vs Deceased distinction!
 */
export function renderVerticalBranchingChart(
  canvas: HTMLCanvasElement,
  members: FamilyMember[],
  options: TreeImageExportOptions
) {
  const context = canvas.getContext('2d');
  if (!context) return;
  const ctx: CanvasRenderingContext2D = context;

  const { root, totalNodes, maxDepth } = buildExportHierarchy(members, options);
  if (!root) return;

  // 1. D3 Tree layout for non-overlapping sibling spacing
  const CARD_W = 140;
  const CARD_H = 65;
  const GAP_X = 40;
  const LEVEL_H = 210; // Strict fixed vertical distance per generation!

  const rootHierarchy = hierarchy<HierarchyExportNode>(root, d => d.children);
  const treeLayout = tree<HierarchyExportNode>()
    .nodeSize([CARD_W + GAP_X, LEVEL_H])
    .separation((a, b) => (a.parent === b.parent ? 1.15 : 1.35));

  const treeRoot = treeLayout(rootHierarchy);
  const layoutNodes = treeRoot.descendants();

  let minX = Infinity;
  let maxX = -Infinity;
  layoutNodes.forEach(n => {
    if (n.x < minX) minX = n.x;
    if (n.x > maxX) maxX = n.x;
  });

  const spanX = Math.max(maxX - minX, 1000);
  const isUltra = options.resolution === 'ultra_4k';
  const width = Math.max(isUltra ? 3400 : 2200, Math.round(spanX + 600));
  const height = Math.max(isUltra ? 4500 : 2800, (maxDepth + 1) * LEVEL_H + 600);

  canvas.width = width;
  canvas.height = height;

  const isDark = options.theme === 'emerald';
  const isClassic = options.theme === 'classic';
  const gold = '#d4af37';

  // 2. Background
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

  // 3. Header
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

  // 4. Strict Generational Placement (كل جيل في مستوى رأسي مستقل تماماً)
  const topY = headerY + 220;
  const centerX = width / 2;
  const xOffset = centerX - (minX + maxX) / 2;

  layoutNodes.forEach(n => {
    n.data.x = n.x + xOffset;
    // STRICT GENERATION TIER: y is purely a function of generation!
    const gen = n.data.generation || (n.depth + 1);
    n.data.y = topY + (gen - 1) * LEVEL_H;
  });

  // Draw Generational Guide Ribbons on the right margin
  ctx.save();
  for (let g = 1; g <= maxDepth; g++) {
    const tierY = topY + (g - 1) * LEVEL_H;
    ctx.strokeStyle = isDark ? 'rgba(52, 211, 153, 0.12)' : 'rgba(180, 140, 40, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(pad + 20, tierY);
    ctx.lineTo(width - pad - 20, tierY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Generation label badge
    ctx.fillStyle = gold;
    ctx.font = 'bold 13px "Traditional Arabic", "Amiri", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`الجيل ${g}`, width - pad - 35, tierY - CARD_H / 2 - 8);
  }
  ctx.restore();

  // 5. Draw Non-Overlapping Lineage Connector Lines (From bottom of parent to top of child)
  ctx.save();
  treeRoot.links().forEach(link => {
    const p = link.source.data;
    const c = link.target.data;

    ctx.strokeStyle = isDark ? 'rgba(52, 211, 153, 0.55)' : 'rgba(180, 140, 40, 0.65)';
    ctx.lineWidth = 2.5;

    const startX = p.x;
    const startY = p.y + CARD_H / 2; // Bottom of parent card
    const endX = c.x;
    const endY = c.y - CARD_H / 2;   // Top of child card
    const midY = (startY + endY) / 2;

    // Smooth non-intersecting cubic bezier
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(startX, midY, endX, midY, endX, endY);
    ctx.stroke();

    // Small connector dot at junction
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.arc(endX, endY, 3, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  // 6. Draw Member Cards with Gender (Men vs Women) and Status (Living vs Deceased)
  layoutNodes.forEach(n => {
    const d = n.data;
    const isPatriarch = d.member.father_id === null;
    const isMale = d.member.gender === 'male';
    const isLiving = d.member.is_living;
    const subColor = getSubFamilyColor(d.member.sub_family);

    ctx.save();
    const cardW = isPatriarch ? 170 : CARD_W;
    const cardH = isPatriarch ? 70 : CARD_H;
    const x = d.x - cardW / 2;
    const y = d.y - cardH / 2;

    // Card shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.16)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;

    // Gender & Status Palette
    const borderColor = isPatriarch 
      ? gold 
      : isMale 
        ? (isLiving ? '#10b981' : '#b45309') 
        : (isLiving ? '#f43f5e' : '#be185d');

    // Background Fill
    if (isDark) {
      if (isMale) {
        ctx.fillStyle = isLiving ? '#06261c' : '#1a2622';
      } else {
        ctx.fillStyle = isLiving ? '#311019' : '#22151b';
      }
    } else {
      if (isMale) {
        ctx.fillStyle = isLiving ? '#ffffff' : '#f7f4ed';
      } else {
        ctx.fillStyle = isLiving ? '#fff5f6' : '#f7ebed';
      }
    }

    ctx.beginPath();
    ctx.roundRect(x, y, cardW, cardH, 14);
    ctx.fill();

    ctx.shadowColor = 'transparent';

    // Border
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = isPatriarch ? 3 : (isLiving ? 2.5 : 1.8);
    if (!isLiving && !isPatriarch) {
      ctx.setLineDash([5, 3]);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Top Gender Ribbon
    ctx.fillStyle = isPatriarch ? gold : (isMale ? '#059669' : '#e11d48');
    ctx.beginPath();
    ctx.roundRect(x, y, cardW, 6, [14, 14, 0, 0]);
    ctx.fill();

    // FIRST NAME
    ctx.textAlign = 'center';
    ctx.fillStyle = isDark ? '#f8fafc' : (isMale ? '#0f172a' : '#881337');
    ctx.font = `bold ${isPatriarch ? 22 : 18}px "Traditional Arabic", "Amiri", "Cairo", serif`;
    ctx.fillText(d.firstName, d.x, y + (isPatriarch ? 35 : 28));

    // Sub-family badge or gender marker
    ctx.font = 'bold 11px "Traditional Arabic", "Amiri", sans-serif';
    ctx.fillStyle = isPatriarch ? '#b45309' : (isMale ? '#047857' : '#be185d');
    const subText = isPatriarch ? 'الجد المؤسس' : (d.member.sub_family || (isMale ? 'ابن / رجل' : 'ابنة / سيدة'));
    ctx.fillText(subText, d.x, y + (isPatriarch ? 52 : 44));

    // Status Prayer or Living indicator
    const statusText = isLiving 
      ? '● حي' 
      : (isMale ? 'رحمه الله' : 'رحمها الله');

    ctx.font = 'bold 10px "Traditional Arabic", "Amiri", sans-serif';
    ctx.fillStyle = isLiving ? '#16a34a' : (isMale ? '#9a3412' : '#9f1239');
    ctx.fillText(statusText, d.x, y + 58);

    ctx.restore();
  });

  // 7. Bottom Legend & Footer
  const legendY = height - 120;
  ctx.save();
  ctx.textAlign = 'center';

  // Comprehensive Legend: Men/Women & Living/Deceased
  const legendItems = [
    { label: 'رجال (أحياء)', color: '#10b981' },
    { label: 'رجال (رحمه الله)', color: '#b45309' },
    { label: 'نساء (أحياء)', color: '#f43f5e' },
    { label: 'نساء (رحمها الله)', color: '#be185d' }
  ];

  const totalLegendW = legendItems.length * 170;
  let legX = (width - totalLegendW) / 2 + 80;

  legendItems.forEach(item => {
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.arc(legX - 55, legendY, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isDark ? '#e2e8f0' : '#334155';
    ctx.font = 'bold 15px "Traditional Arabic", "Amiri", sans-serif';
    ctx.fillText(item.label, legX, legendY + 5);

    legX += 170;
  });

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
