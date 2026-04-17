"""
Clase base para todos los Índices Politeia.
Cada índice hereda de PoliteiaIndex e implementa compute().
"""
from __future__ import annotations

import json
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import date, datetime

from sqlalchemy import text
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)


@dataclass
class IndiceResult:
    codigo: str
    nombre: str
    valor: float                          # 0-100 normalizado
    valor_raw: float                      # valor sin normalizar
    semaforo: str                         # VERDE / AMARILLO / ROJO
    componentes: dict[str, float]         # sub-índices con valores
    interpretacion: str
    metodologia: str
    fecha_calculo: date = field(default_factory=date.today)
    variacion_7d: float | None = None
    variacion_30d: float | None = None

    def semaforo_from_valor(self, umbral_verde: float = 35.0, umbral_rojo: float = 65.0) -> str:
        """Para índices donde alto=malo (ej: polarización, riesgo)."""
        if self.valor <= umbral_verde:
            return "VERDE"
        elif self.valor <= umbral_rojo:
            return "AMARILLO"
        return "ROJO"

    def semaforo_from_valor_inverso(self, umbral_verde: float = 65.0, umbral_rojo: float = 35.0) -> str:
        """Para índices donde alto=bueno (ej: estabilidad, cohesión)."""
        if self.valor >= umbral_verde:
            return "VERDE"
        elif self.valor >= umbral_rojo:
            return "AMARILLO"
        return "ROJO"


class PoliteiaIndex(ABC):
    """Clase base abstracta para índices Politeia."""

    CODIGO: str = ""
    NOMBRE: str = ""
    METODOLOGIA: str = ""

    def __init__(self, engine: Engine):
        self.engine = engine

    def _q(self, sql: str, params: dict | None = None):
        """Ejecuta query y devuelve lista de mappings."""
        import pandas as pd
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text(sql), params or {})
                return result.mappings().fetchall()
        except Exception as exc:
            logger.warning("[%s] Query error: %s", self.CODIGO, exc)
            return []

    def _qdf(self, sql: str, params: dict | None = None):
        """Ejecuta query y devuelve DataFrame."""
        import pandas as pd
        try:
            with self.engine.connect() as conn:
                return pd.read_sql(text(sql), conn, params=params or {})
        except Exception as exc:
            logger.warning("[%s] DataFrame query error: %s", self.CODIGO, exc)
            import pandas as pd
            return pd.DataFrame()

    @abstractmethod
    def compute(self) -> IndiceResult:
        """Calcula el índice y devuelve IndiceResult."""

    def save(self, result: IndiceResult) -> None:
        """Persiste el resultado en indices_politeia."""
        sql = text("""
            INSERT INTO indices_politeia
                (fecha_calculo, indice_codigo, indice_nombre, valor, valor_raw,
                 semaforo, variacion_7d, variacion_30d, componentes_json,
                 interpretacion, metodologia)
            VALUES
                (:fecha, :codigo, :nombre, :valor, :valor_raw,
                 :semaforo, :var7, :var30, :comp_json,
                 :interp, :metod)
            ON CONFLICT (fecha_calculo, indice_codigo) DO UPDATE SET
                valor           = EXCLUDED.valor,
                valor_raw       = EXCLUDED.valor_raw,
                semaforo        = EXCLUDED.semaforo,
                variacion_7d    = EXCLUDED.variacion_7d,
                variacion_30d   = EXCLUDED.variacion_30d,
                componentes_json = EXCLUDED.componentes_json,
                interpretacion  = EXCLUDED.interpretacion
        """)
        with self.engine.begin() as conn:
            conn.execute(sql, {
                "fecha": result.fecha_calculo,
                "codigo": result.codigo,
                "nombre": result.nombre,
                "valor": round(result.valor, 4),
                "valor_raw": round(result.valor_raw, 4),
                "semaforo": result.semaforo,
                "var7": result.variacion_7d,
                "var30": result.variacion_30d,
                "comp_json": json.dumps(result.componentes, ensure_ascii=False),
                "interp": result.interpretacion,
                "metod": result.metodologia,
            })
        logger.info("[%s] Guardado: %.2f (%s)", result.codigo, result.valor, result.semaforo)

    def _get_variaciones(self) -> tuple[float | None, float | None]:
        """Calcula variación respecto a 7 y 30 días anteriores."""
        rows = self._q("""
            SELECT valor, fecha_calculo FROM indices_politeia
            WHERE indice_codigo = :codigo
              AND fecha_calculo >= CURRENT_DATE - 35
            ORDER BY fecha_calculo DESC
            LIMIT 35
        """, {"codigo": self.CODIGO})
        if not rows:
            return None, None
        hist = {r["fecha_calculo"]: float(r["valor"]) for r in rows}
        today = date.today()
        var7 = None
        var30 = None
        import datetime as dt
        d7 = today - dt.timedelta(days=7)
        d30 = today - dt.timedelta(days=30)
        # Busca valor más cercano a 7 y 30 días
        for d, v in sorted(hist.items()):
            if d <= d7:
                var7 = v
            if d <= d30:
                var30 = v
        current = list(hist.values())[0] if hist else None
        var7 = round(current - var7, 3) if var7 and current else None
        var30 = round(current - var30, 3) if var30 and current else None
        return var7, var30

    def run(self) -> IndiceResult:
        """Calcula, enriquece con variaciones y guarda."""
        result = self.compute()
        var7, var30 = self._get_variaciones()
        result.variacion_7d = var7
        result.variacion_30d = var30
        self.save(result)
        return result
