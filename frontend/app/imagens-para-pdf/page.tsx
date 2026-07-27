import type { Metadata } from "next"

import { ImageToPdfWorkspace } from "@/components/image-to-pdf-workspace"

export const metadata: Metadata = {
  title: "Imagens para PDF — Utileazy",
  description:
    "Organize imagens JPEG, PNG e WebP e transforme-as em um único PDF diretamente no navegador.",
}

export default function ImagensParaPdfPage() {
  return (
    <main className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-background">
      <div aria-hidden="true" className="pdf-docx-image-background" />
      <div className="relative z-10 mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:py-14">
        <header className="mb-10 max-w-3xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-brand-light">
            Ferramentas de arquivos
          </p>
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Imagens para PDF
          </h1>
          <p className="mt-4 text-pretty text-sm leading-6 text-muted-foreground sm:text-base">
            Organize suas imagens, configure as páginas e gere um PDF sem
            enviar os arquivos ao servidor.
          </p>
        </header>

        <ImageToPdfWorkspace />
      </div>
    </main>
  )
}
