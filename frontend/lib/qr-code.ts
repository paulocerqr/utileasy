export const MAX_QR_PAYLOAD_BYTES = 1200

export const DEFAULT_QR_CODE_OPTIONS = {
  width: 384,
  margin: 4,
  errorCorrectionLevel: "M",
  color: {
    dark: "#111827",
    light: "#ffffff",
  },
} as const

export type QrContentType = "url" | "wifi"
export type WifiSecurity = "WPA" | "WEP" | "nopass"

export interface WifiPayloadInput {
  ssid: string
  security: WifiSecurity
  password: string
  hidden: boolean
}

export class QrCodeValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "QrCodeValidationError"
  }
}

function assertPayloadCapacity(payload: string) {
  const payloadBytes = new TextEncoder().encode(payload).byteLength

  if (payloadBytes > MAX_QR_PAYLOAD_BYTES) {
    throw new QrCodeValidationError(
      `O conteúdo pode ter no máximo ${MAX_QR_PAYLOAD_BYTES} bytes.`,
    )
  }

  return payload
}

export function buildUrlPayload(rawUrl: string) {
  const value = rawUrl.trim()

  if (!value) {
    throw new QrCodeValidationError("Informe o endereço.")
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(value)
  } catch {
    throw new QrCodeValidationError("O endereço deve ser uma URL válida.")
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new QrCodeValidationError(
      "O endereço deve usar o protocolo http ou https.",
    )
  }

  return assertPayloadCapacity(parsedUrl.toString())
}

export function escapeWifiValue(value: string) {
  return value.replace(/([\\;,:"])/g, "\\$1")
}

export function buildWifiPayload(input: WifiPayloadInput) {
  const ssid = input.ssid.trim()

  if (!ssid) {
    throw new QrCodeValidationError("Informe o nome da rede Wi-Fi.")
  }
  if (!["WPA", "WEP", "nopass"].includes(input.security)) {
    throw new QrCodeValidationError("Selecione uma segurança Wi-Fi válida.")
  }
  if (input.security !== "nopass" && !input.password) {
    throw new QrCodeValidationError("Informe a senha da rede Wi-Fi.")
  }

  const fields = [
    `T:${input.security}`,
    `S:${escapeWifiValue(ssid)}`,
    input.security === "nopass"
      ? null
      : `P:${escapeWifiValue(input.password)}`,
    input.hidden ? "H:true" : null,
  ].filter(Boolean)

  return assertPayloadCapacity(`WIFI:${fields.join(";")};;`)
}
