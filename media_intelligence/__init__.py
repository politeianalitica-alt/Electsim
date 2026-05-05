"""
Media Intelligence — capa de adquisición, calidad y análisis de medios.

Módulos:
- schemas: modelos Pydantic v2
- source_health: registro de salud de fuentes mediáticas
- rss_validator: validador de feeds RSS/Atom
- acquisition: adquisición de artículos desde fuentes mediáticas
- repository: repositorio DB para media_items y source_health
- language_detection: detección de idioma sin dependencias externas obligatorias
- translation_service: traducción con caché en memoria + Ollama
- article_quality: scoring de calidad (clickbait, deportes, antigüedad)
- article_ranker: ranking por relevancia política
- editorial_selector: selección editorial para briefings y dashboards
"""
from __future__ import annotations

from media_intelligence.schemas import (
    MediaSourceProfile,
    MediaSourceHealth,
    MediaArticle,
    ArticleQualityScore,
    ArticleRelevanceScore,
)

__version__ = "1.1.0"

__all__ = [
    "MediaSourceProfile",
    "MediaSourceHealth",
    "MediaArticle",
    "ArticleQualityScore",
    "ArticleRelevanceScore",
]
