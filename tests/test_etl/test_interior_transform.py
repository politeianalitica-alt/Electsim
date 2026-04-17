import pandas as pd

from etl.sources.interior_resultados import CAMPOS_04PROV, InteriorResultadosExtractor


def _line(**kwargs) -> str:
    buf = [" "] * 90
    for campo, (ini, fin) in CAMPOS_04PROV.items():
        if campo not in kwargs:
            continue
        val = kwargs[campo]
        s = str(val)
        width = fin - ini
        buf[ini:fin] = list(s.ljust(width)[:width])
    return "".join(buf)


def test_interior_transform_porcentaje_por_provincia():
    # Dos partidos en provincia 28, un partido en 08
    l1 = _line(
        tipo_eleccion="02",
        año="2023",
        mes="07",
        vuelta="1",
        codigo_ccaa="13",
        codigo_provincia="28",
        codigo_partido="000001",
        votos="00006000",
        candidatos_electos="007",
    )
    l2 = _line(
        tipo_eleccion="02",
        año="2023",
        mes="07",
        vuelta="1",
        codigo_ccaa="13",
        codigo_provincia="28",
        codigo_partido="000002",
        votos="00004000",
        candidatos_electos="005",
    )
    l3 = _line(
        tipo_eleccion="02",
        año="2023",
        mes="07",
        vuelta="1",
        codigo_ccaa="01",
        codigo_provincia="08",
        codigo_partido="000001",
        votos="00001000",
        candidatos_electos="003",
    )
    rows = []
    for line in (l1, l2, l3):
        rows.append(
            {campo: line[ini:fin].strip() for campo, (ini, fin) in CAMPOS_04PROV.items()}
        )
    df = pd.DataFrame(rows)
    ext = InteriorResultadosExtractor(año=2023, mes=7)
    out = ext.transform(df)
    p28 = out[out["codigo_provincia"] == "28"]
    assert set(p28["porcentaje"].tolist()) == {60.0, 40.0}
    assert sorted(p28["votos"].tolist()) == [4000, 6000]
