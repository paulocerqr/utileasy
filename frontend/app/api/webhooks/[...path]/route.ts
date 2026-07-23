import { proxyBackendRequest } from "@/lib/backend-proxy"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface RouteContext {
  params: Promise<{ path: string[] }>
}

export async function POST(request: Request, context: RouteContext) {
  const { path } = await context.params
  return proxyBackendRequest(request, `webhooks/${path.join("/")}/`)
}
