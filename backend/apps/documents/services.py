import os
import resource
import signal
import subprocess
import sys
import zipfile
from pathlib import Path

import pymupdf
from django.conf import settings

from .models import DocumentConversion


class DocumentConversionError(Exception):
    pass


def inspect_pdf(file_path, require_text=True):
    try:
        with pymupdf.open(file_path) as document:
            if document.needs_pass:
                raise DocumentConversionError(
                    "PDFs protegidos por senha não são aceitos."
                )
            page_count = document.page_count
            if page_count < 1:
                raise DocumentConversionError("O PDF não possui páginas.")
            if page_count > settings.DOCUMENT_MAX_PAGES:
                raise DocumentConversionError(
                    f"O documento excede o limite de {settings.DOCUMENT_MAX_PAGES} páginas."
                )
            if require_text and not any(
                document.load_page(index).get_text().strip()
                for index in range(page_count)
            ):
                raise DocumentConversionError(
                    "O PDF não possui texto selecionável. OCR ainda não está disponível."
                )
            return page_count
    except DocumentConversionError:
        raise
    except (OSError, RuntimeError, ValueError, pymupdf.FileDataError) as exc:
        raise DocumentConversionError("PDF inválido ou corrompido.") from exc


def inspect_docx(file_path):
    try:
        with zipfile.ZipFile(file_path) as archive:
            entries = archive.infolist()
            names = {entry.filename for entry in entries}
            if "[Content_Types].xml" not in names or "word/document.xml" not in names:
                raise DocumentConversionError("DOCX inválido ou corrompido.")
            if any(entry.flag_bits & 0x1 for entry in entries):
                raise DocumentConversionError(
                    "Documentos protegidos por senha não são aceitos."
                )
            if any(entry.filename.lower().endswith("vbaproject.bin") for entry in entries):
                raise DocumentConversionError("Documentos com macros não são aceitos.")
            unpacked_size = sum(entry.file_size for entry in entries)
            if unpacked_size > settings.DOCUMENT_MAX_UNCOMPRESSED_SIZE:
                max_mb = settings.DOCUMENT_MAX_UNCOMPRESSED_SIZE // 1024 // 1024
                raise DocumentConversionError(
                    f"O conteúdo descompactado do DOCX excede {max_mb} MB."
                )
    except DocumentConversionError:
        raise
    except (OSError, zipfile.BadZipFile) as exc:
        raise DocumentConversionError("DOCX inválido ou corrompido.") from exc


def _limit_child_resources():
    memory_bytes = settings.DOCUMENT_CONVERSION_MEMORY_LIMIT_MB * 1024 * 1024
    resource.setrlimit(resource.RLIMIT_AS, (memory_bytes, memory_bytes))
    cpu_seconds = settings.DOCUMENT_CONVERSION_TIMEOUT_SECONDS + 30
    resource.setrlimit(resource.RLIMIT_CPU, (cpu_seconds, cpu_seconds))


def _run_bounded_process(command, working_directory, error_message, environment=None):
    environment = (environment or os.environ.copy()).copy()
    environment.update(
        {
            "OPENBLAS_NUM_THREADS": "1",
            "OMP_NUM_THREADS": "1",
            "OMP_THREAD_LIMIT": "1",
            "MKL_NUM_THREADS": "1",
            "NUMEXPR_NUM_THREADS": "1",
        }
    )
    process = subprocess.Popen(
        command,
        cwd=working_directory,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env=environment,
        start_new_session=True,
        preexec_fn=_limit_child_resources,
    )
    try:
        stdout, stderr = process.communicate(
            timeout=settings.DOCUMENT_CONVERSION_TIMEOUT_SECONDS
        )
    except subprocess.TimeoutExpired as exc:
        os.killpg(process.pid, signal.SIGKILL)
        process.communicate()
        raise DocumentConversionError(
            "A conversão ultrapassou o tempo limite."
        ) from exc
    if process.returncode != 0:
        detail = (stderr or stdout or "").strip()
        raise DocumentConversionError(error_message) from RuntimeError(detail)
    return stdout, stderr


def convert_pdf_to_docx(input_path, output_path, working_directory):
    inspect_pdf(input_path, require_text=True)
    command = [
        sys.executable,
        str(Path(__file__).with_name("conversion_runner.py")),
        "--input",
        str(input_path),
        "--output",
        str(output_path),
    ]
    _run_bounded_process(
        command,
        working_directory,
        "Não foi possível converter este PDF para DOCX.",
        environment=os.environ.copy(),
    )
    if not output_path.is_file() or output_path.stat().st_size == 0:
        raise DocumentConversionError("A conversão não gerou um DOCX válido.")
    inspect_docx(output_path)


def convert_docx_to_pdf(input_path, output_path, working_directory):
    inspect_docx(input_path)
    profile_directory = Path(working_directory) / "libreoffice-profile"
    profile_directory.mkdir()
    environment = os.environ.copy()
    environment.update(
        {
            "HOME": str(profile_directory),
            "SAL_USE_VCLPLUGIN": "svp",
        }
    )
    command = [
        "soffice",
        "--headless",
        "--nologo",
        "--nodefault",
        "--nolockcheck",
        "--nofirststartwizard",
        f"-env:UserInstallation={profile_directory.as_uri()}",
        "--convert-to",
        "pdf:writer_pdf_Export",
        "--outdir",
        str(output_path.parent),
        str(input_path),
    ]
    stdout, stderr = _run_bounded_process(
        command,
        working_directory,
        "Não foi possível converter este DOCX para PDF.",
        environment=environment,
    )
    generated_path = output_path.parent / f"{input_path.stem}.pdf"
    if generated_path != output_path and generated_path.exists():
        generated_path.replace(output_path)
    if not output_path.is_file() or output_path.stat().st_size == 0:
        detail = (stderr or stdout or "").strip()
        raise DocumentConversionError(
            "A conversão não gerou um PDF válido."
        ) from RuntimeError(detail)
    return inspect_pdf(output_path, require_text=False)


def convert_document(input_path, output_directory, operation):
    input_path = Path(input_path)
    output_directory = Path(output_directory)
    if operation == DocumentConversion.Operation.PDF_TO_DOCX:
        output_path = output_directory / "result.docx"
        page_count = inspect_pdf(input_path, require_text=True)
        convert_pdf_to_docx(input_path, output_path, output_directory)
        return output_path, page_count
    if operation == DocumentConversion.Operation.DOCX_TO_PDF:
        output_path = output_directory / "result.pdf"
        page_count = convert_docx_to_pdf(input_path, output_path, output_directory)
        return output_path, page_count
    raise DocumentConversionError("Operação de conversão inválida.")
