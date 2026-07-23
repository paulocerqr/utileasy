import type { Metadata } from "next"

import { GroupDividerWorkspace } from "@/components/group-divider-workspace"

export const metadata: Metadata = {
  title: "Divisor de grupos — Utileazy",
  description:
    "Divida participantes aleatoriamente em grupos equilibrados sem enviar os nomes ao servidor.",
}

export default function DivisorDeGruposPage() {
  return (
    <main className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-background">
      <div aria-hidden="true" className="pdf-docx-image-background" />
      <div className="relative z-10 mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:py-14">
        <header className="mb-10 max-w-3xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-brand-light">
            Produtividade
          </p>
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Divisor de grupos
          </h1>
          <p className="mt-4 text-pretty text-sm leading-6 text-muted-foreground sm:text-base">
            Distribua participantes aleatoriamente por quantidade de grupos ou
            tamanho máximo, mantendo as equipes equilibradas.
          </p>
        </header>

        <GroupDividerWorkspace />
      </div>
    </main>
  )
}
