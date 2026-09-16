import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-10">
      <Card>
        <CardContent className="space-y-3 py-10 text-center">
          <FileQuestion className="mx-auto size-8 text-muted-foreground" />
          <h1 className="text-xl font-bold">Страница не найдена</h1>
          <p className="text-sm text-muted-foreground">Такой страницы нет или она была перемещена.</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild><Link href="/organizations">К сообществам</Link></Button>
            <Button asChild variant="outline"><Link href="/">На главную</Link></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
