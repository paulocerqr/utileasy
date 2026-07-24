"use client"

import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  RenderTask,
} from "pdfjs-dist"
import type { DragEvent } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  FilePlus2,
  FileText,
  GripVertical,
  Info,
  LoaderCircle,
  LockKeyhole,
  Plus,
  Trash2,
  Upload,
} from "lucide-react"

import {
  MAX_TOTAL_PDF_SIZE,
  MERGED_PDF_FILENAME,
  PdfMergeValidationError,
  mergePdfDocuments,
  type PdfMergeProgress,
} from "@/lib/pdf-merge"

interface PdfItem {
  id: string
  file: File
}

type PreviewStatus = "loading" | "ready" | "error"

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 MB"
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function isPdf(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
}

function PdfFirstPage({ file }: { file: File }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [status, setStatus] = useState<PreviewStatus>("loading")

  useEffect(() => {
    let cancelled = false
    let loadingTask: PDFDocumentLoadingTask | undefined
    let pdfDocument: PDFDocumentProxy | undefined
    let renderTask: RenderTask | undefined

    async function renderFirstPage() {
      setStatus("loading")

      try {
        const pdfjs = await import("pdfjs-dist/webpack.mjs")
        const data = new Uint8Array(await file.arrayBuffer())

        if (cancelled) return

        loadingTask = pdfjs.getDocument({ data })
        pdfDocument = await loadingTask.promise
        const page = await pdfDocument.getPage(1)
        const baseViewport = page.getViewport({ scale: 1 })
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
        const viewport = page.getViewport({
          scale: (300 / baseViewport.width) * pixelRatio,
        })
        const canvas = canvasRef.current

        if (!canvas || cancelled) return

        canvas.width = Math.ceil(viewport.width)
        canvas.height = Math.ceil(viewport.height)
        renderTask = page.render({ canvas, viewport })
        await renderTask.promise

        if (!cancelled) setStatus("ready")
        await loadingTask.destroy()
        loadingTask = undefined
        pdfDocument = undefined
      } catch {
        if (!cancelled) setStatus("error")
      }
    }

    void renderFirstPage()

    return () => {
      cancelled = true
      renderTask?.cancel()
      void loadingTask?.destroy()
    }
  }, [file])

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-white p-2">
      <canvas
        ref={canvasRef}
        aria-label={`Primeira página de ${file.name}`}
        className={`max-h-full max-w-full shadow-sm transition-opacity ${status === "ready" ? "opacity-100" : "opacity-0"}`}
      />

      {status === "loading" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white text-neutral-500">
          <LoaderCircle className="size-6 animate-spin" aria-hidden="true" />
          <span className="text-[10px] font-medium uppercase tracking-wider">
            Gerando prévia
          </span>
        </div>
      ) : null}

      {status === "error" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-neutral-100 p-4 text-center text-neutral-500">
          <FileText className="size-8" aria-hidden="true" />
          <span className="text-[10px] font-medium leading-4">
            Prévia indisponível
          </span>
        </div>
      ) : null}
    </div>
  )
}

