import assert from "node:assert/strict"
import test from "node:test"

import {
  GroupDividerValidationError,
  divideParticipantsIntoGroups,
  formatAllParticipantGroups,
  validateGroupDivision,
} from "./group-divider.ts"

function sequenceRandom(values) {
  let index = 0
  return () => {
    const value = values[index % values.length]
    index += 1
    return value
  }
}

function participants(count) {
  return Array.from({ length: count }, (_, index) => `Pessoa ${index + 1}`)
}

function flattenGroups(groups) {
  return groups.flatMap((group) => group.members)
}

test("modo por quantidade cria grupos iguais em uma divisão exata", () => {
  const names = participants(8)
  const settings = validateGroupDivision(names.join("\n"), "group-count", "4")
  const groups = divideParticipantsIntoGroups(
    settings,
    sequenceRandom([1, 3, 0, 2]),
  )

  assert.equal(groups.length, 4)
  assert.deepEqual(
    groups.map((group) => group.members.length),
    [2, 2, 2, 2],
  )
})

test("modo por quantidade distribui restos com diferença máxima de um", () => {
  const names = participants(10)
  const settings = validateGroupDivision(names.join("\n"), "group-count", "3")
  const groups = divideParticipantsIntoGroups(
    settings,
    sequenceRandom([2, 5, 1, 0]),
  )
  const sizes = groups.map((group) => group.members.length)

  assert.equal(Math.max(...sizes) - Math.min(...sizes), 1)
  assert.deepEqual(sizes, [4, 3, 3])
})

test("modo por tamanho nunca ultrapassa o máximo configurado", () => {
  const names = participants(10)
  const settings = validateGroupDivision(names.join("\n"), "max-size", "3")
  const groups = divideParticipantsIntoGroups(
    settings,
    sequenceRandom([4, 1, 7, 2]),
  )

  assert.equal(groups.length, 4)
  assert.ok(groups.every((group) => group.members.length <= 3))
})

test("cada participante aparece exatamente uma vez", () => {
  const names = participants(17)
  const settings = validateGroupDivision(names.join("\n"), "group-count", "5")
  const groups = divideParticipantsIntoGroups(
    settings,
    sequenceRandom([3, 8, 1, 6, 0]),
  )
  const assigned = flattenGroups(groups)

  assert.equal(assigned.length, names.length)
  assert.equal(new Set(assigned).size, names.length)
  assert.deepEqual([...assigned].sort(), [...names].sort())
})

test("nomes duplicados são rejeitados antes da divisão", () => {
  assert.throws(
    () => validateGroupDivision("Ana\nBruno\nana", "group-count", "2"),
    /participantes repetidos: Ana/,
  )
})

test("configurações impossíveis ou inválidas são rejeitadas", () => {
  assert.throws(
    () => validateGroupDivision("Ana\nBruno", "group-count", "1"),
    GroupDividerValidationError,
  )
  assert.throws(
    () => validateGroupDivision("Ana\nBruno", "group-count", "3"),
    /não pode superar/,
  )
  assert.throws(
    () => validateGroupDivision("Ana\nBruno\nCarla", "max-size", "3"),
    /pelo menos dois grupos/,
  )
  assert.throws(
    () => validateGroupDivision("Ana\nBruno\nCarla", "max-size", "1.5"),
    /número inteiro positivo/,
  )
})

test("formatação usa os nomes personalizados dos grupos", () => {
  assert.equal(
    formatAllParticipantGroups([
      { id: "group-1", name: "Frontend", members: ["Ana", "Bruno"] },
      { id: "group-2", name: "Backend", members: ["Carla"] },
    ]),
    "Frontend\n1. Ana\n2. Bruno\n\nBackend\n1. Carla",
  )
})
