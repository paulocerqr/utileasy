import { UploadArea } from "@/components/transcricao/upload-area"
import { Zap, ShieldCheck } from "lucide-react"

export const metadata = {
  title: "Transcrição de Áudio e Vídeo — Utileazy",
  description:
    "Envie arquivos de áudio ou vídeo e gere transcrições automáticas com boa precisão.",
}

export default function TranscricaoPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div aria-hidden="true" className="transcricao-image-background" />
      <main className="relative z-10 flex flex-1 flex-col items-center px-4 pb-20 pt-12">
        {/* Hero title */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Transcrição de Áudio e Vídeo
          </h1>
          <p className="flex max-w-2xl items-center justify-center gap-1.5 rounded-2xl border border-border bg-card/90 px-4 py-2 text-sm font-medium text-foreground shadow-lg shadow-black/10 backdrop-blur-sm">
            <Zap className="h-4 w-4" />
            Envie arquivos e gere transcrições automáticas com boa precisão
          </p>
        </div>

        {/* Feature pills */}
        <div className="mb-10 flex flex-wrap justify-center gap-3">
          <span className="flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-brand-light">
            <Zap className="h-3.5 w-3.5" />
            Rápido
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-brand-light">
            <ShieldCheck className="h-3.5 w-3.5" />
            Seguro
          </span>
        </div>

        {/* Upload area */}
        <div className="w-full max-w-3xl">
          <UploadArea />
        </div>

        {/* Info footer */}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Tamanho máximo: 500 MB &mdash; O arquivo é removido após o processamento; a transcrição permanece salva.
        </p>
      </main>
    </div>
  )
}
