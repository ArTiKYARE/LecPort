import {
  BookOpenText, PenLine, FlaskConical, Calculator, Sigma, Microscope, Atom,
  Globe, Map, History, Landmark, Languages, Code2, Palette, Music, Sprout,
  Ruler, ClipboardList, GraduationCap, School, Target, BookMarked, NotebookPen,
  PencilRuler, Flame, Wrench, Briefcase, Brain, Lightbulb, Dna,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type SectionIconOption = { value: string; label: string; icon: LucideIcon };

export const SECTION_ICON_OPTIONS: SectionIconOption[] = [
  { value: "book", label: "Книга", icon: BookOpenText },
  { value: "pen", label: "Письмо", icon: PenLine },
  { value: "flask", label: "Лаборатория", icon: FlaskConical },
  { value: "calculator", label: "Калькулятор", icon: Calculator },
  { value: "sigma", label: "Сигма", icon: Sigma },
  { value: "microscope", label: "Микроскоп", icon: Microscope },
  { value: "atom", label: "Атом", icon: Atom },
  { value: "dna", label: "ДНК", icon: Dna },
  { value: "globe", label: "Глобус", icon: Globe },
  { value: "map", label: "Карта", icon: Map },
  { value: "history", label: "История", icon: History },
  { value: "landmark", label: "Здание", icon: Landmark },
  { value: "languages", label: "Языки", icon: Languages },
  { value: "code", label: "Код", icon: Code2 },
  { value: "palette", label: "Палитра", icon: Palette },
  { value: "music", label: "Музыка", icon: Music },
  { value: "sprout", label: "Росток", icon: Sprout },
  { value: "ruler", label: "Линейка", icon: Ruler },
  { value: "clipboard", label: "Задачи", icon: ClipboardList },
  { value: "grad", label: "Выпускник", icon: GraduationCap },
  { value: "school", label: "Университет", icon: School },
  { value: "target", label: "Цель", icon: Target },
  { value: "bookmarked", label: "Закладки", icon: BookMarked },
  { value: "notebook", label: "Блокнот", icon: NotebookPen },
  { value: "pencil", label: "Карандаш", icon: PencilRuler },
  { value: "flame", label: "Пламя", icon: Flame },
  { value: "wrench", label: "Инструмент", icon: Wrench },
  { value: "briefcase", label: "Дело", icon: Briefcase },
  { value: "brain", label: "Мозг", icon: Brain },
  { value: "bulb", label: "Идея", icon: Lightbulb },
];

const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  SECTION_ICON_OPTIONS.map((o) => [o.value, o.icon]),
);

export function getIcon(name?: string): LucideIcon | null {
  if (!name) return null;
  return ICON_MAP[name] ?? null;
}
