export type LessonType = string;

/** Роль участника сообщества (кроме владельца — она подразумевается). */
export type OrgMemberRole = "member" | "author" | "moderator";

/** Участник сообщества с ролью. Владелец хранится отдельно в ownerId. */
export type OrgMember = {
  userId: string;
  role: OrgMemberRole;
  joinedAt: string;
};

/** Платная или бесплатная секция каталога сообщества. */
export type OrgSection = {
  id: string;
  name: string;
  description?: string;
  /** Цена доступа к секции. Если нет/0 — бесплатная. */
  price?: number;
  color?: string;
  createdAt: string;
};

/** Событие новостной ленты сообщества. */
export type OrgNewsEntry = {
  id: string;
  /** Тип события: объявление владельца или опубликованный контент. */
  kind: "announcement" | "material" | "course" | "service";
  title: string;
  text?: string;
  targetId?: string;
  authorId: string;
  authorName: string;
  createdAt: string;
};

/** Как пользователи попадают в сообщество. */
export type OrgMembership = "open" | "request";

/** Сообщество (организация): каталог материалов, курсы, услуги и лента новостей.
 *  Создать его может пользователь с премиум-подпиской; управляет создатель. */
export type Organization = {
  id: string;
  name: string;
  description?: string;
  /** URL аватара организации (обычный файл из /card-image/... или внешняя ссылка). */
  avatar?: string;
  /** id создателя (UserRecord.id). Если не задан — платформенное сообщество (админ). */
  ownerId?: string;
  /** Отметка «проверено площадкой». */
  verified?: boolean;
  /** Как вступают: сразу («open») или по заявке («request»). */
  membership: OrgMembership;
  /** Участники с ролями (кроме владельца). */
  members: OrgMember[];
  /** userId, ожидающие одобрения заявки (при membership = "request"). */
  joinRequests: string[];
  /** Платные/бесплатные секции каталога сообщества. */
  sections: OrgSection[];
  /** Лента событий сообщества. */
  news: OrgNewsEntry[];
  createdAt: string;
  /** (вычисляемое) Активна ли Премиум-подписка владельца. false = сообщество заморожено (только редактирование). */
  ownerPremiumActive?: boolean;
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
  /** Секция каталога сообщества, к которой относится материал. */
  orgSectionId?: string;
  fileUrl?: string; // /uploads/... или внешняя ссылка
  driveUrl?: string; // ссылка на Google Диск
  hasFile?: boolean;
  hasDrive?: boolean;
  fileName?: string;
  previewText?: string;
  price?: number; // если 0/undefined — входит в подписку или бесплатный
  /** Продвижение: до какой даты карточка находится «в топе». ISO-строка. */
  promotedUntil?: string;
  /** Приоритет в сортировке: чем больше, тем выше в списке. */
  priority?: number;
  createdAt: string;
};

/** Модуль/глава курса — упорядоченный список материалов. */
export type CourseModule = {
  id: string;
  title: string;
  materialIds: string[];
};

/** Курс — структурированный продукт из материалов. Создаётся отдельным лицом или от имени организации. */
export type Course = {
  id: string;
  title: string;
  description?: string;
  organizationId?: string;
  /** Создатель курса (если он не от имени организации). Для автономных курсов. */
  authorId?: string;
  price?: number;
  modules: CourseModule[];
  /** Продвижение: до какой даты курс находится «в топе». ISO-строка. */
  promotedUntil?: string;
  /** Приоритет в сортировке: чем больше, тем выше в списке. */
  priority?: number;
  createdAt: string;
};

/** Категории услуг «Помощи» (репетиторство, работы на заказ и т.п.). */
export const SERVICE_CATEGORIES = [
  { id: "tutoring", name: "Репетиторство" },
  { id: "homework", name: "Работы на заказ" },
  { id: "coding", name: "Код и IT" },
  { id: "consult", name: "Консультации" },
  { id: "writing", name: "Тексты и оформление" },
] as const;

export type ServicePriceType = "fixed" | "hourly";

/** Объявление об услуге: «я всегда этим занимаюсь — наймите меня». Создаётся отдельным лицом или от имени организации. */
export type Service = {
  id: string;
  title: string;
  description: string;
  category: string;
  /** fixed — фикс. цена за работу, hourly — цена за час. */
  priceType: ServicePriceType;
  price?: number;
  organizationId?: string;
  /** Создатель объявления. */
  authorId?: string;
  /** Средняя оценка 1–5 (вычисляется из отзывов). */
  rating: number;
  reviewCount: number;
  /** Продвижение: до какой даты объявление «в топе». ISO-строка. */
  promotedUntil?: string;
  /** Приоритет в сортировке: чем больше, тем выше в списке. */
  priority?: number;
  createdAt: string;
};

/** Отзыв на услугу/курс/материал. По плану — только к подтверждённым сделкам. */
export type Review = {
  id: string;
  /** К чему привязан отзыв: к услуге, курсу или материалу. */
  targetType: "service" | "course" | "material";
  targetId: string;
  authorId: string;
  authorName: string;
  rating: number; // 1–5
  text?: string;
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
    membership: 'open',
    members: [],
    joinRequests: [],
    sections: [],
    news: [],
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

/* ================================================================
   Хелперы для работы с ролями в сообществах (клиент + сервер).
   Не зависят от серверного кода и безопасны для встраивания в UI.
   ================================================================ */

/** Конкретная роль внутри сообщества (с учётом владельца). */
export type OrgRole = "owner" | "moderator" | "author" | "member";

/** Получить роль пользователя в сообществе (null — не участник). */
export function getOrgRole(org: Organization | undefined, userId: string | undefined): OrgRole | null {
  if (!org || !userId) return null;
  if (org.ownerId === userId) return "owner";
  const m = org.members?.find((x) => x.userId === userId);
  return m?.role ?? null;
}

/** Может ли пользователь управлять контентом сообщества (автор + модератор + владелец). */
export function canPublishContent(role: OrgRole | null): boolean {
  return role === "owner" || role === "moderator" || role === "author";
}

/** Может ли пользователь управлять настройками сообщества и его участниками (модератор + владелец). */
export function canManageOrg(role: OrgRole | null): boolean {
  return role === "owner" || role === "moderator";
}

/** Является ли пользователь участником сообщества (любыая роль). */
export function isOrgMember(role: OrgRole | null): boolean {
  return role !== null;
}

/** Стоимость секции: 0 / undefined = бесплатная. */
export function sectionPriceLabel(section: OrgSection): string | null {
  const price = section.price ?? 0;
  if (price <= 0) return null;
  return `${price} ₽`;
}
