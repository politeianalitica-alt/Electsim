from datetime import date, datetime, timezone

from sqlalchemy import text

from etl.realtime.interior_noche_electoral import (
    AvanceEscrutinio,
    NocheElectoralMonitor,
    calcular_proyeccion_final,
    detectar_eleccion_activa,
)


def test_sin_eleccion_activa(sqlite_engine):
    assert detectar_eleccion_activa(sqlite_engine) is None


def test_proyeccion_simple_30pct(sqlite_engine):
    with sqlite_engine.begin() as conn:
        conn.execute(
            text(
                "INSERT INTO partidos (siglas) VALUES ('PP'), ('PSOE'), ('VOX'), ('SUMAR')"
            )
        )
    av = AvanceEscrutinio(
        eleccion_id=1,
        timestamp=datetime.now(timezone.utc),
        pct_escrutado=35.0,
        votos_escrutados=1000,
        resultados_parciales={
            "PP": {"votos": 350, "pct": 35.0},
            "PSOE": {"votos": 300, "pct": 30.0},
            "VOX": {"votos": 150, "pct": 15.0},
            "SUMAR": {"votos": 200, "pct": 20.0},
        },
    )
    proj = calcular_proyeccion_final(av, sqlite_engine)
    assert proj
    s = sum(proj.values())
    assert 340 <= s <= 360


def test_dry_run_no_escribe(monkeypatch, sqlite_engine):
    monkeypatch.setenv("ELECTSIM_DRY_RUN", "true")
    with sqlite_engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO elecciones (tipo, fecha, descripcion, es_activa)
                VALUES ('generales', :fd, 'test', 1)
                """
            ),
            {"fd": date.today().isoformat()},
        )
    m = NocheElectoralMonitor("noche", sqlite_engine)
    m.run(n_ciclos=1)
    with sqlite_engine.connect() as conn:
        n = conn.execute(
            text("SELECT COUNT(*) FROM resultados_electorales")
        ).scalar()
    assert int(n) == 0
