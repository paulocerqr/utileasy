"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  CheckCircle2,
  Clipboard,
  Download,
  FileAudio,
  FileText,
  Loader2,
  RefreshCw,
  Upload,
  X,
} from "lucide-react"
import Link from "next/link"

import { TurnstileWidget } from "@/components/turnstile-widget"
import {
  isTranscriptionFileSizeAllowed,
  TRANSCRIPTION_MAX_FILE_SIZE_MB,
} from "@/lib/transcription-limits"

const acceptedFormats = ".mp3,.wav,.m4a,.aac,.ogg,.flac,.mp4,.mov,.mkv,.webm,.avi"
const allowedExtensions = new Set(acceptedFormats.split(","))
const pollIntervalMs = 5000
const maxPollAttempts = 720

type JobStatus =
  | "queued"
  | "extracting"
  | "checking_duplicate"
  | "uploading_provider"
  | "processing"
  | "completed"
  | "failed"

interface TranscriptionJob {
  id: string
  original_filename: string
  status: JobStatus
  transcript_text: string
  error_message: string
  created_at: string
  finished_at: string | null
  anonymous: boolean
  expires_at: string | null
  access_token?: string
}

interface AnonymousContext {
  authenticated: boolean
  captcha_enabled?: boolean
  site_key?: string
  expires_at?: string
}

const pendingAnonymousJobKey = "utileazy:pending-anonymous-job"

const statusLabels: Record<Exclude<JobStatus, "completed" | "failed">, string> = {
  queued: "Aguardando na fila",
  extracting: "Preparando o áudio",
  checking_duplicate: "Verificando duplicidade",
  uploading_provider: "Enviando para transcrição",
  processing: "Transcrevendo o arquivo",
}

