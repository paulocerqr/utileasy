import { Activity, Server } from "lucide-react"

import { getBackendHealth } from "@/lib/api"

export async function BackendStatus() {
  const health = await getBackendHealth()

  return (
    <section className="relative z-10 mx-auto max-w-7xl px-6 py-6">
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card/45 p-5 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-secondary">
            <Server className="h-5 w-5 text-brand-light" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Integracao com backend
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              API Django em <code className="text-brand-light">/api/health/</code>
            </p>
          </div>
        </div>

        <div
          className={
            health.ok
              ? "flex items-center gap-2 rounded-md border border-brand/30 bg-brand/10 px-3 py-2 text-sm font-medium text-brand"
              : "flex items-center gap-2 rounded-md border border-[#FF7A84]/30 bg-[#FF7A84]/10 px-3 py-2 text-sm font-medium text-[#FF7A84]"
          }
        >
          <Activity className="h-4 w-4" />
          {health.ok
            ? `Online: ${health.service || "backend"}`
            : `Indisponivel: ${health.error || "sem resposta"}`}
        </div>
      </div>
    </section>
  )
}
