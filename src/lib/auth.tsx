"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Role = "guest" | "buyer" | "moderator" | "admin";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Exclude<Role, "guest">;
  hasSubscription: boolean;
  subscriptionPlan?: string;
};

type AuthState = {
  user: SessionUser | null;
  role: Role;
  hasSubscription: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  register: (name: string, email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  buySubscription: (plan?: string) => Promise<string | null>;
  confirmPayment: () => Promise<boolean>;
  cancelSubscription: () => Promise<void>;
};

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (!res.ok) {
        setUser(null);
        return;
      }
      const j = await res.json();
      setUser(j.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return (j.error as string) || "Ошибка входа";
    setUser(j.user);
    return null;
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return (j.error as string) || "Ошибка регистрации";
    setUser(j.user);
    return null;
  };

  const logout = async () => {
    await fetch("/api/auth/me", { method: "DELETE" });
    setUser(null);
  };

  const buySubscription = async (plan = "month"): Promise<string | null> => {
    const res = await fetch("/api/subscription/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return (j.error as string) || "Не удалось создать платёж";
    if (j.demo && j.user) {
      setUser(j.user);
      return null;
    }
    if (j.confirmationUrl) {
      window.location.href = j.confirmationUrl as string;
      return null;
    }
    return "Касса не вернула ссылку на оплату";
  };

  const confirmPayment = async (): Promise<boolean> => {
    const res = await fetch("/api/subscription/confirm", { method: "POST" });
    const j = await res.json().catch(() => ({}));
    if (res.ok && j.user) setUser(j.user);
    return Boolean(j.activated);
  };

  const cancelSubscription = async () => {
    const res = await fetch("/api/subscription", { method: "DELETE" });
    const j = await res.json().catch(() => ({}));
    if (res.ok) setUser(j.user);
  };

  const role: Role = user ? user.role : "guest";
  const hasSubscription = user?.hasSubscription ?? false;

  return (
    <AuthCtx.Provider
      value={{ user, role, hasSubscription, loading, login, register, logout, refresh, buySubscription, confirmPayment, cancelSubscription }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function canAccessFull(role: Role, hasSubscription: boolean) {
  if (role === "admin" || role === "moderator") return true;
  if (role === "buyer" && hasSubscription) return true;
  return false;
}

export function canEditMaterials(role: Role) {
  return role === "admin" || role === "moderator";
}

export function canManageUsers(role: Role) {
  return role === "admin";
}

export const ROLE_LABELS: Record<Role, string> = {
  guest: "Гость",
  buyer: "Покупатель",
  moderator: "Модератор",
  admin: "Администратор",
};
