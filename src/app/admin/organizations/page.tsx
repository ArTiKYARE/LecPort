"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Building2, Pencil, Check, X, Loader2, ShieldCheck, Trash2, BadgeCheck, Users, Newspaper, Lock, Unlock } from "lucide-react";
import { type Organization } from "@/lib/types";
import { useCatalog } from "@/lib/store";
import { useAuth, canEditMaterials, ROLE_LABELS } from "@/lib/auth";
import { logClient } from "@/lib/audit-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/toast";

export default function AdminOrganizationsPage() {
  const { user, role, loading } = useAuth();
  const canEdit = role ? canEditMaterials(role) : false;

  if (loading) {
    return (
      <Card><CardContent className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Проверка доступа...</CardContent></Card>
    );
  }

  if (!user || !canEdit) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5" />Нет доступа</CardTitle>
          <CardDescription>Требуется вход модератора или администратора.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Button asChild><Link href="/login">Войти</Link></Button>
          <Button asChild variant="ghost"><Link href="/admin">Вернуться в админку</Link></Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="action-btn shrink-0">
          <Link href="/admin"><ArrowLeft className="size-4" />К панели модерации</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Сообщества</h1>
          <p className="text-sm text-muted-foreground">Комьюнити пользователей. Создатели (Премиум) управляют ролями, секциями и ценами.</p>
        </div>
        <Badge variant="secondary" className="ml-auto">{ROLE_LABELS[role]}: {user.name}</Badge>
      </div>

      <OrganizationsManager />
    </div>
  );
}

function OrganizationsManager() {
  const { organizations, materials, addOrganization, updateOrganization, deleteOrganization } = useCatalog();
  const toast = useToast();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [descDraft, setDescDraft] = useState("");

  const countFor = (id: string) => materials.filter((m) => m.organizationId === id).length;

  const createOrg = async () => {
    const v = newName.trim();
    if (!v) return;
    const created = await addOrganization(v);
    setNewName("");
    if (!created) {
      toast.error("Не удалось создать организацию");
      return;
    }
    setEditingId(created.id);
    setNameDraft(created.name);
    setDescDraft(created.description ?? "");
    logClient("org_create", `Создана организация: ${created.name}`);
    toast.success(`Организация «${created.name}» создана`);
  };

  const saveOrg = async (org: Organization) => {
    const v = nameDraft.trim();
    if (!v) {
      setEditingId(null);
      return;
    }
    await updateOrganization(org.id, { name: v, description: descDraft.trim() || undefined, verified: org.verified });
    logClient("org_update", `Организация «${org.name}» обновлена`);
    setEditingId(null);
    toast.success(`Организация обновлена: ${v}`);
  };

  const removeOrg = async (org: Organization) => {
    const n = countFor(org.id);
    if (n > 0 && !window.confirm(`У организации «${org.name}» есть материалы (${n}). Удалить организацию? Материалы останутся в каталоге без привязки.`)) return;
    await deleteOrganization(org.id);
    logClient("org_delete", `Удалена организация: ${org.name}`);
    toast.success(`Организация «${org.name}» удалена`);
  };

  const toggleVerified = async (org: Organization) => {
    await updateOrganization(org.id, { verified: !org.verified, name: org.name, description: org.description });
    toast.success(`Организация «${org.name}»: ${org.verified ? "значок снят" : "отмечена как проверенная"}`);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Building2 className="size-4" />Организации</CardTitle>
          <CardDescription>Создание и редактирование продавцов. Новые создаются сразу в режиме редактирования.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Название организации" onKeyDown={(e) => { if (e.key === "Enter") createOrg(); }} />
            <Button variant="outline" className="action-btn" onClick={createOrg}>Добавить</Button>
          </div>
          {organizations.map((org) => (
            <div key={org.id} className={`overflow-hidden rounded-lg border px-3 py-2.5 ${editingId === org.id ? "border-primary" : ""}`}>
              {editingId === org.id ? (
                <div className="space-y-2">
                  <Input autoFocus value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveOrg(org); if (e.key === "Escape") setEditingId(null); }} className="h-8" />
                  <Input value={descDraft} onChange={(e) => setDescDraft(e.target.value)} placeholder="Описание организации" className="h-8" />
                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" className="action-btn" onClick={() => saveOrg(org)}><Check />Сохранить</Button>
                    <Button size="sm" variant="ghost" className="action-btn" onClick={() => setEditingId(null)}><X />Отмена</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    {org.verified ? <BadgeCheck className="size-4 shrink-0 text-sky-500" /> : <Building2 className="size-4 shrink-0 text-muted-foreground" />}
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{org.name}</span>
                    <Badge variant="secondary" className="shrink-0 gap-1">
                      {org.membership === "request" ? <Lock className="size-3" /> : <Unlock className="size-3" />}
                      {(org.members?.length ?? 0) + 1} участн.
                    </Badge>
                    {(org.sections?.length ?? 0) > 0 && <Badge variant="outline" className="shrink-0">{org.sections!.length} секц.</Badge>}
                    {(org.news?.length ?? 0) > 0 && <Badge variant="outline" className="shrink-0"><Newspaper className="size-3" /></Badge>}
                    <Badge variant="secondary" className="shrink-0">{countFor(org.id)} мат.</Badge>
                  </div>
                  {org.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{org.description}</p>}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Button size="sm" variant="outline" className="action-btn" onClick={() => { setEditingId(org.id); setNameDraft(org.name); setDescDraft(org.description ?? ""); }}>
                      <Pencil />Редактировать
                    </Button>
                    <Button size="sm" variant="outline" className="action-btn" onClick={() => toggleVerified(org)}>
                      <BadgeCheck />{org.verified ? "Снять значок" : "Отметить проверенной"}
                    </Button>
                    <Button size="sm" variant="ghost" className="action-btn" onClick={() => removeOrg(org)}><Trash2 /></Button>
                  </div>
                </>
              )}
            </div>
          ))}
          {organizations.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Организаций пока нет.</p>}
        </CardContent>
      </Card>

      <Card className="flex h-[280px] items-center justify-center text-sm text-muted-foreground xl:h-auto">
        <div className="max-w-sm space-y-2 p-6 text-center">
          <Building2 className="mx-auto size-8 opacity-40" />
          <p>
            Сообщество — это комьюнити с новостной лентой, секциями каталога (платные и бесплатные) и участниками с ролями.
            Создатель — Премиум-пользователь. Назначайте модераторов и авторов для управления контентом.
          </p>
        </div>
      </Card>
    </div>
  );
}