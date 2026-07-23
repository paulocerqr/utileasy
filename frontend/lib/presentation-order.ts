export const MIN_PRESENTATION_PARTICIPANTS = 2
export const MAX_PRESENTATION_PARTICIPANTS = 500
export const MAX_PRESENTATION_NAME_LENGTH = 120

const UINT32_RANGE = 0x1_0000_0000
const UINT32_MAX = UINT32_RANGE - 1

export type RandomUint32 = () => number

export interface ParticipantAnalysis {
  participants: string[]
  duplicates: string[]
}

export class PresentationOrderValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PresentationOrderValidationError"
  }
}

function defaultRandomUint32() {
  const values = new Uint32Array(1)
  globalThis.crypto.getRandomValues(values)
  return values[0]
}

function normalizedDuplicateKey(participant: string) {
  return participant.toLocaleLowerCase("pt-BR")
}

function secureRandomIndex(
  maximumExclusive: number,
  randomUint32: RandomUint32,
) {
  if (
    !Number.isSafeInteger(maximumExclusive) ||
    maximumExclusive < 1 ||
    maximumExclusive > UINT32_RANGE
  ) {
    throw new RangeError("O limite aleatório deve estar entre 1 e 2³².")
  }

  const unbiasedLimit =
    Math.floor(UINT32_RANGE / maximumExclusive) * maximumExclusive

  let value: number
  do {
    value = randomUint32()
    if (!Number.isInteger(value) || value < 0 || value > UINT32_MAX) {
      throw new RangeError("A fonte aleatória deve retornar um inteiro uint32.")
    }
  } while (value >= unbiasedLimit)

  return value % maximumExclusive
}

export function analyzeParticipants(rawParticipants: string): ParticipantAnalysis {
  const participants = rawParticipants
    .split(/\r?\n/)
    .map((participant) => participant.trim().replace(/\s+/g, " "))
    .filter(Boolean)

  const firstByKey = new Map<string, string>()
  const duplicateKeys = new Set<string>()
  const duplicates: string[] = []

  for (const participant of participants) {
    const key = normalizedDuplicateKey(participant)
    const firstOccurrence = firstByKey.get(key)

    if (firstOccurrence) {
      if (!duplicateKeys.has(key)) {
        duplicateKeys.add(key)
        duplicates.push(firstOccurrence)
      }
      continue
    }

    firstByKey.set(key, participant)
  }

  return { participants, duplicates }
}

export function validateParticipants(rawParticipants: string) {
  const analysis = analyzeParticipants(rawParticipants)

  if (analysis.participants.length < MIN_PRESENTATION_PARTICIPANTS) {
    throw new PresentationOrderValidationError(
      "Adicione pelo menos dois participantes ou equipes.",
    )
  }
  if (analysis.participants.length > MAX_PRESENTATION_PARTICIPANTS) {
    throw new PresentationOrderValidationError(
      `A lista pode conter no máximo ${MAX_PRESENTATION_PARTICIPANTS} participantes.`,
    )
  }
  if (
    analysis.participants.some(
      (participant) => participant.length > MAX_PRESENTATION_NAME_LENGTH,
    )
  ) {
    throw new PresentationOrderValidationError(
      `Cada nome pode ter no máximo ${MAX_PRESENTATION_NAME_LENGTH} caracteres.`,
    )
  }
  if (analysis.duplicates.length > 0) {
    const visibleDuplicates = analysis.duplicates.slice(0, 3).join(", ")
    const remaining = analysis.duplicates.length - 3
    const suffix = remaining > 0 ? ` e mais ${remaining}` : ""

    throw new PresentationOrderValidationError(
      `Remova os participantes repetidos: ${visibleDuplicates}${suffix}.`,
    )
  }

  return analysis.participants
}

export function shufflePresentationOrder(
  participants: readonly string[],
  randomUint32: RandomUint32 = defaultRandomUint32,
) {
  if (participants.length < MIN_PRESENTATION_PARTICIPANTS) {
    throw new RangeError("São necessários pelo menos dois participantes.")
  }

  const shuffled = [...participants]

  for (let currentIndex = shuffled.length - 1; currentIndex > 0; currentIndex -= 1) {
    const randomIndex = secureRandomIndex(currentIndex + 1, randomUint32)
    const currentParticipant = shuffled[currentIndex]

    shuffled[currentIndex] = shuffled[randomIndex]
    shuffled[randomIndex] = currentParticipant
  }

  return shuffled
}

export function formatPresentationOrder(participants: readonly string[]) {
  return [
    "Ordem de apresentação",
    "",
    ...participants.map((participant, index) => `${index + 1}. ${participant}`),
  ].join("\n")
}
