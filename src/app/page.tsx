import Link from "next/link";
import { BookOpenText, PenLine, FlaskConical, ArrowRight, ShieldCheck, Files, CreditCard, Building2, Users, Crown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const TRACKS = [
  {
    icon: BookOpenText,
    title: "Лекции",
    desc: "Структурированные конспекты и презентации по предметам с оглавлением и терминами.",
  },
  {
    icon: PenLine,
    title: "Практики",
    desc: "Задачи с пошаговым разбором, семинары и контрольные вопросы для самопроверки.",
  },
  {
    icon: FlaskConical,
    title: "Лабораторные",
    desc: "Методички, протоколы измерений и шаблоны отчётов для сдачи без ошибок.",
  },
];

const STEPS = [
  { icon: Building2, title: "1. Найдите сообщество", desc: "Каталог живёт в организациях. Каждая — со своим набором материалов и новостями." },
  { icon: CreditCard, title: "2. Оформите подписку", desc: "Один тариф открывает все файлы и ссылки на Google Диск." },
  { icon: ShieldCheck, title: "3. Учитесь", desc: "Превью доступно гостям, полные файлы — в кабинете после оплаты." },
];

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-2xl border bg-card">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.07] via-transparent to-transparent" />
        <div className="relative grid gap-8 p-8 sm:p-12 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <Badge variant="secondary">Учебная платформа</Badge>
            <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
              Сообщества с материалами, курсами и услугами
            </h1>
            <p className="max-w-xl text-muted-foreground">
              Материалы, курсы и объявления об услугах — всё живёт в сообществах. Присоединяйтесь, вступайте, создавайте свои.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/organizations">
                  Смотреть сообщества
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/subscription">Тарифы подписки</Link>
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 pt-1 text-xs text-muted-foreground">
              <Badge variant="outline">PDF · DOCX · PPTX</Badge>
              <Badge variant="outline">Google Диск</Badge>
              <Badge variant="outline">Превью для гостей</Badge>
            </div>
          </div>
          <Card className="self-center">
            <CardHeader>
              <CardTitle>Как это устроено</CardTitle>
              <CardDescription>Сообщества, роли и подписки</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Building2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div><span className="font-medium">Сообщество</span> — создаётся пользователем с Премиумом. Своя лента, секции, цены.</div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div><span className="font-medium">Участники</span> — владелец назначает роли: автор, модератор, участник.</div>
              </div>
              <div className="flex items-start gap-3">
                <Crown className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div><span className="font-medium">Премиум</span> — даёт возможность создать своё сообщество с платными/бесплатными секциями.</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Разделы контента</h2>
          <p className="text-sm text-muted-foreground">Каждый материал, курс или услуга привязаны к сообществу.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {TRACKS.map((t) => (
            <Card key={t.title}>
              <CardHeader>
                <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <t.icon className="size-5" />
                </span>
                <CardTitle className="pt-2">{t.title}</CardTitle>
                <CardDescription>{t.desc}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/courses">Смотреть курсы <ArrowRight /></Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Как пользоваться</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <Card key={s.title}>
              <CardHeader>
                <s.icon className="size-5 text-muted-foreground" />
                <CardTitle className="text-base">{s.title}</CardTitle>
                <CardDescription>{s.desc}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
