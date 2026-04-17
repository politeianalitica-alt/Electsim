from pathlib import Path

import numpy as np
import pandas as pd
import pyreadstat

from etl.base_extractor import BaseExtractor

CIS_VAR_MAPPING = {
    "SEXO": "sexo",
    "EDAD": "edad",
    "ESTUDIOS": "estudios",
    "SITLAB": "situacion_laboral",
    "TAMUNI": "tamano_habitat",
    "REGION": "ccaa_codigo_ine",
    "P4": "principal_problema",
    "P16": "valoracion_gobierno",
    "P30": "intencion_voto",
    "P31": "simpatia_partido",
    "P40": "escala_ideologica",
    "PESO": "peso_muestral",
    "RECUERDO": "recuerdo_voto_anterior",
}

PARTIDO_CIS_MAPPING = {
    1: "PSOE",
    2: "PP",
    3: "VOX",
    4: "SUMAR",
    5: "CS",
    6: "PODEMOS",
    7: "ERC",
    8: "JUNTS",
    9: "PNV",
    10: "EH-BILDU",
    11: "BNG",
    12: "CC",
    99: "NINGUNO",
    97: "NS",
    98: "NC",
}


class CISBarometroExtractor(BaseExtractor):
    """Lee fichero CIS (.sav) y normaliza columnas hacia el esquema de microdatos."""

    def __init__(self, estudio_numero: str, filepath: Path):
        super().__init__("cis_barometros")
        self.estudio_numero = estudio_numero
        self.filepath = filepath

    def extract(self) -> pd.DataFrame:
        df, self.meta = pyreadstat.read_sav(str(self.filepath))
        return df

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        available_vars = {k: v for k, v in CIS_VAR_MAPPING.items() if k in df.columns}
        if not available_vars:
            return pd.DataFrame()
        out = df[list(available_vars.keys())].rename(columns=available_vars)

        for col in ("intencion_voto", "recuerdo_voto_anterior", "simpatia_partido"):
            if col in out.columns:
                out[col] = out[col].map(PARTIDO_CIS_MAPPING)

        if "edad" in out.columns:
            out["grupo_edad"] = pd.cut(
                out["edad"],
                bins=[17, 24, 34, 44, 54, 64, 120],
                labels=["18-24", "25-34", "35-44", "45-54", "55-64", "65+"],
            ).astype(str)
        else:
            out["grupo_edad"] = None

        out["encuesta_numero"] = self.estudio_numero
        out = out.replace({99.0: np.nan, 98.0: np.nan, 97.0: np.nan})

        if "peso_muestral" in out.columns:
            out["peso_muestral"] = out["peso_muestral"].fillna(1.0)

        return out
