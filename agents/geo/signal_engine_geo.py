"""
Geo Signal Engine — Motor de detección de alertas geopolíticas.
Evalúa eventos ACLED y OSINT contra umbrales y reglas críticas para España.
Genera alertas en alertas_geo (DB o JSON store).
Envía notificaciones Telegram para nivel CRITICO/ALTO.

Clases:
  - GeoSignalEngine: motor principal de alertas

Funciones helper:
  - evaluar_alerta_acled(evento) → nivel alerta o None
  - detectar_reglas_criticas(item) → regla coincidente o None
  - procesar_nuevos_eventos() → lista de alertas generadas
  - enviar_alerta_telegram(alerta) → bool
"""
from __future__ import annotations

import json
import logging
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_ROOT = Path(__file__).resolve().parents[2]
_ALERTAS_PATH = _ROOT / "dashboard" / "data" / "alertas_geo.json"
_ALERTAS_PATH.parent.mkdir(parents=True, exist_ok=True)

# ── Umbrales de alerta ────────────────────────────────────────────────────────

UMBRALES_ALERTA: dict[str, dict] = {
    "CRITICO": {
        "fatalities_min": 100,
        "relevancia_min": 0.85,
        "urgencia_min": 5,
        "score_riesgo_min": 8.5,
    },
    "ALTO": {
        "fatalities_min": 25,
        "relevancia_min": 0.70,
        "urgencia_min": 4,
        "score_riesgo_min": 7.0,
    },
    "MEDIO": {
        "fatalities_min": 5,
        "relevancia_min": 0.55,
        "urgencia_min": 3,
        "score_riesgo_min": 5.5,
    },
    "BAJO": {
        "fatalities_min": 0,
        "relevancia_min": 0.35,
        "urgencia_min": 2,
        "score_riesgo_min": 3.0,
    },
}

# ── Reglas críticas específicas para España ───────────────────────────────────

