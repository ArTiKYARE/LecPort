"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpenCheck, LayoutGrid, CreditCard, UserRound, ShieldCheck, LogOut, PenSquare, Heart, LogIn, UserPlus, Building2 } from "lucide-react";
import { useAuth, ROLE_LABELS, canEditMaterials } from "@/lib/auth";
import { planName } from "@/lib/plans";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/catalog", label: "Каталог", icon: LayoutGrid },
  { href: "/organizations", label: "Продавцы", icon: Building2 },
  { href: "/favorites", label: "Избранное", icon: Heart },
  { href: "/subscription", label: "Подписка", icon: CreditCard },
  { href: "/cabinet", label: "Кабинет", icon: UserRound },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, hasSubscription, logout } = useAuth();
  const showPanel = user && canEditMaterials(role);
  const isAdmin = role === "admin";

  const handleLogout = async () => {
    await logout();
    router.push("/");
    router.refresh();
  };

  const panelLabel = isAdmin ? "Админ" : "Панель";

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BookOpenCheck className="size-4" />
          </span>
          <span className="text-lg">LecPort</span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          {hasSubscription && (
            <Badge variant="success" className="hidden sm:inline-flex">Тариф «{planName(user?.subscriptionPlan)}»</Badge>
          )}
          <ThemeToggle />
          {user ? (
            <div className="flex items-center gap-2">
              <div className="hidden text-right leading-tight sm:block">
                <div className="text-sm font-medium">{user.name}</div>
                <div className="text-xs text-muted-foreground">{ROLE_LABELS[role]}</div>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout} className="action-btn">
                <LogOut />
                <span className="hidden sm:inline">Выйти</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login" aria-label="Войти">
                  <LogIn className="sm:hidden" />
                  <span className="hidden sm:inline">Войти</span>
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register" aria-label="Регистрация">
                  <UserPlus className="sm:hidden" />
                  <span className="hidden sm:inline">Регистрация</span>
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="border-t lg:hidden">
        <div className="no-scrollbar mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 py-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-muted-foreground",
                pathname.startsWith(item.href) && "bg-accent text-accent-foreground"
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
          {showPanel && (
            <Link href="/admin" className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-muted-foreground">
              {isAdmin ? <ShieldCheck className="size-4" /> : <PenSquare className="size-4" />}
              {panelLabel}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
