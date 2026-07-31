const backendBaseUrl = (
  process.env.API_INTERNAL_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:8000"
).replace(/\/$/, "")

const trustedReverseProxy = process.env.TRUSTED_REVERSE_PROXY === "1"

const untrustedForwardingHeaders = [
  "cf-connecting-ip",
  "cf-connecting-ipv6",
  "forwarded",
  "true-client-ip",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-real-ip",
]

export function buildBackendHeaders(
  requestHeaders: HeadersInit,
  trustProxyHeaders = trustedReverseProxy,
) {
  const headers = new Headers(requestHeaders)
  const clientIp = trustProxyHeaders
    ? headers.get("x-real-ip")?.trim()
    : undefined
  const forwardedProto = trustProxyHeaders
    ? headers.get("x-forwarded-proto")?.trim().toLowerCase()
    : undefined

  headers.delete("connection")
  headers.delete("host")
  headers.delete("transfer-encoding")
  for (const header of untrustedForwardingHeaders) {
    headers.delete(header)
  }

  if (clientIp && !clientIp.includes(",")) {
    headers.set("x-real-ip", clientIp)
    headers.set("x-forwarded-for", clientIp)
  }
  if (forwardedProto === "http" || forwardedProto === "https") {
    headers.set("x-forwarded-proto", forwardedProto)
  }

  return headers
}

export async function proxyBackendRequest(request: Request, apiPath: string) {
  const target = `${backendBaseUrl}/api/${apiPath.replace(/^\//, "")}`
  const headers = buildBackendHeaders(request.headers)

  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
    cache: "no-store",
    redirect: "manual",
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body
    init.duplex = "half"
  }

  try {
    const upstream = await fetch(target, init)
    const responseHeaders = new Headers(upstream.headers)
    responseHeaders.delete("connection")
    responseHeaders.delete("transfer-encoding")
    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    })
  } catch {
    return Response.json(
      { detail: "O serviço de transcrição está indisponível." },
      { status: 503 },
    )
  }
}

export function proxyTranscriptionRequest(request: Request, path = "") {
  return proxyBackendRequest(request, `transcriptions/${path}`)
}
