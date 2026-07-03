import { LayoutList } from "lucide-react"

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#08090f]/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#222222]">
            <LayoutList className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-foreground">Utility Dev</span>
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
          <button className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Entrar
          </button>
          <button className="rounded-lg bg-white px-4 py-1.5 text-sm font-medium text-[#08090f] transition-opacity hover:opacity-90">
            Criar conta
          </button>
        </div>
      </div>
    </header>
  )
}
