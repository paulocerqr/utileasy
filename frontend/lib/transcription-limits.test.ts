import assert from "node:assert/strict"

import {
  isTranscriptionFileSizeAllowed,
  TRANSCRIPTION_MAX_FILE_SIZE_BYTES,
  TRANSCRIPTION_MAX_FILE_SIZE_MB,
} from "./transcription-limits.ts"

assert.equal(TRANSCRIPTION_MAX_FILE_SIZE_MB, 95)
assert.equal(TRANSCRIPTION_MAX_FILE_SIZE_BYTES, 99_614_720)
assert.equal(isTranscriptionFileSizeAllowed(TRANSCRIPTION_MAX_FILE_SIZE_BYTES), true)
assert.equal(isTranscriptionFileSizeAllowed(TRANSCRIPTION_MAX_FILE_SIZE_BYTES + 1), false)
assert.equal(isTranscriptionFileSizeAllowed(-1), false)
assert.equal(isTranscriptionFileSizeAllowed(Number.NaN), false)
