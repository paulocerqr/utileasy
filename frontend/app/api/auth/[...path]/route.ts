import { proxyBackendRequest } from "@/lib/backend-proxy"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface RouteContext {
  params: Promise<{ path: string[] }>
}

async function proxy(request: Request, context: RouteContext) {
  const { path } = await context.params
  return proxyBackendRequest(request, `auth/${path.join("/")}/`)
}

export const GET = proxy
export const POST = proxy
export const PATCH = proxy
export const DELETE = proxy
