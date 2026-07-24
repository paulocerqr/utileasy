"use client"

import { useMemo, useState } from "react"
import {
  Check,
  Copy,
  Hash,
  Info,
  List,
  RotateCcw,
  ShieldCheck,
  Shuffle,
  Sparkles,
} from "lucide-react"

import {
  DrawValidationError,
  MAX_DRAW_QUANTITY,
  MAX_LIST_ITEMS,
  MAX_NUMERIC_INTERVAL_SIZE,
  drawItems,
  drawNumbers,
  normalizeListItems,
  validateListDraw,
  validateNumericDraw,
} from "@/lib/sorteador"

type DrawMode = "numbers" | "items"

const DEFAULT_ITEMS = "Ana\nBruno\nCarla\nDiego"

export function RandomDrawWorkspace() {
  const [mode, setMode] = useState<DrawMode>("numbers")
  const [minimum, setMinimum] = useState("1")
  const [maximum, setMaximum] = useState("100")
  const [numberQuantity, setNumberQuantity] = useState("1")
  const [rawItems, setRawItems] = useState(DEFAULT_ITEMS)
  const [itemQuantity, setItemQuantity] = useState("1")
  const [removeDuplicates, setRemoveDuplicates] = useState(true)
  const [results, setResults] = useState<Array<string | number>>([])
  const [error, setError] = useState("")
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">(
    "idle",
  )
  const [announcement, setAnnouncement] = useState("")

  const normalizedItems = useMemo(
    () => normalizeListItems(rawItems, removeDuplicates),
    [rawItems, removeDuplicates],
  )

  function clearFeedback() {
    setResults([])
    setError("")
    setCopyStatus("idle")
    setAnnouncement("")
  }

  function changeMode(nextMode: DrawMode) {
    setMode(nextMode)
    clearFeedback()
  }

  function executeDraw() {
    try {
      const nextResults =
        mode === "numbers"
          ? drawNumbers(
              validateNumericDraw(minimum, maximum, numberQuantity),
            )
          : (() => {
              const settings = validateListDraw(
                rawItems,
                itemQuantity,
                removeDuplicates,
              )
              return drawItems(settings.items, settings.quantity)
            })()

      setResults(nextResults)
      setError("")
      setCopyStatus("idle")
      setAnnouncement(
        `${nextResults.length} ${
          nextResults.length === 1 ? "resultado sorteado" : "resultados sorteados"
        }: ${nextResults.join(", ")}.`,
      )
    } catch (drawError) {
      const message =
        drawError instanceof DrawValidationError
          ? drawError.message
          : "Não foi possível realizar o sorteio. Tente novamente."

      setResults([])
      setError(message)
      setCopyStatus("idle")
      setAnnouncement(`Erro: ${message}`)
    }
  }

  async function copyResults() {
    if (results.length === 0) return

    const text = results
      .map((result, index) =>
        results.length === 1 ? String(result) : `${index + 1}. ${result}`,
      )
      .join("\n")

    try {
      await navigator.clipboard.writeText(text)
      setCopyStatus("copied")
      setAnnouncement("Resultado copiado para a área de transferência.")
    } catch {
      setCopyStatus("error")
      setAnnouncement("Não foi possível copiar o resultado.")
    }
  }

  function resetDraw() {
    setMinimum("1")
    setMaximum("100")
    setNumberQuantity("1")
    setRawItems(DEFAULT_ITEMS)
    setItemQuantity("1")
    setRemoveDuplicates(true)
    clearFeedback()
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,1.08fr)]">
      <section
        aria-labelledby="draw-settings-title"
        className="noir-panel rounded-2xl p-5 sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-light">
              Configuração
            </p>
            <h2 id="draw-settings-title" className="mt-2 text-xl font-semibold">
              O que você quer sortear?
            </h2>
          </div>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-brand-light">
            <Shuffle className="size-5" aria-hidden="true" />
          </span>
        </div>

        <div
          aria-label="Tipo de sorteio"
          className="mt-7 grid grid-cols-2 gap-2 rounded-xl border border-border bg-background/45 p-1.5"
          role="group"
        >
          <button
            type="button"
            aria-pressed={mode === "numbers"}
            onClick={() => changeMode("numbers")}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors ${
              mode === "numbers"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Hash className="size-4" aria-hidden="true" />
            Números
          </button>
          <button
            type="button"
            aria-pressed={mode === "items"}
            onClick={() => changeMode("items")}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors ${
              mode === "items"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <List className="size-4" aria-hidden="true" />
            Lista de itens
          </button>
        </div>

        {mode === "numbers" ? (
          <div className="mt-6 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium" htmlFor="draw-minimum">
                Valor mínimo
                <input
                  id="draw-minimum"
                  type="number"
                  step="1"
                  inputMode="numeric"
                  value={minimum}
                  onChange={(event) => {
                    setMinimum(event.target.value)
                    clearFeedback()
                  }}
                  className="min-h-11 rounded-lg border border-border bg-background/65 px-3 text-base text-foreground outline-none transition focus:border-brand-light focus:ring-2 focus:ring-brand-light/25"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium" htmlFor="draw-maximum">
                Valor máximo
                <input
                  id="draw-maximum"
                  type="number"
                  step="1"
                  inputMode="numeric"
                  value={maximum}
                  onChange={(event) => {
                    setMaximum(event.target.value)
                    clearFeedback()
                  }}
                  className="min-h-11 rounded-lg border border-border bg-background/65 px-3 text-base text-foreground outline-none transition focus:border-brand-light focus:ring-2 focus:ring-brand-light/25"
                />
              </label>
            </div>

            <label className="grid gap-2 text-sm font-medium" htmlFor="draw-number-quantity">
              Quantidade de resultados
              <input
                id="draw-number-quantity"
                type="number"
                min="1"
                max={MAX_DRAW_QUANTITY}
                step="1"
                inputMode="numeric"
                value={numberQuantity}
                onChange={(event) => {
                  setNumberQuantity(event.target.value)
                  clearFeedback()
                }}
                className="min-h-11 rounded-lg border border-border bg-background/65 px-3 text-base text-foreground outline-none transition focus:border-brand-light focus:ring-2 focus:ring-brand-light/25"
              />
            </label>

            <p className="flex gap-2 text-xs leading-5 text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              O intervalo inclui os dois limites e pode conter até{" "}
              {MAX_NUMERIC_INTERVAL_SIZE.toLocaleString("pt-BR")} números.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <label className="grid gap-2 text-sm font-medium" htmlFor="draw-items">
              Itens, um por linha
              <textarea
                id="draw-items"
                rows={9}
                value={rawItems}
                onChange={(event) => {
                  setRawItems(event.target.value)
                  clearFeedback()
                }}
                placeholder={"Ana\nBruno\nCarla"}
                className="resize-y rounded-lg border border-border bg-background/65 px-3 py-3 text-sm leading-6 text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-brand-light focus:ring-2 focus:ring-brand-light/25"
              />
            </label>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <label
                className="grid flex-1 gap-2 text-sm font-medium"
                htmlFor="draw-item-quantity"
              >
                Quantidade de resultados
                <input
                  id="draw-item-quantity"
                  type="number"
                  min="1"
                  max={MAX_DRAW_QUANTITY}
                  step="1"
                  inputMode="numeric"
                  value={itemQuantity}
                  onChange={(event) => {
                    setItemQuantity(event.target.value)
                    clearFeedback()
                  }}
                  className="min-h-11 rounded-lg border border-border bg-background/65 px-3 text-base text-foreground outline-none transition focus:border-brand-light focus:ring-2 focus:ring-brand-light/25"
                />
              </label>

              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border bg-background/45 px-3 text-sm">
                <input
                  type="checkbox"
                  checked={removeDuplicates}
                  onChange={(event) => {
                    setRemoveDuplicates(event.target.checked)
                    clearFeedback()
                  }}
                  className="size-4 accent-[var(--brand-light)]"
                />
                Remover duplicados
              </label>
            </div>

            <p className="text-xs leading-5 text-muted-foreground">
              {normalizedItems.length.toLocaleString("pt-BR")}{" "}
              {normalizedItems.length === 1 ? "item disponível" : "itens disponíveis"}.
              Linhas vazias são ignoradas. Limite de{" "}
              {MAX_LIST_ITEMS.toLocaleString("pt-BR")} itens.
            </p>
          </div>
        )}

        {error ? (
          <p
            role="alert"
            className="mt-5 rounded-lg border border-warning/35 bg-warning/10 px-4 py-3 text-sm leading-5 text-warning-foreground"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={executeDraw}
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-light focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Sparkles className="size-4" aria-hidden="true" />
            {results.length > 0 ? "Sortear novamente" : "Sortear agora"}
          </button>
          <button
            type="button"
            onClick={resetDraw}
            className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-border bg-secondary px-5 text-sm font-medium transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-light"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Reiniciar
          </button>
        </div>
      </section>

      <section
        aria-labelledby="draw-result-title"
        className="noir-panel flex min-h-[500px] flex-col rounded-2xl p-5 sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-light">
              Resultado
            </p>
            <h2 id="draw-result-title" className="mt-2 text-xl font-semibold">
              {results.length > 0 ? "Itens sorteados" : "Pronto para sortear"}
            </h2>
          </div>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-brand-light">
            {results.length > 0 ? (
              <Check className="size-5" aria-hidden="true" />
            ) : (
              <Sparkles className="size-5" aria-hidden="true" />
            )}
          </span>
        </div>

        <div className="mt-6 flex flex-1 flex-col">
          {results.length > 0 ? (
            <>
              <ol className="grid max-h-[430px] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                {results.map((result, index) => (
                  <li
                    key={`${index}-${String(result)}`}
                    className={`flex min-h-20 items-center gap-3 rounded-xl border border-border bg-background/55 px-4 py-3 ${
                      results.length === 1 ? "sm:col-span-2 sm:min-h-36" : ""
                    }`}
                  >
                    {results.length > 1 ? (
                      <span
                        aria-hidden="true"
                        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-brand-light"
                      >
                        {index + 1}
                      </span>
                    ) : null}
                    <span
                      className={`min-w-0 break-words font-semibold ${
                        results.length === 1
                          ? "w-full text-center text-4xl sm:text-5xl"
                          : "text-base"
                      }`}
                    >
                      {result}
                    </span>
                  </li>
                ))}
              </ol>

              <button
                type="button"
                onClick={() => void copyResults()}
                className="mt-5 flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-secondary px-4 text-sm font-medium transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-light"
              >
                {copyStatus === "copied" ? (
                  <Check className="size-4" aria-hidden="true" />
                ) : (
                  <Copy className="size-4" aria-hidden="true" />
                )}
                {copyStatus === "copied"
                  ? "Resultado copiado"
                  : copyStatus === "error"
                    ? "Não foi possível copiar"
                    : "Copiar resultado"}
              </button>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background/25 px-6 py-12 text-center">
              <span className="flex size-16 items-center justify-center rounded-2xl border border-border bg-secondary text-brand-light">
                <Shuffle className="size-7" aria-hidden="true" />
              </span>
              <p className="mt-5 max-w-sm text-base font-medium">
                Configure as opções e faça seu sorteio.
              </p>
            </div>
          )}
        </div>
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {announcement}
        </p>
      </section>
    </div>
  )
}
