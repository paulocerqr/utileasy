import type { Metadata } from "next"

import { PdfDocxConverter } from "@/components/pdf-docx-converter"

export const metadata: Metadata = {
  title: "Conversão PDF ↔ DOCX — Utileazy",
  description: "Simule a conversão de documentos PDF e DOCX em uma interface segura e intuitiva.",
}

export default function PdfDocxPage() {
  return (
    <main className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-background">
      <div aria-hidden="true" className="pdf-docx-image-background" />
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        <header className="mb-10">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-brand-light">Ferramentas de arquivos</p>
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">PDF <span className="text-muted-foreground">↔</span> DOCX</h1>
          <p className="mt-4 max-w-3xl text-pretty text-sm leading-6 text-muted-foreground sm:text-base">Converta seus documentos com fluidez enquanto preserva a estrutura. Esta versão demonstra todo o fluxo sem enviar ou transformar o arquivo real.</p>
        </header>
        <PdfDocxConverter />
      </div>
    </main>
  )
}
