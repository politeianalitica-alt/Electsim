from etl.realtime.prensa_encuestas import (
    PrensaEncuestasScraper,
    extraer_casa_encuestadora,
    extraer_datos_encuesta_regex,
    extraer_metadatos_encuesta,
)


def test_extraer_regex_formato_tipico():
    t = "PP: 33%, PSOE: 28%, VOX: 15%, SUMAR: 12%"
    d = extraer_datos_encuesta_regex(t)
    assert d["PP"] == 33.0
    assert d["PSOE"] == 28.0
    assert d["VOX"] == 15.0
    assert d["SUMAR"] == 12.0


def test_extraer_regex_sin_datos():
    assert extraer_datos_encuesta_regex("Hoy hace sol en Madrid") == {}


def test_extraer_casa_conocida():
    assert extraer_casa_encuestadora("según GAD3 el sondeo") == "GAD3"


def test_confianza_alta():
    from etl.realtime.prensa_encuestas import _confianza

    p = {"PP": 1.0, "PSOE": 2.0, "VOX": 3.0, "SUMAR": 4.0}
    assert _confianza(p, "GAD3", 1200) == 1.0


def test_confianza_baja():
    from etl.realtime.prensa_encuestas import _confianza

    p = {"PP": 1.0, "PSOE": 2.0}
    assert _confianza(p, None, None) == 0.3


def test_dry_run_no_escribe(monkeypatch, sqlite_engine):
    monkeypatch.setenv("ELECTSIM_DRY_RUN", "true")
    s = PrensaEncuestasScraper("prensa", sqlite_engine)
    s.run()
    from sqlalchemy import text

    with sqlite_engine.connect() as conn:
        n = conn.execute(text("SELECT COUNT(*) FROM encuestas_tracking")).scalar()
    assert int(n) == 0


def test_extraer_metadatos_entrevistas():
    m = extraer_metadatos_encuesta("La muestra fue de 850 entrevistas telefónicas")
    assert m.get("n_entrevistas") == 850
