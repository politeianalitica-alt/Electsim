from agents.simulador_campana import (
    MensajeCampana,
    ReaccionPerfil,
    _parsear_reaccion,
    analizar_receptividad,
)


def test_parsear_reaccion_formato_correcto():
    txt = """
RECEPTIVIDAD: 8
CAMBIO_INTENCION: 2
ARGUMENTOS_RESONANTES: a|b|c
OBJECIONES: x|y
RAZONAMIENTO: Me convence el mensaje.
"""
    m = MensajeCampana("PP", "x", "tweet", "economia")
    r = _parsear_reaccion(txt, 3, m, 1.0)
    assert r.receptividad == 8.0
    assert r.cambio_intencion_voto == 2.0
    assert r.argumentos_resonantes == ["a", "b", "c"]
    assert len(r.objeciones_principales) == 2
    assert "convence" in r.razonamiento_completo


def test_parsear_reaccion_formato_incorrecto():
    m = MensajeCampana("PSOE", "x", "mitin", "otro")
    r = _parsear_reaccion("texto sin estructura", 1, m, 0.5)
    assert r.receptividad == 5.0
    assert r.cambio_intencion_voto == 0.0
    assert r.argumentos_resonantes == []


def test_receptividad_clamp():
    m = MensajeCampana("VOX", "x", "spot_tv", "seguridad")
    r = _parsear_reaccion("RECEPTIVIDAD: 15\nCAMBIO_INTENCION: 0\nARGUMENTOS_RESONANTES: \nOBJECIONES: \nRAZONAMIENTO: x", 1, m, 1.0)
    assert r.receptividad == 10.0


def test_cambio_intencion_clamp():
    m = MensajeCampana("SUMAR", "x", "debate", "educacion")
    r = _parsear_reaccion(
        "RECEPTIVIDAD: 5\nCAMBIO_INTENCION: -8\nARGUMENTOS_RESONANTES: \nOBJECIONES: \nRAZONAMIENTO: x",
        1,
        m,
        1.0,
    )
    assert r.cambio_intencion_voto == -5.0


def test_analizar_receptividad_pesos():
    react = [
        ReaccionPerfil(1, "PP", 10.0, 0.0, [], [], "", 0.5),
        ReaccionPerfil(2, "PP", 0.0, 0.0, [], [], "", 0.3),
        ReaccionPerfil(3, "PP", 5.0, 0.0, [], [], "", 0.2),
    ]
    an = analizar_receptividad(react)
    esperado = (10 * 0.5 + 0 * 0.3 + 5 * 0.2) / 1.0
    assert abs(an["receptividad_media_ponderada"] - esperado) < 0.01


def test_distribucion_receptividad_suma_100():
    react = [
        ReaccionPerfil(1, "PP", 2.0, 0.0, [], [], "", 25.0),
        ReaccionPerfil(2, "PP", 5.0, 0.0, [], [], "", 25.0),
        ReaccionPerfil(3, "PP", 9.0, 0.0, [], [], "", 50.0),
    ]
    an = analizar_receptividad(react)
    d = an["distribucion_receptividad"]
    assert abs(d["baja"] + d["media"] + d["alta"] - 100.0) < 0.1
