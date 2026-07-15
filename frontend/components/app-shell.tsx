"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  AudioLines,
  Braces,
  ChevronRight,
  FileArchive,
  FolderOpen,
  Gauge,
  LayoutGrid,
  Menu,
  Settings,
  X,
} from "lucide-react"

import { ThemeToggle } from "@/components/theme-toggle"

const domains = [
  { label: "Arquivos", description: "PDF, DOCX e arquivos", href: "/pdf-docx", icon: FolderOpen },
  { label: "Mídia", description: "Áudio, vídeo e imagens", href: "/transcrisao", icon: AudioLines },
  { label: "Produtividade", description: "Rotinas e organização", href: "/#produtividade", icon: Gauge },
  { label: "Devs", description: "Ferramentas técnicas", href: "/#devs", icon: Braces },
]

function isDomainActive(pathname: string, href: string) {
  return href.startsWith("/#") ? pathname === "/" : pathname.startsWith(href)
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

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

      {sidebarOpen && (
        <button type="button" aria-label="Fechar menu" className="fixed inset-0 z-20 bg-background/70 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed bottom-0 left-0 top-16 z-30 flex w-64 flex-col border-r border-border bg-background/95 p-4 backdrop-blur-xl transition-transform md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center gap-3 border-b border-border px-2 pb-5 pt-2">
          <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-muted-foreground"><FileArchive className="size-5" /></span>
          <div>
            <p className="text-sm font-semibold">Domínios</p>
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">Acesso rápido às utilidades</p>
          </div>
        </div>

        <nav aria-label="Domínios do Utileazy" className="mt-5 flex flex-col gap-2">
          {domains.map((item) => {
            const active = isDomainActive(pathname, item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`group flex items-center gap-3 rounded-md border-l-2 px-3 py-3 transition-colors ${active ? "border-brand-light bg-secondary text-foreground" : "border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="block truncate text-[10px] opacity-70">{item.description}</span>
                </span>
                <ChevronRight className="size-3 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-3 border-t border-border pt-4">
          <Link href="/#ferramentas" onClick={() => setSidebarOpen(false)} className="rounded-md border border-border bg-secondary px-4 py-3 text-center text-xs font-medium hover:bg-accent">Ver todas as ferramentas</Link>
          <Link href="/#configuracoes" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2 text-xs text-muted-foreground hover:text-foreground"><Settings className="size-4" />Configurações</Link>
        </div>
      </aside>

      <div className="min-h-screen pt-16 md:pl-64">{children}</div>
    </div>
  )
}
