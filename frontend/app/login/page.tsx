import type { Metadata } from "next"
import Link from "next/link"
import { LayoutList } from "lucide-react"

import { LoginForm } from "@/components/login-form"
import { ThemeToggle } from "@/components/theme-toggle"

export const metadata: Metadata = {
  title: "Entrar — Utileazy",
  description: "Acesse sua conta Utileazy.",
}

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div aria-hidden="true" className="login-image-background" />

      <header className="relative z-10 flex h-16 items-center justify-between border-b border-black/15 bg-white/25 px-5 backdrop-blur-md dark:border-white/15 dark:bg-black/25 md:px-8">
        <Link
          href="/"
          aria-label="Voltar para a página inicial do Utileazy"
          className="flex items-center gap-2 rounded-lg outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-brand-light"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md border border-black/15 bg-white/25 dark:border-white/20 dark:bg-black/30">
            <LayoutList className="h-4 w-4 text-brand-light" />
          </span>
          <span className="font-semibold text-foreground dark:text-white">Utileazy</span>
        </Link>
        <ThemeToggle />
      </header>

      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
        <section className="login-card-glass w-full max-w-md rounded-2xl border border-black/15 p-6 shadow-2xl shadow-black/40 dark:border-white/20 md:p-8">
          <div className="mb-8 text-center">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.28em] text-brand-light">
              Bem-vindo de volta
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Entrar no Utileazy
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Acesse suas ferramentas e continue de onde parou.
            </p>
          </div>

          <LoginForm />

          <p className="mt-7 text-center text-xs text-muted-foreground">
            Ainda não possui uma conta?{" "}
            <Link href="#criar-conta" className="font-medium text-brand-light hover:text-foreground">
              Criar conta
            </Link>
          </p>
        </section>
      </div>
    </main>
  )
}
