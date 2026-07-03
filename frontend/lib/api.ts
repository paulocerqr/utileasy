export interface BackendHealth {
  ok: boolean
  status?: string
  service?: string
  error?: string
}

const internalApiBaseUrl =
  process.env.API_INTERNAL_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:8000"

export async function getBackendHealth(): Promise<BackendHealth> {
  try {
    const response = await fetch(`${internalApiBaseUrl}/api/health/`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      return {
        ok: false,
        error: `HTTP ${response.status}`,
      }
    }

    const data = (await response.json()) as {
      status?: string
      service?: string
    }

    return {
      ok: data.status === "ok",
      status: data.status,
      service: data.service,
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    }
  }
}
