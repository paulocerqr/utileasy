export const TRANSCRIPTION_MAX_FILE_SIZE_MB = 95
export const TRANSCRIPTION_MAX_FILE_SIZE_BYTES =
  TRANSCRIPTION_MAX_FILE_SIZE_MB * 1024 * 1024

export function isTranscriptionFileSizeAllowed(size: number) {
  return Number.isFinite(size) && size >= 0 && size <= TRANSCRIPTION_MAX_FILE_SIZE_BYTES
}
