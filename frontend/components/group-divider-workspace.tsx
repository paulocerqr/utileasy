"use client"

import { useMemo, useState } from "react"
import {
  AlertTriangle,
  Check,
  ClipboardCopy,
  Copy,
  Info,
  Network,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react"

import {
  GroupDividerValidationError,
  MAX_GROUP_NAME_LENGTH,
  MAX_GROUP_PARTICIPANTS,
  analyzeGroupParticipants,
  divideParticipantsIntoGroups,
  formatAllParticipantGroups,
  formatParticipantGroup,
  validateGroupDivision,
  type GroupDivisionMode,
  type ParticipantGroup,
} from "@/lib/group-divider"

export function GroupDividerWorkspace() {
  const [rawParticipants, setRawParticipants] = useState("")
  const [mode, setMode] = useState<GroupDivisionMode>("group-count")
  const [groupCount, setGroupCount] = useState("2")
  const [maxGroupSize, setMaxGroupSize] = useState("4")
  const [groups, setGroups] = useState<ParticipantGroup[]>([])
  const [error, setError] = useState("")
  const [copiedTarget, setCopiedTarget] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState("")

  const analysis = useMemo(
    () => analyzeGroupParticipants(rawParticipants),
    [rawParticipants],
  )
  const duplicatePreview = analysis.duplicates.slice(0, 3)
  const hiddenDuplicateCount =
    analysis.duplicates.length - duplicatePreview.length

  function clearResult() {
    setGroups([])
    setError("")
    setCopiedTarget(null)
    setAnnouncement("")
  }

  function updateParticipants(value: string) {
    setRawParticipants(value)
    clearResult()
  }

  function changeMode(nextMode: GroupDivisionMode) {
    setMode(nextMode)
    clearResult()
  }

  function divideGroups() {
    if (
      groups.length > 0 &&
      !window.confirm(
        "Refazer a divisão substituirá os grupos atuais. Deseja continuar?",
      )
    ) {
      return
    }

    try {
      const settings = validateGroupDivision(
        rawParticipants,
        mode,
        mode === "group-count" ? groupCount : maxGroupSize,
      )
      const nextGroups = divideParticipantsIntoGroups(settings).map(
        (group, index) => ({
          ...group,
          name: groups[index]?.name || group.name,
        }),
      )

      setGroups(nextGroups)
      setError("")
      setCopiedTarget(null)
      setAnnouncement(
        `${nextGroups.length} grupos criados com ${settings.participants.length} participantes.`,
      )
    } catch (divisionError) {
      const message =
        divisionError instanceof GroupDividerValidationError
          ? divisionError.message
          : "Não foi possível dividir os grupos. Tente novamente."

      setGroups([])
      setError(message)
      setCopiedTarget(null)
      setAnnouncement(`Erro: ${message}`)
    }
  }

  function renameGroup(groupId: string, name: string) {
    if (name.length > MAX_GROUP_NAME_LENGTH) return

    setGroups((currentGroups) =>
      currentGroups.map((group) =>
        group.id === groupId ? { ...group, name } : group,
      ),
    )
    setCopiedTarget(null)
  }

  async function copyText(text: string, target: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedTarget(target)
      setAnnouncement(
        target === "all"
          ? "Todos os grupos foram copiados."
          : "Grupo copiado para a área de transferência.",
      )
    } catch {
      setCopiedTarget(null)
      setAnnouncement("Não foi possível copiar os grupos.")
    }
  }

  function resetWorkspace() {
    setRawParticipants("")
    setMode("group-count")
    setGroupCount("2")
    setMaxGroupSize("4")
    clearResult()
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
      <section
        aria-labelledby="group-divider-settings-title"
        className="noir-panel rounded-2xl p-5 sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-light">
              Configuração
            </p>
            <h2
              id="group-divider-settings-title"
              className="mt-2 text-xl font-semibold"
            >
              Monte sua divisão
            </h2>
          </div>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-brand-light">
            <Network className="size-5" aria-hidden="true" />
          </span>
        </div>

        <label
          htmlFor="group-participants"
          className="mt-7 grid gap-2 text-sm font-medium"
        >
          Um participante por linha
          <textarea
            id="group-participants"
            rows={11}
            value={rawParticipants}
            onChange={(event) => updateParticipants(event.target.value)}
            placeholder={"Ana\nBruno\nCarla\nDiego\nElisa\nFábio"}
            className="resize-y rounded-lg border border-border bg-background/65 px-3 py-3 text-sm leading-6 text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-brand-light focus:ring-2 focus:ring-brand-light/25"
          />
        </label>

        <div className="mt-3 flex flex-col gap-1 text-xs leading-5 text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            {analysis.participants.length.toLocaleString("pt-BR")}{" "}
            {analysis.participants.length === 1
              ? "participante válido"
              : "participantes válidos"}
          </span>
          <span>Limite de {MAX_GROUP_PARTICIPANTS}</span>
        </div>

        {analysis.duplicates.length > 0 ? (
          <div
            role="alert"
            className="mt-4 flex items-start gap-3 rounded-lg border border-warning/35 bg-warning/10 px-4 py-3 text-warning-foreground"
          >
            <AlertTriangle
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <p className="text-sm leading-5">
              Remova os nomes repetidos:{" "}
              <strong>
                {duplicatePreview.join(", ")}
                {hiddenDuplicateCount > 0
                  ? ` e mais ${hiddenDuplicateCount}`
                  : ""}
              </strong>
              .
            </p>
          </div>
        ) : null}

        <fieldset className="mt-6">
          <legend className="text-sm font-medium">Como deseja dividir?</legend>
          <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl border border-border bg-background/45 p-1.5">
            <button
              type="button"
              aria-pressed={mode === "group-count"}
              onClick={() => changeMode("group-count")}
              className={`min-h-11 rounded-lg px-3 text-xs font-medium transition-colors sm:text-sm ${
                mode === "group-count"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              Nº de grupos
            </button>
            <button
              type="button"
              aria-pressed={mode === "max-size"}
              onClick={() => changeMode("max-size")}
              className={`min-h-11 rounded-lg px-3 text-xs font-medium transition-colors sm:text-sm ${
                mode === "max-size"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              Máx. por grupo
            </button>
          </div>
        </fieldset>

        <label
          className="mt-5 grid gap-2 text-sm font-medium"
          htmlFor="group-division-value"
        >
          {mode === "group-count"
            ? "Quantidade de grupos"
            : "Tamanho máximo de cada grupo"}
          <input
            id="group-division-value"
            type="number"
            min={mode === "group-count" ? 2 : 1}
            step="1"
            inputMode="numeric"
            value={mode === "group-count" ? groupCount : maxGroupSize}
            onChange={(event) => {
              if (mode === "group-count") {
                setGroupCount(event.target.value)
              } else {
                setMaxGroupSize(event.target.value)
              }
              clearResult()
            }}
            className="min-h-11 rounded-lg border border-border bg-background/65 px-3 text-base text-foreground outline-none transition focus:border-brand-light focus:ring-2 focus:ring-brand-light/25"
          />
        </label>

        <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          A distribuição é aleatória e mantém os grupos tão equilibrados quanto
          possível.
        </p>

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-warning/35 bg-warning/10 px-4 py-3 text-sm leading-5 text-warning-foreground"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-7 flex flex-col gap-3">
          <button
            type="button"
            onClick={divideGroups}
            className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-light focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Sparkles className="size-4" aria-hidden="true" />
            {groups.length > 0 ? "Refazer divisão" : "Dividir grupos"}
          </button>
          <button
            type="button"
            onClick={resetWorkspace}
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-secondary px-5 text-sm font-medium transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-light"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Reiniciar
          </button>
        </div>
      </section>

      <section
        aria-labelledby="group-divider-result-title"
        className="noir-panel flex min-h-[650px] flex-col rounded-2xl p-5 sm:p-7"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-light">
              Resultado
            </p>
            <h2
              id="group-divider-result-title"
              className="mt-2 text-xl font-semibold"
            >
              {groups.length > 0
                ? `${groups.length} grupos formados`
                : "Os grupos aparecerão aqui"}
            </h2>
          </div>

          {groups.length > 0 ? (
            <button
              type="button"
              onClick={() =>
                void copyText(formatAllParticipantGroups(groups), "all")
              }
              className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-secondary px-4 text-xs font-medium transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-light"
            >
              {copiedTarget === "all" ? (
                <Check className="size-4" aria-hidden="true" />
              ) : (
                <ClipboardCopy className="size-4" aria-hidden="true" />
              )}
              {copiedTarget === "all" ? "Tudo copiado" : "Copiar todos"}
            </button>
          ) : null}
        </div>

        <div className="mt-6 flex flex-1 flex-col">
          {groups.length > 0 ? (
            <div className="grid items-start gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {groups.map((group, index) => (
                <article
                  key={group.id}
                  className="overflow-hidden rounded-xl border border-border bg-background/45"
                >
                  <div className="flex items-center gap-3 border-b border-border bg-secondary/55 p-3">
                    <Users
                      className="size-4 shrink-0 text-brand-light"
                      aria-hidden="true"
                    />
                    <label className="sr-only" htmlFor={`${group.id}-name`}>
                      Nome do {group.name}
                    </label>
                    <input
                      id={`${group.id}-name`}
                      value={group.name}
                      maxLength={MAX_GROUP_NAME_LENGTH}
                      onChange={(event) =>
                        renameGroup(group.id, event.target.value)
                      }
                      onBlur={() =>
                        renameGroup(
                          group.id,
                          group.name.trim() || `Grupo ${index + 1}`,
                        )
                      }
                      className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-semibold outline-none transition hover:border-border focus:border-brand-light focus:bg-background/55"
                    />
                    <span className="shrink-0 rounded-full bg-background/70 px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                      {group.members.length}
                    </span>
                    <button
                      type="button"
                      aria-label={`Copiar ${group.name || "grupo sem nome"}`}
                      onClick={() =>
                        void copyText(formatParticipantGroup(group), group.id)
                      }
                      className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-light"
                    >
                      {copiedTarget === group.id ? (
                        <Check className="size-4" aria-hidden="true" />
                      ) : (
                        <Copy className="size-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>

                  <ol className="grid gap-2 p-3">
                    {group.members.map((member, index) => (
                      <li
                        key={member}
                        className="flex min-h-10 items-center gap-3 rounded-lg border border-border/70 bg-card/35 px-3 py-2"
                      >
                        <span
                          aria-hidden="true"
                          className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-brand-light"
                        >
                          {index + 1}
                        </span>
                        <span className="min-w-0 break-words text-xs font-medium sm:text-sm">
                          {member}
                        </span>
                      </li>
                    ))}
                  </ol>
                </article>
              ))}
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background/25 px-6 py-12 text-center">
              <span className="flex size-16 items-center justify-center rounded-2xl border border-border bg-secondary text-brand-light">
                <Network className="size-7" aria-hidden="true" />
              </span>
              <p className="mt-5 max-w-sm text-base font-medium">
                Adicione os participantes e escolha um modo.
              </p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                Ninguém será perdido ou colocado em mais de um grupo.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-xl border border-border bg-secondary/55 px-4 py-3">
          <ShieldCheck
            className="mt-0.5 size-5 shrink-0 text-brand-light"
            aria-hidden="true"
          />
          <p className="text-xs leading-5 text-muted-foreground">
            Os nomes e os grupos são processados somente neste navegador. Nenhum
            participante é enviado ou salvo no servidor.
          </p>
        </div>

        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {announcement}
        </p>
      </section>
    </div>
  )
}
