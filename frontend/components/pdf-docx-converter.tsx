"use client"

import Link from "next/link"
import { type DragEvent, useEffect, useRef, useState } from "react"
import {
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  LockKeyhole,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react"

import { TurnstileWidget } from "@/components/turnstile-widget"

type JobStatus = "queued" | "validating" | "converting" | "completed" | "failed"

interface DocumentJob {
  id: string
  operation: "pdf_to_docx" | "docx_to_pdf"
  original_filename: string
  output_filename: string
  input_size: number
  output_size: number
  page_count: number | null
  status: JobStatus
  progress: number
  error_message: string
  anonymous: boolean
  expires_at: string | null
  created_at: string
  finished_at: string | null
  access_token?: string
}

interface AnonymousContext {
  authenticated: boolean
  captcha_enabled?: boolean
  site_key?: string
}

const MAX_SIZE = 50 * 1024 * 1024
const POLL_INTERVAL = 2000
const MAX_POLL_ATTEMPTS = 300
const pendingDocumentJobKey = "utileazy:pending-anonymous-document-job"

const statusLabels: Record<JobStatus, string> = {
  queued: "Aguardando na fila de documentos",
  validating: "Validando estrutura e limites",
  converting: "Convertendo o documento",
  completed: "Conversão concluída",
  failed: "A conversão falhou",
}

function formatBytes(bytes: number) {
  return bytes ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : "—"
}

export function PdfDocxConverter() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [job, setJob] = useState<DocumentJob | null>(null)
  const [activities, setActivities] = useState<DocumentJob[]>([])
  const [anonymousContext, setAnonymousContext] = useState<AnonymousContext | null>(null)
  const [captchaToken, setCaptchaToken] = useState("")
  const [captchaGeneration, setCaptchaGeneration] = useState(0)
  const [jobAccessToken, setJobAccessToken] = useState("")
  const [pollAttempt, setPollAttempt] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState("")

  const processing = Boolean(job && !["completed", "failed"].includes(job.status))
  const busy = uploading || processing
  const target = file?.name.toLowerCase().endsWith(".pdf") ? "docx" : "pdf"

  useEffect(() => {
    let active = true

    async function initialize() {
      try {
        const contextResponse = await fetch("/api/anonymous/session", { cache: "no-store" })
        const context = await readJsonResponse<AnonymousContext>(contextResponse)
        if (!active) return
        setAnonymousContext(context)

        if (context.authenticated) {
          const historyResponse = await fetch("/api/documents", { cache: "no-store" })
          const history = await readJsonResponse<DocumentJob[]>(historyResponse)
          if (active) setActivities(history)
          return
        }

        const pendingRaw = sessionStorage.getItem(pendingDocumentJobKey)
        if (!pendingRaw) return
        const pending = JSON.parse(pendingRaw) as { id: string; token: string }
        const pendingJob = await fetchDocumentJob(pending.id, pending.token)
        if (active) {
          setJob(pendingJob)
          setJobAccessToken(pending.token)
        }
      } catch (requestError) {
        if (active) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Não foi possível iniciar a sessão de conversão.",
          )
        }
      }
    }

    void initialize()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!job) return
    setActivities((current) => [job, ...current.filter((item) => item.id !== job.id)])
    if (job.status === "failed") setError(job.error_message)
  }, [job])

  useEffect(() => {
    if (!job?.id || !processing) return
    if (pollAttempt >= MAX_POLL_ATTEMPTS) {
      setError("O acompanhamento ultrapassou o tempo limite. O job permanece salvo.")
      return
    }

    const timeout = window.setTimeout(async () => {
      try {
        setJob(await fetchDocumentJob(job.id, jobAccessToken))
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Não foi possível consultar a conversão.",
        )
      } finally {
        setPollAttempt((attempt) => attempt + 1)
      }
    }, POLL_INTERVAL)

    return () => window.clearTimeout(timeout)
  }, [job?.id, jobAccessToken, pollAttempt, processing])

  function selectFile(selected: File | null) {
    if (!selected || busy) return
    const extension = selected.name.split(".").pop()?.toLowerCase()
    if (extension !== "pdf" && extension !== "docx") {
      setError("Formato não aceito. Selecione um arquivo PDF ou DOCX.")
      return
    }
    if (selected.size > MAX_SIZE) {
      setError("O arquivo excede o limite de 50 MB.")
      return
    }
    setFile(selected)
    setJob(null)
    setJobAccessToken("")
    setPollAttempt(0)
    setError("")
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    selectFile(event.dataTransfer.files[0] ?? null)
  }

  async function startConversion() {
    if (!file || busy || !anonymousContext) return
    setUploading(true)
    setJob(null)
    setPollAttempt(0)
    setError("")

    try {
      const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store" })
      const csrf = await readJsonResponse<{ csrf_token: string }>(csrfResponse)
      const formData = new FormData()
      formData.append("file", file)
      formData.append("target_format", target)
      if (!anonymousContext.authenticated) formData.append("captcha_token", captchaToken)

      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "X-CSRFToken": csrf.csrf_token },
        body: formData,
      })
      const created = await readJsonResponse<DocumentJob>(response)
      setJob(created)
      if (created.access_token) {
        setJobAccessToken(created.access_token)
        sessionStorage.setItem(
          pendingDocumentJobKey,
          JSON.stringify({ id: created.id, token: created.access_token }),
        )
      }
      setCaptchaToken("")
      setCaptchaGeneration((generation) => generation + 1)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível iniciar a conversão.",
      )
    } finally {
      setUploading(false)
    }
  }

  async function downloadResult(selectedJob: DocumentJob) {
    try {
      const headers = new Headers()
      if (selectedJob.id === job?.id && jobAccessToken) {
        headers.set("X-Job-Token", jobAccessToken)
      }
      const response = await fetch(`/api/documents/${selectedJob.id}/download`, { headers })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.detail || "Não foi possível baixar o documento.")
      }
      const url = URL.createObjectURL(await response.blob())
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = selectedJob.output_filename
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível baixar o documento.",
      )
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="grid gap-6 min-[900px]:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="noir-panel rounded-xl p-4 sm:p-6" aria-labelledby="upload-title">
          {anonymousContext && !anonymousContext.authenticated ? (
            <div className="mb-5 rounded-lg border border-brand/50 bg-secondary/70 p-4 text-sm leading-6">
              O resultado expira em 24 horas. <Link href="/login" className="font-medium text-brand-light">Entre</Link>{" "}
              para mantê-lo por 180 dias.
            </div>
          ) : anonymousContext?.authenticated ? (
            <div className="mb-5 rounded-lg border border-border bg-secondary/60 p-4 text-sm text-muted-foreground">
              O resultado fica disponível por 180 dias. A entrada é apagada após o processamento.
            </div>
          ) : null}
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="sr-only"
            disabled={busy}
            onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
          />
          <div
            role="button"
            tabIndex={0}
            onClick={() => !busy && inputRef.current?.click()}
            onKeyDown={(event) => {
              if (!busy && (event.key === "Enter" || event.key === " ")) inputRef.current?.click()
            }}
            onDragEnter={(event) => {
              event.preventDefault()
              if (!busy) setDragging(true)
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`flex min-h-[390px] flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center transition-colors ${dragging ? "border-brand-light bg-secondary" : "border-border bg-background/25"} ${busy ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
          >
            <span className="flex size-16 items-center justify-center rounded-full border border-border bg-secondary text-brand-light">
              {file ? <FileText className="size-7" /> : <Upload className="size-7" />}
            </span>
            <h2 id="upload-title" className="mt-6 max-w-full break-all text-lg font-bold sm:text-xl">
              {file?.name ?? "Arraste e solte o arquivo aqui"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {file ? `${formatBytes(file.size)} · saída ${target.toUpperCase()}` : "ou selecione um documento no seu computador"}
            </p>
            {!file ? (
              <span className="mt-6 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground">
                Selecionar arquivo
              </span>
            ) : !busy ? (
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    inputRef.current?.click()
                  }}
                  className="rounded-md border border-border bg-secondary px-4 py-2 text-xs hover:bg-accent"
                >
                  Substituir arquivo
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    setFile(null)
                    setJob(null)
                    if (inputRef.current) inputRef.current.value = ""
                  }}
                  className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Trash2 className="size-3" />Remover
                </button>
              </div>
            ) : null}
            <div className="mt-7 flex flex-wrap justify-center gap-2 text-[11px] text-muted-foreground">
              <span className="rounded bg-secondary px-2 py-1">PDF textual</span>
              <span className="rounded bg-secondary px-2 py-1">DOCX</span>
              <span className="rounded bg-secondary px-2 py-1">Máx. 50 MB e 200 páginas</span>
            </div>
          </div>
          {error ? (
            <p role="alert" className="mt-4 rounded-lg border border-warning/60 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
              {error}
            </p>
          ) : null}
        </section>

        <div className="flex flex-col gap-5">
          <section className="noir-panel rounded-xl p-6" aria-labelledby="conversion-title">
            <h2 id="conversion-title" className="text-sm font-semibold">Conversão</h2>
            <p className="mt-4 rounded-lg border border-border bg-secondary p-4 text-sm">
              {file ? `${file.name.toLowerCase().endsWith(".pdf") ? "PDF" : "DOCX"} → ${target.toUpperCase()}` : "O destino é definido pelo arquivo enviado."}
            </p>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              Layout, imagens e tabelas simples são preservados quando possível. Documentos complexos podem apresentar diferenças.
            </p>
          </section>

          <section className="noir-panel rounded-xl p-6" aria-labelledby="limits-title">
            <h2 id="limits-title" className="text-sm font-semibold">Limites do MVP</h2>
            <ul className="mt-4 space-y-2 text-xs leading-5 text-muted-foreground">
              <li>PDFs protegidos por senha não são aceitos.</li>
              <li>OCR para PDFs digitalizados ainda não está disponível.</li>
              <li>Macros e arquivos DOC antigos não são aceitos.</li>
            </ul>
          </section>

          {anonymousContext && !anonymousContext.authenticated ? (
            <div className="noir-panel rounded-xl p-4">
              {anonymousContext.captcha_enabled && anonymousContext.site_key ? (
                <TurnstileWidget
                  key={captchaGeneration}
                  siteKey={anonymousContext.site_key}
                  action="anonymous_document_conversion"
                  onToken={setCaptchaToken}
                />
              ) : anonymousContext.captcha_enabled ? (
                <p className="text-center text-sm text-warning-foreground">O CAPTCHA ainda não foi configurado.</p>
              ) : (
                <p className="text-center text-xs text-muted-foreground">CAPTCHA desativado neste ambiente.</p>
              )}
            </div>
          ) : null}

          <button
            type="button"
            disabled={!file || busy || !anonymousContext || (!anonymousContext.authenticated && anonymousContext.captcha_enabled && !captchaToken)}
            onClick={startConversion}
            className="flex min-h-14 items-center justify-center gap-3 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-45"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            {uploading ? "Enviando documento" : processing ? statusLabels[job!.status] : "Iniciar conversão"}
          </button>

          {job ? (
            <div className={`rounded-lg border p-4 ${job.status === "completed" ? "border-brand-light bg-secondary" : "border-border bg-card/60"}`}>
              <p className="flex items-center gap-2 text-sm font-semibold">
                {job.status === "completed" ? <CheckCircle2 className="size-4 text-brand-light" /> : processing ? <Loader2 className="size-4 animate-spin" /> : null}
                {statusLabels[job.status]}
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" aria-label={`Progresso: ${job.progress}%`}>
                <div className="h-full bg-brand-light transition-all" style={{ width: `${job.progress}%` }} />
              </div>
              {job.status === "completed" ? (
                <>
                  <p className="mt-3 break-all text-xs text-muted-foreground">
                    {job.output_filename} · {formatBytes(job.output_size)}
                  </p>
                  <button type="button" onClick={() => downloadResult(job)} className="mt-4 flex items-center gap-2 text-xs font-medium text-brand-light hover:text-foreground">
                    <Download className="size-4" />Baixar arquivo convertido
                  </button>
                </>
              ) : null}
            </div>
          ) : null}

          <p className="flex items-center justify-center gap-2 text-[11px] leading-5 text-muted-foreground">
            <LockKeyhole className="size-3" />Entrada e resultado ficam em storage privado.
          </p>
        </div>
      </div>

      <section id="atividade" className="noir-panel scroll-mt-24 rounded-xl p-5 sm:p-7" aria-labelledby="activity-title">
        <h2 id="activity-title" className="text-sm font-semibold">Atividade recente</h2>
        <p className="mt-1 text-xs text-muted-foreground">Jobs da conta ou a conversão temporária desta sessão.</p>
        <div className="mt-6 flex flex-col gap-2">
          {activities.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Nenhuma conversão ainda.
            </p>
          ) : activities.map((activity) => (
            <div key={activity.id} className="flex items-center gap-4 rounded-lg bg-secondary p-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded bg-accent">
                <FileText className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{activity.output_filename}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {statusLabels[activity.status]} · {new Intl.DateTimeFormat("pt-BR").format(new Date(activity.created_at))}
                </p>
              </div>
              {activity.status === "completed" ? (
                <button type="button" onClick={() => downloadResult(activity)} className="text-xs font-medium text-brand-light hover:text-foreground">
                  Baixar
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

async function fetchDocumentJob(id: string, accessToken = "") {
  const headers = new Headers()
  if (accessToken) headers.set("X-Job-Token", accessToken)
  const response = await fetch(`/api/documents/${id}`, { cache: "no-store", headers })
  return readJsonResponse<DocumentJob>(response)
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.detail || payload?.error_message || `Erro HTTP ${response.status}`)
  }
  return payload as T
}
