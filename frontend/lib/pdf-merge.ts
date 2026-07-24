import { EncryptedPDFError, PDFDocument } from "pdf-lib"

export const MIN_PDF_FILES = 2
export const MAX_TOTAL_PDF_SIZE = 100 * 1024 * 1024
export const MERGED_PDF_FILENAME = "utileazy-pdfs-unidos.pdf"

export interface PdfMergeSource {
  name: string
  size: number
  arrayBuffer: () => Promise<ArrayBuffer>
}

export interface PdfMergeProgress {
  currentFile: number
  fileName: string
  percentage: number
  stage: "reading" | "copying" | "saving" | "done"
  totalFiles: number
}

export interface PdfMergeResult {
  bytes: Uint8Array
  pageCount: number
  sourceCount: number
}

export class PdfMergeValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PdfMergeValidationError"
  }
}

let fallbackIdSequence = 0

export function createPdfItemId(
  randomSource: Crypto | undefined = globalThis.crypto,
) {
  if (typeof randomSource?.randomUUID === "function") {
    return randomSource.randomUUID()
  }

  if (typeof randomSource?.getRandomValues === "function") {
    const bytes = randomSource.getRandomValues(new Uint8Array(16))
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, "0"),
    )

    return [
      hex.slice(0, 4).join(""),
      hex.slice(4, 6).join(""),
      hex.slice(6, 8).join(""),
      hex.slice(8, 10).join(""),
      hex.slice(10, 16).join(""),
    ].join("-")
  }

  fallbackIdSequence += 1
  return [
    "pdf",
    Date.now().toString(36),
    fallbackIdSequence.toString(36),
    Math.random().toString(36).slice(2),
  ].join("-")
}

export function validatePdfMergeSources(
  sources: readonly Pick<PdfMergeSource, "name" | "size">[],
) {
  if (sources.length < MIN_PDF_FILES) {
    throw new PdfMergeValidationError(
      "Adicione pelo menos dois arquivos PDF para realizar a mesclagem.",
    )
  }

  let totalSize = 0
  for (const source of sources) {
    if (!source.name.trim()) {
      throw new PdfMergeValidationError(
        "Todos os arquivos PDF precisam ter um nome válido.",
      )
    }
    if (!Number.isSafeInteger(source.size) || source.size <= 0) {
      throw new PdfMergeValidationError(
        `O arquivo "${source.name}" está vazio ou possui tamanho inválido.`,
      )
    }
    totalSize += source.size
  }

  if (totalSize > MAX_TOTAL_PDF_SIZE) {
    throw new PdfMergeValidationError(
      "A soma dos arquivos não pode ultrapassar 100 MB.",
    )
  }

  return totalSize
}

export function getPdfLoadErrorMessage(fileName: string, error: unknown) {
  if (
    error instanceof EncryptedPDFError ||
    (error instanceof Error &&
      /encrypted|password|senha|protected/i.test(error.message))
  ) {
    return `O arquivo "${fileName}" é protegido por senha e não pode ser mesclado.`
  }

  return `O arquivo "${fileName}" está inválido ou corrompido.`
}

export async function mergePdfDocuments(
  sources: readonly PdfMergeSource[],
  onProgress?: (progress: PdfMergeProgress) => void,
): Promise<PdfMergeResult> {
  validatePdfMergeSources(sources)

  const mergedDocument = await PDFDocument.create()
  let pageCount = 0

  for (const [index, source] of sources.entries()) {
    const currentFile = index + 1
    const basePercentage = Math.round((index / sources.length) * 90)

    onProgress?.({
      currentFile,
      fileName: source.name,
      percentage: basePercentage,
      stage: "reading",
      totalFiles: sources.length,
    })

    let sourceDocument: PDFDocument
    try {
      const sourceBytes = new Uint8Array(await source.arrayBuffer())
      sourceDocument = await PDFDocument.load(sourceBytes, {
        updateMetadata: false,
      })
    } catch (error) {
      throw new PdfMergeValidationError(
        getPdfLoadErrorMessage(source.name, error),
      )
    }

    if (sourceDocument.isEncrypted) {
      throw new PdfMergeValidationError(
        getPdfLoadErrorMessage(source.name, new EncryptedPDFError()),
      )
    }

    try {
      const pageIndices = sourceDocument.getPageIndices()
      if (pageIndices.length === 0) {
        throw new PdfMergeValidationError(
          `O arquivo "${source.name}" não possui páginas.`,
        )
      }

      onProgress?.({
        currentFile,
        fileName: source.name,
        percentage: basePercentage,
        stage: "copying",
        totalFiles: sources.length,
      })

      const copiedPages = await mergedDocument.copyPages(
        sourceDocument,
        pageIndices,
      )
      copiedPages.forEach((page) => mergedDocument.addPage(page))
      pageCount += copiedPages.length
    } catch (error) {
      if (error instanceof PdfMergeValidationError) throw error
      throw new PdfMergeValidationError(
        getPdfLoadErrorMessage(source.name, error),
      )
    }

    onProgress?.({
      currentFile,
      fileName: source.name,
      percentage: Math.round((currentFile / sources.length) * 90),
      stage: "copying",
      totalFiles: sources.length,
    })
  }

  onProgress?.({
    currentFile: sources.length,
    fileName: sources.at(-1)?.name ?? "",
    percentage: 95,
    stage: "saving",
    totalFiles: sources.length,
  })

  mergedDocument.setCreator("Utileazy")
  mergedDocument.setProducer("Utileazy com pdf-lib")
  const bytes = await mergedDocument.save({
    objectsPerTick: 50,
    useObjectStreams: true,
  })

  onProgress?.({
    currentFile: sources.length,
    fileName: sources.at(-1)?.name ?? "",
    percentage: 100,
    stage: "done",
    totalFiles: sources.length,
  })

  return {
    bytes,
    pageCount,
    sourceCount: sources.length,
  }
}
