const backendBaseUrl = (
  process.env.API_INTERNAL_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:8000"
).replace(/\/$/, "")

export async function proxyTranscriptionRequest(request: Request, path = "") {
  const target = `${backendBaseUrl}/api/transcriptions/${path}`
  const headers = new Headers(request.headers)
  headers.delete("connection")
  headers.delete("host")
  headers.delete("transfer-encoding")

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
