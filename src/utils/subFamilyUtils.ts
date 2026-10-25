import { FamilyMember } from '../types/family';

export interface SubFamilyTag {
  id: string;
  label: string; // e.g. "آل جابر", "النواصر"
  category: 'jaber' | 'nawasir' | 'both' | 'house';
  bgClass: string;
  borderClass: string;
  textClass: string;
  dotColor: string;
  glowClass: string;
  description: string;
}

// Preset visual configurations for distinctive luxury tags
export const SUB_FAMILY_PRESETS: Record<string, SubFamilyTag> = {
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

  // 1. Explicit sub_family assignment
  if (member.sub_family) {
    const norm = member.sub_family.trim();
    if (norm === 'آل جابر' || norm === 'جابر') {
      tags.push(SUB_FAMILY_PRESETS.jaber);
    } else if (norm === 'النواصر' || norm === 'نواصر') {
      tags.push(SUB_FAMILY_PRESETS.nawasir);
    } else if (norm.includes('جابر') && norm.includes('نواصر')) {
      tags.push(SUB_FAMILY_PRESETS.both);
    } else {
      // Custom tag
      tags.push({
        id: `custom-${norm}`,
        label: norm,
        category: 'house',
        bgClass: 'bg-cyan-950/60',
        borderClass: 'border-cyan-400/40',
        textClass: 'text-cyan-300 font-semibold',
        dotColor: '#22d3ee',
        glowClass: 'shadow-sm',
        description: `وسم فرعي: ${norm}`
      });
    }
  }

  // If already found explicit tag(s), also append any custom sub_tags
  if (tags.length === 0) {
    // 2. Automatic inference based on member lineage and branch
    const detected = inferSubFamily(member, memberMap);
    if (detected === 'both') {
      tags.push(SUB_FAMILY_PRESETS.both);
    } else if (detected === 'jaber') {
      tags.push(SUB_FAMILY_PRESETS.jaber);
    } else if (detected === 'nawasir') {
      tags.push(SUB_FAMILY_PRESETS.nawasir);
    }
  }

  // 3. Append custom sub_tags if specified
  if (member.sub_tags && member.sub_tags.length > 0) {
    member.sub_tags.forEach((st, idx) => {
      const clean = st.trim();
      if (clean && !tags.some(t => t.label === clean)) {
        tags.push({
          id: `subtag-${idx}-${clean}`,
          label: clean,
          category: 'house',
          bgClass: 'bg-slate-800/80',
          borderClass: 'border-white/20',
          textClass: 'text-slate-300 font-medium',
          dotColor: '#94a3b8',
          glowClass: 'shadow-sm',
          description: clean
        });
      }
    });
  }

  // Fallback: If no tags resolved, default to ancestral 'آل جابر' or 'النواصر' based on generation / default
  if (tags.length === 0) {
    tags.push(SUB_FAMILY_PRESETS.both);
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

  if (filter === 'jaber') {
    return tags.some(t => t.category === 'jaber' || t.category === 'both' || t.label.includes('جابر'));
  }
  if (filter === 'nawasir') {
    return tags.some(t => t.category === 'nawasir' || t.category === 'both' || t.label.includes('نواصر'));
  }
  return tags.some(t => t.label === filter || t.id === filter);
}