export function UploadArea() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [job, setJob] = useState<TranscriptionJob | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  const [pollAttempt, setPollAttempt] = useState(0)
  const [anonymousContext, setAnonymousContext] = useState<AnonymousContext | null>(null)
  const [captchaToken, setCaptchaToken] = useState("")
  const [captchaGeneration, setCaptchaGeneration] = useState(0)
  const [jobAccessToken, setJobAccessToken] = useState("")

  useEffect(() => {
    fetch("/api/anonymous/session", { cache: "no-store" })
      .then((response) => readJsonResponse<AnonymousContext>(response))
      .then(setAnonymousContext)
      .catch(() => setError("Não foi possível iniciar a sessão de uso."))
  }, [])

  const isProcessing = job && !["completed", "failed"].includes(job.status)
  const isBusy = isUploading || Boolean(isProcessing)
  const hasResult = job?.status === "completed" && Boolean(job.transcript_text)
  const wordCount = useMemo(() => {
    const text = job?.transcript_text.trim() || ""
    return text ? text.split(/\s+/).length : 0
  }, [job?.transcript_text])

  useEffect(() => {
    if (!job?.id || !isProcessing) return
    if (pollAttempt >= maxPollAttempts) {
      setError("O acompanhamento ultrapassou o tempo limite. O job permanece salvo.")
      return
    }

    const timeout = window.setTimeout(async () => {
      try {
        const nextJob = await fetchTranscriptionJob(job.id, jobAccessToken)
        setJob(nextJob)
        setError(nextJob.status === "failed" ? nextJob.error_message : "")
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Falha ao consultar o status da transcrição.",
        )
      } finally {
        setPollAttempt((attempt) => attempt + 1)
      }
    }, pollIntervalMs)

    return () => window.clearTimeout(timeout)
  }, [isProcessing, job?.id, jobAccessToken, pollAttempt])

  function selectFile(nextFile: File | null) {
    if (!nextFile) return
    const extension = `.${nextFile.name.split(".").pop()?.toLowerCase() || ""}`
    if (!allowedExtensions.has(extension)) {
      setError("Formato não suportado. Selecione um áudio ou vídeo listado abaixo.")
      return
    }
    if (!isTranscriptionFileSizeAllowed(nextFile.size)) {
      setError(`O tamanho máximo permitido é ${TRANSCRIPTION_MAX_FILE_SIZE_MB} MB.`)
      return
    }
    setFile(nextFile)
    setJob(null)
    setPollAttempt(0)
    setError("")
    setCopied(false)
  }

  async function startTranscription() {
    if (!file) return
    setError("")
    setJob(null)
    setPollAttempt(0)
    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)
      if (!anonymousContext?.authenticated) formData.append("captcha_token", captchaToken)
      const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store" })
      const csrfData = await csrfResponse.json().catch(() => null)
      if (!csrfResponse.ok || !csrfData?.csrf_token) {
        throw new Error("Não foi possível validar sua sessão. Entre novamente.")
      }
      const response = await fetch("/api/transcriptions", {
        method: "POST",
        headers: { "X-CSRFToken": csrfData.csrf_token },
        body: formData,
      })
      const data = await readJsonResponse<TranscriptionJob>(response)
      setJob(data)
      if (data.access_token) {
        setJobAccessToken(data.access_token)
        sessionStorage.setItem(
          pendingAnonymousJobKey,
          JSON.stringify({ id: data.id, token: data.access_token }),
        )
      }
      setCaptchaToken("")
      setCaptchaGeneration((value) => value + 1)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível iniciar a transcrição.",
      )
    } finally {
      setIsUploading(false)
    }
  }

  async function copyTranscript() {
    if (!job?.transcript_text) return
    try {
      await navigator.clipboard.writeText(job.transcript_text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError("Não foi possível copiar o texto automaticamente.")
    }
  }

  async function downloadPdf() {
    if (!job) return
    try {
      const headers = new Headers()
      if (jobAccessToken) headers.set("X-Job-Token", jobAccessToken)
      const response = await fetch(`/api/transcriptions/${job.id}/pdf`, { headers })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.detail || "Não foi possível baixar o PDF.")
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `transcricao-${job.id}.pdf`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível baixar o PDF.")
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border-2 border-border/90 bg-card/40 p-6 shadow-2xl shadow-black/20 backdrop-blur-md md:p-8">
        {anonymousContext && !anonymousContext.authenticated ? (
          <div className="mb-5 rounded-lg border border-brand/50 bg-secondary/70 p-4 text-sm leading-6 text-foreground">
            <p>
              Você está no modo temporário. O resultado expira em 24 horas e não aparece em histórico.
            </p>
            <p className="mt-1 text-muted-foreground">
              <Link href="/login" className="font-medium text-brand-light hover:text-foreground">Entre</Link>{" "}
              para guardar a transcrição por 180 dias e acessá-la em outros dispositivos.
            </p>
          </div>
        ) : anonymousContext?.authenticated ? (
          <div className="mb-5 rounded-lg border border-border bg-secondary/50 p-4 text-sm leading-6 text-muted-foreground">
            O texto da transcrição fica disponível por 180 dias. Os arquivos de áudio ou vídeo
            são descartados após o processamento.
          </div>
        ) : null}
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          accept={acceptedFormats}
          onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
        />

        <div
          role="button"
          tabIndex={0}
          onClick={() => !isBusy && inputRef.current?.click()}
          onKeyDown={(event) => {
            if (!isBusy && (event.key === "Enter" || event.key === " ")) inputRef.current?.click()
          }}
          onDragOver={(event) => {
            event.preventDefault()
            if (!isBusy) setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setIsDragging(false)
            if (!isBusy) selectFile(event.dataTransfer.files[0] ?? null)
          }}
          className={`flex min-h-64 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 text-center transition-colors ${
            isDragging ? "border-brand bg-accent/30" : "border-border bg-secondary/30 hover:border-brand hover:bg-accent/20"
          } ${isBusy ? "cursor-not-allowed opacity-70" : ""}`}
        >
          <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border-2 border-border/90 bg-secondary/60">
            {file ? <FileAudio className="h-7 w-7 text-brand" /> : <Upload className="h-7 w-7 text-brand-light" />}
          </span>
          <strong className="max-w-full break-words text-base font-semibold text-foreground">
            {file ? file.name : "Arraste ou selecione um arquivo de áudio ou vídeo"}
          </strong>
          <span className="mt-2 text-sm text-muted-foreground">
            {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "Clique para escolher um arquivo"}
          </span>
          <span className="mt-4 text-xs text-muted-foreground">
            Áudio: MP3, WAV, M4A, AAC, OGG, FLAC · Vídeo: MP4, MOV, MKV, WebM, AVI
          </span>
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            disabled={
              !file ||
              isBusy ||
              !anonymousContext ||
              (!anonymousContext.authenticated &&
                anonymousContext.captcha_enabled &&
                !captchaToken)
            }
            onClick={startTranscription}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isUploading ? "Enviando arquivo" : "Iniciar transcrição"}
          </button>
          {file && !isBusy ? (
            <button
              type="button"
              aria-label="Remover arquivo"
              onClick={() => {
                setFile(null)
                setJob(null)
                if (inputRef.current) inputRef.current.value = ""
              }}
              className="rounded-lg border border-border bg-card px-4 text-foreground hover:bg-accent"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {anonymousContext && !anonymousContext.authenticated ? (
          <div className="mt-5 rounded-lg border border-border bg-card/60 p-3">
            {anonymousContext.captcha_enabled && anonymousContext.site_key ? (
              <TurnstileWidget
                key={captchaGeneration}
                siteKey={anonymousContext.site_key}
                onToken={setCaptchaToken}
              />
            ) : anonymousContext.captcha_enabled ? (
              <p className="text-center text-sm text-warning-foreground">
                O CAPTCHA ainda não foi configurado pelo administrador.
              </p>
            ) : (
              <p className="text-center text-xs text-muted-foreground">
                CAPTCHA desativado neste ambiente de desenvolvimento.
              </p>
            )}
          </div>
        ) : null}

        {isProcessing ? (
          <div className="mt-4 rounded-lg border border-border bg-secondary/50 p-4">
            <div className="flex items-center gap-3 text-sm">
              <RefreshCw className="h-4 w-4 animate-spin text-brand-light" />
              <span className="font-medium text-foreground">
                {statusLabels[job.status as keyof typeof statusLabels]}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-brand-light" />
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-lg border border-warning/60 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
            {error}
          </p>
        ) : null}
      </section>

      {hasResult ? (
        <section className="rounded-lg border border-border bg-card/45 shadow-2xl shadow-black/20 backdrop-blur-md">
          <div className="flex flex-col gap-4 border-b border-border bg-secondary/45 p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card">
                <FileText className="h-5 w-5 text-brand-light" />
              </span>
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <CheckCircle2 className="h-4 w-4" /> Transcrição concluída
                </h2>
                <p className="mt-1 max-w-xl break-words text-sm text-muted-foreground">
                  {job.original_filename} · {wordCount} palavras
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copyTranscript}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                {copied ? <CheckCircle2 className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                {copied ? "Copiado" : "Copiar"}
              </button>
              <button
                type="button"
                onClick={downloadPdf}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                <Download className="h-4 w-4" /> Baixar PDF
              </button>
            </div>
          </div>
          <p className="max-h-[34rem] overflow-auto whitespace-pre-wrap break-words p-5 text-sm leading-7 text-foreground md:text-base">
            {job.transcript_text}
          </p>
          {job.anonymous ? (
            <div className="border-t border-border p-4 text-center text-sm text-muted-foreground">
              Este resultado é temporário. <Link href="/login" className="font-medium text-brand-light">Entre agora para guardá-lo por 180 dias.</Link>
            </div>
          ) : job.expires_at ? (
            <div className="border-t border-border p-4 text-center text-sm text-muted-foreground">
              Disponível até {new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(job.expires_at))}.
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}

async function fetchTranscriptionJob(id: string, accessToken = ""): Promise<TranscriptionJob> {
  const headers = new Headers()
  if (accessToken) headers.set("X-Job-Token", accessToken)
  const response = await fetch(`/api/transcriptions/${id}`, { cache: "no-store", headers })
  return readJsonResponse<TranscriptionJob>(response)
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data?.detail || data?.error_message || `Erro HTTP ${response.status}`)
  }
  return data as T
}
