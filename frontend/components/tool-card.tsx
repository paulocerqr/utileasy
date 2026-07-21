import type { LucideIcon } from "lucide-react"
import { ArrowRight, AlertTriangle } from "lucide-react"
import Link from "next/link"

interface ToolCardProps {
  icon: LucideIcon
  title: string
  description: string
  warning?: string
  href?: string
}

export function ToolCard({
  icon: Icon,
  title,
  description,
  warning,
  href = "#",
}: ToolCardProps) {
  return (
    <div className="group flex flex-col rounded-xl border border-border bg-card/45 p-5 backdrop-blur-md transition-colors hover:border-brand hover:bg-secondary/55">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-secondary">
        <Icon className="h-5 w-5 text-brand-light" />
      </div>

      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>

      {warning && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
          <span className="text-xs leading-relaxed text-warning-foreground">
            {warning}
          </span>
        </div>
      )}

      <Link
        href={href}
        className="mt-4 flex items-center gap-1 text-sm font-medium text-brand-light transition-colors hover:text-foreground"
      >
        Acessar
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}

interface ToolCardWideProps {
  icon: LucideIcon
  title: string
  description: string
  warning?: string
  badge?: string
  href?: string
}

export function ToolCardWide({
  icon: Icon,
  title,
  description,
  warning,
  badge,
  href = "#",
}: ToolCardWideProps) {
  return (
    <div className="group relative flex flex-col rounded-xl border border-border bg-card/45 p-6 backdrop-blur-md transition-colors hover:border-brand hover:bg-secondary/55">
      {badge && (
        <span className="absolute right-5 top-5 flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning-foreground">
          <AlertTriangle className="h-3 w-3" />
          {badge}
        </span>
      )}

      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-secondary">
        <Icon className="h-5 w-5 text-brand-light" />
      </div>

      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>

      {warning && (
        <div className="mt-4 rounded-md border border-warning/30 bg-warning/10 px-3 py-2">
          <p className="text-xs leading-relaxed text-warning-foreground">{warning}</p>
        </div>
      )}

      <Link
        href={href}
        className="mt-5 flex items-center gap-1 text-sm font-medium text-brand-light transition-colors hover:text-foreground"
      >
        Acessar
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}
