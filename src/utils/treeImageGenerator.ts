import { FamilyMember } from '../types/family';
import { matchesSubFamilyFilter } from './subFamilyUtils';
import { getFirstNameOnly, getTreeCardDisplayName } from './arabicUtils';
import { hierarchy, tree } from 'd3-hierarchy';

export type ExportTreeStyle = 'vertical';
export type ExportTheme = 'modern' | 'parchment' | 'sage';
export type ExportResolution = 'hd' | 'ultra_4k';

export interface TreeImageExportOptions {
  style: ExportTreeStyle;
  theme: ExportTheme;
  resolution: ExportResolution;
  selectedBranch: string; // 'all' or branch name
  selectedSubFamily: string; // 'all' or sub-family name
  genderFilter: 'all' | 'male' | 'female';
  showDates: boolean;
  showVerses?: boolean;
}

export interface HierarchyExportNode {
  id: string;
  member: FamilyMember;
  displayName: string;
  firstName: string;
  generation: number;
  children?: HierarchyExportNode[];
  x: number;
  y: number;
  width: number;
  height: number;
  branchColor: string;
}

// Sub-family subtle accent palette
export const SUB_FAMILY_COLORS: Record<string, { border: string; fill: string }> = {
  'البوحسون': { border: '#d97706', fill: '#f59e0b' },
  'النصف': { border: '#2563eb', fill: '#3b82f6' },
  'الدرويش': { border: '#ea580c', fill: '#f97316' },
  'الأزرق': { border: '#0284c7', fill: '#0ea5e9' },
  'آل جابر': { border: '#059669', fill: '#10b981' },
  'النواصر': { border: '#0d9488', fill: '#14b8a6' },
  default: { border: '#0284c7', fill: '#0ea5e9' }
};

export function getSubFamilyColor(subFamily?: string) {
  if (!subFamily) return SUB_FAMILY_COLORS.default;
  for (const [key, val] of Object.entries(SUB_FAMILY_COLORS)) {
    if (subFamily.includes(key)) return val;
  }
  return SUB_FAMILY_COLORS.default;
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

  // Ensure ancestral connection up to root patriarch
  const includedIds = new Set<string>();
  targetSet.forEach(m => {
    includedIds.add(m.id);
    let curFatherId = m.father_id;
    const visited = new Set<string>();
    while (curFatherId && !visited.has(curFatherId)) {
      visited.add(curFatherId);
      includedIds.add(curFatherId);
      const parent = fullMemberMap.get(curFatherId);
      curFatherId = parent ? parent.father_id : null;
    }
  });

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

  childrenMap.forEach(list => {
    list.sort((a, b) => {
      const yearA = parseInt(a.birth_date || '0', 10);
      const yearB = parseInt(b.birth_date || '0', 10);
      return (yearA || 0) - (yearB || 0);
    });
  });

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
    const gen = m.generation || depth;
    if (gen > maxGen) maxGen = gen;

    const rawChildren = childrenMap.get(m.id) || [];
    const children = rawChildren.length > 0 ? rawChildren.map(child => buildNode(child, depth + 1)) : undefined;
    const subColor = getSubFamilyColor(m.sub_family);

    return {
      id: m.id,
      member: m,
      displayName: getTreeCardDisplayName(m),
      firstName: getFirstNameOnly(m.full_name),
      generation: gen,
      children,
      x: 0,
      y: 0,
      width: 158,
      height: 76,
      branchColor: subColor.border
    };
  }

  const root = buildNode(rootMember, 1);
  return { root, totalNodes: count, maxDepth: maxGen };
}

