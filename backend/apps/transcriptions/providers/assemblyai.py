import os

import requests


class AssemblyAIError(Exception):
    pass


class AssemblyAIClient:
    base_url = "https://api.assemblyai.com/v2"

    def __init__(self):
        self.api_key = os.getenv("ASSEMBLYAI_API_KEY", "").strip()
        if not self.api_key:
            raise AssemblyAIError("ASSEMBLYAI_API_KEY não foi configurada.")

    @property
    def headers(self):
        return {"authorization": self.api_key}

    def upload_file(self, audio_path):
        file_size = os.path.getsize(audio_path)
        headers = {
            **self.headers,
            "content-type": "application/octet-stream",
            "content-length": str(file_size),
        }
        try:
            with open(audio_path, "rb") as audio_file:
                response = requests.post(
                    f"{self.base_url}/upload",
                    headers=headers,
                    data=audio_file,
                    timeout=(15, 900),
                )
            response.raise_for_status()
            return response.json()["upload_url"]
        except (requests.RequestException, KeyError, ValueError) as exc:
            raise AssemblyAIError("Falha ao enviar o áudio para a AssemblyAI.") from exc

    def submit_transcription(self, upload_url, webhook_url=None, webhook_secret=None):
        payload = {
            "audio_url": upload_url,
            "language_code": "pt",
            "format_text": True,
        }
        if webhook_url:
            payload.update(
                {
                    "webhook_url": webhook_url,
                    "webhook_auth_header_name": "X-AssemblyAI-Webhook-Secret",
                    "webhook_auth_header_value": webhook_secret,
                }
            )
        try:
            response = requests.post(
                f"{self.base_url}/transcript",
                headers={**self.headers, "content-type": "application/json"},
                json=payload,
                timeout=(15, 60),
            )
            response.raise_for_status()
            return response.json()["id"]
        except (requests.RequestException, KeyError, ValueError) as exc:
            raise AssemblyAIError("Falha ao iniciar a transcrição na AssemblyAI.") from exc

    def get_transcription(self, transcription_id):
        try:
            response = requests.get(
                f"{self.base_url}/transcript/{transcription_id}",
                headers=self.headers,
                timeout=(15, 60),
            )
            response.raise_for_status()
            return response.json()
        except (requests.RequestException, ValueError) as exc:
            raise AssemblyAIError("Falha ao consultar a transcrição na AssemblyAI.") from exc
