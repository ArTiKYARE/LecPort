import type { CSSProperties } from "react";
import type { LessonType } from "./types";

/** Мягкий фон + цветной текст для бейджей/иконок раздела. */
export function sectionSoftStyle(color: string): CSSProperties {
  return {
    backgroundColor: `${color}1A`,
    color,
    borderColor: `${color}55`,
  };
}

/** Сплошная иконка раздела. */
export function sectionSolidStyle(color: string): CSSProperties {
  return { backgroundColor: color, color: "#fff" };
}

export function sectionColorOf(colors: Record<LessonType, string> | undefined, type: LessonType, fallback = "#64748b") {
  return colors?.[type] ?? fallback;
}

/** Палитра для плашек предметов — цвет стабилен для каждого id. */
export const SUBJECT_PALETTE = [
  "#2563eb", "#16a34a", "#ea580c", "#9333ea", "#db2777",
  "#0891b2", "#ca8a04", "#dc2626", "#4f46e5", "#0d9488",
];

export function subjectColor(subjectId: string): string {
  let h = 0;
  for (let i = 0; i < subjectId.length; i++) {
    h = (h * 31 + subjectId.charCodeAt(i)) >>> 0;
  }
  return SUBJECT_PALETTE[h % SUBJECT_PALETTE.length];
}

/** Итоговый цвет предмета: заданный вручную либо автоматический по id. */
export function resolveSubjectColor(custom: Record<string, string> | undefined, subjectId: string): string {
  return custom?.[subjectId] ?? subjectColor(subjectId);
}

/** Цветная плашка: градиент + белый текст. */
export function plaqueStyle(color: string): CSSProperties {
  return {
    background: `linear-gradient(135deg, ${color}, ${color}B3)`,
    color: "#fff",
    borderColor: color,
  };
}

function linearize(v: number) {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/**
 * Контрастный цвет поверх заливки: белый для тёмных цветов,
 * тёмно-синий для светлых. Для иконок и текста на цветных карточках.
 */
export function contrastOn(hex: string): string {
  const c = hex.replace("#", "");
  const full = (c.length === 3 ? c.split("").map((ch) => ch + ch).join("") : c).padEnd(6, "0");
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return "#ffffff";
  const lum = 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
  return lum > 0.4 ? "#0f172a" : "#ffffff";
}

/** Полупрозрачная «стеклянная» панель поверх цветной заливки. */
export function glassPanel(): CSSProperties {
  return {
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderColor: "rgba(255, 255, 255, 0.35)",
  };
}
