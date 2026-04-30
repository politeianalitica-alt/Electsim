from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Base
    APP_NAME: str = "ElectSim API"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = False

    # JWT
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION_use_openssl_rand_hex_32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480    # 8 horas
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Base de datos
    DATABASE_URL: str = (
        "postgresql+psycopg://electsim:electsim@localhost:5432/electsim_espana"
    )

    # CORS — orígenes permitidos (separados por coma en .env)
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]


settings = Settings()
