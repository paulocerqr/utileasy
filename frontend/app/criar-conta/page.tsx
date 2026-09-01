import type { Metadata } from "next"
import Link from "next/link"
import { RegisterForm } from "@/components/register-form"

export const metadata: Metadata = {
  title: "Criar conta — Utileazy",
  description: "Crie sua conta Utileazy.",
}

export default function RegisterPage() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div aria-hidden="true" className="login-image-background" />

      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
        <section className="login-card-glass w-full max-w-md rounded-2xl border border-black/15 p-6 shadow-2xl shadow-black/40 dark:border-white/20 md:p-8">
          <div className="mb-8 text-center">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.28em] text-brand-light">
              Comece agora
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Criar conta no Utileazy
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Salve seus resultados e acesse suas ferramentas em um só lugar.
            </p>
          </div>

          <RegisterForm />

          <p className="mt-7 text-center text-xs text-muted-foreground">
            Já tem uma conta?{" "}
            <Link href="/login" className="font-medium text-brand-light hover:text-foreground">
              Entrar
            </Link>
          </p>
        </section>
      </div>
    </main>
  )
}
