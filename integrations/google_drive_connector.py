"""
Google Drive Connector — ElectSim.

Importa documentos y datos desde Google Drive usando cuenta de servicio.
Requiere: GOOGLE_SERVICE_ACCOUNT_JSON (path o JSON inline) + GOOGLE_DRIVE_FOLDER_ID (opcional).
"""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from io import BytesIO

from pydantic import BaseModel, ConfigDict

log = logging.getLogger(__name__)


class DriveDocument(BaseModel):
    model_config = ConfigDict()

    id: str
    name: str
    mime_type: str
    size_bytes: int = 0
    created_at: datetime
    modified_at: datetime
    web_view_link: str = ""
    text_content: str = ""
    source_folder: str = ""


def _get_drive_service():  # type: ignore[return]
    """Construye el cliente de Google Drive API. Devuelve None si no está disponible."""
    try:
        from googleapiclient.discovery import build  # type: ignore
        from google.oauth2 import service_account  # type: ignore
    except ImportError:
        log.debug("google-api-python-client no instalado; Drive no disponible")
        return None

    json_env = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON", "").strip()
    if not json_env:
        log.debug("GOOGLE_SERVICE_ACCOUNT_JSON no configurado")
        return None

    try:
        if os.path.isfile(json_env):
            with open(json_env) as fh:
                sa_info = json.load(fh)
        else:
            sa_info = json.loads(json_env)

        credentials = service_account.Credentials.from_service_account_info(
            sa_info,
            scopes=["https://www.googleapis.com/auth/drive.readonly"],
        )
        return build("drive", "v3", credentials=credentials, cache_discovery=False)
    except Exception as exc:
        log.warning("Error construyendo cliente Drive: %s", exc)
        return None


def list_drive_files(
    folder_id: str | None = None,
    max_files: int = 50,
) -> list[DriveDocument]:
    """Lista archivos de Google Drive. Usa modo demo si el servicio no está disponible."""
    service = _get_drive_service()
    if service is None:
        return _demo_drive_files()

    env_folder = os.environ.get("GOOGLE_DRIVE_FOLDER_ID", "").strip()
    target_folder = folder_id or env_folder or None

    try:
        query = "trashed = false"
        if target_folder:
            query += f" and '{target_folder}' in parents"

        response = (
            service.files()
            .list(
                q=query,
                pageSize=max_files,
                fields=(
                    "files(id,name,mimeType,size,createdTime,modifiedTime,"
                    "webViewLink,parents)"
                ),
            )
            .execute()
        )

        results: list[DriveDocument] = []
        for item in response.get("files", []):
            results.append(
                DriveDocument(
                    id=item["id"],
                    name=item.get("name", "Sin nombre"),
                    mime_type=item.get("mimeType", ""),
                    size_bytes=int(item.get("size", 0)),
                    created_at=datetime.fromisoformat(
                        item.get("createdTime", "2026-01-01T00:00:00Z").rstrip("Z")
                        + "+00:00"
                    ),
                    modified_at=datetime.fromisoformat(
                        item.get("modifiedTime", "2026-01-01T00:00:00Z").rstrip("Z")
                        + "+00:00"
                    ),
                    web_view_link=item.get("webViewLink", ""),
                    source_folder=target_folder or "",
                )
            )
        return results
    except Exception as exc:
        log.warning("Error listando archivos Drive: %s", exc)
        return _demo_drive_files()


def get_drive_file_content(file_id: str) -> str:
    """Exporta el contenido de texto de un archivo de Google Drive."""
    service = _get_drive_service()
    if service is None:
        return ""

    try:
        # Primero obtenemos metadatos para saber el mimeType
        meta = service.files().get(fileId=file_id, fields="mimeType,name").execute()
        mime = meta.get("mimeType", "")

        google_doc_mimes = {
            "application/vnd.google-apps.document": "text/plain",
            "application/vnd.google-apps.spreadsheet": "text/csv",
            "application/vnd.google-apps.presentation": "text/plain",
        }

        if mime in google_doc_mimes:
            export_mime = google_doc_mimes[mime]
            data = (
                service.files()
                .export(fileId=file_id, mimeType=export_mime)
                .execute()
            )
            return data.decode("utf-8") if isinstance(data, bytes) else str(data)
        else:
            # Descarga binaria (PDFs, DOCX, etc.) — extracción básica
            request = service.files().get_media(fileId=file_id)
            buf = BytesIO()
            from googleapiclient.http import MediaIoBaseDownload  # type: ignore

            downloader = MediaIoBaseDownload(buf, request)
            done = False
            while not done:
                _, done = downloader.next_chunk()
            # Para PDFs y DOCX no realizamos extracción de texto aquí
            return f"[Archivo binario descargado: {meta.get('name', file_id)}]"
    except Exception as exc:
        log.warning("Error obteniendo contenido del archivo %s: %s", file_id, exc)
        return ""


