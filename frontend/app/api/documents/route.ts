import { proxyDocumentRequest } from "@/lib/backend-proxy"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  return proxyDocumentRequest(request)
}

export async function POST(request: Request) {
  return proxyDocumentRequest(request)
}
