import { PDFDocument, rgb } from "pdf-lib"

export const MAX_IMAGE_FILES = 50
export const MAX_TOTAL_IMAGE_SIZE = 100 * 1024 * 1024
export const MAX_NORMALIZED_IMAGE_DIMENSION = 3000
export const IMAGES_PDF_FILENAME = "utileazy-imagens.pdf"

export type InputImageType = "image/jpeg" | "image/png" | "image/webp"
export type EmbeddedImageType = "image/jpeg" | "image/png"
export type PdfPageSize = "a4" | "image"
export type PdfImageFit = "contain" | "cover"

export interface PreparedImage {
  bytes: Uint8Array
  height: number
  type: EmbeddedImageType
  width: number
}

export interface ImagePdfSource {
  name: string
  size: number
  type: InputImageType
  prepare: () => Promise<PreparedImage>
}

export interface ImagesPdfOptions {
  fit: PdfImageFit
  margin: number
  pageSize: PdfPageSize
}

export interface ImagePdfProgress {
  currentImage: number
  fileName: string
  percentage: number
  stage: "processing" | "embedding" | "saving" | "done"
  totalImages: number
}

export interface ImagePageLayout {
  drawHeight: number
  drawWidth: number
  drawX: number
  drawY: number
  pageHeight: number
  pageWidth: number
}

export interface ImagesPdfResult {
  bytes: Uint8Array
  imageCount: number
  pageCount: number
}

export class ImageToPdfValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ImageToPdfValidationError"
  }
}

const A4_PORTRAIT = {
  width: 595.28,
  height: 841.89,
}

export function getSupportedImageType(
  file: Pick<File, "name" | "type">,
): InputImageType | null {
  if (
    file.type === "image/jpeg" ||
    file.type === "image/png" ||
    file.type === "image/webp"
  ) {
    return file.type
  }

  const extension = file.name.toLowerCase().split(".").at(-1)
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg"
  if (extension === "png") return "image/png"
  if (extension === "webp") return "image/webp"
  return null
}

export function calculateNormalizedImageDimensions(
  width: number,
  height: number,
  maxDimension = MAX_NORMALIZED_IMAGE_DIMENSION,
) {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new ImageToPdfValidationError(
      "A imagem possui dimensões inválidas.",
    )
  }

  const scale = Math.min(1, maxDimension / width, maxDimension / height)
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

export function validateImagePdfSources(
  sources: readonly Pick<ImagePdfSource, "name" | "size" | "type">[],
) {
  if (sources.length === 0) {
    throw new ImageToPdfValidationError(
      "Adicione pelo menos uma imagem para gerar o PDF.",
    )
  }
  if (sources.length > MAX_IMAGE_FILES) {
    throw new ImageToPdfValidationError(
      `O PDF pode conter no máximo ${MAX_IMAGE_FILES} imagens.`,
    )
  }

  let totalSize = 0
  for (const source of sources) {
    if (!source.name.trim()) {
      throw new ImageToPdfValidationError(
        "Todas as imagens precisam ter um nome válido.",
      )
    }
    if (!Number.isSafeInteger(source.size) || source.size <= 0) {
      throw new ImageToPdfValidationError(
        `A imagem "${source.name}" está vazia ou possui tamanho inválido.`,
      )
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(source.type)) {
      throw new ImageToPdfValidationError(
        `A imagem "${source.name}" possui formato incompatível.`,
      )
    }
    totalSize += source.size
  }

  if (totalSize > MAX_TOTAL_IMAGE_SIZE) {
    throw new ImageToPdfValidationError(
      "A soma das imagens não pode ultrapassar 100 MB.",
    )
  }

  return totalSize
}

export function validateImagesPdfOptions(options: ImagesPdfOptions) {
  if (!["a4", "image"].includes(options.pageSize)) {
    throw new ImageToPdfValidationError(
      "Selecione um tamanho de página válido.",
    )
  }
  if (!["contain", "cover"].includes(options.fit)) {
    throw new ImageToPdfValidationError("Selecione um ajuste de imagem válido.")
  }
  if (
    !Number.isFinite(options.margin) ||
    options.margin < 0 ||
    options.margin > 72
  ) {
    throw new ImageToPdfValidationError(
      "A margem deve estar entre 0 e 72 pontos.",
    )
  }

  return options
}

