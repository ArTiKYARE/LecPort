export type Plan = {
  id: string;
  name: string;
  months: number;
  /** Цена в рублях за весь срок. */
  priceRub: number;
  period: string;
  popular?: boolean;
  features: string[];
};

const BASE_MONTHLY = 200;

export const PLANS: Plan[] = [
  {
    id: "month",
    name: "Месяц",
    months: 1,
    priceRub: 200,
    period: "30 дней",
    features: ["Все лекции, практики и лабы", "Файлы PDF / DOCX / PPTX", "Ссылки на Google Диск"],
  },
  {
    id: "semester",
    name: "Семестр",
    months: 6,
    priceRub: 990,
    period: "6 месяцев",
    popular: true,
    features: ["Всё из тарифа «Месяц»", "Цена 165 ₽/мес вместо 200 ₽", "Выгодно для сессии"],
  },
  {
    id: "year",
    name: "Год",
    months: 12,
    priceRub: 1590,
    period: "12 месяцев",
    features: ["Всё из тарифа «Семестр»", "Цена ~133 ₽/мес вместо 200 ₽", "Максимальная выгода −34%"],
  },
];

export function planById(id: string | undefined | null): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}

export function planName(id: string | undefined | null): string {
  return planById(id)?.name ?? "Подписка";
}

export function formatRub(n: number): string {
  return `${n.toLocaleString("ru-RU")} ₽`;
}

/** Экономия относительно помесячной оплаты 200 ₽/мес. */
export function planSavings(p: Plan): number {
  return Math.max(0, BASE_MONTHLY * p.months - p.priceRub);
}