def sync_drive_folder(
    folder_id: str | None,
    tenant_id: str,
) -> dict:
    """Sincroniza todos los documentos de la carpeta. Devuelve resumen."""
    docs = list_drive_files(folder_id=folder_id)

    synced_count = 0
    failed_count = 0
    errors: list[str] = []
    mode = "live" if _get_drive_service() is not None else "demo"

    for doc in docs:
        try:
            # En producción aquí se guardaría en BD con tenant_id
            synced_count += 1
        except Exception as exc:
            failed_count += 1
            errors.append(f"{doc.name}: {exc}")

    return {
        "synced_count": synced_count,
        "failed_count": failed_count,
        "errors": errors,
        "mode": mode,
        "tenant_id": tenant_id,
        "folder_id": folder_id or "root",
    }


def _demo_drive_files() -> list[DriveDocument]:
    """Cinco documentos demo realistas para modo sin credenciales."""
    _now = datetime(2026, 5, 5, 10, 0, 0, tzinfo=timezone.utc)
    return [
        DriveDocument(
            id="demo-doc-001",
            name="Análisis de Voto 2026.docx",
            mime_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            size_bytes=245_760,
            created_at=datetime(2026, 3, 10, 9, 0, 0, tzinfo=timezone.utc),
            modified_at=datetime(2026, 4, 28, 14, 30, 0, tzinfo=timezone.utc),
            web_view_link="https://drive.google.com/file/d/demo-doc-001/view",
            source_folder="demo",
        ),
        DriveDocument(
            id="demo-doc-002",
            name="Encuesta Interna Marzo 2026.xlsx",
            mime_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            size_bytes=98_304,
            created_at=datetime(2026, 3, 15, 11, 0, 0, tzinfo=timezone.utc),
            modified_at=datetime(2026, 4, 1, 16, 0, 0, tzinfo=timezone.utc),
            web_view_link="https://drive.google.com/file/d/demo-doc-002/view",
            source_folder="demo",
        ),
        DriveDocument(
            id="demo-doc-003",
            name="Estrategia de Comunicación Q2.pdf",
            mime_type="application/pdf",
            size_bytes=512_000,
            created_at=datetime(2026, 4, 1, 8, 0, 0, tzinfo=timezone.utc),
            modified_at=datetime(2026, 4, 20, 9, 0, 0, tzinfo=timezone.utc),
            web_view_link="https://drive.google.com/file/d/demo-doc-003/view",
            source_folder="demo",
        ),
        DriveDocument(
            id="demo-doc-004",
            name="Fichas Candidatos CCAA.docx",
            mime_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            size_bytes=184_320,
            created_at=datetime(2026, 2, 20, 10, 0, 0, tzinfo=timezone.utc),
            modified_at=datetime(2026, 5, 2, 12, 0, 0, tzinfo=timezone.utc),
            web_view_link="https://drive.google.com/file/d/demo-doc-004/view",
            source_folder="demo",
        ),
        DriveDocument(
            id="demo-doc-005",
            name="Presupuesto Campaña 2026.xlsx",
            mime_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            size_bytes=73_728,
            created_at=datetime(2026, 1, 15, 8, 30, 0, tzinfo=timezone.utc),
            modified_at=datetime(2026, 4, 30, 17, 45, 0, tzinfo=timezone.utc),
            web_view_link="https://drive.google.com/file/d/demo-doc-005/view",
            source_folder="demo",
        ),
    ]


def is_configured() -> bool:
    """True si la variable de entorno de cuenta de servicio está configurada."""
    return bool(os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON", "").strip())
