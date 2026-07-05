"use client"

import { useRef, useState } from "react"
import { FileAudio, Upload } from "lucide-react"

const acceptedFormats = "audio/*,video/*,.mp3,.mp4,.wav,.m4a,.ogg"

export function UploadArea() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0f1117] p-6 shadow-2xl shadow-black/20 md:p-8">
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
        className="flex min-h-64 w-full flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-6 text-center transition-colors hover:border-white/30 hover:bg-white/[0.04]"
      >
        <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-white/5">
          {file ? (
            <FileAudio className="h-7 w-7 text-white" />
          ) : (
            <Upload className="h-7 w-7 text-[#aaaaaa]" />
          )}
        </span>
        <strong className="text-base font-semibold text-white">
          {file ? file.name : "Selecione um arquivo de áudio ou vídeo"}
        </strong>
        <span className="mt-2 text-sm text-[#777777]">
          {file
            ? `${(file.size / 1024 / 1024).toFixed(2)} MB — clique para trocar`
            : "Clique para escolher um arquivo do seu dispositivo"}
        </span>
        <span className="mt-4 text-xs text-[#555555]">
          MP3, MP4, WAV, M4A ou OGG
        </span>
      </button>

      <button
        type="button"
        disabled={!file}
        className="mt-5 w-full rounded-lg bg-white px-4 py-3 text-sm font-semibold text-[#08090f] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
      >
        Iniciar transcrição
      </button>
    </section>
  )
}
