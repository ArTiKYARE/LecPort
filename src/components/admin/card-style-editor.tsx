"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Upload, Film, Link2, Crop, Expand, Palette, Check, RotateCcw, X, ArrowLeft, BookOpen } from "lucide-react";
import { SECTION_COLOR_PRESETS, type CardStyle } from "@/lib/types";
import { glassEnabled, cardTextColor } from "@/lib/sections";
import { SECTION_ICON_OPTIONS, getIcon } from "@/lib/section-icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CatalogCard } from "@/components/catalog-card";

/** Разбор "25% 30%" / "left top" / "center" → координаты в процентах. */
function positionToPct(pos?: string): { x: number; y: number } {
  if (!pos) return { x: 50, y: 50 };
  const m = pos.match(/(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%/);
  if (m) {
    const clamp = (v: number) => Math.min(100, Math.max(0, v));
    return { x: clamp(Number(m[1])), y: clamp(Number(m[2])) };
  }
  const parts = (pos || "center").split(/\s+/);
  let x = 50;
  let y = 50;
  for (const p of parts) {
    if (p === "left") x = 0;
    else if (p === "right") x = 100;
    else if (p === "top") y = 0;
    else if (p === "bottom") y = 100;
  }
  return { x, y };
}

function pctToPosition(x: number, y: number): string {
  const round = (v: number) => Math.min(100, Math.max(0, Math.round(v)));
  return `${round(x)}% ${round(y)}%`;
}

/** Выбор видимой части изображения: клик/перенос точки фокуса по превью. */
function FocusPointPicker({ imageUrl, value, onChange }: {
  imageUrl: string;
  value?: string;
  onChange: (pos: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pct, setPct] = useState(() => positionToPct(value));
  useEffect(() => setPct(positionToPct(value)), [value]);

  const applyAt = (clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * 100;
    const y = ((clientY - r.top) / r.height) * 100;
    const next = { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
    setPct(next);
    onChange(pctToPosition(next.x, next.y));
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Видимая часть изображения — нажмите или потяните по превью</Label>
        <button type="button" className="text-xs text-muted-foreground underline hover:text-foreground" onClick={() => onChange("center")}>
          По центру
        </button>
      </div>
      <div
        ref={ref}
        className="relative aspect-[4/3] cursor-crosshair select-none overflow-hidden rounded-lg border"
        style={{ backgroundImage: `url(${imageUrl})`, backgroundSize: "cover", backgroundPosition: `${pct.x}% ${pct.y}%`, backgroundRepeat: "no-repeat", backgroundColor: "#0f172a" }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          applyAt(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) applyAt(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
        }}
      >
        <div
          className="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary/70 shadow"
          style={{ left: `${pct.x}%`, top: `${pct.y}%` }}
        />
      </div>
    </div>
  );
}

/** Отдельная страница оформления карточки каталога (не модальное окно). */
export function CardStyleEditor({ title, onExit, icon, footerLabel, cardName, count, compact, initialColor, initialCard, saveLabel, extraAction, onSave }: {
  title: string;
  onExit: () => void;
  icon: ReactNode;
  footerLabel: string;
  cardName: string;
  count: number;
  compact?: boolean;
  initialColor: string;
  initialCard: CardStyle;
  saveLabel: string;
  extraAction?: { label: string; onClick: () => void };
  onSave: (color: string, card: CardStyle) => void;
}) {
  const [draft, setDraft] = useState(initialColor);
  const [card, setCard] = useState<CardStyle>(initialCard);
  const [imgBusy, setImgBusy] = useState(false);
  const [mediaUrl, setMediaUrl] = useState("");
  const on = cardTextColor(card, draft);
  const glass = glassEnabled(card);
  const fit = card.imageFit ?? "cover";
  const SelectedIcon = getIcon(card.icon);

  const onUploadImg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload-image", { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Ошибка загрузки");
      setCard((c) => ({ ...c, imageUrl: j.url, position: c.position ?? "center" }));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setImgBusy(false);
    }
  };

  const applyMediaUrl = () => {
    const url = mediaUrl.trim();
    if (!url) return;
    try {
      const parsed = new URL(url, window.location.origin);
      if (!["http:", "https:"].includes(parsed.protocol)) return;
      setCard((c) => ({ ...c, imageUrl: url, position: c.position ?? "center" }));
      setMediaUrl("");
    } catch {
      alert("Проверьте ссылку: она должна начинаться с http(s)://");
    }
  };

  const setFit = (f: "cover" | "contain") => setCard((c) => ({ ...c, imageFit: f }));

  const hasMedia = !!card.imageUrl;

  return (
    <Card>
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
        <div className="flex items-center gap-2.5">
          <Button variant="ghost" size="icon" onClick={onExit} className="action-btn shrink-0" aria-label="Назад к списку">
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h3 className="flex items-center gap-2 text-base font-semibold"><Palette className="size-4" />{title}</h3>
            <p className="text-sm text-muted-foreground">Все изменения применяются к карточке в каталоге. Предпросмотр обновляется сразу.</p>
          </div>
        </div>
      </div>

      <CardContent className="space-y-6 p-5">
        {/* Верх: предпросмотр */}
        <div className="relative">
          <CatalogCard
            compact={compact}
            card={card}
            color={draft}
            icon={SelectedIcon ? <SelectedIcon className="size-5" /> : icon}
            title={cardName}
            subtitle={`${count} мат.`}
            footer={<span className="flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium" style={{ backgroundColor: "rgba(255,255,255,0.92)", color: on === "#ffffff" ? draft : "#0f172a" }}>{footerLabel}</span>}
            className="cursor-default hover:shadow-none"
          />
          <span className="absolute right-2 top-2 rounded-full border border-white/30 bg-black/30 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white backdrop-blur-sm">
            Так будет в каталоге
          </span>
        </div>

        {/* Инфо-строка */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <span className="block font-medium uppercase tracking-wide">Формат</span>
            {hasMedia ? (card.imageUrl?.toLowerCase().endsWith(".gif") ? "GIF — анимируется" : "Изображение") : "Без медиа, цветная карточка"}
          </div>
          <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <span className="block font-medium uppercase tracking-wide">Подгонка</span>
            {fit === "cover" ? "Заполнить карточку" : "Вписать целиком"}
          </div>
          <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <span className="block font-medium uppercase tracking-wide">Стекло</span>
            {glass ? "Включено" : "Выключено"}
          </div>
        </div>

        {/* Медиа */}
        <div className="rounded-xl border p-4">
          <Label className="mb-3 flex items-center gap-2 text-sm">
            <Upload className="size-4" />Изображение / GIF
          </Label>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <label className={`inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${imgBusy ? "pointer-events-none opacity-60" : "hover:bg-accent"}`}>
                <Upload className="size-4" />{imgBusy ? "Загружаю..." : "Загрузить файл"}
                <input type="file" accept=".png,.jpg,.jpeg,.webp,.gif,.svg,.avif" className="hidden" onChange={onUploadImg} disabled={imgBusy} />
              </label>
              <span className="text-xs text-muted-foreground">PNG, JPG, WEBP, GIF (анимированный), SVG, AVIF · до 15 МБ</span>
            </div>

            {hasMedia ? (
              <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-2.5">
                <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-background">
                  <img src={card.imageUrl} alt="" className="size-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{card.imageUrl?.endsWith(".gif") ? "GIF-анимация" : "Изображение"}</div>
                  <div className="truncate text-xs text-muted-foreground">{card.imageUrl}</div>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setCard((c) => ({ ...c, imageUrl: "" }))} className="action-btn shrink-0">
                  <X />Убрать
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border p-2.5 text-sm text-muted-foreground">
                <Film className="size-4 shrink-0" />
                Карточка без изображения — используется цветная заливка.
              </div>
            )}

            <div className="flex gap-2">
              <Input
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyMediaUrl()}
                placeholder="или вставьте ссылку на изображение / GIF (http...)"
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={applyMediaUrl} disabled={!mediaUrl.trim()} className="action-btn shrink-0">
                <Link2 className="size-4" />Вставить
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Средний столбец: иконка + подгонка + стекло + фокус */}
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><Palette className="size-4" />Иконка карточки</span>
                {card.icon && (
                  <button type="button" className="text-xs text-muted-foreground underline hover:text-foreground" onClick={() => setCard((c) => ({ ...c, icon: undefined }))}>
                    Сбросить
                  </button>
                )}
              </Label>
              <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6">
                {SECTION_ICON_OPTIONS.map((opt) => {
                  const active = card.icon === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      title={opt.label}
                      aria-label={opt.label}
                      onClick={() => setCard((c) => ({ ...c, icon: active ? undefined : opt.value }))}
                      className={`flex aspect-square items-center justify-center rounded-lg border transition-colors ${active ? "border-primary bg-primary/10 text-primary" : "border-input text-muted-foreground hover:bg-accent hover:text-foreground"}`}
                    >
                      <opt.icon className="size-4" />
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">Если иконка не выбрана — используется стандартная для таких карточек.</p>
            </div>

            {hasMedia && (
              <div className="space-y-2">
                <Label className="text-sm">Подгонка изображения</Label>
                <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/60 p-1">
                  {(["cover", "contain"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFit(f)}
                      className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${fit === f ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {f === "cover" ? <Crop className="size-4" /> : <Expand className="size-4" />}
                      {f === "cover" ? "Заполнить карточку" : "Вписать целиком"}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">«Заполнить» обрезает медиа и берёт выбранную область; «Вписать целиком» — показывает полностью с фоном цвета подложки.</p>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
              <div>
                <Label className="block text-sm">Стеклянный эффект</Label>
                <p className="text-xs text-muted-foreground">Прозрачные панели, blur и мягкие блики</p>
              </div>
              <button
                role="switch"
                aria-checked={glass}
                onClick={() => setCard((c) => ({ ...c, glass: !c.glass }))}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${glass ? "bg-primary" : "bg-input"}`}
              >
                <span className={`absolute top-0.5 size-5 rounded-full bg-background shadow transition-all ${glass ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </div>

            {hasMedia && (
              <div className="space-y-2">
                <Label className="flex items-center justify-between text-sm">
                  Выбор видимой части
                  <button type="button" className="text-xs text-muted-foreground underline hover:text-foreground" onClick={() => setCard((c) => ({ ...c, position: "center" }))}>
                    По центру
                  </button>
                </Label>
                <FocusPointPicker
                  imageUrl={card.imageUrl!}
                  value={card.position}
                  onChange={(pos) => setCard((c) => ({ ...c, position: pos }))}
                />
              </div>
            )}
          </div>

          {/* Правый столбец: цвет */}
          <div className="space-y-4 rounded-xl border p-4">
            <Label className="flex items-center gap-2 text-sm">
              <Palette className="size-4" />Цвет карточки
            </Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded border bg-background p-1"
                aria-label="Цвет карточки"
              />
              <input
                value={draft}
                onChange={(e) => /^#[\da-fA-F]{6}$/.test(e.target.value) && setDraft(e.target.value)}
                className="h-10 w-28 rounded-md border bg-background px-2 font-mono text-sm uppercase"
                aria-label="HEX-код цвета"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {SECTION_COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setDraft(c)}
                  className="size-8 rounded-full border-2 transition-transform hover:scale-105"
                  style={{
                    backgroundColor: c,
                    borderColor: draft.toLowerCase() === c.toLowerCase() ? "#fff" : "transparent",
                    boxShadow: draft.toLowerCase() === c.toLowerCase() ? `0 0 0 2px ${c}` : "none",
                  }}
                  title={c}
                  aria-label={`Выбрать ${c}`}
                />
              ))}
            </div>
            {hasMedia && <p className="text-xs text-muted-foreground">Цвет используется как подложка (фон и поля при «вписать целиком»).</p>}
          </div>
        </div>

        {/* Действия */}
        <div className="flex flex-wrap items-center gap-2 border-t pt-4">
          <Button onClick={() => onSave(draft, card)} className="action-btn" disabled={imgBusy}>
            <Check />{saveLabel}
          </Button>
          {extraAction && (
            <Button variant="outline" onClick={extraAction.onClick} className="action-btn">
              <RotateCcw />{extraAction.label}
            </Button>
          )}
          <Button variant="ghost" onClick={onExit} className="action-btn"><X />Отмена</Button>
        </div>
      </CardContent>
    </Card>
  );
}