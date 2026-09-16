"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, Loader2, AtSign } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const err = await register(username.trim(), name.trim(), email.trim(), password);
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
          <CardTitle className="flex items-center gap-2"><UserPlus className="size-5" />Регистрация</CardTitle>
          <CardDescription>Юзернейм — ваш ник на площадке. Имя указывать необязательно.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Юзернейм</Label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="username" required className="pl-9" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ivan_petrov" />
              </div>
              <p className="text-xs text-muted-foreground">Латиница, цифры, «_» и «-», 3–20 символов. Уникальный.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Имя (необязательно)</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Иван" />
              <p className="text-xs text-muted-foreground">Будет показано в кабинете и профилях. Если пусто — покажем юзернейм.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Минимум 6 символов" />
            </div>
            {error && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm">{error}</p>}
            <Button type="submit" className="action-btn w-full" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              Создать аккаунт
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Уже есть аккаунт? <Link href="/login" className="underline">Войти</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}