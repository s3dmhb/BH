import { useState, useEffect, useMemo, useCallback } from 'react';
import { FamilyMember, FamilyStats } from '../types/family';
import { INITIAL_FAMILY_DATA } from '../data/initialFamilyData';

const STORAGE_KEY = 'albuhasson_family_tree_v1';

export function useFamilyStorage() {
  const [members, setMembers] = useState<FamilyMember[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.error('Error loading family data from localStorage', err);
    }
    return INITIAL_FAMILY_DATA;
  });

  // Sync to localStorage whenever members changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
    } catch (err) {
      console.error('Failed to save to localStorage', err);
    }
  }, [members]);

  // Derived member lookup map for O(1) relationships
  const memberMap = useMemo(() => {
    const map = new Map<string, FamilyMember>();
    members.forEach(m => map.set(m.id, m));
    return map;
  }, [members]);

  // Calculate generational depth and statistics
  const stats: FamilyStats = useMemo(() => {
    let males = 0;
    let females = 0;
    let living = 0;
    let deceased = 0;
    let maxGen = 1;
    const branchCountMap: Record<string, number> = {};

    members.forEach(m => {
      if (m.gender === 'male') males++;
      else females++;

      if (m.is_living) living++;
      else deceased++;

      const gen = m.generation || 1;
      if (gen > maxGen) maxGen = gen;

      const br = m.branch || 'أخرى';
      branchCountMap[br] = (branchCountMap[br] || 0) + 1;
    });

    const branches = Object.entries(branchCountMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const patriarch = members.find(m => m.father_id === null && m.gender === 'male') || members[0];

    return {
      total: members.length,
      males,
      females,
      living,
      deceased,
      generationsCount: maxGen,
      branches,
      patriarchName: patriarch ? patriarch.full_name : 'حسن بن محمد آل بوعينين'
    };
  }, [members]);

  // Add Member
  const addMember = useCallback((data: Omit<FamilyMember, 'id'>) => {
    let calculatedGen = 1;
    if (data.father_id) {
      const father = memberMap.get(data.father_id);
      if (father) {
        calculatedGen = (father.generation || 1) + 1;
      }
    }

    const newMember: FamilyMember = {
      ...data,
      id: `albuhasson-${Date.now()}`,
      generation: calculatedGen,
      // Strictly enforce no avatar for females
      avatar_url: data.gender === 'male' ? data.avatar_url || '' : undefined
    };

    setMembers(prev => [...prev, newMember]);
    return newMember;
  }, [memberMap]);

  // Update Member
  const updateMember = useCallback((id: string, updates: Partial<FamilyMember>) => {
    setMembers(prev => {
      return prev.map(m => {
        if (m.id !== id) return m;

        let generation = m.generation;
        if (updates.father_id !== undefined && updates.father_id !== m.father_id) {
          if (updates.father_id) {
            const father = memberMap.get(updates.father_id);
            generation = father ? (father.generation || 1) + 1 : 1;
          } else {
            generation = 1;
          }
        }

        const updated: FamilyMember = {
          ...m,
          ...updates,
          generation: updates.generation ?? generation
        };

        // Strictly enforce no avatar for females
        if (updated.gender === 'female') {
          delete updated.avatar_url;
        }

        return updated;
      });
    });
  }, [memberMap]);

  // Delete Member
  const deleteMember = useCallback((id: string) => {
    setMembers(prev => {
      // Reassign children's father_id to null or father's father
      const memberToDelete = prev.find(m => m.id === id);
      const fallbackFatherId = memberToDelete?.father_id || null;

      return prev
        .filter(m => m.id !== id)
        .map(m => {
          if (m.father_id === id) {
            return { ...m, father_id: fallbackFatherId };
          }
          return m;
        });
    });
  }, []);

  // Import JSON with validation
  const importJSON = useCallback((jsonData: string) => {
    try {
      const parsed = JSON.parse(jsonData);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('الملف لا يحتوي على بيانات أفراد صالحة.');
      }

      // Basic sanitization
      const sanitized: FamilyMember[] = parsed.map((item, idx) => ({
        id: item.id || `albuhasson-${Date.now()}-${idx}`,
        full_name: String(item.full_name || 'بدون اسم'),
        nickname: String(item.nickname || ''),
        gender: item.gender === 'female' ? 'female' : 'male',
        father_id: item.father_id ? String(item.father_id) : null,
        birth_date: String(item.birth_date || ''),
        death_date: item.death_date ? String(item.death_date) : undefined,
        is_living: Boolean(item.is_living),
        branch: item.branch ? String(item.branch) : 'الفرع العام',
        generation: Number(item.generation) || 1,
        spouse_info: item.spouse_info ? String(item.spouse_info) : '',
        bio: item.gender === 'male' ? (item.bio ? String(item.bio) : '') : undefined,
        avatar_url: item.gender === 'male' ? (item.avatar_url ? String(item.avatar_url) : '') : undefined,
        children_summary: item.gender === 'female' ? (item.children_summary ? String(item.children_summary) : '') : undefined,
        notes: item.gender === 'female' ? (item.notes ? String(item.notes) : '') : undefined
      }));

      setMembers(sanitized);
      return { success: true, count: sanitized.length };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطأ غير معروف في قراءة ملف JSON';
      return { success: false, error: msg };
    }
  }, []);

  // Reset to initial heritage seed data
  const resetToDefault = useCallback(() => {
    setMembers(INITIAL_FAMILY_DATA);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_FAMILY_DATA));
  }, []);

  // Compute paternal lineage chain for a member up to the root ancestor
  const getPaternalLineage = useCallback((memberId: string): FamilyMember[] => {
    const chain: FamilyMember[] = [];
    const visited = new Set<string>();

    let current = memberMap.get(memberId);
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      chain.push(current);
      if (!current.father_id) break;
      current = memberMap.get(current.father_id);
    }

    return chain;
  }, [memberMap]);

  // Get direct children of a member
  const getChildren = useCallback((memberId: string): FamilyMember[] => {
    return members.filter(m => m.father_id === memberId);
  }, [members]);

  return {
    members,
    memberMap,
    stats,
    addMember,
    updateMember,
    deleteMember,
    importJSON,
    resetToDefault,
    getPaternalLineage,
    getChildren
  };
}
