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

const acceptedFormats = ".mp3,.wav,.m4a,.aac,.ogg,.flac,.mp4,.mov,.mkv,.webm,.avi"
const allowedExtensions = new Set(acceptedFormats.split(","))
const maxFileSize = 500 * 1024 * 1024
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
  reused: boolean
}

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
        const nextJob = await fetchTranscriptionJob(job.id)
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
  }, [isProcessing, job?.id, pollAttempt])

  function selectFile(nextFile: File | null) {
    if (!nextFile) return
    const extension = `.${nextFile.name.split(".").pop()?.toLowerCase() || ""}`
    if (!allowedExtensions.has(extension)) {
      setError("Formato não suportado. Selecione um áudio ou vídeo listado abaixo.")
      return
    }
    if (nextFile.size > maxFileSize) {
      setError("O tamanho máximo permitido é 500 MB.")
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
      const response = await fetch("/api/transcriptions", { method: "POST", body: formData })
      const data = await readJsonResponse<TranscriptionJob>(response)
      setJob(data)
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

  return (
    <div className="space-y-6">
      <section className="rounded-lg border-2 border-border/90 bg-card/75 p-6 shadow-2xl shadow-black/20 backdrop-blur-sm md:p-8">
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
            disabled={!file || isBusy}
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
        <section className="rounded-lg border border-border bg-card/85 shadow-2xl shadow-black/20 backdrop-blur-sm">
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
                  {job.original_filename} · {wordCount} palavras{job.reused ? " · resultado reutilizado" : ""}
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
              <a
                href={`/api/transcriptions/${job.id}/pdf`}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                <Download className="h-4 w-4" /> Baixar PDF
              </a>
            </div>
          </div>
          <p className="max-h-[34rem] overflow-auto whitespace-pre-wrap break-words p-5 text-sm leading-7 text-foreground md:text-base">
            {job.transcript_text}
          </p>
        </section>
      ) : null}
    </div>
  )
}

async function fetchTranscriptionJob(id: string): Promise<TranscriptionJob> {
  const response = await fetch(`/api/transcriptions/${id}`, { cache: "no-store" })
  return readJsonResponse<TranscriptionJob>(response)
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data?.detail || data?.error_message || `Erro HTTP ${response.status}`)
  }
  return data as T
}
