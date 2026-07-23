import {
  MAX_PRESENTATION_NAME_LENGTH,
  MAX_PRESENTATION_PARTICIPANTS,
  analyzeParticipants,
  shufflePresentationOrder,
  type ParticipantAnalysis,
  type RandomUint32,
} from "./presentation-order.ts"

export const MIN_GROUP_PARTICIPANTS = 2
export const MAX_GROUP_PARTICIPANTS = MAX_PRESENTATION_PARTICIPANTS
export const MAX_GROUP_NAME_LENGTH = 60

export type GroupDivisionMode = "group-count" | "max-size"

export interface GroupDivisionSettings {
  participants: string[]
  groupCount: number
  configuredValue: number
  mode: GroupDivisionMode
}

export interface ParticipantGroup {
  id: string
  name: string
  members: string[]
}

export class GroupDividerValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "GroupDividerValidationError"
  }
}

function parsePositiveInteger(rawValue: string, label: string) {
  if (rawValue.trim() === "") {
    throw new GroupDividerValidationError(`Informe ${label}.`)
  }

  const value = Number(rawValue)
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new GroupDividerValidationError(
      `${label} deve ser um número inteiro positivo.`,
    )
  }

  return value
}

export function analyzeGroupParticipants(
  rawParticipants: string,
): ParticipantAnalysis {
  return analyzeParticipants(rawParticipants)
}

export function validateGroupDivision(
  rawParticipants: string,
  mode: GroupDivisionMode,
  rawConfiguredValue: string,
): GroupDivisionSettings {
  const analysis = analyzeGroupParticipants(rawParticipants)

  if (analysis.participants.length < MIN_GROUP_PARTICIPANTS) {
    throw new GroupDividerValidationError(
      "Adicione pelo menos dois participantes.",
    )
  }
  if (analysis.participants.length > MAX_GROUP_PARTICIPANTS) {
    throw new GroupDividerValidationError(
      `A lista pode conter no máximo ${MAX_GROUP_PARTICIPANTS} participantes.`,
    )
  }
  if (
    analysis.participants.some(
      (participant) => participant.length > MAX_PRESENTATION_NAME_LENGTH,
    )
  ) {
    throw new GroupDividerValidationError(
      `Cada nome pode ter no máximo ${MAX_PRESENTATION_NAME_LENGTH} caracteres.`,
    )
  }
  if (analysis.duplicates.length > 0) {
    const visibleDuplicates = analysis.duplicates.slice(0, 3).join(", ")
    const remaining = analysis.duplicates.length - 3
    const suffix = remaining > 0 ? ` e mais ${remaining}` : ""

    throw new GroupDividerValidationError(
      `Remova os participantes repetidos: ${visibleDuplicates}${suffix}.`,
    )
  }

  const configuredValue = parsePositiveInteger(
    rawConfiguredValue,
    mode === "group-count"
      ? "a quantidade de grupos"
      : "o tamanho máximo do grupo",
  )

  if (mode === "group-count") {
    if (configuredValue < 2) {
      throw new GroupDividerValidationError(
        "A divisão precisa ter pelo menos dois grupos.",
      )
    }
    if (configuredValue > analysis.participants.length) {
      throw new GroupDividerValidationError(
        "A quantidade de grupos não pode superar a quantidade de participantes.",
      )
    }

    return {
      participants: analysis.participants,
      groupCount: configuredValue,
      configuredValue,
      mode,
    }
  }

  if (configuredValue >= analysis.participants.length) {
    throw new GroupDividerValidationError(
      "O tamanho máximo deve formar pelo menos dois grupos.",
    )
  }

  return {
    participants: analysis.participants,
    groupCount: Math.ceil(analysis.participants.length / configuredValue),
    configuredValue,
    mode,
  }
}

export function divideParticipantsIntoGroups(
  settings: GroupDivisionSettings,
  randomUint32?: RandomUint32,
) {
  const shuffled = shufflePresentationOrder(
    settings.participants,
    randomUint32,
  )
  const membersByGroup = Array.from(
    { length: settings.groupCount },
    () => [] as string[],
  )

  shuffled.forEach((participant, index) => {
    membersByGroup[index % settings.groupCount].push(participant)
  })

  return membersByGroup.map<ParticipantGroup>((members, index) => ({
    id: `group-${index + 1}`,
    name: `Grupo ${index + 1}`,
    members,
  }))
}

export function formatParticipantGroup(group: ParticipantGroup) {
  return [
    group.name,
    ...group.members.map((member, index) => `${index + 1}. ${member}`),
  ].join("\n")
}

export function formatAllParticipantGroups(groups: readonly ParticipantGroup[]) {
  return groups.map(formatParticipantGroup).join("\n\n")
}
