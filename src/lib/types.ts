export type LessonType = string;

/** Продавец на площадке: любой пользователь может создать организацию и вести от её имени продажи. */
export type Organization = {
  id: string;
  name: string;
  description?: string;
  /** URL аватара организации (обычный файл из /card-image/... или внешняя ссылка). */
  avatar?: string;
  /** id владельца (UserRecord.id). */
  ownerId?: string;
  /** Отметка «проверено площадкой». */
  verified?: boolean;
  createdAt: string;
};

/** Оформление цветной карточки каталога (раздел/предмет). */
export type CardStyle = {
  /** URL картинки-подложки карточки. Если нет — обычная цветная заливка. */
  imageUrl?: string;
  /** Как вписать картинку в карточку: cover — заполнить, contain — вписать целиком. */
  imageFit?: "cover" | "contain";
  /** Какая часть изображения видна: background-position, например "25% 30%". По умолчанию центр. */
  position?: string;
  /** Стеклянный эффект (прозрачные панели, blur, орбы). По умолчанию true. */
  glass?: boolean;
  /** Иконка карточки: строковый ключ из SECTION_ICON_OPTIONS. Если не задана — используется дефолтная. */
  icon?: string;
};

export type Section = {
  id: string;
  name: string;
  card?: CardStyle;
};

export type Subject = {
  id: string;
  name: string;
  card?: CardStyle;
};

export type Material = {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  lessonType: LessonType;
  /** Организация-продавец. Если нет — материал считается базовым (каталог платформы). */
  organizationId?: string;
  fileUrl?: string; // /uploads/... или внешняя ссылка
  driveUrl?: string; // ссылка на Google Диск
  hasFile?: boolean;
  hasDrive?: boolean;
  fileName?: string;
  previewText?: string;
  price?: number; // если 0/undefined — входит в подписку или бесплатный
  createdAt: string;
};

export const LESSON_TYPES: { id: LessonType; name: string }[] = [
  { id: 'lecture', name: 'Лекция' },
  { id: 'practice', name: 'Практика' },
  { id: 'lab', name: 'Лабораторная работа' },
];

/** Стартовая организация (используется, пока админ не создал свои). */
export const ORGANIZATION_SEED: Organization[] = [
  {
    id: 'org-lecport',
    name: 'LecPort',
    description: 'Базовая организация платформы. Материалы публикуются от её имени, пока вы не создали свою.',
    verified: true,
    createdAt: new Date().toISOString(),
  },
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
