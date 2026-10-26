"""Self-check descartavel executado no backend ARM64, sem banco ou provedor."""

import platform
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory

import pymupdf
from docx import Document
from pdf2docx import Converter


assert platform.machine() == "aarch64", "Este teste exige execucao nativa ARM64."
with TemporaryDirectory() as tmp:
    root = Path(tmp)
    doc = Document()
    doc.add_paragraph("Teste ARM64: conversao de documento.")
    doc.save(root / "origem.docx")
    subprocess.run(
        [
            "libreoffice",
            "-env:UserInstallation=file://" + str(root / "profile"),
            "--headless",
            "--convert-to",
            "pdf",
            "--outdir",
            str(root),
            str(root / "origem.docx"),
        ],
        check=True,
        timeout=120,
    )
    with pymupdf.open(root / "origem.pdf") as pdf:
        assert len(pdf) == 1
        assert "ARM64" in pdf[0].get_text()
    converter = Converter(str(root / "origem.pdf"))
    try:
        converter.convert(str(root / "volta.docx"))
    finally:
        converter.close()
    assert (root / "volta.docx").stat().st_size > 0
    subprocess.run(
        [
            "ffmpeg", "-v", "error", "-f", "lavfi", "-i",
            "sine=frequency=440:duration=2", str(root / "audio.mp3"),
        ],
        check=True,
        timeout=30,
    )
    assert (root / "audio.mp3").stat().st_size > 0
print("documentos_audio_arm64_ok")
