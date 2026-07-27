"use client"

import type { DragEvent } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  FileImage,
  GripVertical,
  ImagePlus,
  Info,
  LoaderCircle,
  LockKeyhole,
  Plus,
  Trash2,
  Upload,
} from "lucide-react"

import {
  IMAGES_PDF_FILENAME,
  MAX_IMAGE_FILES,
  MAX_TOTAL_IMAGE_SIZE,
  ImageToPdfValidationError,
  calculateNormalizedImageDimensions,
  createImagesPdf,
  getSupportedImageType,
  type EmbeddedImageType,
  type ImagePdfProgress,
  type ImagesPdfOptions,
  type InputImageType,
  type PreparedImage,
} from "@/lib/image-to-pdf"
import { createPdfItemId } from "@/lib/pdf-merge"

interface ImageItem {
  file: File
  id: string
  previewUrl: string
  type: InputImageType
}

interface DecodedImage {
  height: number
  source: CanvasImageSource
  width: number
  release: () => void
}

const initialOptions: ImagesPdfOptions = {
  pageSize: "a4",
  margin: 18,
  fit: "contain",
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 MB"
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    })
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      release: () => bitmap.close(),
    }
  }

  const objectUrl = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.decoding = "async"
    image.src = objectUrl
    await image.decode()

    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => URL.revokeObjectURL(objectUrl),
    }
  } catch (error) {
    URL.revokeObjectURL(objectUrl)
    throw error
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: EmbeddedImageType,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error("O navegador não conseguiu converter a imagem."))
        }
      },
      type,
      type === "image/jpeg" ? 0.9 : undefined,
    )
  })
}

async function normalizeImageFile(
  file: File,
  inputType: InputImageType,
): Promise<PreparedImage> {
  const decoded = await decodeImage(file)
  const canvas = document.createElement("canvas")

  try {
    const dimensions = calculateNormalizedImageDimensions(
      decoded.width,
      decoded.height,
    )
    canvas.width = dimensions.width
    canvas.height = dimensions.height
    const context = canvas.getContext("2d", {
      alpha: inputType === "image/png",
    })

    if (!context) {
      throw new Error("Canvas indisponível.")
    }

    const outputType: EmbeddedImageType =
      inputType === "image/png" ? "image/png" : "image/jpeg"
    if (outputType === "image/jpeg") {
      context.fillStyle = "#ffffff"
      context.fillRect(0, 0, canvas.width, canvas.height)
    }
    context.drawImage(decoded.source, 0, 0, canvas.width, canvas.height)

    const blob = await canvasToBlob(canvas, outputType)
    return {
      bytes: new Uint8Array(await blob.arrayBuffer()),
      width: canvas.width,
      height: canvas.height,
      type: outputType,
    }
  } finally {
    decoded.release()
    canvas.width = 0
    canvas.height = 0
  }
}

