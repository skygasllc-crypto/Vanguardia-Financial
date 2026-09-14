"""Application configuration loaded from environment variables."""
from functools import lru_cache
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    APP_NAME: str = "Vanguard Trading API"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # Security
    SECRET_KEY: str = "insecure-dev-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://vanguard:vanguard@localhost:5432/vanguard_trading"
    DATABASE_URL_SYNC: str = "postgresql+psycopg2://vanguard:vanguard@localhost:5432/vanguard_trading"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173"

    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 120

    # Twelve Data supplies the assets CoinGecko cannot: equities, FX and spot
    # metals. Blank by default, which leaves the provider inert and those
    # assets priced by the engine, exactly as before it was added.
    TWELVEDATA_API_KEY: str = ""
    # Symbols per /quote request. Kept modest because the request is a query
    # string, and free plans cap both symbols-per-call and calls-per-minute.
    TWELVEDATA_BATCH_SIZE: int = 8
    # Pause between chunks so one cycle does not burst through a per-minute cap.
    TWELVEDATA_BATCH_DELAY_SECONDS: float = 1.0
    # How often an equity point is written per account for the progress chart.
    EQUITY_SNAPSHOT_INTERVAL_SECONDS: float = 300.0
    # How long those points are kept.
    EQUITY_SNAPSHOT_RETENTION_DAYS: int = 90

    # Yahoo Finance covers everything CoinGecko cannot and needs no key, so it
    # is the default source for equities/FX/commodities. It is an undocumented
    # endpoint though: set this False to fall back to the engine (or rely on
    # Twelve Data) if it starts refusing requests or the terms matter to you.
    YAHOO_FALLBACK_ENABLED: bool = True

    # Equities, FX and metals move slower than crypto and cost more API budget,
    # so they poll on their own, longer cadence rather than every crypto tick.
    NON_CRYPTO_UPDATE_INTERVAL_SECONDS: float = 300.0

    # Market data source: "live" pulls real prices from CoinGecko; "simulated"
    # uses the controlled random-walk engine (useful for offline dev/CI).
    MARKET_DATA_SOURCE: str = "live"
    MARKET_UPDATE_INTERVAL_SECONDS: float = 30.0
    MARKET_MIN_MOVEMENT_PCT: float = -0.6
    MARKET_MAX_MOVEMENT_PCT: float = 0.6
    MARKET_VOLATILITY_LEVEL: str = "medium"

    # Paper trading
    # New demo accounts open empty; no free practice balance is credited.
    STARTING_PAPER_BALANCE: float = 0.0
    DEFAULT_ACCOUNT_CURRENCY: str = "USD"

    # Email
    EMAIL_FROM: str = "no-reply@vanguardtrading.dev"
    EMAIL_PROVIDER: str = "console"

    @field_validator("DATABASE_URL", mode="after")
    @classmethod
    def _force_async_driver(cls, url: str) -> str:
        """Rewrite a driverless Postgres URL onto asyncpg.

        Managed hosts inject their own connection string — Render's
        `fromDatabase` property and Heroku's DATABASE_URL both hand over
        `postgresql://...` (Heroku still uses the older `postgres://`), with no
        driver named. SQLAlchemy then loads its default psycopg2 dialect, and
        both the app engine and Alembic's `async_engine_from_config` fail on it
        with "The asyncio extension requires an async driver". That surfaces as
        a failed pre-deploy migration, before the service ever starts.

        Only the scheme is touched, so an explicit `+asyncpg` (or any other
        driver someone deliberately chose) is left exactly as written.
        """
        if url.startswith("postgres://"):
            return "postgresql+asyncpg://" + url[len("postgres://"):]
        if url.startswith("postgresql://"):
            return "postgresql+asyncpg://" + url[len("postgresql://"):]
        return url

    @field_validator("DATABASE_URL_SYNC", mode="after")
    @classmethod
    def _force_sync_driver(cls, url: str) -> str:
        """Same fix for the sync URL, which wants psycopg2 rather than asyncpg."""
        if url.startswith("postgres://"):
            return "postgresql+psycopg2://" + url[len("postgres://"):]
        if url.startswith("postgresql://"):
            return "postgresql+psycopg2://" + url[len("postgresql://"):]
        return url

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
