export type LessonType = string;

export type Section = {
  id: string;
  name: string;
};

export type Subject = {
  id: string;
  name: string;
};

export type Material = {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  lessonType: LessonType;
  fileUrl?: string; // /uploads/... или внешняя ссылка
  driveUrl?: string; // ссылка на Google Диск
  fileName?: string;
  previewText?: string;
  price?: number; // если 0 — входит в подписку
  createdAt: string;
};

export const LESSON_TYPES: { id: LessonType; name: string }[] = [
  { id: 'lecture', name: 'Лекция' },
  { id: 'practice', name: 'Практика' },
  { id: 'lab', name: 'Лабораторная работа' },
];

/** Стартовый набор разделов (дальше ими управляет админ/модератор). */
export const SECTIONS_SEED: Section[] = [
  { id: 'lecture', name: 'Лекция' },
  { id: 'practice', name: 'Практика' },
  { id: 'lab', name: 'Лабораторная работа' },
];

export type SectionColors = Record<LessonType, string>;

export const SECTION_COLORS_DEFAULT: SectionColors = {
  lecture: '#2563eb',
  practice: '#16a34a',
  lab: '#ea580c',
};

export const SECTION_COLOR_PRESETS = [
  '#2563eb', '#16a34a', '#ea580c', '#9333ea',
  '#db2777', '#0891b2', '#ca8a04', '#dc2626',
];

export const SUBJECTS_SEED: Subject[] = [
  { id: 'math', name: 'Математика' },
  { id: 'physics', name: 'Физика' },
  { id: 'informatics', name: 'Информатика' },
  { id: 'history', name: 'История' },
  { id: 'english', name: 'Английский язык' },
];

export const MATERIALS_SEED: Material[] = [
  {
    id: 'm1',
    title: 'Лекция 1: Пределы и непрерывность',
    description: 'Основные определения, теоремы, примеры решения. PDF с конспектом.',
    subjectId: 'math',
    lessonType: 'lecture',
    previewText: 'Предел функции в точке. Определение по Коши... (превью, первые 2 страницы)',
    fileName: 'predely.pdf',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'm2',
    title: 'Практика: Производные — 20 задач с разбором',
    description: 'Подборка задач с пошаговым решением.',
    subjectId: 'math',
    lessonType: 'practice',
    previewText: 'Задача 1-3 в открытом доступе, остальные — по подписке.',
    fileName: 'proizvodnye.docx',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'm3',
    title: 'Лабораторная: Маятник и измерение g',
    description: 'Методичка + шаблон отчёта для лабы по физике.',
    subjectId: 'physics',
    lessonType: 'lab',
    previewText: 'Цель работы, оборудование, теория... Полный шаблон по подписке.',
    driveUrl: 'https://drive.google.com/example',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'm4',
    title: 'Лекция: Основы Python — типы данных',
    description: 'Презентация PPTX + конспект.',
    subjectId: 'informatics',
    lessonType: 'lecture',
    previewText: 'Переменные, списки, словари... Превью презентации.',
    fileName: 'python-basics.pptx',
    createdAt: new Date().toISOString(),
  },
];