export function ImageToPdfWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null)
  const previewUrlsRef = useRef(new Set<string>())
  const [items, setItems] = useState<ImageItem[]>([])
  const [options, setOptions] = useState<ImagesPdfOptions>(initialOptions)
  const [draggingFiles, setDraggingFiles] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState<ImagePdfProgress | null>(null)
  const [error, setError] = useState("")
  const [resultNotice, setResultNotice] = useState("")
  const [announcement, setAnnouncement] = useState("")

  useEffect(
    () => () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
      previewUrlsRef.current.clear()
    },
    [],
  )

  const totalSize = useMemo(
    () => items.reduce((total, item) => total + item.file.size, 0),
    [items],
  )
  const usagePercentage = Math.min(
    (totalSize / MAX_TOTAL_IMAGE_SIZE) * 100,
    100,
  )

  function clearGeneratedResult() {
    setProgress(null)
    setResultNotice("")
  }

  function addFiles(files: File[]) {
    if (files.length === 0 || isGenerating) return

    let runningSize = totalSize
    let invalidCount = 0
    let limitCount = 0
    let countLimit = 0
    const accepted: ImageItem[] = []

    for (const file of files) {
      const type = getSupportedImageType(file)
      if (!type || file.size <= 0) {
        invalidCount += 1
        continue
      }
      if (items.length + accepted.length >= MAX_IMAGE_FILES) {
        countLimit += 1
        continue
      }
      if (runningSize + file.size > MAX_TOTAL_IMAGE_SIZE) {
        limitCount += 1
        continue
      }

      const previewUrl = URL.createObjectURL(file)
      previewUrlsRef.current.add(previewUrl)
      runningSize += file.size
      accepted.push({
        file,
        type,
        previewUrl,
        id: createPdfItemId(),
      })
    }

    if (accepted.length > 0) {
      setItems((current) => [...current, ...accepted])
      clearGeneratedResult()
    }

    const messages: string[] = []
    if (invalidCount > 0) {
      messages.push(
        `${invalidCount} ${
          invalidCount === 1 ? "arquivo foi ignorado" : "arquivos foram ignorados"
        } por não ser JPEG, PNG ou WebP válido.`,
      )
    }
    if (countLimit > 0) {
      messages.push(
        `${countLimit} ${
          countLimit === 1 ? "imagem excederia" : "imagens excederiam"
        } o limite de ${MAX_IMAGE_FILES} arquivos.`,
      )
    }
    if (limitCount > 0) {
      messages.push(
        `${limitCount} ${
          limitCount === 1 ? "imagem excederia" : "imagens excederiam"
        } o limite total de 100 MB.`,
      )
    }
    setError(messages.join(" "))
  }

  function removeItem(item: ImageItem) {
    if (isGenerating) return

    URL.revokeObjectURL(item.previewUrl)
    previewUrlsRef.current.delete(item.previewUrl)
    setItems((current) =>
      current.filter((currentItem) => currentItem.id !== item.id),
    )
    setError("")
    clearGeneratedResult()
  }

  function moveItem(id: string, direction: -1 | 1) {
    if (isGenerating) return

    setItems((current) => {
      const currentIndex = current.findIndex((item) => item.id === id)
      const targetIndex = currentIndex + direction
      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= current.length) {
        return current
      }

      const reordered = [...current]
      const [moved] = reordered.splice(currentIndex, 1)
      reordered.splice(targetIndex, 0, moved)
      return reordered
    })
    clearGeneratedResult()
  }

  function moveDraggedItem(targetId: string) {
    if (isGenerating || !draggedId || draggedId === targetId) return

    setItems((current) => {
      const sourceIndex = current.findIndex((item) => item.id === draggedId)
      const targetIndex = current.findIndex((item) => item.id === targetId)
      if (sourceIndex < 0 || targetIndex < 0) return current

      const reordered = [...current]
      const [moved] = reordered.splice(sourceIndex, 1)
      reordered.splice(targetIndex, 0, moved)
      return reordered
    })
    clearGeneratedResult()
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDraggingFiles(false)
    if (!isGenerating && event.dataTransfer.files.length > 0) {
      addFiles(Array.from(event.dataTransfer.files))
    }
  }

  function updateOptions(patch: Partial<ImagesPdfOptions>) {
    setOptions((current) => ({ ...current, ...patch }))
    clearGeneratedResult()
  }

  function downloadPdf(bytes: Uint8Array) {
    const blob = new Blob([Uint8Array.from(bytes).buffer], {
      type: "application/pdf",
    })
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement("a")

    try {
      link.href = objectUrl
      link.download = IMAGES_PDF_FILENAME
      link.hidden = true
      document.body.appendChild(link)
      link.click()
      link.remove()
    } finally {
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
    }
  }

  async function generatePdf() {
    if (isGenerating || items.length === 0) return

    setIsGenerating(true)
    setError("")
    setResultNotice("")
    setAnnouncement("Geração do PDF iniciada.")

    try {
      const result = await createImagesPdf(
        items.map((item) => ({
          name: item.file.name,
          size: item.file.size,
          type: item.type,
          prepare: () => normalizeImageFile(item.file, item.type),
        })),
        options,
        setProgress,
      )

      downloadPdf(result.bytes)
      const message = `${result.imageCount} ${
        result.imageCount === 1 ? "imagem convertida" : "imagens convertidas"
      } em ${result.pageCount} ${
        result.pageCount === 1 ? "página" : "páginas"
      }. Download iniciado como ${IMAGES_PDF_FILENAME}.`
      setResultNotice(message)
      setAnnouncement(message)
    } catch (generationError) {
      const message =
        generationError instanceof ImageToPdfValidationError
          ? generationError.message
          : "Não foi possível gerar o PDF. Revise as imagens e tente novamente."
      setError(message)
      setProgress(null)
      setAnnouncement(`Erro: ${message}`)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="grid items-start gap-6 min-[1100px]:grid-cols-[minmax(0,1fr)_340px]">
      <section
        aria-labelledby="image-files-title"
        onDragEnter={(event) => {
          if (!isGenerating && event.dataTransfer.types.includes("Files")) {
            event.preventDefault()
            setDraggingFiles(true)
          }
        }}
        onDragOver={(event) => {
          if (!isGenerating && event.dataTransfer.types.includes("Files")) {
            event.preventDefault()
          }
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setDraggingFiles(false)
          }
        }}
        onDrop={handleDrop}
        className={`noir-panel min-h-[580px] rounded-xl border-dashed p-4 transition-colors sm:p-6 ${
          draggingFiles ? "border-brand-light bg-secondary/70" : ""
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          multiple
          disabled={isGenerating}
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
            <h2
              id="image-files-title"
              className="mt-7 text-xl font-bold sm:text-2xl"
            >
              Adicione as imagens do seu PDF
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              Arraste imagens para esta área ou selecione arquivos JPEG, PNG e
              WebP. O processamento acontece somente neste navegador.
            </p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-6 flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              <ImagePlus className="size-4" aria-hidden="true" />
              Selecionar imagens
            </button>
            <p className="mt-5 text-xs text-muted-foreground">
              Até {MAX_IMAGE_FILES} imagens e 100 MB no total
            </p>
          </div>
        ) : (
          <>
            <div className="mb-5 flex flex-col gap-2 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 id="image-files-title" className="font-semibold">
                  Imagens selecionadas
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Cada imagem gera uma página na ordem abaixo.
                </p>
              </div>
              <p className="text-xs font-medium text-brand-light">
                {items.length} {items.length === 1 ? "imagem" : "imagens"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {items.map((item, index) => (
                <article
                  key={item.id}
                  draggable={!isGenerating}
                  onDragStart={(event) => {
                    setDraggedId(item.id)
                    event.dataTransfer.effectAllowed = "move"
                    event.dataTransfer.setData("text/plain", item.id)
                  }}
                  onDragEnter={() => moveDraggedItem(item.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDragEnd={() => setDraggedId(null)}
                  className={`group relative overflow-hidden rounded-lg border bg-card shadow-lg transition-[border-color,opacity] ${
                    draggedId === item.id
                      ? "border-brand-light opacity-60"
                      : "border-border hover:border-brand"
                  }`}
                >
                  <div className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded bg-black/75 px-2 py-1 text-[10px] font-bold text-white shadow-sm">
                    <GripVertical className="size-3" aria-hidden="true" />
                    {index + 1}
                  </div>
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={() => removeItem(item)}
                    aria-label={`Remover ${item.file.name}`}
                    className="absolute right-2 top-2 z-10 flex size-7 items-center justify-center rounded-md border border-white/20 bg-black/75 text-white shadow-sm hover:bg-warning hover:text-background disabled:opacity-50"
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </button>

                  <div className="aspect-square overflow-hidden bg-white">
                    <img
                      src={item.previewUrl}
                      alt={`Pré-visualização de ${item.file.name}`}
                      className="size-full object-contain"
                    />
                  </div>

                  <div className="border-t border-border bg-card p-3">
                    <p
                      className="truncate text-xs font-semibold"
                      title={item.file.name}
                    >
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
                          disabled={isGenerating || index === 0}
                          aria-label={`Mover ${item.file.name} para a esquerda`}
                          className="flex size-7 items-center justify-center rounded border border-border text-muted-foreground hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <ArrowLeft className="size-3" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveItem(item.id, 1)}
                          disabled={isGenerating || index === items.length - 1}
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
            <h2 className="mt-2 text-lg font-bold">Configurar PDF</h2>
          </div>
          <button
            type="button"
            disabled={isGenerating}
            onClick={() => inputRef.current?.click()}
            aria-label="Adicionar mais imagens"
            className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-xs font-medium">
            Tamanho da página
            <select
              value={options.pageSize}
              disabled={isGenerating}
              onChange={(event) =>
                updateOptions({
                  pageSize: event.target.value as ImagesPdfOptions["pageSize"],
                })
              }
              className="min-h-11 rounded-md border border-border bg-background/65 px-3 text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/25"
            >
              <option value="a4">A4</option>
              <option value="image">Tamanho da imagem</option>
            </select>
          </label>

          <label className="grid gap-2 text-xs font-medium">
            Margem
            <select
              value={options.margin}
              disabled={isGenerating}
              onChange={(event) =>
                updateOptions({ margin: Number(event.target.value) })
              }
              className="min-h-11 rounded-md border border-border bg-background/65 px-3 text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/25"
            >
              <option value="0">Sem margem</option>
              <option value="18">Pequena</option>
              <option value="36">Média</option>
              <option value="54">Grande</option>
            </select>
          </label>

          <label className="grid gap-2 text-xs font-medium">
            Ajuste da imagem
            <select
              value={options.fit}
              disabled={isGenerating}
              onChange={(event) =>
                updateOptions({
                  fit: event.target.value as ImagesPdfOptions["fit"],
                })
              }
              className="min-h-11 rounded-md border border-border bg-background/65 px-3 text-sm outline-none focus:border-brand-light focus:ring-2 focus:ring-brand-light/25"
            >
              <option value="contain">Conter imagem inteira</option>
              <option value="cover">Preencher página (pode cortar)</option>
            </select>
          </label>
        </div>

        <div className="mt-5 rounded-md border border-border bg-background/30 p-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Arquivos selecionados
              </p>
              <p className="mt-1 text-sm font-bold">
                {items.length}/{MAX_IMAGE_FILES} · {formatBytes(totalSize)}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">de 100 MB</p>
          </div>
          <div
            role="progressbar"
            aria-label="Espaço utilizado pelas imagens"
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
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-5 flex gap-3 rounded-md border border-warning/30 bg-warning/10 p-3 text-warning-foreground"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p className="text-xs leading-5">{error}</p>
          </div>
        ) : null}

        <div className="mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Ordem das páginas
          </h3>
          {items.length > 0 ? (
            <ol className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
              {items.map((item, index) => (
                <li
                  key={item.id}
                  className="flex items-center gap-2 rounded-md border border-border bg-secondary/40 p-2"
                >
                  <span className="w-5 shrink-0 text-right text-[10px] text-muted-foreground">
                    {index + 1}.
                  </span>
                  <span className="flex size-7 shrink-0 items-center justify-center rounded bg-secondary text-brand-light">
                    <FileImage className="size-3.5" aria-hidden="true" />
                  </span>
                  <span
                    className="min-w-0 flex-1 truncate text-xs"
                    title={item.file.name}
                  >
                    {item.file.name}
                  </span>
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={() => removeItem(item)}
                    aria-label={`Remover ${item.file.name}`}
                    className="flex size-7 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-warning/15 hover:text-warning disabled:opacity-50"
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 rounded-md border border-dashed border-border p-4 text-center text-xs leading-5 text-muted-foreground">
              As imagens adicionadas aparecerão aqui.
            </p>
          )}
        </div>

        <button
          type="button"
          disabled={items.length === 0 || isGenerating}
          onClick={generatePdf}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isGenerating ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Download className="size-4" aria-hidden="true" />
          )}
          {isGenerating ? "Gerando PDF..." : "Gerar e baixar PDF"}
        </button>

        {progress ? (
          <div
            className="mt-4 rounded-md border border-border bg-background/30 p-3"
            role="status"
          >
            <div className="flex items-center justify-between gap-3 text-[10px] text-muted-foreground">
              <span className="min-w-0 truncate">
                {progress.stage === "done"
                  ? "PDF concluído"
                  : progress.stage === "saving"
                    ? "Finalizando o PDF"
                    : `${progress.currentImage} de ${progress.totalImages}: ${progress.fileName}`}
              </span>
              <span>{progress.percentage}%</span>
            </div>
            <div
              role="progressbar"
              aria-label="Progresso da geração do PDF"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress.percentage}
              className="mt-2 h-2 overflow-hidden rounded-sm bg-secondary"
            >
              <div
                className="h-full bg-brand-light transition-[width] duration-300"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
        ) : null}

        {resultNotice ? (
          <div
            role="status"
            className="mt-3 flex gap-3 rounded-md border border-brand-light/35 bg-secondary p-3 text-xs leading-5 text-muted-foreground"
          >
            <CheckCircle2
              className="mt-0.5 size-4 shrink-0 text-brand-light"
              aria-hidden="true"
            />
            <p>{resultNotice}</p>
          </div>
        ) : null}

        <div className="mt-5 flex items-center justify-center gap-2 border-t border-border pt-5 text-[10px] text-muted-foreground">
          <LockKeyhole className="size-3.5" aria-hidden="true" />
          <span>Imagens e PDF processados localmente</span>
        </div>
      </aside>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  )
}
