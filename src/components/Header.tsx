"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpenCheck, LayoutGrid, CreditCard, UserRound, ShieldCheck, LogOut, PenSquare, Heart } from "lucide-react";
import { useAuth, ROLE_LABELS, canEditMaterials } from "@/lib/auth";
import { planName } from "@/lib/plans";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/catalog", label: "Каталог", icon: LayoutGrid },
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

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                  active && "bg-accent text-accent-foreground"
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
          {showPanel && (
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                pathname === "/admin" && "bg-accent text-accent-foreground"
              )}
            >
              {isAdmin ? <ShieldCheck className="size-4" /> : <PenSquare className="size-4" />}
              {panelLabel}
            </Link>
          )}
        </nav>

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
                <Link href="/login">Войти</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">Регистрация</Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="border-t md:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 py-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground",
                pathname.startsWith(item.href) && "bg-accent text-accent-foreground"
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
          {showPanel && (
            <Link href="/admin" className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground">
              {isAdmin ? <ShieldCheck className="size-4" /> : <PenSquare className="size-4" />}
              {panelLabel}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