REGLAS_CRITICAS: list[dict] = [
    {
        "id": "corte_gas_argelia",
        "nombre": "Corte suministro gas argelino",
        "nivel": "CRITICO",
        "descripcion": "Interrupción o amenaza grave al suministro de gas natural argelino vía Medgaz/TransMed",
        "paises": ["DZA"],
        "keywords": ["gas", "gasoducto", "medgaz", "transmed", "suministro", "corte",
                     "argelino", "argelia", "enagás", "naturgy", "gnl"],
        "categorias": ["energia"],
        "tipo_evento_acled": None,
        "fatalities_threshold": 0,
        "relevancia_threshold": 0.7,
        "alerta_template": "⛽ ALERTA ENERGÉTICA: Riesgo para suministro gas argelino — {titulo}",
    },
    {
        "id": "crisis_ceuta_melilla",
        "nombre": "Crisis migratoria Ceuta/Melilla",
        "nivel": "CRITICO",
        "descripcion": "Entrada masiva o crisis humanitaria en las ciudades autónomas españolas",
        "paises": ["MAR", "ESP"],
        "keywords": ["ceuta", "melilla", "valla", "frontera", "entrada masiva",
                     "migrantes", "menores", "crisis humanitaria", "presión migratoria"],
        "categorias": ["migracion"],
        "tipo_evento_acled": None,
        "fatalities_threshold": 0,
        "relevancia_threshold": 0.75,
        "alerta_template": "🚨 CRISIS FRONTERIZA: Situación Ceuta/Melilla — {titulo}",
    },
    {
        "id": "activacion_articulo5_otan",
        "nombre": "Activación Artículo 5 OTAN",
        "nivel": "CRITICO",
        "descripcion": "Activación o debate serio sobre el Artículo 5 del Tratado de Washington",
        "paises": [],
        "keywords": ["artículo 5", "article 5", "defensa colectiva", "otan",
                     "nato collective", "alianza atlántica", "ataque aliado"],
        "categorias": ["defensa", "diplomacia"],
        "tipo_evento_acled": None,
        "fatalities_threshold": 0,
        "relevancia_threshold": 0.6,
        "alerta_template": "🛡️ ALERTA OTAN: Posible activación Artículo 5 — {titulo}",
    },
    {
        "id": "ciberataque_infraestructura_critica_es",
        "nombre": "Ciberataque infraestructura crítica española",
        "nivel": "CRITICO",
        "descripcion": "Ataque cibernético grave contra infraestructuras críticas españolas (Red Eléctrica, Repsol, CNPIC, FCAS)",
        "paises": ["ESP", "RUS", "CHN", "PRK"],
        "keywords": ["ciberataque", "cyberattack", "ransomware", "infraestructura crítica",
                     "red eléctrica", "enagas", "repsol hack", "telefonica", "indra",
                     "cnpic", "ccn-cert", "incibe", "ciberespionaje"],
        "categorias": ["ciberseguridad"],
        "tipo_evento_acled": None,
        "fatalities_threshold": 0,
        "relevancia_threshold": 0.65,
        "alerta_template": "💻 CIBERALERTA CRÍTICA: Ataque a infraestructura española — {titulo}",
    },
    {
        "id": "escalada_ucrania_otan",
        "nombre": "Escalada Ucrania con implicación OTAN",
        "nivel": "CRITICO",
        "descripcion": "Escalada del conflicto ucraniano que involucra directamente a aliados OTAN",
        "paises": ["UKR", "RUS", "POL", "LVA", "LTU", "EST"],
        "keywords": ["escalada", "misiles", "territorio otan", "poland attack",
                     "baltics", "nuclear", "táctica nuclear", "escalation"],
        "categorias": ["conflicto_armado", "defensa"],
        "tipo_evento_acled": ["Battles", "Explosions/Remote violence"],
        "fatalities_threshold": 50,
        "relevancia_threshold": 0.80,
        "alerta_template": "☢️ ESCALADA OTAN: Situación crítica Ucrania — {titulo}",
    },
    {
        "id": "colapso_gobierno_aliado",
        "nombre": "Colapso gobierno en país aliado clave",
        "nivel": "ALTO",
        "descripcion": "Caída o crisis grave de gobierno en país estratégico para España",
        "paises": ["MAR", "DZA", "TUN", "LBY", "VEN", "COL", "MEX"],
        "keywords": ["golpe de estado", "coup", "caída gobierno", "gobierno cae",
                     "crisis política", "estado de excepción", "colapso institucional"],
        "categorias": ["diplomacia"],
        "tipo_evento_acled": ["Strategic developments"],
        "fatalities_threshold": 0,
        "relevancia_threshold": 0.65,
        "alerta_template": "🏛️ CRISIS POLÍTICA: Inestabilidad en {pais} — {titulo}",
    },
    {
        "id": "ataque_personal_militar_es",
        "nombre": "Ataque a personal militar español",
        "nivel": "CRITICO",
        "descripcion": "Bajas españolas en misiones OTAN/ONU en el extranjero",
        "paises": ["MLI", "IRQ", "LBN", "LVA", "EST", "LTU", "AFG"],
        "keywords": ["soldado español", "militar español", "ejército español",
                     "legión", "bripac", "fuerzas armadas españa",
                     "spanish soldier", "spanish troops"],
        "categorias": ["defensa", "conflicto_armado"],
        "tipo_evento_acled": ["Battles", "Explosions/Remote violence"],
        "fatalities_threshold": 1,
        "relevancia_threshold": 0.50,
        "alerta_template": "🪖 BAJAS MILITARES ESPAÑOLAS: {titulo}",
    },
    {
        "id": "crisis_estrecho_gibraltar",
        "nombre": "Crisis en el Estrecho de Gibraltar",
        "nivel": "ALTO",
        "descripcion": "Incidente grave en el Estrecho de Gibraltar o aguas territoriales españolas",
        "paises": ["MAR", "GBR", "ESP"],
        "keywords": ["estrecho", "gibraltar", "aguas territoriales", "soberanía",
                     "mar territorial", "incursión", "disputa marítima"],
        "categorias": ["diplomacia", "defensa"],
        "tipo_evento_acled": None,
        "fatalities_threshold": 0,
        "relevancia_threshold": 0.70,
        "alerta_template": "🌊 ALERTA ESTRECHO: Incidente en Gibraltar — {titulo}",
    },
    {
        "id": "colapso_suministro_gnl",
        "nombre": "Colapso mercado GNL global",
        "nivel": "ALTO",
        "descripcion": "Crisis grave en el suministro global de GNL que afecta a España (5 regasificadoras)",
        "paises": ["QAT", "USA", "NGA", "TTO", "AUS"],
        "keywords": ["gnl", "lng", "regasificadora", "gas licuado", "suministro gas",
                     "precio gas", "ttf", "henry hub", "gas crisis"],
        "categorias": ["energia"],
        "tipo_evento_acled": None,
        "fatalities_threshold": 0,
        "relevancia_threshold": 0.60,
        "alerta_template": "⚡ CRISIS GNL: Amenaza suministro energético — {titulo}",
    },
    {
        "id": "crisis_sahel_migracion",
        "nombre": "Colapso de seguridad en el Sahel",
        "nivel": "ALTO",
        "descripcion": "Colapso de seguridad en países del Sahel con impacto en rutas migratorias y misiones españolas",
        "paises": ["MLI", "NER", "BFA", "TCD", "MRT"],
        "keywords": ["jnim", "isgs", "yihadista", "sahel", "mali", "niger",
                     "burkina", "evacuación", "misión eutm", "fuerzas especiales"],
        "categorias": ["terrorismo", "conflicto_armado"],
        "tipo_evento_acled": ["Battles", "Explosions/Remote violence"],
        "fatalities_threshold": 10,
        "relevancia_threshold": 0.65,
        "alerta_template": "🔥 CRISIS SAHEL: Deterioro seguridad — {titulo}",
    },
]


