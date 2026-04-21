import pandas as pd

from dashboard.services.institutional_service import (
    build_quality_inputs,
    normalize_live_agenda_rows,
    prepare_agenda_data,
    prepare_boe_data,
)


def test_normalize_live_agenda_rows_deduplicates_and_fills_defaults():
    rows = [
        {"title": "Consejo de Ministros", "institution": "Moncloa", "date": "2026-04-21"},
        {"titulo": "Consejo de Ministros", "fuente": "Moncloa", "fecha": "2026-04-21"},
        {"title": "Comparecencia", "institution": "Congreso", "date": "2026-04-22", "summary": "Resumen"},
    ]

    out = normalize_live_agenda_rows(rows)

    assert len(out) == 2
    assert out[0]["titulo"] == "Consejo de Ministros"
    assert out[0]["resumen"] == "Comunicación oficial agenda/actividad institucional."
    assert out[1]["resumen"] == "Resumen"


def test_prepare_agenda_data_prefers_rich_database_schema():
    df = pd.DataFrame(
        [
            {
                "title": "Sesión plenaria",
                "main_actor": "Congreso",
                "host_institution": "Congreso de los Diputados",
                "event_date": "2026-04-21",
                "time_start": "09:00:00",
                "event_type": "PLENARY_SESSION",
                "location": "Madrid",
                "description": "Orden del día",
                "source_url": "https://congreso.es/evento",
            }
        ]
    )

    out = prepare_agenda_data(df)

    assert out.is_real is True
    assert out.source_label == "Tabla agenda_item"
    assert len(out.events) == 1
    assert out.events[0].title == "Sesión plenaria"
    assert out.events[0].institution == "Congreso de los Diputados"


def test_prepare_boe_data_normalizes_database_rows():
    df = pd.DataFrame(
        [
            {
                "boe_no": "BOE-A-2026-1",
                "fecha": "2026-04-21",
                "seccion": "I — Disposiciones generales",
                "departamento": "Ministerio de Hacienda",
                "tipo_norma": "Ley",
                "titulo": "Ley de Presupuestos",
                "resumen": "Resumen oficial",
                "url_html": "https://boe.es/boe-a-2026-1",
                "relevancia": "Alta",
            }
        ]
    )

    out = prepare_boe_data(df)

    assert out.is_real is True
    assert out.source_label == "Tabla boe_publication"
    assert out.items[0]["numero"] == "BOE-A-2026-1"
    assert out.items[0]["organismo"] == "Ministerio de Hacienda"
    assert out.items[0]["relevancia_politica"] == "Alta"


def test_build_quality_inputs_ignores_empty_frames():
    out = build_quality_inputs(
        boe_df=pd.DataFrame({"titulo": ["x"]}),
        agenda_df=pd.DataFrame(),
        votes_df=pd.DataFrame({"titulo": ["votacion"]}),
    )

    assert set(out) == {"boe", "votes"}
