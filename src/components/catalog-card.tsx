import { useState } from "react";
import type { ReactNode } from "react";
import { glassEnabled, glassPanel, cardTextColor } from "@/lib/sections";
import type { CardStyle } from "@/lib/types";

type CatalogCardProps = {
  card: CardStyle | undefined;
  color: string;
  icon: ReactNode;
  title: ReactNode;
  subtitle: ReactNode;
  footer?: ReactNode;
  compact?: boolean;
  className?: string;
};

/** Карточка каталога. Медиа (фото или GIF) рисуется как <img> с object-fit/object-position —
 *  так анимированные GIF работают, а выбранная область совпадает с каталогом.
 *  Тот же компонент используют каталог и редактор в админке, поэтому пропорции совпадают. */
export function CatalogCard({ card, color, icon, title, subtitle, footer, compact, className }: CatalogCardProps) {
  const glass = glassEnabled(card);
  const on = cardTextColor(card, color);
  const [mediaOk, setMediaOk] = useState(true);
  const showMedia = !!card?.imageUrl && mediaOk;
  const fit = card?.imageFit ?? "cover";
  const pos = card?.position ?? "center";

  return (
    <div
      className={`relative aspect-[4/3] overflow-hidden rounded-lg transition-shadow hover:shadow-lg ${className ?? ""}`}
      style={{ backgroundColor: color, border: "1px solid rgba(255,255,255,0.25)" }}
    >
      {showMedia ? (
        <img
          src={card!.imageUrl}
          alt=""
          draggable={false}
          onError={() => setMediaOk(false)}
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{ objectFit: fit, objectPosition: pos }}
        />
      ) : (
        <div aria-hidden className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)` }} />
      )}

      {glass && (
        <>
          <div aria-hidden className={`pointer-events-none absolute rounded-full bg-white/15 blur-2xl ${compact ? "-right-8 -top-8 size-32" : "-right-10 -top-10 size-40"}`} />
          <div aria-hidden className={`pointer-events-none absolute rounded-full bg-black/10 blur-2xl ${compact ? "-bottom-10 -left-6 size-28" : "-bottom-12 -left-8 size-36"}`} />
        </>
      )}

      <div className={`absolute inset-0 flex flex-col ${compact ? "p-4" : "p-5"}`}>
        <div className={compact ? "flex items-center gap-3" : "space-y-3"}>
          <span
            className={`flex items-center justify-center rounded-xl border ${compact ? "size-9 shrink-0" : "size-11"} ${glass ? "backdrop-blur-sm" : ""}`}
            style={glass ? { ...glassPanel(), color: on } : { backgroundColor: `${color}22`, borderColor: `${color}55`, color: on }}
          >
            {icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className={`truncate font-semibold ${compact ? "text-sm" : ""}`} style={{ color: on }}>{title}</div>
            <div className="truncate text-xs" style={{ color: on, opacity: 0.75 }}>{subtitle}</div>
          </div>
        </div>
        {footer && <div className="mt-auto pt-3">{footer}</div>}
      </div>
    </div>
  );
}