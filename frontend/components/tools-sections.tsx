import {
  FileText,
  FilePlus2,
  ImageIcon,
  Mic,
  Shuffle,
  ListOrdered,
  Users,
  QrCode,
  File,
} from "lucide-react"
import { SectionHeader } from "./section-header"
import { ToolCard, ToolCardWide } from "./tool-card"

export function FileToolsSection() {
  return (
    <section id="ferramentas" className="relative z-10 mx-auto max-w-7xl px-6 py-10">
      <SectionHeader icon={File} title="Ferramentas de Arquivos" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ToolCard
          icon={FileText}
          title="Conversão PDF ↔ DOCX"
          description="Converta documentos entre PDF e Word preservando o layout quando possível."
          href="/pdf-docx"
        />
        <ToolCard
          icon={FilePlus2}
          title="Juntar PDFs"
          description="Combine vários arquivos PDF em um único documento."
          href="/juntarpdf"
        />
        <ToolCard
          icon={ImageIcon}
          title="Imagens para PDF"
          description="Transforme fotos e capturas de tela em um documento PDF organizado."
          href="/imagens-para-pdf"
        />
      </div>
    </section>
  )
}

export function MediaSection() {
  return (
    <section className="relative z-10 mx-auto max-w-7xl px-6 py-10">
      <SectionHeader
        icon={FileText}
        title="Mídia & Vídeo"
        iconColor="text-brand-light"
        iconBg="bg-secondary"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <ToolCardWide
          icon={Mic}
          title="Transcrição de áudio e vídeo"
          description="Envie arquivos e gere transcrições automáticas com boa precisão."
          href="/transcrisao"
        />
      </div>
    </section>
  )
}

export function ProductivitySection() {
  return (
    <section id="produtividade" className="relative z-10 mx-auto max-w-7xl scroll-mt-24 px-6 py-10">
      <SectionHeader
        icon={FileText}
        title="Produtividade"
        iconColor="text-brand-light"
        iconBg="bg-secondary"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ToolCard
          icon={Shuffle}
          title="Sorteador"
          description="Sorteie números ou itens de uma lista sem repetições."
          href="/sorteador"
        />
        <ToolCard
          icon={ListOrdered}
          title="Ordem de apresentação"
          description="Organize a ordem de apresentações em equipe rapidamente."
          href="/ordem-de-apresentacao"
        />
        <ToolCard
          icon={Users}
          title="Divisor de grupos"
          description="Separe pessoas em equipes equilibradas em poucos cliques."
          href="/divisor-de-grupos"
        />
        <ToolCard
          icon={QrCode}
          title="Gerador de QR Code"
          description="Crie QR codes para links e acesso a redes Wi-Fi."
          href="/qr-code"
        />
      </div>
    </section>
  )
}
