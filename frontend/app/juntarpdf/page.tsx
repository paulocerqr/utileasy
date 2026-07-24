import type { Metadata } from "next"

import { PdfMergeWorkspace } from "@/components/pdf-merge-workspace"

export const metadata: Metadata = {
  title: "Juntar arquivos PDF — Utileazy",
  description:
    "Organize e una arquivos PDF no navegador, preservando a ordem de todas as páginas.",
}

export default function JuntarPdfPage() {
  return (
    <main className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-background">
      <div aria-hidden="true" className="pdf-docx-image-background" />
      <div className="relative z-10 mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:py-14">
        <header className="mb-10 max-w-3xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-brand-light">
            Ferramentas de arquivos
          </p>
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Juntar arquivos PDF
          </h1>
        </header>

        <PdfMergeWorkspace />
      </div>
    </main>
  )
}
