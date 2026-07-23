export const MAX_NUMERIC_INTERVAL_SIZE = 1_000_000
export const MAX_DRAW_QUANTITY = 1_000
export const MAX_LIST_ITEMS = 10_000
export const MAX_ITEM_LENGTH = 200

const UINT32_RANGE = 0x1_0000_0000
const UINT32_MAX = UINT32_RANGE - 1

export type RandomUint32 = () => number

export interface NumericDrawSettings {
  minimum: number
  maximum: number
  quantity: number
  intervalSize: number
}

export class DrawValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "DrawValidationError"
  }
}

function defaultRandomUint32() {
  const values = new Uint32Array(1)
  globalThis.crypto.getRandomValues(values)
  return values[0]
}

function parseInteger(value: string, label: string) {
  if (value.trim() === "") {
    throw new DrawValidationError(`Informe ${label}.`)
  }

  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed)) {
    throw new DrawValidationError(`${label} deve ser um número inteiro válido.`)
  }

  return parsed
}

export function secureRandomInt(
  maximumExclusive: number,
  randomUint32: RandomUint32 = defaultRandomUint32,
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

export function drawUniqueIndices(
  poolSize: number,
  quantity: number,
  randomUint32: RandomUint32 = defaultRandomUint32,
) {
  if (!Number.isSafeInteger(poolSize) || poolSize < 1) {
    throw new RangeError("A quantidade de opções deve ser positiva.")
  }
  if (
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    quantity > poolSize
  ) {
    throw new RangeError("A quantidade sorteada deve caber nas opções disponíveis.")
  }
  if (poolSize > UINT32_RANGE) {
    throw new RangeError("A quantidade de opções ultrapassa o limite suportado.")
  }

  const replacements = new Map<number, number>()
  const selected: number[] = []

  for (let remaining = poolSize; selected.length < quantity; remaining -= 1) {
    const randomIndex = secureRandomInt(remaining, randomUint32)
    const selectedIndex = replacements.get(randomIndex) ?? randomIndex
    const lastIndex = remaining - 1
    const replacement = replacements.get(lastIndex) ?? lastIndex

    replacements.set(randomIndex, replacement)
    replacements.delete(lastIndex)
    selected.push(selectedIndex)
  }

  return selected
}

export function validateNumericDraw(
  minimumValue: string,
  maximumValue: string,
  quantityValue: string,
): NumericDrawSettings {
  const minimum = parseInteger(minimumValue, "o valor mínimo")
  const maximum = parseInteger(maximumValue, "o valor máximo")
  const quantity = parseInteger(quantityValue, "a quantidade de resultados")

  if (maximum < minimum) {
    throw new DrawValidationError(
      "O valor máximo deve ser maior ou igual ao valor mínimo.",
    )
  }

  const intervalSize = maximum - minimum + 1
  if (!Number.isSafeInteger(intervalSize)) {
    throw new DrawValidationError("O intervalo informado é muito grande.")
  }
  if (intervalSize > MAX_NUMERIC_INTERVAL_SIZE) {
    throw new DrawValidationError(
      `O intervalo pode conter no máximo ${MAX_NUMERIC_INTERVAL_SIZE.toLocaleString("pt-BR")} números.`,
    )
  }
  if (quantity < 1) {
    throw new DrawValidationError("A quantidade deve ser pelo menos 1.")
  }
  if (quantity > MAX_DRAW_QUANTITY) {
    throw new DrawValidationError(
      `É possível sortear no máximo ${MAX_DRAW_QUANTITY.toLocaleString("pt-BR")} resultados por vez.`,
    )
  }
  if (quantity > intervalSize) {
    throw new DrawValidationError(
      "A quantidade não pode ser maior que os números disponíveis no intervalo.",
    )
  }

  return { minimum, maximum, quantity, intervalSize }
}

export function drawNumbers(
  settings: NumericDrawSettings,
  randomUint32: RandomUint32 = defaultRandomUint32,
) {
  return drawUniqueIndices(
    settings.intervalSize,
    settings.quantity,
    randomUint32,
  ).map((index) => settings.minimum + index)
}

export function normalizeListItems(rawItems: string, removeDuplicates: boolean) {
  const items = rawItems
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)

  if (!removeDuplicates) return items

  return [...new Set(items)]
}

export function validateListDraw(
  rawItems: string,
  quantityValue: string,
  removeDuplicates: boolean,
) {
  const quantity = parseInteger(quantityValue, "a quantidade de resultados")
  const items = normalizeListItems(rawItems, removeDuplicates)

  if (items.length === 0) {
    throw new DrawValidationError("Adicione pelo menos um item à lista.")
  }
  if (items.length > MAX_LIST_ITEMS) {
    throw new DrawValidationError(
      `A lista pode conter no máximo ${MAX_LIST_ITEMS.toLocaleString("pt-BR")} itens.`,
    )
  }
  if (items.some((item) => item.length > MAX_ITEM_LENGTH)) {
    throw new DrawValidationError(
      `Cada item pode ter no máximo ${MAX_ITEM_LENGTH} caracteres.`,
    )
  }
  if (quantity < 1) {
    throw new DrawValidationError("A quantidade deve ser pelo menos 1.")
  }
  if (quantity > MAX_DRAW_QUANTITY) {
    throw new DrawValidationError(
      `É possível sortear no máximo ${MAX_DRAW_QUANTITY.toLocaleString("pt-BR")} resultados por vez.`,
    )
  }
  if (quantity > items.length) {
    throw new DrawValidationError(
      "A quantidade não pode ser maior que os itens disponíveis.",
    )
  }

  return { items, quantity }
}

export function drawItems(
  items: string[],
  quantity: number,
  randomUint32: RandomUint32 = defaultRandomUint32,
) {
  return drawUniqueIndices(items.length, quantity, randomUint32).map(
    (index) => items[index],
  )
}
