'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Material, Subject, Section, SectionColors, CardStyle, Organization, Course, CourseModule, Service, Review } from './types';
import { useAuth } from './auth';

export type CatalogSnapshot = {
  sections: Section[];
  subjects: Subject[];
  materials: Material[];
  organizations: Organization[];
  courses: Course[];
  services: Service[];
  reviews: Review[];
  sectionColors: SectionColors;
  subjectColors: Record<string, string>;
};

export type LegacyData = {
  sections: Section[] | null;
  subjects: Subject[] | null;
  materials: Material[] | null;
};

const EMPTY: CatalogSnapshot = { sections: [], subjects: [], materials: [], organizations: [], courses: [], services: [], reviews: [], sectionColors: {}, subjectColors: {} };

const LS_LEGACY = [
  'lecport_materials_v1',
  'lecport_subjects_v1',
  'lecport_sections_v1',
  'lecport_section_colors_v1',
  'lecport_subject_colors_v1',
] as const;

function readLegacy<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Каталог хранится на сервере (data/catalog.json) — добавляйте через /admin,
 * изменения будут видны всем пользователям, а не только в этом браузере.
 */
export function useCatalog() {
  const [state, setState] = useState<CatalogSnapshot | null>(null);
  const [legacy, setLegacy] = useState<LegacyData | null>(null);
  const [busy, setBusy] = useState(false);

  const apply = (snap: CatalogSnapshot) => {
    setState({
      ...snap,
      sectionColors: { ...snap.sectionColors },
      subjectColors: { ...snap.subjectColors },
      organizations: snap.organizations ?? [],
      courses: snap.courses ?? [],
      services: snap.services ?? [],
      reviews: snap.reviews ?? [],
    });
  };

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/catalog', { cache: 'no-store' });
      const j = await res.json();
      if (res.ok && j?.catalog) apply(j.catalog);
      else setState(EMPTY);
    } catch {
      setState(EMPTY);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Обнаруживаем данные, которые раньше жили только в localStorage
  // (добавленные админом до переноса каталога на сервер).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sections = readLegacy<Section[]>('lecport_sections_v1');
    const subjects = readLegacy<Subject[]>('lecport_subjects_v1');
    const materials = readLegacy<Material[]>('lecport_materials_v1');
    const hasLegacy =
      (Array.isArray(sections) && sections.length > 0) ||
      (Array.isArray(subjects) && subjects.length > 0) ||
      (Array.isArray(materials) && materials.length > 0);
    if (hasLegacy) setLegacy({ sections, subjects, materials });
  }, []);

  const mutate = useCallback(async (action: string, payload: Record<string, unknown> = {}): Promise<CatalogSnapshot | null> => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });
      const j = await res.json();
      if (res.ok && j?.catalog) {
        apply(j.catalog);
        return j.catalog;
      }
      console.error('[catalog]', j?.error ?? 'Операция не выполнена');
      return null;
    } catch (e) {
      console.error('[catalog]', e);
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const sections = state?.sections ?? [];
  const subjects = state?.subjects ?? [];
  const materials = state?.materials ?? [];
  const organizations = state?.organizations ?? [];
  const courses = state?.courses ?? [];
  const services = state?.services ?? [];
  const reviews = state?.reviews ?? [];
  const sectionColors = state?.sectionColors ?? ({} as SectionColors);
  const subjectColors = state?.subjectColors ?? {};

  const addSection = async (name: string): Promise<Section | null> => {
    const prev = sections;
    const snap = await mutate('addSection', { name });
    if (!snap) return null;
    return snap.sections.find((s) => !prev.some((p) => p.id === s.id)) ?? null;
  };
  const renameSection = async (id: string, name: string) => { await mutate('renameSection', { id, name }); };
  const deleteSection = async (id: string, opts: { action: 'delete' } | { action: 'move'; moveToId: string }) => {
    const affected = materials.filter((m) => m.lessonType === id).length;
    await mutate('deleteSection', { id, moveAction: opts.action, moveToId: opts.action === 'move' ? opts.moveToId : undefined });
    return affected;
  };

  const addSubject = async (name: string): Promise<Subject | null> => {
    const prev = subjects;
    const snap = await mutate('addSubject', { name });
    if (!snap) return null;
    return snap.subjects.find((s) => !prev.some((p) => p.id === s.id)) ?? null;
  };
  const renameSubject = async (id: string, name: string) => { await mutate('renameSubject', { id, name }); };
  const deleteSubject = async (id: string, opts: { action: 'delete' } | { action: 'move'; moveToId: string }) => {
    const affected = materials.filter((m) => m.subjectId === id).length;
    await mutate('deleteSubject', { id, moveAction: opts.action, moveToId: opts.action === 'move' ? opts.moveToId : undefined });
    return affected;
  };

  const setSectionColor = async (id: string, color: string) => { await mutate('setSectionColor', { id, color }); };
  const setSectionCard = async (id: string, card: Partial<CardStyle>) => { await mutate('setSectionCard', { id, card }); };
  const resetSectionColors = async () => { await mutate('resetSectionColors'); };
  const setSubjectColor = async (id: string, color: string) => { await mutate('setSubjectColor', { id, color }); };
  const setSubjectCard = async (id: string, card: Partial<CardStyle>) => { await mutate('setSubjectCard', { id, card }); };
  const clearSubjectColor = async (id: string) => { await mutate('clearSubjectColor', { id }); };
  const resetSubjectColors = async () => { await mutate('resetSubjectColors'); };

  const addOrganization = async (name: string, description?: string): Promise<Organization | null> => {
    const snap = await mutate('addOrganization', { name, description });
    if (!snap) return null;
    return snap.organizations.find((o) => !organizations.some((p) => p.id === o.id)) ?? null;
  };
  const updateOrganization = async (id: string, patch: Partial<Pick<Organization, "name" | "description" | "verified">>) => { await mutate('updateOrganization', { id, ...patch }); };
  const deleteOrganization = async (id: string) => { await mutate('deleteOrganization', { id }); };

  const addMaterial = async (mat: Material) => { await mutate('addMaterial', { material: mat }); };
  const updateMaterial = async (id: string, patch: Partial<Material>) => { await mutate('updateMaterial', { id, patch }); };
  const deleteMaterial = async (id: string) => { await mutate('deleteMaterial', { id }); };
  const promoteMaterial = async (id: string, days: number) => { await mutate('promoteMaterial', { id, days }); };
  const unpromoteMaterial = async (id: string) => { await mutate('unpromoteMaterial', { id }); };

  const addCourse = async (data: { title: string; description?: string; organizationId?: string; price?: number }): Promise<Course | null> => {
    const prev = courses;
    const snap = await mutate('addCourse', data);
    if (!snap) return null;
    return snap.courses.find((c) => !prev.some((p) => p.id === c.id)) ?? null;
  };
  const updateCourse = async (id: string, patch: Partial<Course>) => { await mutate('updateCourse', { id, patch }); };
  const deleteCourse = async (id: string) => { await mutate('deleteCourse', { id }); };
  const promoteCourse = async (id: string, days: number) => { await mutate('promoteCourse', { id, days }); };
  const unpromoteCourse = async (id: string) => { await mutate('unpromoteCourse', { id }); };

  const addService = async (data: { title: string; description?: string; category: string; priceType: Service["priceType"]; price?: number; organizationId?: string }): Promise<Service | null> => {
    const prev = services;
    const snap = await mutate('addService', data);
    if (!snap) return null;
    return snap.services.find((s) => !prev.some((p) => p.id === s.id)) ?? null;
  };
  const updateService = async (id: string, patch: Partial<Service>) => { await mutate('updateService', { id, patch }); };
  const deleteService = async (id: string) => { await mutate('deleteService', { id }); };
  const promoteService = async (id: string, days: number) => { await mutate('promoteService', { id, days }); };
  const unpromoteService = async (id: string) => { await mutate('unpromoteService', { id }); };

  const addReview = async (review: Omit<Review, "id" | "createdAt">) => { await mutate('addReview', review); };
  const deleteReview = async (id: string) => { await mutate('deleteReview', { id }); };

  /** Универсальная мутация org-роута (новые API для сообществ). Возвращает обновлённый каталог. */
  const orgMutate = useCallback(async (action: string, payload: Record<string, unknown> = {}): Promise<CatalogSnapshot | null> => {
    setBusy(true);
    try {
      const res = await fetch('/api/org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });
      const j = await res.json();
      if (res.ok && j?.catalog) {
        apply(j.catalog);
        return j.catalog;
      }
      console.error('[org]', j?.error ?? 'Операция не выполнена');
      return null;
    } catch (e) {
      console.error('[org]', e);
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const importLegacy = async () => {
    if (!state) return;
    const snapshot: CatalogSnapshot = {
      sections: readLegacy<Section[]>('lecport_sections_v1') ?? state.sections,
      subjects: readLegacy<Subject[]>('lecport_subjects_v1') ?? state.subjects,
      materials: readLegacy<Material[]>('lecport_materials_v1') ?? state.materials,
      organizations: state.organizations ?? [],
      courses: state.courses ?? [],
      services: state.services ?? [],
      reviews: state.reviews ?? [],
      sectionColors: { ...readLegacy<Record<string, string>>('lecport_section_colors_v1'), ...state.sectionColors },
      subjectColors: { ...readLegacy<Record<string, string>>('lecport_subject_colors_v1'), ...state.subjectColors },
    };
    const snap = await mutate('replaceAll', { catalog: snapshot });
    try { LS_LEGACY.forEach((k) => localStorage.removeItem(k)); } catch {}
    setLegacy(null);
    if (snap) apply(snap);
  };

  const discardLegacy = () => {
    try { LS_LEGACY.forEach((k) => localStorage.removeItem(k)); } catch {}
    setLegacy(null);
  };

  return {
    sections,
    subjects,
    materials,
    organizations,
    courses,
    services,
    reviews,
    sectionColors,
    subjectColors,
    loading: !state,
    busy,
    refresh: load,
    legacy,
    importLegacy,
    discardLegacy,
    addSection,
    renameSection,
    deleteSection,
    addSubject,
    renameSubject,
    deleteSubject,
    setSectionColor,
    setSectionCard,
    resetSectionColors,
    setSubjectColor,
    setSubjectCard,
    clearSubjectColor,
    resetSubjectColors,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    promoteMaterial,
    unpromoteMaterial,
    addOrganization,
    updateOrganization,
    deleteOrganization,
    addCourse,
    updateCourse,
    deleteCourse,
    promoteCourse,
    unpromoteCourse,
    addService,
    updateService,
    deleteService,
    promoteService,
    unpromoteService,
    addReview,
    deleteReview,
    orgMutate,
  };
}

const favKey = (uid: string) => `lecport_fav_${uid}`;
const notesKey = (uid: string) => `lecport_notes_${uid}`;

/** Избранное и заметки. Ключ — id пользователя (у гостей — общий «guest»).
 *  Остаются личными для каждого пользователя (localStorage). */
export function useFavorites() {
  const { user, loading } = useAuth();
  const uid = user?.id ?? 'guest';
  const [favorites, setFavorites] = useState<string[]>([]);
  const [notes, setNotesState] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    setFavorites(readJson<string[]>(favKey(uid), []));
    setNotesState(readJson<Record<string, string>>(notesKey(uid), {}));
    setReady(true);
  }, [uid, loading]);

  const persistFav = (next: string[]) => {
    setFavorites(next);
    try { localStorage.setItem(favKey(uid), JSON.stringify(next)); } catch {}
  };

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((f) => f !== id) : [id, ...prev];
      try { localStorage.setItem(favKey(uid), JSON.stringify(next)); } catch {}
      return next;
    });
  }, [uid]);

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

  const setNote = useCallback((id: string, text: string) => {
    setNotesState((prev) => {
      const next = { ...prev, [id]: text };
      try { localStorage.setItem(notesKey(uid), JSON.stringify(next)); } catch {}
      return next;
    });
  }, [uid]);

  const removeFavorite = useCallback((id: string) => {
    persistFav(favorites.filter((f) => f !== id));
  }, [favorites, uid]);

  return { favorites, notes, toggleFavorite, isFavorite, setNote, removeFavorite, ready };
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}