"use client"

import { useRef, useState, useCallback } from "react"
import { CloudUpload, File } from "lucide-react"

export function UploadArea() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  const handleFile = useCallback((f: File) => {
    setFile(f)
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragging(false)
      const dropped = e.dataTransfer.files[0]
      if (dropped) handleFile(dropped)
    },
    [handleFile],
  )

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(true)
  }

  const onDragLeave = () => setDragging(false)

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) handleFile(selected)
  }

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={`
        relative flex w-full flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dashed px-8 py-16 text-center transition-colors
        ${dragging ? "border-white/40 bg-white/5" : "border-white/10 bg-[#111111]"}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/avi,video/quicktime,video/x-matroska,video/webm,audio/mpeg,audio/wav,audio/mp4,audio/aac,audio/ogg,audio/flac"
        className="hidden"
        onChange={onInputChange}
      />

      {file ? (
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1a1a1a]">
            <File className="h-8 w-8 text-white" />
          </div>
          <p className="text-sm font-medium text-white">{file.name}</p>
          <p className="text-xs text-[#888888]">
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
          <button
            onClick={() => setFile(null)}
            className="mt-1 text-xs text-[#888888] underline underline-offset-2 transition-colors hover:text-white"
          >
            Remover arquivo
          </button>
        </div>
      ) : (
        <>
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#1a1a1a]">
            <CloudUpload className="h-10 w-10 text-white" />
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-base font-semibold text-white">
              Arraste seu arquivo aqui
            </p>
            <p className="text-sm text-[#888888]">
              <span className="font-medium text-[#aaaaaa]">Vídeos:</span> MP4, AVI, MOV, MKV, WebM
            </p>
            <p className="text-sm text-[#888888]">
              <span className="font-medium text-[#aaaaaa]">Áudios:</span> MP3, WAV, M4A, AAC, OGG, FLAC
            </p>
          </div>

          <button
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2 rounded-lg border border-white/15 bg-[#1a1a1a] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#222222]"
          >
            <File className="h-4 w-4" />
            Selecionar Arquivo
          </button>
        </>
      )}
    </div>
  )
}
