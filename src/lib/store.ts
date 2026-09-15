'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Material, MATERIALS_SEED, Subject, SUBJECTS_SEED,
  LessonType, Section, SECTIONS_SEED, SectionColors, SECTION_COLORS_DEFAULT,
} from './types';
import { useAuth } from './auth';

const LS_MATERIALS = 'lecport_materials_v1';
const LS_SUBJECTS = 'lecport_subjects_v1';
const LS_COLORS = 'lecport_section_colors_v1';
const LS_SECTIONS = 'lecport_sections_v1';
const LS_SUBJ_COLORS = 'lecport_subject_colors_v1';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function useCatalog() {
  const [materials, setMaterials] = useState<Material[]>(MATERIALS_SEED);
  const [subjects, setSubjects] = useState<Subject[]>(SUBJECTS_SEED);
  const [sections, setSections] = useState<Section[]>(SECTIONS_SEED);
  const [sectionColors, setSectionColorsState] = useState<SectionColors>(SECTION_COLORS_DEFAULT);
  const [subjectColors, setSubjectColorsState] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const m = localStorage.getItem(LS_MATERIALS);
      const s = localStorage.getItem(LS_SUBJECTS);
      const c = localStorage.getItem(LS_COLORS);
      const sec = localStorage.getItem(LS_SECTIONS);
      const sjc = localStorage.getItem(LS_SUBJ_COLORS);
      if (m) setMaterials(JSON.parse(m));
      else localStorage.setItem(LS_MATERIALS, JSON.stringify(MATERIALS_SEED));
      if (s) setSubjects(JSON.parse(s));
      else localStorage.setItem(LS_SUBJECTS, JSON.stringify(SUBJECTS_SEED));
      if (sec) {
        const parsed = JSON.parse(sec) as Section[];
        if (Array.isArray(parsed) && parsed.length) setSections(parsed);
        else localStorage.setItem(LS_SECTIONS, JSON.stringify(SECTIONS_SEED));
      }
      else localStorage.setItem(LS_SECTIONS, JSON.stringify(SECTIONS_SEED));
      if (c) setSectionColorsState({ ...SECTION_COLORS_DEFAULT, ...JSON.parse(c) });
      else localStorage.setItem(LS_COLORS, JSON.stringify(SECTION_COLORS_DEFAULT));
      if (sjc) {
        try { setSubjectColorsState(JSON.parse(sjc)); } catch {}
      }
    } catch {}
  }, []);

  const saveMaterials = (next: Material[]) => {
    setMaterials(next);
    localStorage.setItem(LS_MATERIALS, JSON.stringify(next));
  };

  const addMaterial = (mat: Material) => {
    saveMaterials([mat, ...materials]);
  };

  const updateMaterial = (id: string, patch: Partial<Material>) => {
    saveMaterials(materials.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const deleteMaterial = (id: string) => {
    saveMaterials(materials.filter((m) => m.id !== id));
  };

  const addSubject = (name: string) => {
    const id = name.toLowerCase().replace(/[^a-zа-я0-9]+/gi, '-');
    const next = [...subjects, { id: `${id}-${Date.now()}`, name }];
    setSubjects(next);
    localStorage.setItem(LS_SUBJECTS, JSON.stringify(next));
  };

  const renameSubject = (id: string, name: string) => {
    const next = subjects.map((s) => (s.id === id ? { ...s, name } : s));
    setSubjects(next);
    localStorage.setItem(LS_SUBJECTS, JSON.stringify(next));
  };

  /**
   * Удаление предмета. Материалы либо удаляются вместе с ним,
   * либо переносятся в другой предмет (moveToId).
   */
  const deleteSubject = (id: string, opts: { action: 'delete' } | { action: 'move'; moveToId: string }) => {
    const affected = materials.filter((m) => m.subjectId === id).length;
    if (opts.action === 'delete') {
      saveMaterials(materials.filter((m) => m.subjectId !== id));
    } else {
      saveMaterials(materials.map((m) => (m.subjectId === id ? { ...m, subjectId: opts.moveToId } : m)));
    }
    const nextSubjects = subjects.filter((s) => s.id !== id);
    setSubjects(nextSubjects);
    localStorage.setItem(LS_SUBJECTS, JSON.stringify(nextSubjects));
    const nextColors = { ...subjectColors };
    delete nextColors[id];
    setSubjectColorsState(nextColors);
    localStorage.setItem(LS_SUBJ_COLORS, JSON.stringify(nextColors));
    return affected;
  };

  const setSubjectColor = (id: string, color: string) => {
    const next = { ...subjectColors, [id]: color };
    setSubjectColorsState(next);
    localStorage.setItem(LS_SUBJ_COLORS, JSON.stringify(next));
  };

  const clearSubjectColor = (id: string) => {
    const next = { ...subjectColors };
    delete next[id];
    setSubjectColorsState(next);
    localStorage.setItem(LS_SUBJ_COLORS, JSON.stringify(next));
  };

  const resetSubjectColors = () => {
    setSubjectColorsState({});
    localStorage.setItem(LS_SUBJ_COLORS, JSON.stringify({}));
  };

  const setSectionColor = (type: LessonType, color: string) => {
    const next = { ...sectionColors, [type]: color };
    setSectionColorsState(next);
    localStorage.setItem(LS_COLORS, JSON.stringify(next));
  };

  const resetSectionColors = () => {
    setSectionColorsState(SECTION_COLORS_DEFAULT);
    localStorage.setItem(LS_COLORS, JSON.stringify(SECTION_COLORS_DEFAULT));
  };

  const renameSection = (id: string, name: string) => {
    const next = sections.map((s) => (s.id === id ? { ...s, name } : s));
    setSections(next);
    localStorage.setItem(LS_SECTIONS, JSON.stringify(next));
  };

  /**
   * Удаление раздела. Материалы либо удаляются вместе с ним,
   * либо переносятся в другой раздел (moveToId).
   * Возвращает количество затронутых материалов.
   */
  const deleteSection = (id: string, opts: { action: 'delete' } | { action: 'move'; moveToId: string }) => {
    const affected = materials.filter((m) => m.lessonType === id).length;
    if (opts.action === 'delete') {
      saveMaterials(materials.filter((m) => m.lessonType !== id));
    } else {
      saveMaterials(materials.map((m) => (m.lessonType === id ? { ...m, lessonType: opts.moveToId } : m)));
    }
    const nextSections = sections.filter((s) => s.id !== id);
    setSections(nextSections);
    localStorage.setItem(LS_SECTIONS, JSON.stringify(nextSections));
    const nextColors = { ...sectionColors };
    delete nextColors[id];
    setSectionColorsState(nextColors);
    localStorage.setItem(LS_COLORS, JSON.stringify(nextColors));
    return affected;
  };

  return {
    materials, subjects, sections, sectionColors, subjectColors,
    addMaterial, updateMaterial, deleteMaterial,
    addSubject, renameSubject, deleteSubject,
    setSubjectColor, clearSubjectColor, resetSubjectColors,
    setSectionColor, resetSectionColors,
    renameSection, deleteSection,
  };
}

export function getMaterialById(id: string): Material | undefined {
  if (typeof window === 'undefined') return MATERIALS_SEED.find((m) => m.id === id);
  try {
    const raw = localStorage.getItem(LS_MATERIALS);
    const arr: Material[] = raw ? JSON.parse(raw) : MATERIALS_SEED;
    return arr.find((m) => m.id === id);
  } catch {
    return MATERIALS_SEED.find((m) => m.id === id);
  }
}

const favKey = (uid: string) => `lecport_fav_${uid}`;
const notesKey = (uid: string) => `lecport_notes_${uid}`;

/** Избранное и заметки. Ключ — id пользователя (у гостей — общий «guest»). */
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
