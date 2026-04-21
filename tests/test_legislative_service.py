import pandas as pd

from dashboard.services.legislative_service import build_legislative_laws_view


def test_build_legislative_laws_view_combines_activity_and_votes():
    activity = pd.DataFrame(
        {
            "partido_siglas": ["PSOE", "PP"],
            "tipo_acto": ["Proyecto de Ley", "Comparecencia"],
            "titulo": ["Ley de Vivienda", "Sesion informativa"],
            "fecha": ["2026-04-10", "2026-04-09"],
            "resultado": ["Registro", "Celebrada"],
        }
    )
    votes = pd.DataFrame(
        {
            "tipo_votacion": ["Proposición de Ley", "Mocion"],
            "titulo": ["Ley de Vivienda", "Reforma del reglamento"],
            "fecha": ["2026-04-11", "2026-04-08"],
            "resultado": ["APROBADA", "RECHAZADA"],
        }
    )

    out = build_legislative_laws_view(activity, votes)

    assert out["titulo_norma"].tolist() == ["Ley de Vivienda"]
    assert out.iloc[0]["estado"] == "Registro"
    assert out.iloc[0]["partido_siglas"] == "PSOE"
    assert out.iloc[0]["fecha_norma_label"] == "2026-04-10"


def test_build_legislative_laws_view_supports_rich_vote_schema():
    votes = pd.DataFrame(
        {
            "vote_type": ["RDL", "Control al Gobierno"],
            "title": ["Decreto ley energético", "Sesion de control"],
            "session_date": ["2026-04-12", "2026-04-11"],
            "result": ["APROBADA", "APROBADA"],
        }
    )

    out = build_legislative_laws_view(pd.DataFrame(), votes)

    assert len(out) == 1
    assert out.iloc[0]["titulo_norma"] == "Decreto ley energético"
    assert out.iloc[0]["estado"] == "APROBADA"
    assert out.iloc[0]["partido_siglas"] == "N/A"
