/**
 * Arabic String Normalization & Search Utilities
 */

export function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    // Remove diacritics (tashkeel)
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // Normalize Alefs
    .replace(/[أإآٱ]/g, 'ا')
    // Normalize Teh Marbuta
    .replace(/ة/g, 'ه')
    // Normalize Alef Maksura
    .replace(/ى/g, 'ي')
    // Normalize Waw with Hamza
    .replace(/ؤ/g, 'و')
    // Normalize Yeh with Hamza
    .replace(/ئ/g, 'ي')
    // Remove tatweel (kashida)
    .replace(/\u0640/g, '')
    // Remove extra whitespace
    .trim()
    .toLowerCase();
}

/**
 * Checks if search query matches any target text in a normalized way
 */
export function matchesArabic(target: string | undefined | null, query: string): boolean {
  if (!target || !query) return false;
  const normTarget = normalizeArabic(target);
  const normQuery = normalizeArabic(query);
  return normTarget.includes(normQuery);
}

/**
 * Format Arabic date/year
 */
export function formatArabicYear(yearStr?: string): string {
  if (!yearStr) return '';
  return `${yearStr} م`;
}

/**
 * Extract first name cleanly, preserving Arabic compound names like عبد الله / عبد العزيز
 */
export function getFirstNameOnly(fullName: string): string {
  if (!fullName) return '';
  let clean = fullName.trim();

  // Strip optional honorific prefixes
  const honorifics = ['الجد', 'الشيخ', 'الوجيه', 'النوخذة', 'الأديب', 'السيد', 'الحاج', 'د.', 'دكتور'];
  for (const h of honorifics) {
    if (clean.startsWith(h + ' ')) {
      clean = clean.slice(h.length + 1).trim();
      break;
    }
  }

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';

  const first = parts[0];
  const second = parts[1];

  // Never merge lineage connectors ("بن", "بنت", "ابن") into the first name
  const lineageConnectors = ['بن', 'بنت', 'ابن', 'آل'];
  if (!second || lineageConnectors.includes(normalizeArabic(second))) {
    return first;
  }

  // Always-compound prefixes (e.g. عبد الله، عبد العزيز، عبد الرحمن، أبو بكر، أم كلثوم، ذو الفقار)
  const alwaysCompoundFirst = ['عبد', 'ابو', 'ام', 'ذو'];
  if (alwaysCompoundFirst.includes(normalizeArabic(first))) {
    return `${first} ${second}`;
  }

  // Construct-state religious/honorific compounds (e.g. سيف الدين، نور الدين، جار الله، ضيف الله)
  const normSecond = normalizeArabic(second);
  if (normSecond === 'الدين' || normSecond === 'الله' || normSecond === 'الاسلام' || normSecond === 'الرحمن') {
    return `${first} ${second}`;
  }

  return first;
}

/**
 * Display name for lineage tree cards:
 * Shows first name only, EXCEPT the first/root ancestor in the tree (e.g. خلف بن جابر) whose name stays as-is.
 */
export function getTreeCardDisplayName(member: { full_name: string; father_id?: string | null }): string {
  const full = (member.full_name || '').trim();
  if (!full) return '';

  const normalized = normalizeArabic(full);
  if (!member.father_id || normalized.includes('خلف بن جابر')) {
    return full;
  }

  return getFirstNameOnly(full);
}

