import { FamilyMember } from '../types/family';

export interface SubFamilyTag {
  id: string;
  label: string; // e.g. "البوحسون", "النصف", "الدرويش", "الأزرق", "آل جابر", "النواصر"
  category: 'albuhasson' | 'alnesf' | 'aldarwish' | 'alazraq' | 'jaber' | 'nawasir' | 'both' | 'house';
  bgClass: string;
  borderClass: string;
  textClass: string;
  dotColor: string;
  glowClass: string;
  description: string;
}

// Preset visual configurations for distinctive luxury tags
export const SUB_FAMILY_PRESETS: Record<string, SubFamilyTag> = {
  albuhasson: {
    id: 'albuhasson',
    label: 'البوحسون',
    category: 'albuhasson',
    bgClass: 'bg-gradient-to-r from-emerald-600/25 via-teal-700/20 to-emerald-700/25',
    borderClass: 'border-emerald-400/50 hover:border-emerald-300',
    textClass: 'text-emerald-200 font-bold',
    dotColor: '#34d399',
    glowClass: 'shadow-[0_0_12px_rgba(52,211,153,0.3)]',
    description: 'ينتسب إلى فرع وعائلة البوحسون من قبيلة آل بوعينين'
  },
  alnesf: {
    id: 'alnesf',
    label: 'النصف',
    category: 'alnesf',
    bgClass: 'bg-gradient-to-r from-indigo-500/20 via-blue-600/15 to-indigo-600/20',
    borderClass: 'border-indigo-400/50 hover:border-indigo-300',
    textClass: 'text-indigo-200 font-bold',
    dotColor: '#818cf8',
    glowClass: 'shadow-[0_0_12px_rgba(129,140,248,0.3)]',
    description: 'ينتسب إلى تفرع عائلة النصف من قبيلة آل بوعينين'
  },
  aldarwish: {
    id: 'aldarwish',
    label: 'الدرويش',
    category: 'aldarwish',
    bgClass: 'bg-gradient-to-r from-orange-500/20 via-amber-600/15 to-orange-600/20',
    borderClass: 'border-orange-400/50 hover:border-orange-300',
    textClass: 'text-orange-200 font-bold',
    dotColor: '#fb923c',
    glowClass: 'shadow-[0_0_12px_rgba(251,146,60,0.3)]',
    description: 'ينتسب إلى تفرع عائلة الدرويش من قبيلة آل بوعينين'
  },
  alazraq: {
    id: 'alazraq',
    label: 'الأزرق',
    category: 'alazraq',
    bgClass: 'bg-gradient-to-r from-cyan-500/20 via-sky-600/15 to-blue-500/20',
    borderClass: 'border-cyan-400/50 hover:border-cyan-300',
    textClass: 'text-cyan-200 font-bold',
    dotColor: '#22d3ee',
    glowClass: 'shadow-[0_0_12px_rgba(34,211,238,0.3)]',
    description: 'ينتسب إلى تفرع عائلة الأزرق من قبيلة آل بوعينين'
  },
  jaber: {
    id: 'jaber',
    label: 'آل جابر',
    category: 'jaber',
    bgClass: 'bg-gradient-to-r from-amber-500/20 via-amber-600/15 to-yellow-500/20',
    borderClass: 'border-amber-400/50 hover:border-amber-400',
    textClass: 'text-amber-300 font-bold',
    dotColor: '#fbbf24',
    glowClass: 'shadow-[0_0_12px_rgba(251,191,36,0.25)]',
    description: 'ينتسب إلى تفرع آل جابر من قبيلة آل بوعينين'
  },
  nawasir: {
    id: 'nawasir',
    label: 'النواصر',
    category: 'nawasir',
    bgClass: 'bg-gradient-to-r from-emerald-500/20 via-teal-600/15 to-emerald-600/20',
    borderClass: 'border-emerald-400/50 hover:border-emerald-400',
    textClass: 'text-emerald-300 font-bold',
    dotColor: '#34d399',
    glowClass: 'shadow-[0_0_12px_rgba(52,211,153,0.25)]',
    description: 'ينتسب إلى فخذ النواصر من قبيلة آل بوعينين'
  },
  both: {
    id: 'both',
    label: 'آل جابر والنواصر',
    category: 'both',
    bgClass: 'bg-gradient-to-r from-amber-500/20 via-emerald-600/20 to-amber-600/20',
    borderClass: 'border-amber-400/50 hover:border-emerald-400',
    textClass: 'text-amber-200 font-bold',
    dotColor: '#f59e0b',
    glowClass: 'shadow-[0_0_14px_rgba(245,158,11,0.3)]',
    description: 'جامع بين أصالة آل جابر وعراقة فخذ النواصر'
  }
};