interface ThemePalette {
  bgStart: string;
  bgEnd: string;
  gridColor: string;
  frameOuter: string;
  frameInner: string;
  accent: string;
  accentSoft: string;
  titleText: string;
  subtitleText: string;
  mutedText: string;
  cableStroke: string;
  cableHighlight: string;
  guideStroke: string;
  guideLabelBg: string;
  guideLabelText: string;
  maleLivingBg: string;
  maleLivingBorder: string;
  maleLivingAccent: string;
  maleDeceasedBg: string;
  maleDeceasedBorder: string;
  maleDeceasedAccent: string;
  femaleLivingBg: string;
  femaleLivingBorder: string;
  femaleLivingAccent: string;
  femaleDeceasedBg: string;
  femaleDeceasedBorder: string;
  femaleDeceasedAccent: string;
  patriarchBgTop: string;
  patriarchBgBottom: string;
  patriarchBorder: string;
  patriarchAccent: string;
}

const THEME_PALETTES: Record<ExportTheme, ThemePalette> = {
  modern: {
    bgStart: '#ffffff',
    bgEnd: '#f8fafc',
    gridColor: 'rgba(148, 163, 184, 0.14)',
    frameOuter: '#cbd5e1',
    frameInner: '#e2e8f0',
    accent: '#0284c7',
    accentSoft: '#e0f2fe',
    titleText: '#0f172a',
    subtitleText: '#0369a1',
    mutedText: '#64748b',
    cableStroke: '#94a3b8',
    cableHighlight: '#0284c7',
    guideStroke: 'rgba(148, 163, 184, 0.28)',
    guideLabelBg: '#f1f5f9',
    guideLabelText: '#475569',
    maleLivingBg: '#ffffff',
    maleLivingBorder: '#38bdf8',
    maleLivingAccent: '#0284c7',
    maleDeceasedBg: '#f8fafc',
    maleDeceasedBorder: '#94a3b8',
    maleDeceasedAccent: '#475569',
    femaleLivingBg: '#fffbfc',
    femaleLivingBorder: '#fb7185',
    femaleLivingAccent: '#e11d48',
    femaleDeceasedBg: '#fdf4f7',
    femaleDeceasedBorder: '#cbd5e1',
    femaleDeceasedAccent: '#9f1239',
    patriarchBgTop: '#fffbeb',
    patriarchBgBottom: '#ffffff',
    patriarchBorder: '#d97706',
    patriarchAccent: '#b45309'
  },
  parchment: {
    bgStart: '#fdfbf7',
    bgEnd: '#f6efe3',
    gridColor: 'rgba(180, 140, 70, 0.09)',
    frameOuter: '#d4af37',
    frameInner: 'rgba(180, 140, 70, 0.35)',
    accent: '#b45309',
    accentSoft: '#fef3c7',
    titleText: '#292018',
    subtitleText: '#92400e',
    mutedText: '#786858',
    cableStroke: '#b99c6b',
    cableHighlight: '#b45309',
    guideStroke: 'rgba(180, 140, 70, 0.25)',
    guideLabelBg: '#faf3e4',
    guideLabelText: '#78350f',
    maleLivingBg: '#ffffff',
    maleLivingBorder: '#0ea5e9',
    maleLivingAccent: '#0369a1',
    maleDeceasedBg: '#fbf8f1',
    maleDeceasedBorder: '#b45309',
    maleDeceasedAccent: '#92400e',
    femaleLivingBg: '#fffafa',
    femaleLivingBorder: '#f43f5e',
    femaleLivingAccent: '#be123c',
    femaleDeceasedBg: '#fcf2f4',
    femaleDeceasedBorder: '#c084fc',
    femaleDeceasedAccent: '#86198f',
    patriarchBgTop: '#fef9e7',
    patriarchBgBottom: '#ffffff',
    patriarchBorder: '#c59b27',
    patriarchAccent: '#92400e'
  },
  sage: {
    bgStart: '#f8fcfa',
    bgEnd: '#eef7f2',
    gridColor: 'rgba(16, 185, 129, 0.1)',
    frameOuter: '#6ee7b7',
    frameInner: '#a7f3d0',
    accent: '#047857',
    accentSoft: '#d1fae5',
    titleText: '#064e3b',
    subtitleText: '#047857',
    mutedText: '#4b6b5c',
    cableStroke: '#64748b',
    cableHighlight: '#059669',
    guideStroke: 'rgba(16, 185, 129, 0.22)',
    guideLabelBg: '#ecfdf5',
    guideLabelText: '#065f46',
    maleLivingBg: '#ffffff',
    maleLivingBorder: '#10b981',
    maleLivingAccent: '#047857',
    maleDeceasedBg: '#f6faf8',
    maleDeceasedBorder: '#94a3b8',
    maleDeceasedAccent: '#475569',
    femaleLivingBg: '#fffbfc',
    femaleLivingBorder: '#fb7185',
    femaleLivingAccent: '#e11d48',
    femaleDeceasedBg: '#fdf2f8',
    femaleDeceasedBorder: '#d8b4fe',
    femaleDeceasedAccent: '#9f1239',
    patriarchBgTop: '#ecfdf5',
    patriarchBgBottom: '#ffffff',
    patriarchBorder: '#059669',
    patriarchAccent: '#065f46'
  }
};

