"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeCheck, Building2, ArrowRight, Users, Crown, Plus, Lock, Unlock, Loader2, X } from "lucide-react";
import { useCatalog } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/toast";

export default function OrganizationsPage() {
  const { organizations, materials, courses, services, loading, orgMutate } = useCatalog();
  const { user, isPremium } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [cName, setCName] = useState("");
  const [cDesc, setCDesc] = useState("");
  const [cMembership, setCMembership] = useState<"open" | "request">("open");
  const [cBusy, setCBusy] = useState(false);

  const orgStats = useMemo(() => {
    const matCounts = new Map<string, number>();
    const courseCounts = new Map<string, number>();
    const serviceCounts = new Map<string, number>();
    for (const m of materials) {
      if (m.organizationId) matCounts.set(m.organizationId, (matCounts.get(m.organizationId) ?? 0) + 1);
    }
    for (const c of courses) {
      if (c.organizationId) courseCounts.set(c.organizationId, (courseCounts.get(c.organizationId) ?? 0) + 1);
    }
    for (const s of services) {
      if (s.organizationId) serviceCounts.set(s.organizationId, (serviceCounts.get(s.organizationId) ?? 0) + 1);
    }
    return organizations
      .map((o) => ({
        ...o,
        matCount: matCounts.get(o.id) ?? 0,
        courseCount: courseCounts.get(o.id) ?? 0,
        serviceCount: serviceCounts.get(o.id) ?? 0,
        subjectCount: new Set(materials.filter((m) => m.organizationId === o.id).map((m) => m.subjectId)).size,
      }))
      .sort((a, b) => b.matCount + b.courseCount + b.serviceCount - (a.matCount + a.courseCount + a.serviceCount) || a.name.localeCompare(b.name, "ru"));
  }, [organizations, materials, courses, services]);

  const myOrgs = useMemo(() => {
    if (!user) return [];
    return orgStats.filter((o) => o.ownerId === user.id);
  }, [orgStats, user]);

  const submitCreate = async () => {
    const name = cName.trim();
    if (!name) {
      toast.error("Укажите название сообщества");
      return;
    }
    setCBusy(true);
    const snap = await orgMutate("addOrganization", { name, description: cDesc.trim(), membership: cMembership });
    setCBusy(false);
    if (!snap) {
      toast.error("Не удалось создать сообщество. Нужен Премиум?");
      return;
    }
    toast.success("Сообщество создано");
    setShowCreate(false);
    setCName(""); setCDesc(""); setCMembership("open");
    router.push(`/organization/${snap.organizations[0].id}`);
  };

  if (loading) {
    return (
      <Card><CardContent className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Building2 className="size-4 animate-pulse" />Загрузка сообществ...</CardContent></Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Сообщества</h1>
        <p className="text-sm text-muted-foreground">
          Каждое сообщество — отдельный каталог с материалами, курсами, услугами и новостями.
        </p>
      </div>

      {user && isPremium && !showCreate && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col gap-2 py-8 text-center sm:flex-row sm:items-center sm:justify-center sm:text-left">
            <Crown className="mx-auto size-7 shrink-0 text-amber-500 sm:mx-0" />
            <div className="space-y-0.5">
              <p className="text-sm font-medium">У вас есть Премиум — создайте своё сообщество</p>
              <p className="text-xs text-muted-foreground">Платные и бесплатные секции, новости, роли для участников.</p>
            </div>
            <Button size="sm" className="action-btn sm:ml-3" onClick={() => setShowCreate(true)}>
              <Plus />Создать
            </Button>
          </CardContent>
        </Card>
      )}

      {user && isPremium && showCreate && (
        <Card>
          <CardContent className="space-y-3 py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base"><Crown className="size-4 text-amber-500" />Новое сообщество</CardTitle>
              <Button size="sm" variant="ghost" className="action-btn" onClick={() => setShowCreate(false)}><X /></Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="orgname">Название</Label>
                <Input id="orgname" value={cName} onChange={(e) => setCName(e.target.value)} placeholder="Репетиторский клуб" autoFocus />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orgdesc">Описание</Label>
                <Input id="orgdesc" value={cDesc} onChange={(e) => setCDesc(e.target.value)} placeholder="О чём сообщество" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Правила вступления</Label>
              <div className="flex flex-wrap gap-2">
                <Badge variant={cMembership === "open" ? "default" : "secondary"} className="cursor-pointer" onClick={() => setCMembership("open")}>
                  <Unlock className="size-3" />Открытое — все вступают сами
                </Badge>
                <Badge variant={cMembership === "request" ? "default" : "secondary"} className="cursor-pointer" onClick={() => setCMembership("request")}>
                  <Lock className="size-3" />По заявке — вы одобряете
                </Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="action-btn" disabled={cBusy} onClick={submitCreate}>
                {cBusy && <Loader2 className="animate-spin" />}Создать сообщество
              </Button>
              <Button size="sm" variant="ghost" className="action-btn" onClick={() => setShowCreate(false)}>Отмена</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {user && !isPremium && !user.premiumUntil && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <Crown className="size-8 text-amber-500" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Хотите создать своё сообщество?</p>
              <p className="text-xs text-muted-foreground">Для этого нужна подписка Премиум. Создатель получает полное управление.</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/subscription">Смотреть тарифы</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {myOrgs.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Ваши сообщества</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myOrgs.map((o) => (
              <OrgCard key={o.id} org={o} isOwner />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Все сообщества ({orgStats.length})</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orgStats.map((o) => (
            <OrgCard key={o.id} org={o} />
          ))}
        </div>
        {orgStats.length === 0 && (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Сообществ пока нет — будьте первыми.</CardContent></Card>
        )}
      </section>
    </div>
  );
}

function OrgCard({ org, isOwner }: { org: { id: string; name: string; description?: string; avatar?: string; verified?: boolean; membership: string; members?: { userId: string; role: string }[]; sections?: any[]; ownerId?: string; matCount: number; courseCount: number; serviceCount: number; subjectCount: number }; isOwner?: boolean }) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary overflow-hidden">
          {org.avatar ? (
            <img src={org.avatar} alt="" className="size-10 object-cover" />
          ) : (
            <span className="text-lg font-semibold">{org.name.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-1.5 text-base">
            <span className="truncate">{org.name}</span>
            {org.verified && <BadgeCheck className="size-4 shrink-0 text-sky-500" />}
            {isOwner && <Badge variant="price" className="ml-1">Вы</Badge>}
          </CardTitle>
          <CardDescription className="truncate">
            {org.membership === "request" ? <Lock className="inline size-3 mr-1" /> : <Unlock className="inline size-3 mr-1" />}
            {org.membership === "request" ? "Вступление по заявке" : "Открытое"}
            {" · "}
            {(org.members?.length ?? 0)} участн.
          </CardDescription>
        </div>
      </CardHeader>
      {org.description && <CardDescription className="px-6 pb-2 text-sm text-muted-foreground line-clamp-2">{org.description}</CardDescription>}
      <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{org.matCount} мат. {org.courseCount > 0 && `· ${org.courseCount} курс. `}{org.serviceCount > 0 && `· ${org.serviceCount} усл.`}</span>
        {org.sections && org.sections.length > 0 && <Badge variant="secondary" className="gap-1"><Users className="size-3" />{org.sections.length} секц.</Badge>}
        <Link href={`/organization/${org.id}`} className="action-btn ml-auto inline-flex items-center gap-1 rounded-md px-3 py-1.5 font-medium">
          Открыть <ArrowRight className="size-4" />
        </Link>
      </CardContent>
    </Card>
  );
}