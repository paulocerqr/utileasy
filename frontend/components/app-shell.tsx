"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  AudioLines,
  Braces,
  ChevronLeft,
  ChevronRight,
  FileArchive,
  FolderOpen,
  Gauge,
  LayoutGrid,
  Menu,
  PanelLeftOpen,
  Settings,
  X,
} from "lucide-react"

import { ThemeToggle } from "@/components/theme-toggle"

const domains = [
  {
    label: "Arquivos",
    icon: FileArchive,
    tools: [
      { label: "Conversão PDF ↔ DOCX", href: "/pdf-docx" },
      { label: "Juntar e separar PDFs", href: "/#ferramentas" },
      { label: "Imagens para PDF", href: "/#ferramentas" },
    ],
  },
  {
    label: "Mídia",
    icon: AudioLines,
    tools: [
      { label: "Transcrição de mídia", href: "/transcrisao" },
      { label: "Removedor de fundo", href: "/#ferramentas" },
      { label: "Editor de imagens", href: "/#ferramentas" },
    ],
  },
  {
    label: "Produtividade",
    icon: Gauge,
    tools: [
      { label: "Bloco de notas", href: "/#produtividade" },
      { label: "Lista de tarefas", href: "/#produtividade" },
      { label: "Pomodoro", href: "/#produtividade" },
    ],
  },
  {
    label: "Devs",
    icon: Braces,
    tools: [
      { label: "Decodificador JWT", href: "/#devs" },
      { label: "Dicas de Linux", href: "/#devs" },
      { label: "Dicas de Git", href: "/#devs" },
    ],
  },
]

function isToolActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  if (href.startsWith("/#")) return false
  return pathname.startsWith(href)
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [expandedFolders, setExpandedFolders] = useState<string[]>(["Arquivos", "Mídia"])

  function toggleFolder(label: string) {
    setExpandedFolders((current) =>
      current.includes(label) ? current.filter((item) => item !== label) : [...current, label],
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center border-b border-border bg-background/90 px-4 backdrop-blur-xl md:px-6">
        <Link href="/" className="flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-light">
          <span className="flex size-8 items-center justify-center rounded-md border border-border bg-secondary">
            <LayoutGrid className="size-4 text-brand-light" aria-hidden="true" />
          </span>
          <span className="text-xl font-bold tracking-tight">Utileazy</span>
        </Link>

        <nav aria-label="Navegação principal" className="mx-auto hidden items-center gap-8 text-sm md:flex">
          <Link href="/" className={pathname === "/" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}>Início</Link>
          <Link href="/#ferramentas" className="text-muted-foreground hover:text-foreground">Explorar</Link>
          <Link href="/#produtividade" className="text-muted-foreground hover:text-foreground">Categorias</Link>
          <Link href="/pdf-docx#atividade" className="text-muted-foreground hover:text-foreground">Recentes</Link>
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <ThemeToggle />
          <Link href="/login" className="hidden rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground sm:block">Entrar</Link>
          <Link href="/login#criar-conta" className="hidden rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 sm:block">Criar conta</Link>
          <button
            type="button"
            aria-label={sidebarOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen((value) => !value)}
            className="flex size-9 items-center justify-center rounded-md border border-border bg-secondary text-foreground md:hidden"
          >
            {sidebarOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </header>

      {sidebarOpen ? (
        <button type="button" aria-label="Fechar menu" className="fixed inset-0 z-20 bg-background/70 md:hidden" onClick={() => setSidebarOpen(false)} />
      ) : null}

      <aside className={`fixed bottom-0 left-0 top-16 z-30 flex w-64 flex-col border-r border-border bg-background/95 p-4 backdrop-blur-xl transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} ${sidebarCollapsed ? "md:-translate-x-full" : "md:translate-x-0"}`}>
        <div className="flex items-center gap-3 border-b border-border px-2 pb-5 pt-2">
          <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-muted-foreground"><FolderOpen className="size-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Domínios</p>
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">Pastas de utilidades</p>
          </div>
          <button type="button" aria-label="Recolher barra lateral" onClick={() => setSidebarCollapsed(true)} className="hidden size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground md:flex">
            <ChevronLeft className="size-4" />
          </button>
        </div>

        <nav aria-label="Domínios do Utileazy" className="mt-4 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          {domains.map((domain) => {
            const expanded = expandedFolders.includes(domain.label)
            const parentActive = domain.tools.some((tool) => isToolActive(pathname, tool.href))
            const Icon = domain.icon
            return (
              <div key={domain.label} className="flex flex-col">
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={`folder-${domain.label}`}
                  onClick={() => toggleFolder(domain.label)}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors ${parentActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className="flex-1 text-sm font-medium">{domain.label}</span>
                  {expanded ? <ChevronRight className="size-3 rotate-90" /> : <ChevronRight className="size-3" />}
                </button>
                {expanded ? (
                  <div id={`folder-${domain.label}`} className="relative ml-5 flex flex-col gap-0.5 border-l border-border py-1 pl-3">
                    {domain.tools.map((tool) => {
                      const active = isToolActive(pathname, tool.href)
                      return (
                        <Link
                          key={tool.label}
                          href={tool.href}
                          aria-current={active ? "page" : undefined}
                          onClick={() => setSidebarOpen(false)}
                          className={`relative rounded-md px-3 py-2 text-xs leading-4 transition-colors before:absolute before:-left-3 before:top-1/2 before:w-2 before:border-t before:border-border ${active ? "bg-secondary font-medium text-brand-light" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                        >
                          {tool.label}
                        </Link>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            )
          })}
        </nav>

        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <Link href="/#ferramentas" onClick={() => setSidebarOpen(false)} className="rounded-md border border-border bg-secondary px-4 py-3 text-center text-xs font-medium hover:bg-accent">Ver todas as ferramentas</Link>
          <Link href="/#configuracoes" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2 text-xs text-muted-foreground hover:text-foreground"><Settings className="size-4" />Configurações</Link>
        </div>
      </aside>

      {sidebarCollapsed ? (
        <button
          type="button"
          aria-label="Expandir barra lateral"
          onClick={() => setSidebarCollapsed(false)}
          className="fixed left-0 top-24 z-30 hidden items-center gap-2 rounded-r-md border border-l-0 border-border bg-background/95 px-2 py-3 text-muted-foreground shadow-lg backdrop-blur-xl hover:text-foreground md:flex"
        >
          <PanelLeftOpen className="size-4" />
          <span className="sr-only">Mostrar domínios</span>
        </button>
      ) : null}

      <div className={`min-h-screen pt-16 transition-[padding] duration-300 ${sidebarCollapsed ? "md:pl-0" : "md:pl-64"}`}>{children}</div>
    </div>
  )
}
