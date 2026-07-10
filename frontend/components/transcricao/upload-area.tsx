"use client"

import { useRef, useState } from "react"
import { FileAudio, Upload } from "lucide-react"

const acceptedFormats = "audio/*,video/*,.mp3,.mp4,.wav,.m4a,.ogg"

export function UploadArea() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)

  return (
    <section className="rounded-2xl border-2 border-border/90 bg-transparent p-6 shadow-2xl shadow-black/20 md:p-8">
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept={acceptedFormats}
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex min-h-64 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#6a6a6a]/80 bg-secondary/5 px-6 text-center transition-colors hover:border-brand hover:bg-accent/20"
      >
        <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border-2 border-border/90 bg-secondary/10">
          {file ? (
            <FileAudio className="h-7 w-7 text-brand" />
          ) : (
            <Upload className="h-7 w-7 text-brand-light" />
          )}
        </span>
        <strong className="text-base font-semibold text-foreground">
          {file ? file.name : "Selecione um arquivo de áudio ou vídeo"}
        </strong>
        <span className="mt-2 text-sm text-muted-foreground">
          {file
            ? `${(file.size / 1024 / 1024).toFixed(2)} MB — clique para trocar`
            : "Clique para escolher um arquivo do seu dispositivo"}
        </span>
        <span className="mt-4 text-xs text-muted-foreground">
          MP3, MP4, WAV, M4A ou OGG
        </span>
      </button>

      <button
        type="button"
        disabled={!file}
        className="mt-5 w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
      >
        Iniciar transcrição
      </button>
    </section>
  )
}
