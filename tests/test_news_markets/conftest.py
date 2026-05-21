"""Test-wide flags para news + markets.

Por defecto las pruebas NO ejecutan llamadas reales · `is_available()` debe
detectar la ausencia de keys y devolver estructuras vacías. Para correr
tests con red real, exportar las keys reales antes de pytest.
"""
import os

# Estos defaults aseguran que los tests sin red no se rompen
# (los clientes devuelven [] o None y los tests verifican esa branch).
os.environ.setdefault("NEWSAPI_TEST_MODE", "1")
os.environ.setdefault("ALPHA_VANTAGE_TEST_MODE", "1")
os.environ.setdefault("FRED_TEST_MODE", "1")