# ── Store JSON de alertas ─────────────────────────────────────────────────────

def _load_alertas() -> list[dict]:
    """Carga alertas desde JSON store."""
    if _ALERTAS_PATH.exists():
        try:
            with open(_ALERTAS_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data if isinstance(data, list) else []
        except Exception:
            return []
    return []


def _save_alertas(alertas: list[dict]) -> None:
    """Guarda alertas en JSON store (máx. 500)."""
    alertas_sorted = sorted(
        alertas,
        key=lambda x: x.get("creada_en", ""),
        reverse=True,
    )[:500]
    with open(_ALERTAS_PATH, "w", encoding="utf-8") as f:
        json.dump(alertas_sorted, f, ensure_ascii=False, indent=2)


# ── Motor de señales ──────────────────────────────────────────────────────────

class GeoSignalEngine:
    """
    Motor de detección y generación de alertas geopolíticas.
    Evalúa eventos ACLED y items OSINT contra umbrales y reglas críticas.
    """

    def __init__(self) -> None:
        self._alertas_emitidas: set[str] = set()  # evitar duplicados en sesión
        self._load_emitidas_recientes()

    def _load_emitidas_recientes(self) -> None:
        """Carga IDs de alertas recientes para evitar duplicados."""
        alertas = _load_alertas()
        # Solo las últimas 24h
        from datetime import timedelta
        cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
        for a in alertas:
            if a.get("creada_en", "") > cutoff:
                self._alertas_emitidas.add(a.get("dedup_key", ""))

    # ── Evaluación ACLED ─────────────────────────────────────────────────────

    def evaluar_alerta_acled(self, evento: dict) -> str | None:
        """
        Evalúa un evento ACLED y retorna el nivel de alerta (o None si no aplica).
        """
        relevancia = float(evento.get("relevancia_es", 0))
        fatalities = int(evento.get("fatalities", 0))
        tipo = str(evento.get("tipo_evento", ""))

        # Prioridad: CRITICO → ALTO → MEDIO
        if (
            fatalities >= UMBRALES_ALERTA["CRITICO"]["fatalities_min"]
            or relevancia >= UMBRALES_ALERTA["CRITICO"]["relevancia_min"]
        ):
            if relevancia >= 0.70 or fatalities >= 50:
                return "CRITICO"

        if (
            fatalities >= UMBRALES_ALERTA["ALTO"]["fatalities_min"]
            or relevancia >= UMBRALES_ALERTA["ALTO"]["relevancia_min"]
        ):
            return "ALTO"

        if (
            fatalities >= UMBRALES_ALERTA["MEDIO"]["fatalities_min"]
            and relevancia >= UMBRALES_ALERTA["MEDIO"]["relevancia_min"]
        ) or (
            tipo in ("Battles", "Explosions/Remote violence")
            and relevancia >= 0.60
        ):
            return "MEDIO"

        if relevancia >= UMBRALES_ALERTA["BAJO"]["relevancia_min"]:
            return "BAJO"

        return None

    # ── Evaluación reglas críticas ────────────────────────────────────────────

    def evaluar_reglas_criticas(self, item: dict) -> dict | None:
        """
        Evalúa un item OSINT (o evento ACLED normalizado) contra las reglas críticas.
        Retorna la primera regla que coincide, o None.
        """
        titulo = (item.get("titulo") or "").lower()
        contenido = (item.get("contenido") or item.get("notas") or item.get("resumen_ollama") or "").lower()
        texto_completo = titulo + " " + contenido

        pais_item = item.get("pais", item.get("iso3", ""))
        paises_item = item.get("paises_mencionados", [])
        if pais_item:
            paises_item = list(paises_item) + [pais_item]

        categoria_item = item.get("categoria", "")
        tipo_evento = item.get("tipo_evento", "")
        relevancia = float(item.get("relevancia_espana", item.get("relevancia_es", 0)))
        fatalities = int(item.get("fatalities", 0))

        for regla in REGLAS_CRITICAS:
            # Filtro por relevancia mínima
            if relevancia < regla["relevancia_threshold"]:
                continue

            # Filtro por fatalities mínimas
            if fatalities < regla["fatalities_threshold"]:
                # Para reglas con fatalities=0 no filtramos
                if regla["fatalities_threshold"] > 0:
                    continue

            # Filtro por países (si la regla especifica países)
            if regla["paises"]:
                match_pais = any(p in paises_item for p in regla["paises"])
                if not match_pais:
                    continue

            # Filtro por categoría (si la regla especifica categorías)
            if regla["categorias"] and categoria_item:
                if categoria_item not in regla["categorias"]:
                    continue

            # Filtro por tipo de evento ACLED (si aplica)
            if regla["tipo_evento_acled"] and tipo_evento:
                if tipo_evento not in regla["tipo_evento_acled"]:
                    continue

            # Verificar keywords (al menos 2 deben aparecer en el texto)
            keywords_encontradas = sum(
                1 for kw in regla["keywords"]
                if kw.lower() in texto_completo
            )
            if keywords_encontradas >= 2 or (
                len(regla["keywords"]) <= 3 and keywords_encontradas >= 1
            ):
                return regla

        return None

    # ── Construcción de alertas ───────────────────────────────────────────────

    def _construir_alerta_acled(self, evento: dict, nivel: str) -> dict:
        """Construye dict de alerta a partir de evento ACLED."""
        import hashlib
        pais = evento.get("pais_nombre", evento.get("pais", "Desconocido"))
        titulo_evento = evento.get("notas", "")[:200] or f"Evento en {pais}"
        titulo_alerta = (
            f"[{nivel}] {evento.get('tipo_evento', 'Evento')} en {pais} "
            f"— {int(evento.get('fatalities', 0))} bajas"
        )
        dedup_key = hashlib.md5(
            f"acled_{evento.get('acled_id', '')}_{nivel}".encode()
        ).hexdigest()

        return {
            "id": dedup_key,
            "tipo": "acled",
            "titulo": titulo_alerta,
            "descripcion": titulo_evento,
            "nivel": nivel,
            "paises": [evento.get("pais", "")],
            "evento_acled_id": evento.get("acled_id"),
            "fatalities": int(evento.get("fatalities", 0)),
            "relevancia_es": float(evento.get("relevancia_es", 0)),
            "fuente_alerta": "acled_threshold",
            "enviado_telegram": False,
            "leida": False,
            "dedup_key": dedup_key,
            "creada_en": datetime.now(timezone.utc).isoformat(),
        }

    def _construir_alerta_regla(self, item: dict, regla: dict) -> dict:
        """Construye dict de alerta a partir de item OSINT + regla crítica."""
        import hashlib
        titulo_fmt = regla["alerta_template"].format(
            titulo=item.get("titulo", "")[:200],
            pais=item.get("pais", item.get("paises_mencionados", [""])[0] if item.get("paises_mencionados") else ""),
        )
        dedup_key = hashlib.md5(
            f"regla_{regla['id']}_{item.get('id', item.get('titulo', ''))[:50]}".encode()
        ).hexdigest()

        return {
            "id": dedup_key,
            "tipo": "regla_critica",
            "titulo": titulo_fmt,
            "descripcion": item.get("resumen_ollama", item.get("contenido", ""))[:500],
            "nivel": regla["nivel"],
            "paises": item.get("paises_mencionados", [item.get("pais", "")]),
            "regla_id": regla["id"],
            "regla_nombre": regla["nombre"],
            "osint_item_id": item.get("id"),
            "url_origen": item.get("url", ""),
            "fuente_alerta": "regla_critica",
            "enviado_telegram": False,
            "leida": False,
            "dedup_key": dedup_key,
            "creada_en": datetime.now(timezone.utc).isoformat(),
        }

    # ── Pipeline de procesamiento ─────────────────────────────────────────────

    def procesar_nuevos_eventos(
        self,
        eventos_acled: list[dict] | None = None,
        items_osint: list[dict] | None = None,
    ) -> list[dict]:
        """
        Procesa eventos ACLED y/o items OSINT y genera alertas nuevas.
        Las alertas se guardan en el store JSON y (si configurado) en PostgreSQL.
        Retorna lista de alertas generadas en esta ejecución.
        """
        nuevas_alertas: list[dict] = []

        # ── Evaluar eventos ACLED ───────────────────────────────────────────
        if eventos_acled:
            for evento in eventos_acled:
                nivel = self.evaluar_alerta_acled(evento)
                if nivel and nivel in ("CRITICO", "ALTO", "MEDIO"):
                    alerta = self._construir_alerta_acled(evento, nivel)
                    if alerta["dedup_key"] not in self._alertas_emitidas:
                        nuevas_alertas.append(alerta)
                        self._alertas_emitidas.add(alerta["dedup_key"])

                # También evaluar reglas críticas sobre el evento
                regla = self.evaluar_reglas_criticas(evento)
                if regla:
                    alerta_r = self._construir_alerta_regla(evento, regla)
                    if alerta_r["dedup_key"] not in self._alertas_emitidas:
                        nuevas_alertas.append(alerta_r)
                        self._alertas_emitidas.add(alerta_r["dedup_key"])

        # ── Evaluar items OSINT ─────────────────────────────────────────────
        if items_osint:
            for item in items_osint:
                # Umbral básico por urgencia/relevancia
                urgencia = int(item.get("urgencia", 1))
                relevancia = float(item.get("relevancia_espana", 0))

                if urgencia >= 5 or (urgencia >= 4 and relevancia >= 0.70):
                    nivel = "CRITICO" if urgencia == 5 else "ALTO"
                    alerta = {
                        "id": f"osint_{item.get('id', '')}",
                        "tipo": "osint_urgente",
                        "titulo": f"[{nivel}] {item.get('titulo', '')[:300]}",
                        "descripcion": item.get("resumen_ollama", item.get("contenido", ""))[:500],
                        "nivel": nivel,
                        "paises": item.get("paises_mencionados", []),
                        "osint_item_id": item.get("id"),
                        "url_origen": item.get("url", ""),
                        "categoria": item.get("categoria", ""),
                        "fuente_alerta": "osint_urgencia",
                        "enviado_telegram": False,
                        "leida": False,
                        "dedup_key": f"osint_urg_{item.get('id', '')}",
                        "creada_en": datetime.now(timezone.utc).isoformat(),
                    }
                    if alerta["dedup_key"] not in self._alertas_emitidas:
                        nuevas_alertas.append(alerta)
                        self._alertas_emitidas.add(alerta["dedup_key"])

                # Evaluar reglas críticas
                regla = self.evaluar_reglas_criticas(item)
                if regla:
                    alerta_r = self._construir_alerta_regla(item, regla)
                    if alerta_r["dedup_key"] not in self._alertas_emitidas:
                        nuevas_alertas.append(alerta_r)
                        self._alertas_emitidas.add(alerta_r["dedup_key"])

        # ── Persistir alertas nuevas ────────────────────────────────────────
        if nuevas_alertas:
            alertas_existentes = _load_alertas()
            alertas_existentes.extend(nuevas_alertas)
            _save_alertas(alertas_existentes)
            logger.info("GeoSignalEngine: %d nuevas alertas generadas", len(nuevas_alertas))

            # Enviar Telegram para CRITICO/ALTO
            for alerta in nuevas_alertas:
                if alerta["nivel"] in ("CRITICO", "ALTO"):
                    sent = self.enviar_alerta_telegram(alerta)
                    alerta["enviado_telegram"] = sent

        return nuevas_alertas

    # ── Notificación Telegram ─────────────────────────────────────────────────

    def enviar_alerta_telegram(self, alerta: dict) -> bool:
        """
        Envía alerta por Telegram (Bot API).
        Requiere TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID en variables de entorno.
        """
        token = os.getenv("TELEGRAM_BOT_TOKEN", "")
        chat_id = os.getenv("TELEGRAM_CHAT_ID", "")

        if not token or not chat_id:
            logger.debug("Telegram no configurado (TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID)")
            return False

        nivel = alerta.get("nivel", "MEDIO")
        emoji_nivel = {"CRITICO": "🚨", "ALTO": "⚠️", "MEDIO": "📌", "BAJO": "ℹ️"}.get(nivel, "📌")

        paises = ", ".join(alerta.get("paises", [])[:3]) or "N/A"
        url_origen = alerta.get("url_origen", "")
        url_line = f"\n🔗 {url_origen}" if url_origen else ""

        mensaje = (
            f"{emoji_nivel} *POLITEIA GEO — {nivel}*\n\n"
            f"📰 {alerta.get('titulo', '')}\n\n"
            f"📋 {alerta.get('descripcion', '')[:400]}\n\n"
            f"🌍 Países: {paises}"
            f"{url_line}\n\n"
            f"⏰ {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')} UTC"
        )

        try:
            import httpx
            resp = httpx.post(
                f"https://api.telegram.org/bot{token}/sendMessage",
                json={
                    "chat_id": chat_id,
                    "text": mensaje,
                    "parse_mode": "Markdown",
                    "disable_web_page_preview": True,
                },
                timeout=10,
            )
            resp.raise_for_status()
            logger.info("Telegram: alerta '%s' enviada", alerta.get("titulo", "")[:50])
            return True
        except Exception as exc:
            logger.warning("Telegram send error: %s", exc)
            return False

    # ── Consultas al store ────────────────────────────────────────────────────

    def get_alertas_activas(
        self,
        nivel: str | None = None,
        limite: int = 50,
        solo_no_leidas: bool = False,
    ) -> list[dict]:
        """Retorna alertas activas desde el JSON store."""
        alertas = _load_alertas()
        if nivel:
            alertas = [a for a in alertas if a.get("nivel") == nivel]
        if solo_no_leidas:
            alertas = [a for a in alertas if not a.get("leida", False)]
        return alertas[:limite]

    def marcar_leida(self, alerta_id: str) -> bool:
        """Marca una alerta como leída."""
        alertas = _load_alertas()
        for a in alertas:
            if a.get("id") == alerta_id or a.get("dedup_key") == alerta_id:
                a["leida"] = True
                _save_alertas(alertas)
                return True
        return False

    def resumen_alertas(self) -> dict[str, int]:
        """Cuenta de alertas por nivel."""
        alertas = _load_alertas()
        conteo: dict[str, int] = {"CRITICO": 0, "ALTO": 0, "MEDIO": 0, "BAJO": 0}
        for a in alertas:
            nivel = a.get("nivel", "BAJO")
            if nivel in conteo:
                conteo[nivel] += 1
        return conteo


# ── Singleton para uso desde dashboard ───────────────────────────────────────

_ENGINE: GeoSignalEngine | None = None


def get_engine() -> GeoSignalEngine:
    global _ENGINE
    if _ENGINE is None:
        _ENGINE = GeoSignalEngine()
    return _ENGINE


# ── Funciones de conveniencia ─────────────────────────────────────────────────

def evaluar_alerta_acled(evento: dict) -> str | None:
    """Wrapper de conveniencia para evaluar un evento ACLED."""
    return get_engine().evaluar_alerta_acled(evento)


def detectar_reglas_criticas(item: dict) -> dict | None:
    """Wrapper de conveniencia para evaluar un item contra reglas críticas."""
    return get_engine().evaluar_reglas_criticas(item)


def procesar_nuevos_eventos(
    eventos_acled: list[dict] | None = None,
    items_osint: list[dict] | None = None,
) -> list[dict]:
    """Wrapper de conveniencia para el pipeline de alertas."""
    return get_engine().procesar_nuevos_eventos(eventos_acled, items_osint)


def enviar_alerta_telegram(alerta: dict) -> bool:
    """Wrapper de conveniencia para Telegram."""
    return get_engine().enviar_alerta_telegram(alerta)
