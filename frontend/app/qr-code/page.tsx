import type { Metadata } from "next"

import { QrCodeGenerator } from "@/components/qr-code-generator"

export const metadata: Metadata = {
  title: "Gerador de QR Code — Utileazy",
  description:
    "Crie QR Codes para links e redes Wi-Fi diretamente no navegador.",
}

export default function QrCodePage() {
  return (
    <main className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-background">
      <div aria-hidden="true" className="pdf-docx-image-background" />
      <div className="relative z-10 mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:py-14">
        <header className="mb-10 max-w-3xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-brand-light">
            Produtividade
          </p>
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Gerador de QR Code
          </h1>
          <p className="mt-4 text-pretty text-sm leading-6 text-muted-foreground sm:text-base">
            Transforme links e dados de redes Wi-Fi em QR Codes prontos para
            compartilhar, sem enviar seus dados ao servidor.
          </p>
        </header>

        <QrCodeGenerator />
      </div>
    </main>
  )
}
