import { Navbar } from "@/components/navbar"
import { UploadArea } from "@/components/transcricao/upload-area"
import { History, BookOpen, Zap, ShieldCheck, Users } from "lucide-react"

export const metadata = {
  title: "Transcrição de Áudio e Vídeo — Utileazy",
  description:
    "Envie arquivos de áudio ou vídeo e gere transcrições automáticas com boa precisão.",
}

export default function TranscricaoPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex flex-1 flex-col items-center px-4 pb-20 pt-12">
        {/* Top action buttons */}
        <div className="mb-10 flex w-full max-w-3xl justify-end gap-3">
          <button className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <History className="h-4 w-4" />
            Histórico
          </button>
          <button className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <BookOpen className="h-4 w-4" />
            Guia de Uso
          </button>
        </div>

        {/* Hero title */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Transcrição de Áudio e Vídeo
          </h1>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
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
          <span className="flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-brand-light">
            <Users className="h-3.5 w-3.5" />
            Multi-speaker
          </span>
        </div>

        {/* Upload area */}
        <div className="w-full max-w-3xl">
          <UploadArea />
        </div>

        {/* Info footer */}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Tamanho máximo por arquivo: 500 MB &mdash; Os arquivos são processados com segurança e não são armazenados.
        </p>
      </main>
    </div>
  )
}