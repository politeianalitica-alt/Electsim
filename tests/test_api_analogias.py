from __future__ import annotations

from fastapi.testclient import TestClient

from api.main import app


def test_analogias_buscar_serializa_tipos_python() -> None:
    client = TestClient(app)
    payload = {
        "pib_crecimiento": 2.5,
        "tasa_paro": 11.0,
        "inflacion": 3.2,
        "deficit_pib": 3.5,
        "satisfaccion_eco": 4.0,
        "incumbente_anios": 5,
        "aprobacion_gobierno": 33.0,
        "fragmentacion_pre": 5.8,
        "polarizacion": 0.65,
        "escandalo_mayor": False,
        "tension_territorial": 0.65,
        "crisis_internacional": True,
        "partido_ref": "PSOE",
        "top_n": 5,
        "guardar": False,
    }

    response = client.post("/analogias/buscar", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert "analogias" in data
    assert "proyeccion" in data
    assert isinstance(data["proyeccion"].get("vuelco_probable"), bool)
    assert isinstance(data["proyeccion"].get("escenarios", []), list)
