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
