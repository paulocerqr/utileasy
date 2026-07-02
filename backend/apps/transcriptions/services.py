from .models import Audio, Transcricao


class TranscriptionService:
    def create_transcription(self, *, audio: Audio, texto_transcricao: str, **extra_fields):
        return Transcricao.objects.create(
            audio=audio,
            texto_transcricao=texto_transcricao,
            **extra_fields,
        )