/**
 * Automatically infers and returns sub-family tags for a member
 */
export function getSubFamilyTags(
  member: FamilyMember,
  memberMap?: Map<string, FamilyMember>
): SubFamilyTag[] {
  const tags: SubFamilyTag[] = [];

  // Helper to resolve string to preset or custom tag
  const resolveTag = (val: string): SubFamilyTag => {
    const norm = val.trim();
    if (norm === 'البوحسون' || norm.includes('بوحسون')) return SUB_FAMILY_PRESETS.albuhasson;
    if (norm === 'النصف' || norm.includes('نصف')) return SUB_FAMILY_PRESETS.alnesf;
    if (norm === 'الدرويش' || norm.includes('درويش')) return SUB_FAMILY_PRESETS.aldarwish;
    if (norm === 'الأزرق' || norm.includes('أزرق') || norm.includes('ازرق')) return SUB_FAMILY_PRESETS.alazraq;
    if (norm === 'آل جابر' || norm === 'جابر') return SUB_FAMILY_PRESETS.jaber;
    if (norm === 'النواصر' || norm === 'نواصر') return SUB_FAMILY_PRESETS.nawasir;
    if (norm.includes('جابر') && norm.includes('نواصر')) return SUB_FAMILY_PRESETS.both;

    return {
      id: `custom-${norm}`,
      label: norm,
      category: 'house',
      bgClass: 'bg-cyan-950/60',
      borderClass: 'border-cyan-400/40',
      textClass: 'text-cyan-300 font-semibold',
      dotColor: '#22d3ee',
      glowClass: 'shadow-sm',
      description: `وسم فرعي: ${norm}`
    };
  };

  // 1. Explicit sub_family assignment
  if (member.sub_family) {
    const explicitTag = resolveTag(member.sub_family);
    if (!tags.some(t => t.id === explicitTag.id)) {
      tags.push(explicitTag);
    }
  }

  // 2. Check for mentions in nickname, branch or bio
  const bio = member.bio || '';
  const nickname = member.nickname || '';
  const branch = member.branch || '';

  if (nickname.includes('النصف') || bio.includes('النصف')) {
    if (!tags.some(t => t.id === 'alnesf')) tags.push(SUB_FAMILY_PRESETS.alnesf);
  }
  if (nickname.includes('الدرويش') || bio.includes('الدرويش')) {
    if (!tags.some(t => t.id === 'aldarwish')) tags.push(SUB_FAMILY_PRESETS.aldarwish);
  }
  if (nickname.includes('الأزرق') || nickname.includes('الازرق') || bio.includes('الأزرق') || bio.includes('الازرق')) {
    if (!tags.some(t => t.id === 'alazraq')) tags.push(SUB_FAMILY_PRESETS.alazraq);
  }
  if ((nickname.includes('البوحسون') || branch.includes('البوحسون')) && !tags.some(t => t.id === 'albuhasson')) {
    tags.push(SUB_FAMILY_PRESETS.albuhasson);
  }

  // 3. If no tags found yet, run automatic lineage inference
  if (tags.length === 0) {
    const detected = inferSubFamily(member, memberMap);
    if (detected === 'both') {
      tags.push(SUB_FAMILY_PRESETS.both);
    } else if (detected === 'jaber') {
      tags.push(SUB_FAMILY_PRESETS.jaber);
    } else if (detected === 'nawasir') {
      tags.push(SUB_FAMILY_PRESETS.nawasir);
    }
  }

  // 4. Append custom sub_tags if specified
  if (member.sub_tags && member.sub_tags.length > 0) {
    member.sub_tags.forEach((st, idx) => {
      const clean = st.trim();
      if (clean && !tags.some(t => t.label === clean)) {
        const resolved = resolveTag(clean);
        if (!tags.some(t => t.id === resolved.id)) {
          tags.push(resolved);
        }
      }
    });
  }

  // Fallback: If no tags resolved, default to ancestral Al-Buhasson / Al-Jaber and Al-Nawasir
  if (tags.length === 0) {
    tags.push(SUB_FAMILY_PRESETS.albuhasson);
  }

  return tags;
}

