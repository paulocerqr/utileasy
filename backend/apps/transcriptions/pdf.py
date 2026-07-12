from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer


def build_transcription_pdf(transcription):
    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title=f"Transcrição - {transcription.nome_original}",
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "TranscriptionTitle",
        parent=styles["Title"],
        alignment=TA_CENTER,
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
    )
    body_style = ParagraphStyle(
        "TranscriptionBody",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=10,
        leading=15,
        spaceAfter=8,
    )

    text = escape(transcription.effective_transcription.texto_transcricao).replace("\n", "<br/>")
    completed_at = transcription.finalizado_em or transcription.criado_em
    story = [
        Paragraph("Transcrição", title_style),
        Spacer(1, 0.4 * cm),
        Paragraph(f"Arquivo: {escape(transcription.nome_original)}", styles["Normal"]),
        Paragraph(
            f"Concluída em: {completed_at.strftime('%d/%m/%Y %H:%M')}",
            styles["Normal"],
        ),
        Spacer(1, 0.7 * cm),
        Paragraph(text, body_style),
    ]
    document.build(story)
    return buffer.getvalue()
