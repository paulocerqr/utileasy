import assert from "node:assert/strict"
import test from "node:test"

import { PDFDocument } from "pdf-lib"

import {
  MAX_IMAGE_FILES,
  MAX_TOTAL_IMAGE_SIZE,
  ImageToPdfValidationError,
  calculateImagePageLayout,
  calculateNormalizedImageDimensions,
  createImagesPdf,
  getSupportedImageType,
  validateImagePdfSources,
} from "./image-to-pdf.ts"

const transparentPng = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nWQAAAAASUVORK5CYII=",
    "base64",
  ),
)

function createPngSource(name, width, height) {
  return {
    name,
    size: transparentPng.byteLength,
    type: "image/png",
    prepare: async () => ({
      bytes: transparentPng,
      width,
      height,
      type: "image/png",
    }),
  }
}

test("reconhece JPEG, PNG e WebP por MIME ou extensão", () => {
  assert.equal(
    getSupportedImageType({ name: "foto.bin", type: "image/jpeg" }),
    "image/jpeg",
  )
  assert.equal(
    getSupportedImageType({ name: "imagem.PNG", type: "" }),
    "image/png",
  )
  assert.equal(
    getSupportedImageType({ name: "imagem.webp", type: "" }),
    "image/webp",
  )
  assert.equal(
    getSupportedImageType({ name: "imagem.gif", type: "image/gif" }),
    null,
  )
})

test("redimensiona imagens grandes preservando a proporção", () => {
  assert.deepEqual(calculateNormalizedImageDimensions(6000, 4000), {
    width: 3000,
    height: 2000,
  })
  assert.deepEqual(calculateNormalizedImageDimensions(1200, 800), {
    width: 1200,
    height: 800,
  })
})

test("calcula A4 com orientação automática, margem e ajuste", () => {
  const portrait = calculateImagePageLayout(1000, 2000, {
    pageSize: "a4",
    margin: 36,
    fit: "contain",
  })
  const landscape = calculateImagePageLayout(2000, 1000, {
    pageSize: "a4",
    margin: 36,
    fit: "cover",
  })

  assert.ok(portrait.pageHeight > portrait.pageWidth)
  assert.ok(landscape.pageWidth > landscape.pageHeight)
  assert.ok(portrait.drawWidth <= portrait.pageWidth - 72)
  assert.ok(landscape.drawWidth >= landscape.pageWidth - 72)
})

test("tamanho da imagem preserva proporção e inclui margem", () => {
  const layout = calculateImagePageLayout(800, 600, {
    pageSize: "image",
    margin: 18,
    fit: "contain",
  })

  assert.equal(layout.pageWidth, 636)
  assert.equal(layout.pageHeight, 486)
  assert.equal(layout.drawWidth, 600)
  assert.equal(layout.drawHeight, 450)
})

test("gera uma página por imagem na ordem escolhida", async () => {
  const result = await createImagesPdf(
    [
      createPngSource("vertical.png", 100, 200),
      createPngSource("horizontal.png", 300, 100),
    ],
    { pageSize: "a4", margin: 0, fit: "contain" },
  )
  const pdf = await PDFDocument.load(result.bytes)
  const pages = pdf.getPages()

  assert.equal(result.imageCount, 2)
  assert.equal(result.pageCount, 2)
  assert.ok(pages[0].getHeight() > pages[0].getWidth())
  assert.ok(pages[1].getWidth() > pages[1].getHeight())
})

test("rejeita arquivo inválido e limites de quantidade e tamanho", async () => {
  assert.throws(
    () =>
      validateImagePdfSources(
        Array.from({ length: MAX_IMAGE_FILES + 1 }, (_, index) => ({
          name: `${index}.png`,
          size: 1,
          type: "image/png",
        })),
      ),
    ImageToPdfValidationError,
  )
  assert.throws(
    () =>
      validateImagePdfSources([
        { name: "uma.png", size: MAX_TOTAL_IMAGE_SIZE, type: "image/png" },
        { name: "duas.png", size: 1, type: "image/png" },
      ]),
    ImageToPdfValidationError,
  )

  await assert.rejects(
    createImagesPdf(
      [
        createPngSource("valida.png", 100, 100),
        {
          ...createPngSource("invalida.png", 100, 100),
          prepare: async () => {
            throw new Error("falha")
          },
        },
      ],
      { pageSize: "a4", margin: 0, fit: "contain" },
    ),
    (error) =>
      error instanceof ImageToPdfValidationError &&
      error.message.includes('"invalida.png"'),
  )
})