/**
 * Intelligent automatic inference of whether a member belongs to Al-Jaber or Al-Nawasir
 */
function inferSubFamily(
  member: FamilyMember,
  memberMap?: Map<string, FamilyMember>
): 'jaber' | 'nawasir' | 'both' {
  // Patriarch is the father of all branches
  if (member.father_id === null || member.generation === 1) {
    return 'both';
  }

  const branch = member.branch || '';
  const fullName = member.full_name || '';
  const nickname = member.nickname || '';
  const bio = member.bio || '';

  // Direct keywords in branch
  if (branch.includes('جابر')) return 'jaber';
  if (branch.includes('نواصر') || branch.includes('ناصري')) return 'nawasir';

  // Direct branch lineage mapping:
  // - فرع محمد: Mohammed bin Hasan had son Jaber and carries the prominent Al-Jaber direct line
  // - فرع علي: Ali bin Hasan line is closely associated with Al-Jaber branch
  // - فرع إبراهيم: Ibrahim bin Hasan had son Nasser and preserves the Al-Nawasir lineage
  if (branch === 'فرع محمد' || branch.includes('محمد')) {
    // If specifically in Jaber's sub-branch or named Jaber
    if (fullName.includes('جابر') || nickname.includes('جابر')) {
      return 'jaber';
    }
    return 'jaber';
  }

  if (branch === 'فرع علي' || branch.includes('علي')) {
    return 'jaber';
  }

  if (branch === 'فرع إبراهيم' || branch.includes('إبراهيم')) {
    if (fullName.includes('ناصر') || nickname.includes('ناصر')) {
      return 'nawasir';
    }
    return 'nawasir';
  }

  // Walk up paternal chain if memberMap is available
  if (memberMap && member.father_id) {
    let curr: FamilyMember | undefined = memberMap.get(member.father_id);
    let depth = 0;
    while (curr && depth < 10) {
      if (curr.sub_family) {
        if (curr.sub_family.includes('جابر')) return 'jaber';
        if (curr.sub_family.includes('نواصر')) return 'nawasir';
      }
      if (curr.branch) {
        if (curr.branch.includes('إبراهيم') || curr.branch.includes('نواصر')) return 'nawasir';
        if (curr.branch.includes('محمد') || curr.branch.includes('علي') || curr.branch.includes('جابر')) return 'jaber';
      }
      if (curr.full_name.includes('جابر')) return 'jaber';
      if (curr.full_name.includes('ناصر')) return 'nawasir';

      if (!curr.father_id) break;
      curr = memberMap.get(curr.father_id);
      depth++;
    }
  }

  // Text matching heuristics
  if (fullName.includes('جابر') || bio.includes('آل جابر')) {
    return 'jaber';
  }
  if (fullName.includes('ناصر') || bio.includes('النواصر')) {
    return 'nawasir';
  }

  return 'both';
}

/**
 * Checks if a member matches a specific sub-family filter query
 */
export function matchesSubFamilyFilter(
  member: FamilyMember,
  filter: string,
  memberMap?: Map<string, FamilyMember>
): boolean {
  if (!filter || filter === 'all') return true;
  const tags = getSubFamilyTags(member, memberMap);

  if (filter === 'albuhasson') {
    return tags.some(t => t.category === 'albuhasson' || t.label.includes('بوحسون'));
  }
  if (filter === 'alnesf') {
    return tags.some(t => t.category === 'alnesf' || t.label.includes('نصف'));
  }
  if (filter === 'aldarwish') {
    return tags.some(t => t.category === 'aldarwish' || t.label.includes('درويش'));
  }
  if (filter === 'alazraq') {
    return tags.some(t => t.category === 'alazraq' || t.label.includes('أزرق') || t.label.includes('ازرق'));
  }
  if (filter === 'jaber') {
    return tags.some(t => t.category === 'jaber' || t.category === 'both' || t.label.includes('جابر'));
  }
  if (filter === 'nawasir') {
    return tags.some(t => t.category === 'nawasir' || t.category === 'both' || t.label.includes('نواصر'));
  }
  return tags.some(t => t.label === filter || t.id === filter);
}