function fitTextWithEllipsis(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (!text) return '';
  if (ctx.measureText(text).width <= maxWidth) return text;
  let trimmed = text;
  while (trimmed.length > 2 && ctx.measureText(`${trimmed}..`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}..`;
}

/**
 * MODERN VERTICAL HIERARCHICAL CHART RENDERER
 * Clean, bright, architectural family lineage poster with strict generational alignment,
 * crisp Men vs Women distinction, and Living vs Deceased clarity.
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

  const palette = THEME_PALETTES[options.theme] || THEME_PALETTES.modern;

  // 1. D3 Tree layout for non-overlapping sibling spacing
  const CARD_W = 158;
  const CARD_H = 76;
  const GAP_X = 36;
  const LEVEL_H = 195;

  const rootHierarchy = hierarchy<HierarchyExportNode>(root, d => d.children);
  const treeLayout = tree<HierarchyExportNode>()
    .nodeSize([CARD_W + GAP_X, LEVEL_H])
    .separation((a, b) => (a.parent === b.parent ? 1.12 : 1.32));

  const treeRoot = treeLayout(rootHierarchy);
  const layoutNodes = treeRoot.descendants();

  let minX = Infinity;
  let maxX = -Infinity;
  layoutNodes.forEach(n => {
    if (n.x < minX) minX = n.x;
    if (n.x > maxX) maxX = n.x;
  });

  const spanX = Math.max(maxX - minX, 1100);
  const isUltra = options.resolution === 'ultra_4k';
  const width = Math.max(isUltra ? 3200 : 2100, Math.round(spanX + 520));
  const topHeaderSpace = 270;
  const bottomFooterSpace = 190;
  const height = Math.max(isUltra ? 2600 : 1750, topHeaderSpace + maxDepth * LEVEL_H + bottomFooterSpace);

  canvas.width = width;
  canvas.height = height;

  // 2. Clean Bright Architectural Background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, palette.bgStart);
  bgGrad.addColorStop(1, palette.bgEnd);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle architectural micro-grid
  ctx.save();
  ctx.strokeStyle = palette.gridColor;
  ctx.lineWidth = 1;
  const gridStep = 48;
  for (let gx = 48; gx < width - 48; gx += gridStep) {
    ctx.beginPath();
    ctx.moveTo(gx, 48);
    ctx.lineTo(gx, height - 48);
    ctx.stroke();
  }
  for (let gy = 48; gy < height - 48; gy += gridStep) {
    ctx.beginPath();
    ctx.moveTo(48, gy);
    ctx.lineTo(width - 48, gy);
    ctx.stroke();
  }
  ctx.restore();

  // Outer sleek editorial frame
  const pad = 36;
  ctx.save();
  ctx.strokeStyle = palette.frameOuter;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(pad, pad, width - pad * 2, height - pad * 2, 24);
  ctx.stroke();

  ctx.strokeStyle = palette.frameInner;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(pad + 10, pad + 10, width - (pad + 10) * 2, height - (pad + 10) * 2, 18);
  ctx.stroke();
  ctx.restore();

  // 3. Modern Editorial Header
  const headerY = 84;
  ctx.save();
  ctx.textAlign = 'center';

  ctx.fillStyle = palette.accent;
  ctx.font = 'bold 22px "Cairo", "Traditional Arabic", "Amiri", sans-serif';
  ctx.fillText('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', width / 2, headerY + 14);

  let chartTitle = 'شجرة عائلة آل بوحسون · آل بوعينين';
  if (options.selectedSubFamily !== 'all') {
    chartTitle = `شجرة آل بوحسون · تفرع ${options.selectedSubFamily}`;
  } else if (options.selectedBranch !== 'all') {
    chartTitle = `شجرة آل بوحسون · ${options.selectedBranch}`;
  }

  ctx.fillStyle = palette.titleText;
  ctx.font = '800 44px "Cairo", "Tahoma", sans-serif';
  ctx.fillText(chartTitle, width / 2, headerY + 68);

  // Clean horizontal divider with center diamond ornament
  const divW = 540;
  const divY = headerY + 92;
  ctx.strokeStyle = palette.frameOuter;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(width / 2 - divW / 2, divY);
  ctx.lineTo(width / 2 - 16, divY);
  ctx.moveTo(width / 2 + 16, divY);
  ctx.lineTo(width / 2 + divW / 2, divY);
  ctx.stroke();

  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.moveTo(width / 2, divY - 6);
  ctx.lineTo(width / 2 + 6, divY);
  ctx.lineTo(width / 2, divY + 6);
  ctx.lineTo(width / 2 - 6, divY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = palette.subtitleText;
  ctx.font = 'bold 20px "Cairo", "Tahoma", sans-serif';
  ctx.fillText('فخذ النواصر · آل جابر الكرام', width / 2, headerY + 124);

  ctx.fillStyle = palette.mutedText;
  ctx.font = '600 14px "Cairo", "Tahoma", sans-serif';
  const branchText = options.selectedBranch === 'all' ? 'كافة الفروع' : options.selectedBranch;
  const subTextLabel = options.selectedSubFamily === 'all' ? 'كافة الأسر' : options.selectedSubFamily;
  ctx.fillText(
    `المخطط الهيكلي الرأسي  ·  ${totalNodes} فرداً  ·  ${maxDepth} أجيال  ·  ${subTextLabel} (${branchText})`,
    width / 2,
    headerY + 154
  );
  ctx.restore();

  // 4. Strict Generational Tier Placement
  const topY = topHeaderSpace + 52;
  const centerX = width / 2;
  const xOffset = centerX - (minX + maxX) / 2;

  layoutNodes.forEach(n => {
    n.data.x = n.x + xOffset;
    const gen = n.data.generation || n.depth + 1;
    n.data.y = topY + (gen - 1) * LEVEL_H;
  });

  // Draw clean generational horizontal guide lanes
  ctx.save();
  for (let g = 1; g <= maxDepth; g++) {
    const tierY = topY + (g - 1) * LEVEL_H;
    ctx.strokeStyle = palette.guideStroke;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(pad + 90, tierY);
    ctx.lineTo(width - pad - 90, tierY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Right-side clean generation tag
    const badgeW = 72;
    const badgeH = 26;
    const bx = width - pad - badgeW - 22;
    const by = tierY - badgeH / 2;

    ctx.fillStyle = palette.guideLabelBg;
    ctx.strokeStyle = palette.frameOuter;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(bx, by, badgeW, badgeH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = palette.guideLabelText;
    ctx.font = 'bold 12px "Cairo", "Tahoma", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`الجيل ${g}`, bx + badgeW / 2, tierY + 1);
  }
  ctx.restore();

  // 5. Draw Crisp Smooth Lineage Connector Cables
  ctx.save();
  treeRoot.links().forEach(link => {
    const p = link.source.data;
    const c = link.target.data;
    const isRootLink = link.source.data.member.father_id === null;
    const pHeight = isRootLink ? 86 : CARD_H;

    const startX = p.x;
    const startY = p.y + pHeight / 2;
    const endX = c.x;
    const endY = c.y - CARD_H / 2;
    const midY = (startY + endY) / 2;

    ctx.strokeStyle = isRootLink ? palette.cableHighlight : palette.cableStroke;
    ctx.lineWidth = isRootLink ? 2.8 : 2.2;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(startX, midY, endX, midY, endX, endY);
    ctx.stroke();

    // Parent exit dot
    ctx.fillStyle = isRootLink ? palette.cableHighlight : palette.accent;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(startX, startY, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Child entry dot
    ctx.fillStyle = isRootLink ? palette.cableHighlight : palette.cableStroke;
    ctx.beginPath();
    ctx.arc(endX, endY, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  ctx.restore();

  // 6. Draw Member Cards (First name only for descendants; full name for root patriarch)
  layoutNodes.forEach(n => {
    const d = n.data;
    const isPatriarch = d.member.father_id === null;
    const isMale = d.member.gender === 'male';
    const isLiving = d.member.is_living;

    ctx.save();
    const cardW = isPatriarch ? 236 : CARD_W;
    const cardH = isPatriarch ? 86 : CARD_H;
    const x = d.x - cardW / 2;
    const y = d.y - cardH / 2;

    // Soft modern elevation shadow
    ctx.shadowColor = 'rgba(15, 23, 42, 0.08)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;

    if (isPatriarch) {
      const pGrad = ctx.createLinearGradient(x, y, x, y + cardH);
      pGrad.addColorStop(0, palette.patriarchBgTop);
      pGrad.addColorStop(1, palette.patriarchBgBottom);
      ctx.fillStyle = pGrad;
    } else if (isMale) {
      ctx.fillStyle = isLiving ? palette.maleLivingBg : palette.maleDeceasedBg;
    } else {
      ctx.fillStyle = isLiving ? palette.femaleLivingBg : palette.femaleDeceasedBg;
    }

    ctx.beginPath();
    ctx.roundRect(x, y, cardW, cardH, 14);
    ctx.fill();

    ctx.shadowColor = 'transparent';

    // Crisp card border (solid for living, gentle dashed for deceased)
    const borderColor = isPatriarch
      ? palette.patriarchBorder
      : isMale
        ? (isLiving ? palette.maleLivingBorder : palette.maleDeceasedBorder)
        : (isLiving ? palette.femaleLivingBorder : palette.femaleDeceasedBorder);

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = isPatriarch ? 2.5 : isLiving ? 1.8 : 1.5;
    if (!isLiving && !isPatriarch) {
      ctx.setLineDash([5, 3]);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Top 4.5px semantic accent bar (Clipped cleanly to top rounded corners)
    const topRibbonColor = isPatriarch
      ? palette.patriarchBorder
      : isMale
        ? (isLiving ? palette.maleLivingAccent : palette.maleDeceasedAccent)
        : (isLiving ? palette.femaleLivingAccent : palette.femaleDeceasedAccent);

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, cardW, cardH, 14);
    ctx.clip();
    ctx.fillStyle = topRibbonColor;
    ctx.fillRect(x, y, cardW, 5);
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    if (isPatriarch) {
      // Root Patriarch Card (Preserves full name e.g. خلف بن جابر)
      ctx.fillStyle = palette.patriarchAccent;
      ctx.font = 'bold 11px "Cairo", "Tahoma", sans-serif';
      ctx.fillText('الجد المؤسس', d.x, y + 23);

      ctx.fillStyle = palette.titleText;
      ctx.font = '800 18px "Cairo", "Tahoma", sans-serif';
      const rootLabel = fitTextWithEllipsis(ctx, d.displayName, cardW - 22);
      ctx.fillText(rootLabel, d.x, y + 48);

      const subLine = d.member.nickname?.trim() || (options.showDates && d.member.birth_date ? d.member.birth_date : 'أصل الشجرة');
      ctx.fillStyle = palette.mutedText;
      ctx.font = '600 11px "Cairo", "Tahoma", sans-serif';
      ctx.fillText(fitTextWithEllipsis(ctx, subLine, cardW - 24), d.x, y + 70);
    } else {
      // Descendant Card (First Name Only + Nickname + Status)
      ctx.fillStyle = isMale ? '#0f172a' : '#881337';
      ctx.font = '800 18px "Cairo", "Tahoma", sans-serif';
      ctx.fillText(fitTextWithEllipsis(ctx, d.firstName, cardW - 18), d.x, y + 30);

      const nickname = d.member.nickname?.trim();
      const subText = nickname || d.member.sub_family || '';
      if (subText) {
        ctx.font = '600 11px "Cairo", "Tahoma", sans-serif';
        ctx.fillStyle = isMale
          ? (isLiving ? palette.maleLivingAccent : palette.maleDeceasedAccent)
          : (isLiving ? palette.femaleLivingAccent : palette.femaleDeceasedAccent);
        ctx.fillText(fitTextWithEllipsis(ctx, subText, cardW - 18), d.x, y + 48);
      }

      // Clean status + optional birth year footer
      const statusText = isLiving
        ? (isMale ? 'حي يُرزق' : 'حفظها الله')
        : (isMale ? 'رحمه الله' : 'رحمها الله');
      const dateSuffix = options.showDates && d.member.birth_date ? ` · ${d.member.birth_date}` : '';
      ctx.font = '600 10px "Cairo", "Tahoma", sans-serif';
      ctx.fillStyle = isLiving ? '#059669' : palette.mutedText;
      ctx.fillText(`${statusText}${dateSuffix}`, d.x, y + (subText ? 65 : 54));
    }

    ctx.restore();
  });

  // 7. Modern Footer Legend Strip
  const legendY = height - 108;
  ctx.save();

  const legendItems = [
    { label: 'رجال (أحياء)', color: palette.maleLivingAccent, dashed: false },
    { label: 'رجال (رحمه الله)', color: palette.maleDeceasedBorder, dashed: true },
    { label: 'نساء (أحياء)', color: palette.femaleLivingAccent, dashed: false },
    { label: 'نساء (رحمها الله)', color: palette.femaleDeceasedAccent, dashed: true }
  ];

  const legendCardW = 740;
  const legendCardH = 44;
  const lx = width / 2 - legendCardW / 2;
  const ly = legendY - 22;

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = palette.frameOuter;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(lx, ly, legendCardW, legendCardH, 14);
  ctx.fill();
  ctx.stroke();

  const stepW = legendCardW / legendItems.length;
  legendItems.forEach((item, idx) => {
    const itemCx = lx + stepW * idx + stepW / 2;

    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.arc(itemCx + 42, legendY, 6, 0, Math.PI * 2);
    ctx.fill();

    if (item.dashed) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.fillStyle = palette.titleText;
    ctx.font = 'bold 13px "Cairo", "Tahoma", sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.label, itemCx + 28, legendY + 1);
  });

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = palette.mutedText;
  ctx.font = '600 12px "Cairo", "Tahoma", sans-serif';
  ctx.fillText(
    `شجرة عائلة آل بوحسون (آل بوعينين)  ·  إجمالي الأفراد: ${totalNodes}  ·  الأجيال: ${maxDepth}  ·  تاريخ التصدير: ${new Date().toLocaleDateString('ar-SA')}`,
    width / 2,
    height - 52
  );
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
