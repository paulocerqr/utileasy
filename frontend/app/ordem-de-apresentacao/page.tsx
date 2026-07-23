import type { Metadata } from "next"

import { PresentationOrderWorkspace } from "@/components/presentation-order-workspace"

export const metadata: Metadata = {
  title: "Ordem de apresentação — Utileazy",
  description:
    "Sorteie uma ordem numerada para participantes ou equipes sem enviar os nomes ao servidor.",
}

export default function OrdemDeApresentacaoPage() {
  return (
    <main className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-background">
      <div aria-hidden="true" className="pdf-docx-image-background" />
      <div className="relative z-10 mx-auto max-w-[1280px] px-4 py-10 sm:px-6 lg:py-14">
        <header className="mb-10 max-w-3xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-brand-light">
            Produtividade
          </p>
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Ordem de apresentação
          </h1>
          <p className="mt-4 text-pretty text-sm leading-6 text-muted-foreground sm:text-base">
            Adicione participantes ou equipes e gere uma ordem aleatória numerada,
            sem repetições e sem enviar os nomes ao servidor.
          </p>
        </header>

        <PresentationOrderWorkspace />
      </div>
    </main>
  )
}
