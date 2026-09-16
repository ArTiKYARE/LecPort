"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Heart, CreditCard, UserRound, ShieldCheck, PenSquare, Building2 } from "lucide-react";
import { useAuth, canEditMaterials } from "@/lib/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/catalog", label: "Каталог", icon: LayoutGrid },
  { href: "/organizations", label: "Продавцы", icon: Building2 },
  { href: "/favorites", label: "Избранное", icon: Heart },
  { href: "/subscription", label: "Подписка", icon: CreditCard },
  { href: "/cabinet", label: "Кабинет", icon: UserRound },
];

/** Левое навигационное меню. Показывается на десктопе (lg+); на малых экранах — нижняя полоса в Header. */
export default function Sidebar() {
  const pathname = usePathname();
  const { user, role } = useAuth();
  const showPanel = user && canEditMaterials(role);
  const isAdmin = role === "admin";

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 flex-col border-r px-3 py-6 lg:flex">
      <nav className="flex w-60 flex-col gap-1">
        <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Меню</p>
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
              isActive(item.href) && "bg-accent text-accent-foreground"
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        ))}

        {showPanel && (
          <>
            <p className="px-3 pb-2 pt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">Управление</p>
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                pathname === "/admin" && "bg-accent text-accent-foreground"
              )}
            >
              {isAdmin ? <ShieldCheck className="size-4" /> : <PenSquare className="size-4" />}
              {isAdmin ? "Администрирование" : "Панель модератора"}
            </Link>
          </>
        )}
      </nav>

      <div className="mt-auto px-3 text-xs text-muted-foreground">
        {showPanel && <p className="mb-1">{isAdmin ? "Админ" : "Модератор"}: {user.name}</p>}
        <p>Лекции · Практики · Лабораторные</p>
      </div>
    </aside>
  );
}