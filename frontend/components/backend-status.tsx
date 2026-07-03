import { Activity, Server } from "lucide-react"

import { getBackendHealth } from "@/lib/api"

export async function BackendStatus() {
  const health = await getBackendHealth()

  return (
    <section className="relative z-10 mx-auto max-w-7xl px-6 py-6">
      <div className="flex flex-col gap-4 rounded-lg border border-white/8 bg-[#0f1117]/90 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-[#1a1a1a]">
            <Server className="h-5 w-5 text-[#aaaaaa]" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">
              Integracao com backend
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              API Django em <code className="text-[#cccccc]">/api/health/</code>
            </p>
          </div>
        </div>

        <div
          className={
            health.ok
              ? "flex items-center gap-2 rounded-md border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm font-medium text-emerald-200"
              : "flex items-center gap-2 rounded-md border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm font-medium text-red-200"
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
