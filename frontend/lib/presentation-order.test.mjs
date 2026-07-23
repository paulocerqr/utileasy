import assert from "node:assert/strict"
import test from "node:test"

import {
  MAX_PRESENTATION_NAME_LENGTH,
  MAX_PRESENTATION_PARTICIPANTS,
  PresentationOrderValidationError,
  analyzeParticipants,
  formatPresentationOrder,
  shufflePresentationOrder,
  validateParticipants,
} from "./presentation-order.ts"

function sequenceRandom(values) {
  let index = 0
  return () => {
    const value = values[index % values.length]
    index += 1
    return value
  }
}

test("analyzeParticipants remove vazios e normaliza espaços", () => {
  const analysis = analyzeParticipants(
    "  Ana Silva  \n\nBruno\r\nEquipe   Azul  ",
  )

  assert.deepEqual(analysis, {
    participants: ["Ana Silva", "Bruno", "Equipe Azul"],
    duplicates: [],
  })
})

test("analyzeParticipants encontra duplicados ignorando maiúsculas", () => {
  const analysis = analyzeParticipants("Ana\nBruno\nana\nBRUNO\nAna")

  assert.deepEqual(analysis.duplicates, ["Ana", "Bruno"])
})

test("validateParticipants exige pelo menos dois nomes", () => {
  assert.throws(
    () => validateParticipants("\nAna\n"),
    PresentationOrderValidationError,
  )
})

test("validateParticipants rejeita duplicados antes do sorteio", () => {
  assert.throws(
    () => validateParticipants("Ana\nBruno\nana"),
    /participantes repetidos: Ana/,
  )
})

test("validateParticipants aplica limites de quantidade e tamanho", () => {
  const tooManyParticipants = Array.from(
    { length: MAX_PRESENTATION_PARTICIPANTS + 1 },
    (_, index) => `Pessoa ${index}`,
  ).join("\n")
  const longName = "A".repeat(MAX_PRESENTATION_NAME_LENGTH + 1)

  assert.throws(
    () => validateParticipants(tooManyParticipants),
    /no máximo 500 participantes/,
  )
  assert.throws(
    () => validateParticipants(`${longName}\nBruno`),
    /no máximo 120 caracteres/,
  )
})

test("shufflePresentationOrder preserva todos os participantes uma única vez", () => {
  const participants = ["Ana", "Bruno", "Carla", "Diego", "Elisa"]
  const result = shufflePresentationOrder(
    participants,
    sequenceRandom([2, 0, 1, 0]),
  )

  assert.equal(result.length, participants.length)
  assert.equal(new Set(result).size, participants.length)
  assert.deepEqual([...result].sort(), [...participants].sort())
  assert.deepEqual(participants, ["Ana", "Bruno", "Carla", "Diego", "Elisa"])
})

test("formatPresentationOrder numera a lista a partir de um", () => {
  assert.equal(
    formatPresentationOrder(["Carla", "Ana", "Bruno"]),
    "Ordem de apresentação\n\n1. Carla\n2. Ana\n3. Bruno",
  )
})