export function calculateImagePageLayout(
  imageWidth: number,
  imageHeight: number,
  options: ImagesPdfOptions,
): ImagePageLayout {
  calculateNormalizedImageDimensions(imageWidth, imageHeight, Infinity)
  validateImagesPdfOptions(options)

  const imageIsLandscape = imageWidth > imageHeight
  const naturalWidth = imageWidth * 0.75
  const naturalHeight = imageHeight * 0.75
  const pageWidth =
    options.pageSize === "image"
      ? naturalWidth + options.margin * 2
      : imageIsLandscape
        ? A4_PORTRAIT.height
        : A4_PORTRAIT.width
  const pageHeight =
    options.pageSize === "image"
      ? naturalHeight + options.margin * 2
      : imageIsLandscape
        ? A4_PORTRAIT.width
        : A4_PORTRAIT.height
  const availableWidth = pageWidth - options.margin * 2
  const availableHeight = pageHeight - options.margin * 2

  if (availableWidth <= 0 || availableHeight <= 0) {
    throw new ImageToPdfValidationError(
      "A margem escolhida não cabe no tamanho da página.",
    )
  }

  const widthScale = availableWidth / imageWidth
  const heightScale = availableHeight / imageHeight
  const scale =
    options.fit === "cover"
      ? Math.max(widthScale, heightScale)
      : Math.min(widthScale, heightScale)
  const drawWidth = imageWidth * scale
  const drawHeight = imageHeight * scale

  return {
    pageWidth,
    pageHeight,
    drawWidth,
    drawHeight,
    drawX: (pageWidth - drawWidth) / 2,
    drawY: (pageHeight - drawHeight) / 2,
  }
}

function coverMargins(
  page: ReturnType<PDFDocument["addPage"]>,
  pageWidth: number,
  pageHeight: number,
  margin: number,
) {
  if (margin <= 0) return

  const white = rgb(1, 1, 1)
  page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: margin, color: white })
  page.drawRectangle({
    x: 0,
    y: pageHeight - margin,
    width: pageWidth,
    height: margin,
    color: white,
  })
  page.drawRectangle({
    x: 0,
    y: margin,
    width: margin,
    height: pageHeight - margin * 2,
    color: white,
  })
  page.drawRectangle({
    x: pageWidth - margin,
    y: margin,
    width: margin,
    height: pageHeight - margin * 2,
    color: white,
  })
}

export async function createImagesPdf(
  sources: readonly ImagePdfSource[],
  options: ImagesPdfOptions,
  onProgress?: (progress: ImagePdfProgress) => void,
): Promise<ImagesPdfResult> {
  validateImagePdfSources(sources)
  validateImagesPdfOptions(options)

  const document = await PDFDocument.create()

  for (const [index, source] of sources.entries()) {
    const currentImage = index + 1
    const basePercentage = Math.round((index / sources.length) * 90)
    onProgress?.({
      currentImage,
      fileName: source.name,
      percentage: basePercentage,
      stage: "processing",
      totalImages: sources.length,
    })

    let prepared: PreparedImage
    try {
      prepared = await source.prepare()
    } catch {
      throw new ImageToPdfValidationError(
        `A imagem "${source.name}" está inválida ou não pôde ser lida.`,
      )
    }

    if (
      !prepared.bytes.byteLength ||
      !Number.isFinite(prepared.width) ||
      !Number.isFinite(prepared.height) ||
      prepared.width <= 0 ||
      prepared.height <= 0
    ) {
      throw new ImageToPdfValidationError(
        `A imagem "${source.name}" possui dados inválidos.`,
      )
    }

    onProgress?.({
      currentImage,
      fileName: source.name,
      percentage: basePercentage,
      stage: "embedding",
      totalImages: sources.length,
    })

    try {
      const embedded =
        prepared.type === "image/png"
          ? await document.embedPng(prepared.bytes)
          : await document.embedJpg(prepared.bytes)
      const layout = calculateImagePageLayout(
        prepared.width,
        prepared.height,
        options,
      )
      const page = document.addPage([layout.pageWidth, layout.pageHeight])
      page.drawImage(embedded, {
        x: layout.drawX,
        y: layout.drawY,
        width: layout.drawWidth,
        height: layout.drawHeight,
      })
      if (options.fit === "cover") {
        coverMargins(
          page,
          layout.pageWidth,
          layout.pageHeight,
          options.margin,
        )
      }
    } catch (error) {
      if (error instanceof ImageToPdfValidationError) throw error
      throw new ImageToPdfValidationError(
        `A imagem "${source.name}" está inválida ou não pôde ser incorporada.`,
      )
    }

    onProgress?.({
      currentImage,
      fileName: source.name,
      percentage: Math.round((currentImage / sources.length) * 90),
      stage: "embedding",
      totalImages: sources.length,
    })
  }

  onProgress?.({
    currentImage: sources.length,
    fileName: sources.at(-1)?.name ?? "",
    percentage: 95,
    stage: "saving",
    totalImages: sources.length,
  })

  document.setCreator("Utileazy")
  document.setProducer("Utileazy com pdf-lib")
  const bytes = await document.save({
    objectsPerTick: 50,
    useObjectStreams: true,
  })

  onProgress?.({
    currentImage: sources.length,
    fileName: sources.at(-1)?.name ?? "",
    percentage: 100,
    stage: "done",
    totalImages: sources.length,
  })

  return {
    bytes,
    imageCount: sources.length,
    pageCount: document.getPageCount(),
  }
}
