import { useState, useEffect, useMemo, useCallback } from 'react';
import { FamilyMember, FamilyStats } from '../types/family';
import { INITIAL_FAMILY_DATA } from '../data/initialFamilyData';
import {
  db,
  OperationType,
  handleFirestoreError
} from '../lib/firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';

const STORAGE_KEY = 'albuhasson_family_tree_v2';
const VERSION_KEY = 'albuhasson_tree_version';
export const CURRENT_DATA_VERSION = '2026.2.3';

function sanitizeForFirestore(m: Partial<FamilyMember> & { id?: string }): Record<string, any> {
  const result: Record<string, any> = {
    updatedAt: new Date().toISOString()
  };

  if (m.id !== undefined) result.id = String(m.id).slice(0, 128);
  if (m.full_name !== undefined) result.full_name = String(m.full_name || 'بدون اسم').slice(0, 200);
  if (m.gender !== undefined) result.gender = m.gender === 'female' ? 'female' : 'male';
  if (m.is_living !== undefined) result.is_living = Boolean(m.is_living);
  if (m.father_id !== undefined) result.father_id = m.father_id ? String(m.father_id).slice(0, 128) : null;
  if (m.generation !== undefined) result.generation = Number(m.generation) || 1;
  if (m.nickname !== undefined && m.nickname !== '') result.nickname = String(m.nickname).slice(0, 100);
  if (m.birth_date !== undefined && m.birth_date !== '') result.birth_date = String(m.birth_date).slice(0, 50);
  if (m.death_date !== undefined && m.death_date !== '') result.death_date = String(m.death_date).slice(0, 50);
  if (m.branch !== undefined && m.branch !== '') result.branch = String(m.branch).slice(0, 100);
  if (m.sub_family !== undefined && m.sub_family !== '') result.sub_family = String(m.sub_family).slice(0, 100);
  if (m.spouse_info !== undefined && m.spouse_info !== '') result.spouse_info = String(m.spouse_info).slice(0, 500);
  if (m.bio !== undefined && m.bio !== '') result.bio = String(m.bio).slice(0, 2000);
  if (m.avatar_url !== undefined && m.avatar_url !== '') result.avatar_url = String(m.avatar_url).slice(0, 1000);
  if (m.children_summary !== undefined && m.children_summary !== '') result.children_summary = String(m.children_summary).slice(0, 1000);
  if (m.notes !== undefined && m.notes !== '') result.notes = String(m.notes).slice(0, 1000);

  return result;
}