export function PdfMergeWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<PdfItem[]>([])
  const [confirmBeforeRemove, setConfirmBeforeRemove] = useState(true)
  const [draggingFiles, setDraggingFiles] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [integrationNotice, setIntegrationNotice] = useState("")
  const [mergeProgress, setMergeProgress] = useState<PdfMergeProgress | null>(
    null,
  )
  const [isMerging, setIsMerging] = useState(false)
  const [announcement, setAnnouncement] = useState("")

  const totalSize = useMemo(
    () => items.reduce((total, item) => total + item.file.size, 0),
    [items],
  )
  const usagePercentage = Math.min(
    (totalSize / MAX_TOTAL_PDF_SIZE) * 100,
    100,
  )

  function addFiles(files: File[]) {
    if (files.length === 0 || isMerging) return

    let runningSize = totalSize
    let invalidCount = 0
    let limitCount = 0
    const accepted: PdfItem[] = []

    for (const file of files) {
      if (!isPdf(file)) {
        invalidCount += 1
        continue
      }

      if (runningSize + file.size > MAX_TOTAL_PDF_SIZE) {
        limitCount += 1
        continue
      }

      runningSize += file.size
      accepted.push({ id: crypto.randomUUID(), file })
    }

    if (accepted.length > 0) {
      setItems((current) => [...current, ...accepted])
      setIntegrationNotice("")
      setMergeProgress(null)
    }

    const messages: string[] = []
    if (invalidCount > 0) {
      messages.push(
        `${invalidCount} ${invalidCount === 1 ? "arquivo foi ignorado" : "arquivos foram ignorados"} por não ser PDF.`,
      )
    }
    if (limitCount > 0) {
      messages.push(
        `${limitCount} ${limitCount === 1 ? "arquivo excederia" : "arquivos excederiam"} o limite total de 100 MB.`,
      )
    }
    setError(messages.join(" "))
  }

  function removeItem(item: PdfItem) {
    if (isMerging) return

    if (
      confirmBeforeRemove &&
      !window.confirm(`Remover o arquivo "${item.file.name}" da lista?`)
    ) {
      return
    }

    setItems((current) => current.filter((currentItem) => currentItem.id !== item.id))
    setError("")
    setIntegrationNotice("")
    setMergeProgress(null)
  }

  function moveItem(id: string, direction: -1 | 1) {
    if (isMerging) return

    setItems((current) => {
      const currentIndex = current.findIndex((item) => item.id === id)
      const targetIndex = currentIndex + direction

      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= current.length) {
        return current
      }

      const reordered = [...current]
      const [movedItem] = reordered.splice(currentIndex, 1)
      reordered.splice(targetIndex, 0, movedItem)
      return reordered
    })
    setIntegrationNotice("")
    setMergeProgress(null)
  }

  function moveDraggedItem(targetId: string) {
    if (isMerging || !draggedId || draggedId === targetId) return

    setItems((current) => {
      const sourceIndex = current.findIndex((item) => item.id === draggedId)
      const targetIndex = current.findIndex((item) => item.id === targetId)

      if (sourceIndex < 0 || targetIndex < 0) return current

      const reordered = [...current]
      const [movedItem] = reordered.splice(sourceIndex, 1)
      reordered.splice(targetIndex, 0, movedItem)
      return reordered
    })
    setIntegrationNotice("")
    setMergeProgress(null)
  }

  function handleFileDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDraggingFiles(false)

    if (!isMerging && event.dataTransfer.files.length > 0) {
      addFiles(Array.from(event.dataTransfer.files))
    }
  }

  function downloadMergedPdf(bytes: Uint8Array) {
    const blob = new Blob([Uint8Array.from(bytes).buffer], {
      type: "application/pdf",
    })
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement("a")

    try {
      link.href = objectUrl
      link.download = MERGED_PDF_FILENAME
      link.hidden = true
      document.body.appendChild(link)
      link.click()
      link.remove()
    } finally {
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
    }
  }

  async function mergePdfs() {
    if (isMerging || items.length < 2) return

    setIsMerging(true)
    setError("")
    setIntegrationNotice("")
    setAnnouncement("Mesclagem iniciada.")

    try {
      const result = await mergePdfDocuments(
        items.map(({ file }) => ({
          name: file.name,
          size: file.size,
          arrayBuffer: () => file.arrayBuffer(),
        })),
        setMergeProgress,
      )

      downloadMergedPdf(result.bytes)
      const message = `${result.sourceCount} PDFs unidos em ${result.pageCount} ${
        result.pageCount === 1 ? "página" : "páginas"
      }. Download iniciado como ${MERGED_PDF_FILENAME}.`
      setIntegrationNotice(message)
      setAnnouncement(message)
    } catch (mergeError) {
      const message =
        mergeError instanceof PdfMergeValidationError
          ? mergeError.message
          : "Não foi possível juntar os PDFs. Revise os arquivos e tente novamente."

      setError(message)
      setMergeProgress(null)
      setAnnouncement(`Erro: ${message}`)
    } finally {
      setIsMerging(false)
    }
  }

  return (
    <div className="grid items-start gap-6 min-[1100px]:grid-cols-[minmax(0,1fr)_340px]">
      <section
        aria-labelledby="pdf-files-title"
        onDragEnter={(event) => {
          if (!isMerging && event.dataTransfer.types.includes("Files")) {
            event.preventDefault()
            setDraggingFiles(true)
          }
        }}
        onDragOver={(event) => {
          if (event.dataTransfer.types.includes("Files")) event.preventDefault()
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setDraggingFiles(false)
          }
        }}
        onDrop={handleFileDrop}
        className={`noir-panel min-h-[580px] rounded-xl border-dashed p-4 transition-colors sm:p-6 ${draggingFiles ? "border-brand-light bg-secondary/70" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          disabled={isMerging}
          className="sr-only"
          onChange={(event) => {
            addFiles(Array.from(event.target.files ?? []))
            event.target.value = ""
          }}
        />

        {items.length === 0 ? (
          <div className="flex min-h-[530px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background/25 px-6 text-center">
            <span className="flex size-16 items-center justify-center rounded-full border border-border bg-secondary text-brand-light">
              <Upload className="size-7" aria-hidden="true" />
            </span>
            <h2 id="pdf-files-title" className="mt-7 text-xl font-bold sm:text-2xl">
              Adicione os PDFs que deseja organizar
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              Arraste os arquivos para esta área ou selecione vários PDFs no seu
              computador. Nada será enviado durante esta etapa.
            </p>
            <button
              type="button"
              disabled={isMerging}
              onClick={() => inputRef.current?.click()}
              className="mt-6 flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
            >
              <FilePlus2 className="size-4" aria-hidden="true" />
              Selecionar arquivos
            </button>
            <p className="mt-5 text-xs text-muted-foreground">
              Somente PDF, até 100 MB no total
            </p>
          </div>
        ) : (
          <>
            <div className="mb-5 flex flex-col gap-2 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 id="pdf-files-title" className="font-semibold">
                  Arquivos selecionados
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Arraste os cards ou use as setas para alterar a ordem.
                </p>
              </div>
              <p className="text-xs font-medium text-brand-light">
                {items.length} {items.length === 1 ? "arquivo" : "arquivos"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {items.map((item, index) => (
                <article
                  key={item.id}
                  draggable={!isMerging}
                  onDragStart={(event) => {
                    setDraggedId(item.id)
                    event.dataTransfer.effectAllowed = "move"
                    event.dataTransfer.setData("text/plain", item.id)
                  }}
                  onDragEnter={() => moveDraggedItem(item.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDragEnd={() => {
                    setDraggedId(null)
                    setIntegrationNotice("")
                  }}
                  className={`group relative overflow-hidden rounded-lg border bg-card shadow-lg transition-[border-color,opacity] ${draggedId === item.id ? "border-brand-light opacity-60" : "border-border hover:border-brand"}`}
                >
                  <div className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded bg-black/75 px-2 py-1 text-[10px] font-bold text-white shadow-sm">
                    <GripVertical className="size-3" aria-hidden="true" />
                    {index + 1}
                  </div>
                  <button
                    type="button"
                    disabled={isMerging}
                    onClick={() => removeItem(item)}
                    aria-label={`Remover ${item.file.name}`}
                    className="absolute right-2 top-2 z-10 flex size-7 items-center justify-center rounded-md border border-white/20 bg-black/75 text-white shadow-sm transition-colors hover:bg-warning hover:text-background disabled:cursor-wait disabled:opacity-50"
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </button>

                  <div className="aspect-[210/297] overflow-hidden bg-white">
                    <PdfFirstPage file={item.file} />
                  </div>

                  <div className="border-t border-border bg-card p-3">
                    <p className="truncate text-xs font-semibold" title={item.file.name}>
                      {item.file.name}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-muted-foreground">
                        {formatBytes(item.file.size)}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveItem(item.id, -1)}
                          disabled={isMerging || index === 0}
                          aria-label={`Mover ${item.file.name} para a esquerda`}
                          className="flex size-7 items-center justify-center rounded border border-border text-muted-foreground hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <ArrowLeft className="size-3" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveItem(item.id, 1)}
                          disabled={isMerging || index === items.length - 1}
                          aria-label={`Mover ${item.file.name} para a direita`}
                          className="flex size-7 items-center justify-center rounded border border-border text-muted-foreground hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <ArrowRight className="size-3" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <aside className="noir-panel rounded-xl p-5 min-[1100px]:sticky min-[1100px]:top-24 sm:p-6">
        <div className="flex items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Opções
            </p>
            <h2 className="mt-2 text-lg font-bold">Adicionar mais PDF</h2>
          </div>
          <button
            type="button"
            disabled={isMerging}
            onClick={() => inputRef.current?.click()}
            aria-label="Adicionar mais arquivos PDF"
            className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-50"
          >
            <Plus className="size-5" aria-hidden="true" />
          </button>
        </div>

        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-md border border-border bg-background/25 p-3">
          <input
            type="checkbox"
            checked={confirmBeforeRemove}
            onChange={(event) => setConfirmBeforeRemove(event.target.checked)}
            className="mt-0.5 size-4 accent-current"
          />
          <span className="text-xs leading-5">
            Pedir confirmação antes de remover PDF
          </span>
        </label>

        <div className="mt-5 rounded-md border border-border bg-background/30 p-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Espaço utilizado
              </p>
              <p className="mt-1 text-sm font-bold">{formatBytes(totalSize)}</p>
            </div>
            <p className="text-xs text-muted-foreground">de 100 MB</p>
          </div>
          <div
            role="progressbar"
            aria-label="Espaço utilizado pelos PDFs"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(usagePercentage)}
            className="mt-3 h-2 overflow-hidden rounded-sm bg-secondary"
          >
            <div
              className="h-full bg-brand-light transition-[width] duration-300"
              style={{ width: `${usagePercentage}%` }}
            />
          </div>
          <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
            O limite é calculado antes de cada arquivo entrar na lista.
          </p>
        </div>

        <div className="mt-5 flex gap-3 rounded-md border border-warning/30 bg-warning/10 p-4 text-warning-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p className="text-xs leading-5">
            Para alterar a ordem, arraste os cards ou use os controles de cada
            arquivo. A lista abaixo segue a ordem final.
          </p>
        </div>

        {error ? (
          <div role="alert" className="mt-5 flex gap-3 rounded-md border border-warning/30 bg-warning/10 p-3 text-warning-foreground">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p className="text-xs leading-5">{error}</p>
          </div>
        ) : null}

        <div className="mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Resumo
          </h3>
          {items.length > 0 ? (
            <ol className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
              {items.map((item, index) => (
                <li key={item.id} className="flex items-center gap-2 rounded-md border border-border bg-secondary/40 p-2">
                  <span className="w-5 shrink-0 text-right text-[10px] text-muted-foreground">
                    {index + 1}.
                  </span>
                  <span className="flex size-7 shrink-0 items-center justify-center rounded bg-secondary text-brand-light">
                    <FileText className="size-3.5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs" title={item.file.name}>
                    {item.file.name}
                  </span>
                  <button
                    type="button"
                    disabled={isMerging}
                    onClick={() => removeItem(item)}
                    aria-label={`Remover ${item.file.name}`}
                    className="flex size-7 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-warning/15 hover:text-warning disabled:cursor-wait disabled:opacity-50"
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 rounded-md border border-dashed border-border p-4 text-center text-xs leading-5 text-muted-foreground">
              Os PDFs adicionados aparecerão aqui.
            </p>
          )}
        </div>

        <button
          type="button"
          disabled={items.length < 2 || isMerging}
          onClick={mergePdfs}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isMerging ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Download className="size-4" aria-hidden="true" />
          )}
          {isMerging ? "Juntando PDFs..." : "Juntar PDFs"}
        </button>
        {items.length < 2 ? (
          <p className="mt-2 text-center text-[10px] leading-4 text-muted-foreground">
            Adicione pelo menos dois arquivos para realizar a mesclagem.
          </p>
        ) : null}

        {mergeProgress ? (
          <div
            className="mt-4 rounded-md border border-border bg-background/30 p-3"
            role="status"
          >
            <div className="flex items-center justify-between gap-3 text-[10px] text-muted-foreground">
              <span className="min-w-0 truncate">
                {mergeProgress.stage === "done"
                  ? "PDF concluído"
                  : mergeProgress.stage === "saving"
                    ? "Finalizando o PDF"
                    : `${mergeProgress.currentFile} de ${mergeProgress.totalFiles}: ${mergeProgress.fileName}`}
              </span>
              <span>{mergeProgress.percentage}%</span>
            </div>
            <div
              role="progressbar"
              aria-label="Progresso da mesclagem"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={mergeProgress.percentage}
              className="mt-2 h-2 overflow-hidden rounded-sm bg-secondary"
            >
              <div
                className="h-full bg-brand-light transition-[width] duration-300"
                style={{ width: `${mergeProgress.percentage}%` }}
              />
            </div>
          </div>
        ) : null}

        {integrationNotice ? (
          <div
            role="status"
            className="mt-3 flex gap-3 rounded-md border border-brand-light/35 bg-secondary p-3 text-xs leading-5 text-muted-foreground"
          >
            <CheckCircle2
              className="mt-0.5 size-4 shrink-0 text-brand-light"
              aria-hidden="true"
            />
            <p>{integrationNotice}</p>
          </div>
        ) : null}

        <div className="mt-5 flex items-center justify-center gap-2 border-t border-border pt-5 text-[10px] text-muted-foreground">
          <LockKeyhole className="size-3.5" aria-hidden="true" />
          <span>Pré-visualização e mesclagem locais</span>
        </div>
      </aside>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  )
}
