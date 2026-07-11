import hashlib
import json
import subprocess
from pathlib import Path

from django.conf import settings
from django.core.files.storage import default_storage


class MediaProcessingError(Exception):
    pass


def storage_path(relative_name):
    try:
        return Path(default_storage.path(relative_name))
    except NotImplementedError as exc:
        raise MediaProcessingError("O processamento local exige storage em disco.") from exc


def inspect_media(input_path):
    command = [
        "ffprobe",
        "-v",
        "error",
        "-print_format",
        "json",
        "-show_streams",
        "-show_format",
        str(input_path),
    ]
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=60, check=True)
        payload = json.loads(result.stdout)
    except (subprocess.SubprocessError, json.JSONDecodeError) as exc:
        raise MediaProcessingError("Arquivo de mídia inválido ou corrompido.") from exc

    audio_streams = [item for item in payload.get("streams", []) if item.get("codec_type") == "audio"]
    video_streams = [item for item in payload.get("streams", []) if item.get("codec_type") == "video"]
    if not audio_streams:
        raise MediaProcessingError("O arquivo não possui uma faixa de áudio.")

    duration = payload.get("format", {}).get("duration") or audio_streams[0].get("duration") or 0
    try:
        duration_seconds = max(0, round(float(duration)))
    except (TypeError, ValueError):
        duration_seconds = 0

    max_duration = settings.TRANSCRIPTION_MAX_DURATION_SECONDS
    if duration_seconds and duration_seconds > max_duration:
        raise MediaProcessingError(
            f"A duração máxima permitida é de {max_duration // 3600} hora(s)."
        )

    return {
        "duration_seconds": duration_seconds,
        "source_kind": "video" if video_streams else "audio",
    }


def create_canonical_audio(input_path, output_path):
    command = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-threads",
        "1",
        "-i",
        str(input_path),
        "-map",
        "0:a:0",
        "-vn",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-codec:a",
        "libmp3lame",
        "-b:a",
        "64k",
        "-map_metadata",
        "-1",
        "-y",
        str(output_path),
    ]
    try:
        subprocess.run(command, capture_output=True, text=True, timeout=7200, check=True)
    except subprocess.TimeoutExpired as exc:
        raise MediaProcessingError("A extração do áudio ultrapassou o tempo limite.") from exc
    except subprocess.CalledProcessError as exc:
        raise MediaProcessingError("Não foi possível extrair o áudio do arquivo.") from exc


def calculate_sha256(file_path):
    digest = hashlib.sha256()
    with open(file_path, "rb") as media_file:
        for chunk in iter(lambda: media_file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def delete_storage_file(relative_name):
    if relative_name and default_storage.exists(relative_name):
        default_storage.delete(relative_name)


def delete_local_file(file_path):
    if file_path:
        Path(file_path).unlink(missing_ok=True)
