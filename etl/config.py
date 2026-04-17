import os


REQUIRED_ENV = [
    "DATABASE_URL",
]


def validate_env() -> None:
    missing = [k for k in REQUIRED_ENV if not os.environ.get(k)]
    if missing:
        raise EnvironmentError(
            f"Variables de entorno obligatorias no definidas: {missing}\n"
            f"Comprueba tu archivo .env o el entorno de despliegue."
        )
