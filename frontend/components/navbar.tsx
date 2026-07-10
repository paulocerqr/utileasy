import { LayoutList } from "lucide-react"
import { ThemeToggle } from "./theme-toggle"

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-secondary">
            <LayoutList className="h-4 w-4 text-brand" />
          </div>
          <span className="font-semibold text-foreground">Utileazy</span>
        </div>

        {/* Nav Links */}
        <nav className="hidden items-center gap-8 md:flex">
          <a
            href="#ferramentas"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Ferramentas
          </a>
          <a
            href="#devs"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Para Devs
          </a>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Entrar
          </button>
          <button className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
            Criar conta
          </button>
        </div>
      </div>
    </header>
  )
}
