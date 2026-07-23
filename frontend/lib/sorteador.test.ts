import assert from "node:assert/strict"
import test from "node:test"

import {
  DrawValidationError,
  MAX_NUMERIC_INTERVAL_SIZE,
  drawItems,
  drawNumbers,
  drawUniqueIndices,
  normalizeListItems,
  secureRandomInt,
  validateListDraw,
  validateNumericDraw,
} from "./sorteador.ts"

function sequenceRandom(values: number[]) {
  let index = 0
  return () => {
    const value = values[index % values.length]
    index += 1
    return value
  }
}

test("secureRandomInt rejeita a faixa enviesada antes de aplicar o módulo", () => {
  const random = sequenceRandom([0xffff_ffff, 17])

  assert.equal(secureRandomInt(10, random), 7)
})

test("validateNumericDraw aceita limites inclusivos", () => {
  assert.deepEqual(validateNumericDraw("-2", "2", "5"), {
    minimum: -2,
    maximum: 2,
    quantity: 5,
    intervalSize: 5,
  })
})

test("drawNumbers mantém resultados no intervalo e sem repetição", () => {
  const settings = validateNumericDraw("10", "30", "10")
  const results = drawNumbers(
    settings,
    sequenceRandom([1, 7, 3, 12, 5, 9, 0, 2, 4, 6]),
  )

  assert.equal(results.length, 10)
  assert.equal(new Set(results).size, results.length)
  assert.ok(results.every((result) => result >= 10 && result <= 30))
})

test("intervalos inválidos ou excessivos são rejeitados", () => {
  assert.throws(
    () => validateNumericDraw("10", "1", "1"),
    DrawValidationError,
  )
  assert.throws(
    () =>
      validateNumericDraw(
        "1",
        String(MAX_NUMERIC_INTERVAL_SIZE + 1),
        "1",
      ),
    /intervalo pode conter no máximo/,
  )
  assert.throws(
    () => validateNumericDraw("1.5", "10", "1"),
    /número inteiro válido/,
  )
})

test("a quantidade numérica não pode superar as opções disponíveis", () => {
  assert.throws(
    () => validateNumericDraw("1", "3", "4"),
    /números disponíveis/,
  )
})

test("normalizeListItems remove vazios e duplicados quando solicitado", () => {
  const rawItems = " Ana \n\nBruno\r\nAna\n Carla "

  assert.deepEqual(normalizeListItems(rawItems, true), [
    "Ana",
    "Bruno",
    "Carla",
  ])
  assert.deepEqual(normalizeListItems(rawItems, false), [
    "Ana",
    "Bruno",
    "Ana",
    "Carla",
  ])
})

test("validateListDraw trata linhas iguais como entradas distintas quando configurado", () => {
  assert.deepEqual(validateListDraw("Ana\nAna\nBruno", "3", false), {
    items: ["Ana", "Ana", "Bruno"],
    quantity: 3,
  })

  assert.throws(
    () => validateListDraw("Ana\nAna\nBruno", "3", true),
    /itens disponíveis/,
  )
})

test("drawUniqueIndices nunca retorna o mesmo índice duas vezes", () => {
  const indices = drawUniqueIndices(
    50,
    50,
    sequenceRandom([4, 12, 1, 9, 2, 20, 6, 0, 3, 7]),
  )

  assert.equal(indices.length, 50)
  assert.equal(new Set(indices).size, 50)
  assert.ok(indices.every((index) => index >= 0 && index < 50))
})

test("drawItems preserva somente itens pertencentes à lista", () => {
  const items = ["A", "B", "C", "D"]
  const results = drawItems(items, 3, sequenceRandom([2, 0, 1]))

  assert.equal(results.length, 3)
  assert.equal(new Set(results).size, 3)
  assert.ok(results.every((result) => items.includes(result)))
})
