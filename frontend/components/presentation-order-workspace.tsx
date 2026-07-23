"use client"

import { useMemo, useState } from "react"
import {
  AlertTriangle,
  Check,
  ClipboardCopy,
  Download,
  Info,
  ListOrdered,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react"

import {
  MAX_PRESENTATION_PARTICIPANTS,
  PresentationOrderValidationError,
  analyzeParticipants,
  formatPresentationOrder,
  shufflePresentationOrder,
  validateParticipants,
} from "@/lib/presentation-order"

export function PresentationOrderWorkspace() {
  const [rawParticipants, setRawParticipants] = useState("")
  const [presentationOrder, setPresentationOrder] = useState<string[]>([])
  const [error, setError] = useState("")
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">(
    "idle",
  )
  const [announcement, setAnnouncement] = useState("")

  const analysis = useMemo(
    () => analyzeParticipants(rawParticipants),
    [rawParticipants],
  )
  const duplicatePreview = analysis.duplicates.slice(0, 3)
  const hiddenDuplicateCount =
    analysis.duplicates.length - duplicatePreview.length

  function clearResult() {
    setPresentationOrder([])
    setError("")
    setCopyStatus("idle")
    setAnnouncement("")
  }

  function updateParticipants(value: string) {
    setRawParticipants(value)
    clearResult()
  }

  function drawOrder() {
    if (
      presentationOrder.length > 0 &&
      !window.confirm(
        "Sortear novamente substituirá a ordem atual. Deseja continuar?",
      )
    ) {
      return
    }

    try {
      const participants = validateParticipants(rawParticipants)
      const nextOrder = shufflePresentationOrder(participants)

      setPresentationOrder(nextOrder)
      setError("")
      setCopyStatus("idle")
      setAnnouncement(
        `Nova ordem sorteada com ${nextOrder.length} participantes: ${nextOrder
          .map((participant, index) => `${index + 1}, ${participant}`)
          .join("; ")}.`,
      )
    } catch (drawError) {
      const message =
        drawError instanceof PresentationOrderValidationError
          ? drawError.message
          : "Não foi possível sortear a ordem. Tente novamente."

      setPresentationOrder([])
      setError(message)
      setCopyStatus("idle")
      setAnnouncement(`Erro: ${message}`)
    }
  }

  async function copyOrder() {
    if (presentationOrder.length === 0) return

    try {
      await navigator.clipboard.writeText(
        formatPresentationOrder(presentationOrder),
      )
      setCopyStatus("copied")
      setAnnouncement("Ordem copiada para a área de transferência.")
    } catch {
      setCopyStatus("error")
      setAnnouncement("Não foi possível copiar a ordem.")
    }
  }

  function downloadOrder() {
    if (presentationOrder.length === 0) return

    const file = new Blob([formatPresentationOrder(presentationOrder)], {
      type: "text/plain;charset=utf-8",
    })
    const downloadUrl = URL.createObjectURL(file)
    const anchor = document.createElement("a")

    anchor.href = downloadUrl
    anchor.download = "ordem-de-apresentacao.txt"
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(downloadUrl)
    setAnnouncement("Arquivo TXT da ordem de apresentação baixado.")
  }

  function resetWorkspace() {
    setRawParticipants("")
    clearResult()
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(380px,1.1fr)]">
      <section
        aria-labelledby="presentation-participants-title"
        className="noir-panel rounded-2xl p-5 sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-light">
              Participantes
            </p>
            <h2
              id="presentation-participants-title"
              className="mt-2 text-xl font-semibold"
            >
              Quem vai apresentar?
            </h2>
          </div>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-brand-light">
            <Users className="size-5" aria-hidden="true" />
          </span>
        </div>

        <label
          htmlFor="presentation-participants"
          className="mt-7 grid gap-2 text-sm font-medium"
        >
          Um participante ou equipe por linha
          <textarea
            id="presentation-participants"
            rows={13}
            value={rawParticipants}
            onChange={(event) => updateParticipants(event.target.value)}
            placeholder={"Equipe Aurora\nEquipe Horizonte\nEquipe Atlas"}
            className="resize-y rounded-lg border border-border bg-background/65 px-3 py-3 text-sm leading-6 text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-brand-light focus:ring-2 focus:ring-brand-light/25"
          />
        </label>

        <div className="mt-3 flex flex-col gap-1 text-xs leading-5 text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            {analysis.participants.length.toLocaleString("pt-BR")}{" "}
            {analysis.participants.length === 1
              ? "participante válido"
              : "participantes válidos"}
          </span>
          <span>Limite de {MAX_PRESENTATION_PARTICIPANTS}</span>
        </div>

        {analysis.duplicates.length > 0 ? (
          <div
            role="alert"
            className="mt-5 flex items-start gap-3 rounded-lg border border-warning/35 bg-warning/10 px-4 py-3 text-warning-foreground"
          >
            <AlertTriangle
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <p className="text-sm leading-5">
              Remova os nomes repetidos antes de sortear:{" "}
              <strong>
                {duplicatePreview.join(", ")}
                {hiddenDuplicateCount > 0
                  ? ` e mais ${hiddenDuplicateCount}`
                  : ""}
              </strong>
              .
            </p>
          </div>
        ) : (
          <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Linhas vazias são ignoradas e espaços extras são normalizados.
          </p>
        )}

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-warning/35 bg-warning/10 px-4 py-3 text-sm leading-5 text-warning-foreground"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={drawOrder}
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-light focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Sparkles className="size-4" aria-hidden="true" />
            {presentationOrder.length > 0
              ? "Sortear nova ordem"
              : "Sortear ordem"}
          </button>
          <button
            type="button"
            onClick={resetWorkspace}
            className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-border bg-secondary px-5 text-sm font-medium transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-light"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Reiniciar
          </button>
        </div>
      </section>

      <section
        aria-labelledby="presentation-result-title"
        className="noir-panel flex min-h-[610px] flex-col rounded-2xl p-5 sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-light">
              Resultado
            </p>
            <h2
              id="presentation-result-title"
              className="mt-2 text-xl font-semibold"
            >
              {presentationOrder.length > 0
                ? "Ordem de apresentação"
                : "A ordem aparecerá aqui"}
            </h2>
          </div>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-brand-light">
            {presentationOrder.length > 0 ? (
              <Check className="size-5" aria-hidden="true" />
            ) : (
              <ListOrdered className="size-5" aria-hidden="true" />
            )}
          </span>
        </div>

        <div className="mt-6 flex flex-1 flex-col">
          {presentationOrder.length > 0 ? (
            <>
              <ol className="grid max-h-[470px] gap-3 overflow-y-auto pr-1">
                {presentationOrder.map((participant, index) => (
                  <li
                    key={participant}
                    className="flex min-h-16 items-center gap-4 rounded-xl border border-border bg-background/55 px-4 py-3"
                  >
                    <span
                      aria-hidden="true"
                      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-brand-light"
                    >
                      {index + 1}
                    </span>
                    <span className="min-w-0 break-words text-sm font-semibold sm:text-base">
                      {participant}
                    </span>
                  </li>
                ))}
              </ol>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => void copyOrder()}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-secondary px-4 text-sm font-medium transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-light"
                >
                  {copyStatus === "copied" ? (
                    <Check className="size-4" aria-hidden="true" />
                  ) : (
                    <ClipboardCopy className="size-4" aria-hidden="true" />
                  )}
                  {copyStatus === "copied"
                    ? "Ordem copiada"
                    : copyStatus === "error"
                      ? "Não foi possível copiar"
                      : "Copiar ordem"}
                </button>
                <button
                  type="button"
                  onClick={downloadOrder}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-secondary px-4 text-sm font-medium transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-light"
                >
                  <Download className="size-4" aria-hidden="true" />
                  Baixar TXT
                </button>
              </div>

              <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                <AlertTriangle
                  className="mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
                Sortear novamente substituirá esta ordem e pedirá confirmação.
              </p>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background/25 px-6 py-12 text-center">
              <span className="flex size-16 items-center justify-center rounded-2xl border border-border bg-secondary text-brand-light">
                <ListOrdered className="size-7" aria-hidden="true" />
              </span>
              <p className="mt-5 max-w-sm text-base font-medium">
                Adicione as pessoas ou equipes.
              </p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                Cada participante aparecerá exatamente uma vez na ordem final.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-xl border border-border bg-secondary/55 px-4 py-3">
          <ShieldCheck
            className="mt-0.5 size-5 shrink-0 text-brand-light"
            aria-hidden="true"
          />
          <p className="text-xs leading-5 text-muted-foreground">
            Os nomes e a ordem são processados somente neste navegador. Nada é
            enviado ou salvo no servidor. Este sorteio não possui validade jurídica.
          </p>
        </div>

        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {announcement}
        </p>
      </section>
    </div>
  )
}
