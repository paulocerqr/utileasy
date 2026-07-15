"use client"

import { DragEvent, useRef, useState } from "react"
import {
  Check,
  Download,
  FileText,
  LockKeyhole,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react"

type Target = "docx" | "pdf"
type Activity = { id: number; name: string; source: string; createdAt: string }

const MAX_SIZE = 50 * 1024 * 1024

function formatBytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function outputName(fileName: string, target: Target) {
  return `${fileName.replace(/\.[^.]+$/, "")}.${target}`
}

export function PdfDocxConverter() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [target, setTarget] = useState<Target>("docx")
  const [keepImages, setKeepImages] = useState(true)
  const [ocr, setOcr] = useState(false)
  const [error, setError] = useState("")
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState(0)
  const [converting, setConverting] = useState(false)
  const [completedName, setCompletedName] = useState("")
  const [activities, setActivities] = useState<Activity[]>([])

  function selectFile(selected?: File) {
    setError("")
    setCompletedName("")
    if (!selected) return

    const extension = selected.name.split(".").pop()?.toLowerCase()
    if (extension !== "pdf" && extension !== "docx") {
      setFile(null)
      setError("Formato não aceito. Selecione um arquivo .pdf ou .docx.")
      return
    }
    if (selected.size > MAX_SIZE) {
      setFile(null)
      setError("O arquivo excede o limite de 50 MB.")
      return
    }

    setFile(selected)
    setTarget(extension === "pdf" ? "docx" : "pdf")
    if (extension === "docx") setOcr(false)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    selectFile(event.dataTransfer.files[0])
  }

  function convert() {
    if (!file || converting) return
    setConverting(true)
    setCompletedName("")
    setProgress(8)

    const timer = window.setInterval(() => {
      setProgress((current) => {
        const next = Math.min(current + 14, 100)
        if (next === 100) {
          window.clearInterval(timer)
          const name = outputName(file.name, target)
          window.setTimeout(() => {
            setConverting(false)
            setCompletedName(name)
            setActivities((items) => [
              { id: Date.now(), name, source: file.name.split(".").pop()?.toUpperCase() ?? "Arquivo", createdAt: "agora" },
              ...items,
            ])
          }, 250)
        }
        return next
      })
    }, 180)
  }

  function downloadSimulation(name: string) {
    const notice = `Simulação Utileazy\n\nA interface simulou a conversão para ${name}. Nenhum conteúdo foi convertido ou enviado a um servidor.`
    const url = URL.createObjectURL(new Blob([notice], { type: "text/plain;charset=utf-8" }))
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `${name}.simulacao.txt`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const sourceIsPdf = file?.name.toLowerCase().endsWith(".pdf") ?? true

  return (
    <div className="flex flex-col gap-10">
      <div className="grid gap-6 min-[900px]:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="noir-panel rounded-xl p-4 sm:p-6" aria-labelledby="upload-title">
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="sr-only"
            onChange={(event) => selectFile(event.target.files?.[0])}
          />
          <div
            onDragEnter={(event) => { event.preventDefault(); setDragging(true) }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`flex min-h-[410px] flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center transition-colors ${dragging ? "border-brand-light bg-secondary" : "border-border bg-background/25"}`}
          >
            {file ? (
              <>
                <span className="flex size-16 items-center justify-center rounded-full border border-border bg-secondary text-brand-light"><FileText className="size-7" /></span>
                <h2 id="upload-title" className="mt-6 max-w-full break-all text-lg font-bold sm:text-xl">{file.name}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{formatBytes(file.size)} · pronto para simular</p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <button type="button" onClick={() => inputRef.current?.click()} className="rounded-md border border-border bg-secondary px-4 py-2 text-xs hover:bg-accent">Substituir arquivo</button>
                  <button type="button" onClick={() => { setFile(null); setCompletedName(""); setProgress(0) }} className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-xs text-muted-foreground hover:text-foreground"><Trash2 className="size-3" />Remover</button>
                </div>
              </>
            ) : (
              <>
                <span className="flex size-16 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground"><Upload className="size-7" /></span>
                <h2 id="upload-title" className="mt-7 text-xl font-bold sm:text-2xl">Arraste e solte o arquivo aqui</h2>
                <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">ou selecione um documento no seu computador</p>
                <button type="button" onClick={() => inputRef.current?.click()} className="mt-6 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:opacity-90">Selecionar arquivo</button>
                <div className="mt-7 flex flex-wrap justify-center gap-2 text-[11px] text-muted-foreground">
                  <span className="rounded bg-secondary px-2 py-1">.pdf</span><span className="rounded bg-secondary px-2 py-1">.docx</span><span className="rounded bg-secondary px-2 py-1">Máx. 50 MB</span>
                </div>
              </>
            )}
          </div>
          {error && <p role="alert" className="mt-3 text-sm text-warning-foreground">{error}</p>}
        </section>

        <div className="flex flex-col gap-5">
          <fieldset className="noir-panel rounded-xl p-6">
            <legend className="px-1 text-sm font-semibold">Destino da conversão</legend>
            <div className="mt-4 flex flex-col gap-3">
              {(["docx", "pdf"] as Target[]).map((value) => (
                <label key={value} className="flex cursor-pointer items-center gap-3 rounded-md p-2 text-sm hover:bg-secondary">
                  <input type="radio" name="target" value={value} checked={target === value} onChange={() => setTarget(value)} className="accent-current" />
                  Para {value === "docx" ? "Word (.docx)" : "PDF (.pdf)"}
                </label>
              ))}
            </div>
          </fieldset>

          <section className="noir-panel rounded-xl p-6" aria-labelledby="options-title">
            <h2 id="options-title" className="text-sm font-semibold">Opções</h2>
            <div className="mt-5 flex flex-col gap-4">
              <Toggle label="OCR (texto digitalizado)" checked={ocr} onChange={setOcr} disabled={!sourceIsPdf} />
              <Toggle label="Manter imagens" checked={keepImages} onChange={setKeepImages} />
            </div>
          </section>

          <button type="button" disabled={!file || converting} onClick={convert} className="flex min-h-14 items-center justify-center gap-3 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-45">
            {converting ? <RefreshCw className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            {converting ? `Simulando... ${progress}%` : "Simular conversão"}
          </button>

          {converting && <div className="h-1 overflow-hidden rounded-full bg-secondary" aria-label={`Progresso: ${progress}%`}><div className="h-full bg-brand-light transition-all" style={{ width: `${progress}%` }} /></div>}

          {completedName && (
            <div className="rounded-lg border border-brand-light bg-secondary p-4">
              <p className="flex items-center gap-2 text-sm font-semibold"><Check className="size-4 text-brand-light" />Simulação concluída</p>
              <p className="mt-2 break-all text-xs text-muted-foreground">Saída prevista: {completedName}</p>
              <button type="button" onClick={() => downloadSimulation(completedName)} className="mt-4 flex items-center gap-2 text-xs font-medium text-brand-light hover:text-foreground"><Download className="size-4" />Baixar comprovante da simulação</button>
            </div>
          )}

          <p className="flex items-center justify-center gap-2 text-[11px] leading-5 text-muted-foreground"><LockKeyhole className="size-3" />Seus arquivos não são enviados nesta demonstração.</p>
        </div>
      </div>

      <section id="atividade" className="noir-panel scroll-mt-24 rounded-xl p-5 sm:p-7" aria-labelledby="activity-title">
        <div className="flex items-center justify-between gap-4">
          <div><h2 id="activity-title" className="text-sm font-semibold">Atividade recente</h2><p className="mt-1 text-xs text-muted-foreground">Disponível apenas durante esta sessão.</p></div>
          <span className="rounded bg-secondary px-2 py-1 text-[10px] text-muted-foreground">SIMULAÇÃO</span>
        </div>
        <div className="mt-6 flex flex-col gap-2">
          {activities.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Nenhuma conversão simulada ainda.</p>
          ) : activities.map((activity) => (
            <div key={activity.id} className="flex items-center gap-4 rounded-lg bg-secondary p-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded bg-accent"><FileText className="size-4" /></span>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{activity.name}</p><p className="mt-1 text-[11px] text-muted-foreground">Simulado a partir de {activity.source} · {activity.createdAt}</p></div>
              <button type="button" onClick={() => downloadSimulation(activity.name)} className="text-xs font-medium text-brand-light hover:text-foreground">Comprovante</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function Toggle({ label, checked, onChange, disabled = false }: { label: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return (
    <label className={`flex items-center justify-between gap-4 text-xs ${disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer"}`}>
      <span>{label}</span>
      <input type="checkbox" className="peer sr-only" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      <span className="relative h-5 w-9 rounded-full bg-muted transition-colors peer-checked:bg-brand-light peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 after:absolute after:left-1 after:top-1 after:size-3 after:rounded-full after:bg-primary after:transition-transform peer-checked:after:translate-x-4" />
    </label>
  )
}
