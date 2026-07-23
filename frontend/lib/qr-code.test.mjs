import assert from "node:assert/strict"
import test from "node:test"

import jsQR from "jsqr"
import QRCode from "qrcode"

import {
  DEFAULT_QR_CODE_OPTIONS,
  MAX_QR_PAYLOAD_BYTES,
  QrCodeValidationError,
  buildUrlPayload,
  buildWifiPayload,
  escapeWifiValue,
} from "./qr-code.ts"

function decodeQrPayload(payload) {
  const qrCode = QRCode.create(payload, {
    errorCorrectionLevel: DEFAULT_QR_CODE_OPTIONS.errorCorrectionLevel,
  })
  const moduleCount = qrCode.modules.size
  const margin = DEFAULT_QR_CODE_OPTIONS.margin
  const scale = 8
  const imageSize = (moduleCount + margin * 2) * scale
  const pixels = new Uint8ClampedArray(imageSize * imageSize * 4)

  for (let pixel = 0; pixel < imageSize * imageSize; pixel += 1) {
    const offset = pixel * 4
    pixels[offset] = 255
    pixels[offset + 1] = 255
    pixels[offset + 2] = 255
    pixels[offset + 3] = 255
  }

  for (let row = 0; row < moduleCount; row += 1) {
    for (let column = 0; column < moduleCount; column += 1) {
      if (!qrCode.modules.data[row * moduleCount + column]) continue

      const startX = (column + margin) * scale
      const startY = (row + margin) * scale
      for (let y = startY; y < startY + scale; y += 1) {
        for (let x = startX; x < startX + scale; x += 1) {
          const offset = (y * imageSize + x) * 4
          pixels[offset] = 0
          pixels[offset + 1] = 0
          pixels[offset + 2] = 0
        }
      }
    }
  }

  const decoded = jsQR(pixels, imageSize, imageSize, {
    inversionAttempts: "dontInvert",
  })
  assert.ok(decoded, "A amostra gerada deveria ser decodificável")
  return decoded.data
}

test("gera e decodifica uma URL sem alterar o conteúdo esperado", () => {
  const payload = buildUrlPayload(
    "https://utileazy.example/ferramentas?origem=qr",
  )

  assert.equal(decodeQrPayload(payload), payload)
})

test("aceita somente URLs HTTP(S)", () => {
  assert.equal(
    buildUrlPayload("https://utileazy.example"),
    "https://utileazy.example/",
  )
  assert.throws(
    () => buildUrlPayload("javascript:alert(1)"),
    (error) =>
      error instanceof QrCodeValidationError &&
      error.message.includes("http ou https"),
  )
  assert.throws(() => buildUrlPayload("não é uma URL"), QrCodeValidationError)
})

test("escapa caracteres reservados e decodifica payload Wi-Fi", () => {
  assert.equal(
    escapeWifiValue('Rede;Casa:5G\\,"'),
    'Rede\\;Casa\\:5G\\\\\\,\\"',
  )

  const payload = buildWifiPayload({
    ssid: "Rede;Casa:5G",
    security: "WPA",
    password: 's,en"ha;',
    hidden: true,
  })

  assert.equal(
    payload,
    'WIFI:T:WPA;S:Rede\\;Casa\\:5G;P:s\\,en\\"ha\\;;H:true;;',
  )
  assert.equal(decodeQrPayload(payload), payload)
})

test("rede aberta omite senha e campos Wi-Fi inválidos são rejeitados", () => {
  assert.equal(
    buildWifiPayload({
      ssid: "Visitantes",
      security: "nopass",
      password: "ignorada",
      hidden: false,
    }),
    "WIFI:T:nopass;S:Visitantes;;",
  )
  assert.throws(
    () =>
      buildWifiPayload({
        ssid: "",
        security: "WPA",
        password: "senha",
        hidden: false,
      }),
    QrCodeValidationError,
  )
  assert.throws(
    () =>
      buildWifiPayload({
        ssid: "Rede",
        security: "WPA",
        password: "",
        hidden: false,
      }),
    QrCodeValidationError,
  )
})

test("rejeita conteúdo maior que o limite", () => {
  assert.throws(
    () =>
      buildWifiPayload({
        ssid: "a".repeat(MAX_QR_PAYLOAD_BYTES + 1),
        security: "nopass",
        password: "",
        hidden: false,
      }),
    (error) =>
      error instanceof QrCodeValidationError &&
      error.message.includes(`${MAX_QR_PAYLOAD_BYTES}`),
  )
})

test("o padrão fixo gera PNG e SVG", async () => {
  const payload = buildUrlPayload("https://utileazy.example")
  const [png, svg] = await Promise.all([
    QRCode.toDataURL(payload, {
      ...DEFAULT_QR_CODE_OPTIONS,
      type: "image/png",
    }),
    QRCode.toString(payload, {
      ...DEFAULT_QR_CODE_OPTIONS,
      type: "svg",
    }),
  ])

  assert.match(png, /^data:image\/png;base64,/)
  assert.match(svg, /<svg/)
  assert.match(svg, /width="384"/)
})
