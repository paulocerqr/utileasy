"use client"

import { useState } from "react"
import {
  Download,
  Link2,
  QrCode,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Wifi,
} from "lucide-react"
import QRCode from "qrcode"

import {
  DEFAULT_QR_CODE_OPTIONS,
  MAX_QR_PAYLOAD_BYTES,
  QrCodeValidationError,
  buildUrlPayload,
  buildWifiPayload,
  type QrContentType,
  type WifiPayloadInput,
} from "@/lib/qr-code"

const contentTypes = [
  { id: "url", label: "URL", icon: Link2 },
  { id: "wifi", label: "Wi-Fi", icon: Wifi },
] as const

const initialWifi: WifiPayloadInput = {
  ssid: "",
  security: "WPA",
  password: "",
  hidden: false,
}

export function QrCodeGenerator() {
  const [contentType, setContentType] = useState<QrContentType>("url")
  const [url, setUrl] = useState("")
  const [wifi, setWifi] = useState<WifiPayloadInput>(initialWifi)
  const [pngDataUrl, setPngDataUrl] = useState("")
  const [svgContent, setSvgContent] = useState("")
  const [error, setError] = useState("")
  const [announcement, setAnnouncement] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)

  function invalidatePreview() {
    setPngDataUrl("")
    setSvgContent("")
    setError("")
    setAnnouncement("")
  }

  function changeContentType(nextType: QrContentType) {
    setContentType(nextType)
    invalidatePreview()
  }

  async function generateQrCode() {
    setIsGenerating(true)

    try {
      const payload =
        contentType === "url" ? buildUrlPayload(url) : buildWifiPayload(wifi)
      const [nextPngDataUrl, nextSvgContent] = await Promise.all([
        QRCode.toDataURL(payload, {
          ...DEFAULT_QR_CODE_OPTIONS,
          type: "image/png",
        }),
        QRCode.toString(payload, {
          ...DEFAULT_QR_CODE_OPTIONS,
          type: "svg",
        }),
      ])

      setPngDataUrl(nextPngDataUrl)
      setSvgContent(nextSvgContent)
      setError("")
      setAnnouncement("QR Code gerado e pronto para download.")
    } catch (generationError) {
      const message =
        generationError instanceof QrCodeValidationError
          ? generationError.message
          : "Não foi possível gerar o QR Code."

      setPngDataUrl("")
      setSvgContent("")
      setError(message)
      setAnnouncement(`Erro: ${message}`)
    } finally {
      setIsGenerating(false)
    }
  }

  function downloadSvg() {
    if (!svgContent) return

    const blobUrl = URL.createObjectURL(
      new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" }),
    )
    const link = document.createElement("a")
    link.href = blobUrl
    link.download = "utileazy-qrcode.svg"
    link.click()
    URL.revokeObjectURL(blobUrl)
    setAnnouncement("Download do QR Code em SVG iniciado.")
  }

  function resetGenerator() {
    setContentType("url")
    setUrl("")
    setWifi(initialWifi)
    invalidatePreview()
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
      <section
        aria-labelledby="qr-content-title"
        className="noir-panel rounded-2xl p-5 sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-light">
              Conteúdo
            </p>
            <h2 id="qr-content-title" className="mt-2 text-xl font-semibold">
              O que deseja compartilhar?
            </h2>
          </div>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-brand-light">
            <QrCode className="size-5" aria-hidden="true" />
          </span>
        </div>

        <div
          aria-label="Tipo de conteúdo"
          className="mt-7 grid grid-cols-2 gap-2 rounded-xl border border-border bg-background/45 p-1.5"
          role="group"
        >
          {contentTypes.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={contentType === id}
              onClick={() => changeContentType(id)}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors ${
                contentType === id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        <div className="mt-7">
          {contentType === "url" ? (
            <label htmlFor="qr-url" className="grid gap-2 text-sm font-medium">
              Endereço completo
              <input
                id="qr-url"
                type="url"
                inputMode="url"
                value={url}
                onChange={(event) => {
                  setUrl(event.target.value)
                  invalidatePreview()
                }}
                placeholder="https://exemplo.com.br"
                className="min-h-11 rounded-lg border border-border bg-background/65 px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-brand-light focus:ring-2 focus:ring-brand-light/25"
              />
            </label>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              <label
                htmlFor="qr-wifi-ssid"
                className="grid gap-2 text-sm font-medium sm:col-span-2"
              >
                Nome da rede (SSID)
                <input
                  id="qr-wifi-ssid"
                  value={wifi.ssid}
                  onChange={(event) => {
                    setWifi((current) => ({
                      ...current,
                      ssid: event.target.value,
                    }))
                    invalidatePreview()
                  }}
                  placeholder="Minha rede"
                  className="min-h-11 rounded-lg border border-border bg-background/65 px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-brand-light focus:ring-2 focus:ring-brand-light/25"
                />
              </label>

              <label
                htmlFor="qr-wifi-security"
                className="grid gap-2 text-sm font-medium"
              >
                Segurança
                <select
                  id="qr-wifi-security"
                  value={wifi.security}
                  onChange={(event) => {
                    setWifi((current) => ({
                      ...current,
                      security: event.target.value as WifiPayloadInput["security"],
                    }))
                    invalidatePreview()
                  }}
                  className="min-h-11 rounded-lg border border-border bg-background/65 px-3 text-sm text-foreground outline-none transition focus:border-brand-light focus:ring-2 focus:ring-brand-light/25"
                >
                  <option value="WPA">WPA/WPA2/WPA3</option>
                  <option value="WEP">WEP</option>
                  <option value="nopass">Sem senha</option>
                </select>
              </label>

              {wifi.security !== "nopass" ? (
                <label
                  htmlFor="qr-wifi-password"
                  className="grid gap-2 text-sm font-medium"
                >
                  Senha
                  <input
                    id="qr-wifi-password"
                    type="password"
                    value={wifi.password}
                    onChange={(event) => {
                      setWifi((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                      invalidatePreview()
                    }}
                    autoComplete="new-password"
                    className="min-h-11 rounded-lg border border-border bg-background/65 px-3 text-sm text-foreground outline-none transition focus:border-brand-light focus:ring-2 focus:ring-brand-light/25"
                  />
                </label>
              ) : null}

              <label className="flex min-h-11 items-center gap-3 rounded-lg border border-border bg-background/45 px-3 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={wifi.hidden}
                  onChange={(event) => {
                    setWifi((current) => ({
                      ...current,
                      hidden: event.target.checked,
                    }))
                    invalidatePreview()
                  }}
                  className="size-4 accent-current"
                />
                Esta é uma rede oculta
              </label>
            </div>
          )}
        </div>

        <p className="mt-5 text-xs leading-5 text-muted-foreground">
          Limite de {MAX_QR_PAYLOAD_BYTES.toLocaleString("pt-BR")} bytes. URLs
          aceitam apenas HTTP ou HTTPS.
        </p>

        {error ? (
          <p
            role="alert"
            className="mt-5 rounded-lg border border-warning/35 bg-warning/10 px-4 py-3 text-sm leading-5 text-warning-foreground"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={generateQrCode}
            disabled={isGenerating}
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-light"
          >
            <Sparkles className="size-4" aria-hidden="true" />
            {isGenerating ? "Gerando..." : "Gerar QR Code"}
          </button>
          <button
            type="button"
            onClick={resetGenerator}
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-secondary px-5 text-sm font-medium transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-light"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Reiniciar
          </button>
        </div>
      </section>

      <section
        aria-labelledby="qr-preview-title"
        className="noir-panel flex min-h-[500px] flex-col rounded-2xl p-5 sm:p-7 xl:sticky xl:top-24"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-light">
            Resultado
          </p>
          <h2 id="qr-preview-title" className="mt-2 text-xl font-semibold">
            Pré-visualização
          </h2>
        </div>

        <div className="mt-7 flex min-h-[300px] flex-1 items-center justify-center rounded-2xl border border-dashed border-border bg-background/45 p-5">
          {pngDataUrl ? (
            <img
              src={pngDataUrl}
              alt="Pré-visualização do QR Code gerado"
              width={DEFAULT_QR_CODE_OPTIONS.width}
              height={DEFAULT_QR_CODE_OPTIONS.width}
              className="h-auto max-h-[380px] w-auto max-w-full rounded-lg"
            />
          ) : (
            <div className="max-w-xs text-center">
              <span className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-border bg-secondary text-muted-foreground">
                <QrCode className="size-8" aria-hidden="true" />
              </span>
              <p className="mt-5 text-sm font-medium">
                Seu QR Code aparecerá aqui
              </p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Preencha os dados e gere a imagem.
              </p>
            </div>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <a
            href={pngDataUrl || undefined}
            download="utileazy-qrcode.png"
            aria-disabled={!pngDataUrl}
            onClick={(event) => {
              if (!pngDataUrl) event.preventDefault()
            }}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-medium transition ${
              pngDataUrl
                ? "bg-secondary hover:bg-accent"
                : "cursor-not-allowed bg-secondary/40 text-muted-foreground opacity-60"
            }`}
          >
            <Download className="size-4" aria-hidden="true" />
            PNG
          </a>
          <button
            type="button"
            disabled={!svgContent}
            onClick={downloadSvg}
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-secondary px-4 text-sm font-medium transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="size-4" aria-hidden="true" />
            SVG
          </button>
        </div>

        <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
          <ShieldCheck
            className="mt-0.5 size-4 shrink-0 text-brand-light"
            aria-hidden="true"
          />
          Tudo é processado neste navegador. Os dados não são enviados nem
          salvos pelo Utileazy.
        </p>
      </section>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  )
}
