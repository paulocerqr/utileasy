import type { Metadata } from "next"

import { RandomDrawWorkspace } from "@/components/random-draw-workspace"

export const metadata: Metadata = {
  title: "Sorteador de números e itens — Utileazy",
  description:
    "Sorteie números ou itens de uma lista sem repetições e sem enviar seus dados ao servidor.",
}

export default function SorteadorPage() {
  return (
    <main className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-background">
      <div aria-hidden="true" className="pdf-docx-image-background" />
      <div className="relative z-10 mx-auto max-w-[1280px] px-4 py-10 sm:px-6 lg:py-14">
        <header className="mb-10 max-w-3xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-brand-light">
            Produtividade
          </p>
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Sorteador
          </h1>
          <p className="mt-4 text-pretty text-sm leading-6 text-muted-foreground sm:text-base">
            Sorteie números ou itens de uma lista com uma fonte aleatória segura,
            sem repetições e sem enviar seus dados ao servidor.
          </p>
        </header>

        <RandomDrawWorkspace />
      </div>
    </main>
  )
}
