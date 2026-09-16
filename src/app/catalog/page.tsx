"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Глобальный каталог убран — все материалы теперь живут в сообществах. */
export default function CatalogRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/organizations");
  }, [router]);
  return null;
}
