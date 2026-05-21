"""Test-wide flags para el módulo Puertos.

Activa los modos sintéticos / forced-seed en todas las pruebas, para que
los tests no dependan de red externa (AISstream, Comtrade, OFAC, etc.).
La rama de producción usa estos defaults INVERTIDOS · live siempre que sea posible.
"""
import os

os.environ.setdefault("PORTS_ALLOW_SYNTH", "1")
os.environ.setdefault("COMTRADE_FORCE_SEED", "1")
