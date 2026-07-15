import {
  KeyRound,
  Gauge,
  Terminal,
  MonitorDown,
  DownloadCloud,
  GitCompare,
  GitBranch,
  Box,
  Database,
  Code2,
} from "lucide-react"
import { SectionHeader } from "./section-header"
import { ToolCard } from "./tool-card"

const devTools = [
  {
    icon: KeyRound,
    title: "Decodificador JWT",
    description:
      "Inspecione o payload de tokens JSON Web com segurança.",
  },
  {
    icon: Gauge,
    title: "Teste de velocidade",
    description: "Verifique a latência e a velocidade da sua conexão.",
  },
  {
    icon: Terminal,
    title: "Dicas de Linux",
    description:
      "Comandos, atalhos e boas práticas para o dia a dia no terminal.",
  },
  {
    icon: MonitorDown,
    title: "Distribuições Linux",
    description:
      "Panorama das principais distros e para quem cada uma serve.",
  },
  {
    icon: DownloadCloud,
    title: "Onde baixar Linux",
    description:
      "Fontes oficiais e seguras para baixar sua distribuição favorita.",
  },
  {
    icon: GitCompare,
    title: "Comparar distros",
    description: "Compare distribuições Linux lado a lado.",
  },
  {
    icon: GitBranch,
    title: "Dicas de Git",
    description:
      "Fluxos, comandos essenciais e boas práticas com Git.",
  },
  {
    icon: Box,
    title: "Dicas de Docker",
    description: "Containers, imagens e comandos úteis do Docker.",
  },
  {
    icon: Database,
    title: "Dicas de Banco de Dados",
    description: "SQL, modelagem e performance para o dia a dia.",
  },
]

export function DevSection() {
  return (
    <section id="devs" className="relative z-10 mx-auto max-w-7xl px-6 py-10">
        <div className="rounded-2xl border border-border bg-card/40 p-6 backdrop-blur-md md:p-8">
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-secondary">
            <Code2 className="h-5 w-5 text-brand-light" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            Para Desenvolvedores
          </h2>
        </div>
        <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
          Utilitários e conteúdos rápidos pensados para quem está aprendendo ou
          já vive no terminal.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {devTools.map((tool) => (
            <ToolCard
              key={tool.title}
              icon={tool.icon}
              title={tool.title}
              description={tool.description}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
