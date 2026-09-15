import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/components/theme-provider";
import Header from "@/components/Header";
import "./globals.css";

export const metadata = {
  metadataBase: new URL(process.env.APP_URL || "https://lecport.kos-ko.ru"),
  title: "LecPort — учебные материалы",
  description: "Лекции, практические и лабораторные работы по предметам. Файлы и Google Диск, доступ по подписке.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        <ThemeProvider>
          <AuthProvider>
            <div className="flex min-h-screen flex-col">
              <Header />
              <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
              <footer className="border-t">
                <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <span>LecPort — платформа учебных материалов</span>
                  <span>Лекции · Практики · Лабораторные · Подписка</span>
                </div>
              </footer>
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
