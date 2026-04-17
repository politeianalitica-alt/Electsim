import pandas as pd

from etl.sources.cis_barometro import CISBarometroExtractor


def test_cis_transform_maps_and_grupo_edad(monkeypatch, tmp_path):
    raw = pd.DataFrame(
        {
            "SEXO": [1, 2],
            "EDAD": [22, 50],
            "P30": [1, 2],
            "PESO": [1.0, 1.1],
            "P40": [5.0, 8.0],
        }
    )
    ext = CISBarometroExtractor("TEST-001", tmp_path / "dummy.sav")

    def fake_extract(self):
        return raw

    monkeypatch.setattr(CISBarometroExtractor, "extract", fake_extract)
    out = ext.extract()
    clean = ext.transform(out)
    assert "intencion_voto" in clean.columns
    assert clean["intencion_voto"].iloc[0] == "PSOE"
    assert clean["grupo_edad"].iloc[0] == "18-24"
    assert clean["encuesta_numero"].iloc[0] == "TEST-001"