export function useFamilyStorage() {
  const [members, setMembers] = useState<FamilyMember[]>(() => {
    try {
      const storedVersion = localStorage.getItem(VERSION_KEY);
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && storedVersion === CURRENT_DATA_VERSION) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.error('Error loading initial data from localStorage', err);
    }
    return INITIAL_FAMILY_DATA;
  });

  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'connecting' | 'connected' | 'offline' | 'error'>('connecting');
  const [isSeeding, setIsSeeding] = useState<boolean>(false);

  // Seed / Sync initial heritage tree to Firestore cloud database
  const seedDatabaseToCloud = useCallback(async () => {
    setIsSeeding(true);
    const path = 'members';
    try {
      const batch = writeBatch(db);
      INITIAL_FAMILY_DATA.forEach(m => {
        const docRef = doc(db, 'members', m.id);
        const payload = sanitizeForFirestore(m);
        batch.set(docRef, payload, { merge: true });
      });
      await batch.commit();
      setIsCloudConnected(true);
      setCloudSyncStatus('connected');
      return { success: true, count: INITIAL_FAMILY_DATA.length };
    } catch (err) {
      console.error('Failed to seed database to Firestore cloud:', err);
      handleFirestoreError(err, OperationType.WRITE, path);
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    } finally {
      setIsSeeding(false);
    }
  }, []);

  // Real-time Firestore onSnapshot listener
  useEffect(() => {
    const path = 'members';
    let hasAttemptedAutoSeed = false;

    const unsubscribe = onSnapshot(
      collection(db, path),
      (snapshot) => {
        if (!snapshot.empty) {
          const cloudMembers: FamilyMember[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            cloudMembers.push({
              id: docSnap.id,
              full_name: data.full_name || '',
              nickname: data.nickname || '',
              gender: data.gender === 'female' ? 'female' : 'male',
              father_id: data.father_id || null,
              birth_date: data.birth_date || '',
              death_date: data.death_date || undefined,
              is_living: Boolean(data.is_living),
              branch: data.branch || 'الفرع العام',
              sub_family: data.sub_family || undefined,
              sub_tags: Array.isArray(data.sub_tags) ? data.sub_tags : undefined,
              generation: Number(data.generation) || 1,
              spouse_info: data.spouse_info || undefined,
              bio: data.gender === 'male' ? (data.bio || undefined) : undefined,
              avatar_url: data.gender === 'male' ? (data.avatar_url || undefined) : undefined,
              children_summary: data.gender === 'female' ? (data.children_summary || undefined) : undefined,
              notes: data.gender === 'female' ? (data.notes || undefined) : undefined
            });
          });

          // Sort by generation ascending, then birth_date
          cloudMembers.sort((a, b) => {
            const genDiff = (a.generation || 1) - (b.generation || 1);
            if (genDiff !== 0) return genDiff;
            return parseInt(a.birth_date || '0') - parseInt(b.birth_date || '0');
          });

          setMembers(cloudMembers);
          setIsCloudConnected(true);
          setCloudSyncStatus('connected');

          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudMembers));
            localStorage.setItem(VERSION_KEY, CURRENT_DATA_VERSION);
          } catch {
            // Ignore storage quota
          }
        } else {
          // If Firestore is empty, auto-seed heritage records to Firestore once
          setIsCloudConnected(true);
          setCloudSyncStatus('connected');
          if (!hasAttemptedAutoSeed) {
            hasAttemptedAutoSeed = true;
            seedDatabaseToCloud().catch(err => {
              console.warn('Auto-seed to cloud failed:', err);
            });
          }
        }
      },
      (error) => {
        console.error('Firestore listener error:', error);
        setCloudSyncStatus('error');
        try {
          handleFirestoreError(error, OperationType.LIST, path);
        } catch {
          // Handled
        }
      }
    );

    return () => unsubscribe();
  }, [seedDatabaseToCloud]);

  // Save to local storage as fallback cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
      localStorage.setItem(VERSION_KEY, CURRENT_DATA_VERSION);
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
  const addMember = useCallback(async (data: Omit<FamilyMember, 'id'>) => {
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
      avatar_url: data.gender === 'male' ? data.avatar_url || '' : undefined
    };

    // Optimistic local state update
    setMembers(prev => [...prev, newMember]);

    // Push to Firestore cloud
    const path = `members/${newMember.id}`;
    try {
      const payload = sanitizeForFirestore(newMember);
      await setDoc(doc(db, 'members', newMember.id), payload);
    } catch (err) {
      console.error('Failed to persist new member to Firestore:', err);
      handleFirestoreError(err, OperationType.CREATE, path);
    }

    return newMember;
  }, [memberMap]);

  // Update Member
  const updateMember = useCallback(async (id: string, updates: Partial<FamilyMember>) => {
    let updatedMember: FamilyMember | null = null;

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

        if (updated.gender === 'female') {
          delete updated.avatar_url;
        }

        updatedMember = updated;
        return updated;
      });
    });

    if (updatedMember) {
      const path = `members/${id}`;
      try {
        const payload = sanitizeForFirestore(updatedMember as FamilyMember);
        await setDoc(doc(db, 'members', id), payload, { merge: true });
      } catch (err) {
        console.error('Failed to update member in Firestore:', err);
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    }
  }, [memberMap]);

  // Delete Member
  const deleteMember = useCallback(async (id: string) => {
    // Optimistic local state
    setMembers(prev => {
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

    // Delete in Firestore cloud
    const path = `members/${id}`;
    try {
      await deleteDoc(doc(db, 'members', id));
    } catch (err) {
      console.error('Failed to delete member from Firestore:', err);
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  }, []);

  // Import JSON with validation and cloud sync
  const importJSON = useCallback(async (jsonData: string) => {
    try {
      const parsed = JSON.parse(jsonData);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('الملف لا يحتوي على بيانات أفراد صالحة.');
      }

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

      // Update local state
      setMembers(sanitized);

      // Write to cloud in batches
      const batch = writeBatch(db);
      sanitized.forEach(m => {
        const docRef = doc(db, 'members', m.id);
        batch.set(docRef, sanitizeForFirestore(m), { merge: true });
      });
      await batch.commit();

      return { success: true, count: sanitized.length };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطأ غير معروف في قراءة ملف JSON';
      return { success: false, error: msg };
    }
  }, []);

  // Reset to initial heritage seed data from codebase
  const resetToDefault = useCallback(async () => {
    setMembers(INITIAL_FAMILY_DATA);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_FAMILY_DATA));
    localStorage.setItem(VERSION_KEY, CURRENT_DATA_VERSION);
    await seedDatabaseToCloud();
  }, [seedDatabaseToCloud]);

  // Generate full TypeScript code to update src/data/initialFamilyData.ts permanently
  const exportTypeScriptCode = useCallback(() => {
    return `import { FamilyMember } from '../types/family';\n\nexport const INITIAL_FAMILY_DATA: FamilyMember[] = ${JSON.stringify(members, null, 2)};\n`;
  }, [members]);

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
    isCloudConnected,
    cloudSyncStatus,
    isSeeding,
    seedDatabaseToCloud,
    addMember,
    updateMember,
    deleteMember,
    importJSON,
    resetToDefault,
    exportTypeScriptCode,
    getPaternalLineage,
    getChildren
  };
}
