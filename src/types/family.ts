/**
 * Family Tree Data Models for Albuhasson (فخذ النواصر - آل جابر - قبيلة آل بوعينين)
 */

export type Gender = 'male' | 'female';

export interface FamilyMember {
  id: string;
  full_name: string;
  nickname: string; // اسم الشهرة للبحث السريع والتصنيف
  gender: Gender;
  father_id: string | null; // null for patriarch
  birth_date: string; // Year or date string (e.g. "1945")
  death_date?: string; // Optional year or date
  is_living: boolean;
  branch?: string; // e.g. "فرع محمد", "فرع علي", "فرع مبارك"
  generation?: number; // 1 for founding patriarch, 2 for sons/daughters, etc.

  // Male-specific fields
  spouse_info?: string; // أسماء الزوجات
  bio?: string; // السيرة الذاتية / النبذة التاريخية
  avatar_url?: string; // رابط الصورة المصغرة (للذكور فقط)

  // Female-specific fields (STRICTLY WITHOUT avatar/thumbnail image)
  children_summary?: string; // أسماء الأبناء والبنات
  notes?: string; // ملاحظات خاصة
}

export interface FamilyStats {
  total: number;
  males: number;
  females: number;
  living: number;
  deceased: number;
  generationsCount: number;
  branches: { name: string; count: number }[];
  patriarchName: string;
}

export type ViewMode = 'tree' | 'lineage' | 'directory' | 'stats';

export interface FilterOptions {
  searchQuery: string;
  gender: 'all' | 'male' | 'female';
  status: 'all' | 'living' | 'deceased';
  branch: string;
  generation: number | 'all';
}
