"""Storage helpers shared by document and transcription pipelines."""
import shutil
import tempfile
from contextlib import contextmanager
from pathlib import Path

from django.core.files.storage import default_storage


class StorageProcessingError(Exception):
    """Raised when local storage is required but unavailable."""


def storage_path(relative_name):
    try:
        return Path(default_storage.path(relative_name))
    except NotImplementedError as exc:
        raise StorageProcessingError("O processamento local exige storage em disco.") from exc


@contextmanager
def materialize_storage_file(relative_name):
    """Yield a local path for either filesystem or remote Django storage."""
    try:
        local_storage_path = Path(default_storage.path(relative_name))
    except NotImplementedError:
        local_storage_path = None
    if local_storage_path is not None:
        yield local_storage_path
        return
    suffix = Path(relative_name).suffix
    with tempfile.TemporaryDirectory(prefix="utileazy-media-") as temp_dir:
        local_path = Path(temp_dir) / f"input{suffix}"
        try:
            with default_storage.open(relative_name, "rb") as source, local_path.open("wb") as target:
                shutil.copyfileobj(source, target, length=1024 * 1024)
        except OSError as exc:
            raise StorageProcessingError("Não foi possível obter o arquivo enviado.") from exc
        yield local_path


def save_local_file(file_path, relative_name):
    with Path(file_path).open("rb") as source:
        return default_storage.save(relative_name, source)


def delete_storage_file(relative_name):
    if relative_name and default_storage.exists(relative_name):
        default_storage.delete(relative_name)
