"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const err = await login(email.trim(), password);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    router.push("/cabinet");
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><LogIn className="size-5" />Вход в LecPort</CardTitle>
          <CardDescription>Доступ к файлам, подписке и личному кабинету.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            {error && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm">{error}</p>}
            <Button type="submit" className="action-btn w-full" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              Войти
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Нет аккаунта? <Link href="/register" className="underline">Зарегистрироваться</Link>
            </p>
            {process.env.NODE_ENV !== "production" && (
              <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                Демо-админ: admin@lecport.local / admin123
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
