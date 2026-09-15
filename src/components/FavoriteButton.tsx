"use client";
import { Heart } from "lucide-react";
import { useFavorites } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function FavoriteButton({
  materialId,
  title,
  className,
}: {
  materialId: string;
  title?: string;
  className?: string;
}) {
  const { isFavorite, toggleFavorite, ready } = useFavorites();
  const fav = isFavorite(materialId);

  return (
    <Button
      variant={fav ? "secondary" : "outline"}
      size="sm"
      disabled={!ready}
      onClick={() => toggleFavorite(materialId)}
      title={title ?? (fav ? "Убрать из избранного" : "В избранное")}
      aria-pressed={fav}
      aria-label={fav ? "Убрать из избранного" : "Добавить в избранное"}
      className={cn("action-btn", className)}
    >
      {/* key заставляет иконку переигрывать pop-анимацию при каждом переключении */}
      <Heart
        key={String(fav)}
        className={cn("animate-heart-pop", fav && "fill-current")}
      />
      <span className="hidden sm:inline">{fav ? "В избранном" : "В избранное"}</span>
    </Button>
  );
}
