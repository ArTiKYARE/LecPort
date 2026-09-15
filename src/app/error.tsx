"use client";
import { TriangleAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md py-10">
      <Card>
        <CardContent className="space-y-3 py-10 text-center">
          <TriangleAlert className="mx-auto size-8 text-muted-foreground" />
          <h1 className="text-xl font-bold">Что-то пошло не так</h1>
          <p className="text-sm text-muted-foreground">Попробуйте обновить страницу.</p>
          <Button onClick={reset} className="action-btn">Повторить</Button>
        </CardContent>
      </Card>
    </div>
  );
}
