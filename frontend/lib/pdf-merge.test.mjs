import assert from "node:assert/strict"
import test from "node:test"

import { EncryptedPDFError, PDFDocument } from "pdf-lib"

import {
  MAX_TOTAL_PDF_SIZE,
  PdfMergeValidationError,
  createPdfItemId,
  getPdfLoadErrorMessage,
  mergePdfDocuments,
  validatePdfMergeSources,
} from "./pdf-merge.ts"

test("usa randomUUID quando a origem oferece a API", () => {
  const expectedId = "123e4567-e89b-42d3-a456-426614174000"
  const id = createPdfItemId({
    randomUUID: () => expectedId,
  })

  assert.equal(id, expectedId)
})

test("gera UUID v4 com getRandomValues quando randomUUID não existe", () => {
  const id = createPdfItemId({
    getRandomValues: (bytes) => {
      bytes.fill(0)
      return bytes
    },
  })

  assert.equal(id, "00000000-0000-4000-8000-000000000000")
})

async function createPdfSource(name, pageWidths) {
  const document = await PDFDocument.create()
  pageWidths.forEach((width) => document.addPage([width, 400]))
  const bytes = await document.save()
  const buffer = Uint8Array.from(bytes).buffer

  return {
    name,
    size: bytes.byteLength,
    arrayBuffer: async () => buffer,
  }
}

test("preserva a ordem dos arquivos e de todas as páginas", async () => {
  const first = await createPdfSource("primeiro.pdf", [101, 102])
  const second = await createPdfSource("segundo.pdf", [201])
  const progress = []

  const result = await mergePdfDocuments([first, second], (value) => {
    progress.push(value)
  })
  const merged = await PDFDocument.load(result.bytes)

  assert.equal(result.sourceCount, 2)
  assert.equal(result.pageCount, 3)
  assert.deepEqual(
    merged.getPages().map((page) => page.getWidth()),
    [101, 102, 201],
  )
  assert.equal(progress.at(-1).stage, "done")
  assert.equal(progress.at(-1).percentage, 100)
})

test("a ordem inversa dos arquivos altera a ordem final das páginas", async () => {
  const first = await createPdfSource("primeiro.pdf", [101, 102])
  const second = await createPdfSource("segundo.pdf", [201])

  const result = await mergePdfDocuments([second, first])
  const merged = await PDFDocument.load(result.bytes)

  assert.deepEqual(
    merged.getPages().map((page) => page.getWidth()),
    [201, 101, 102],
  )
})

test("rejeita seleção insuficiente e limite acumulado", () => {
  assert.throws(
    () => validatePdfMergeSources([{ name: "um.pdf", size: 100 }]),
    PdfMergeValidationError,
  )
  assert.throws(
    () =>
      validatePdfMergeSources([
        { name: "um.pdf", size: MAX_TOTAL_PDF_SIZE },
        { name: "dois.pdf", size: 1 },
      ]),
    (error) =>
      error instanceof PdfMergeValidationError &&
      error.message.includes("100 MB"),
  )
  assert.equal(
    validatePdfMergeSources([
      { name: "um.pdf", size: MAX_TOTAL_PDF_SIZE - 1 },
      { name: "dois.pdf", size: 1 },
    ]),
    MAX_TOTAL_PDF_SIZE,
  )
})

test("rejeita PDF inválido identificando o arquivo", async () => {
  const valid = await createPdfSource("valido.pdf", [100])
  const invalidBytes = new TextEncoder().encode("não é um PDF")
  const invalid = {
    name: "corrompido.pdf",
    size: invalidBytes.byteLength,
    arrayBuffer: async () => Uint8Array.from(invalidBytes).buffer,
  }

  await assert.rejects(
    mergePdfDocuments([valid, invalid]),
    (error) =>
      error instanceof PdfMergeValidationError &&
      error.message.includes('"corrompido.pdf"') &&
      error.message.includes("inválido ou corrompido"),
  )
})

test("produz mensagem específica para PDF protegido", () => {
  assert.equal(
    getPdfLoadErrorMessage("protegido.pdf", new EncryptedPDFError()),
    'O arquivo "protegido.pdf" é protegido por senha e não pode ser mesclado.',
  )
})
