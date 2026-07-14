"""Configuration. All of it. No os.getenv() scattered through the codebase."""
from __future__ import annotations

import functools
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.repositories.base import PipelineRepository
from app.repositories.excel_repo import ExcelPipelineRepository
from app.repositories.postgres_repo import PostgresPipelineRepository


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # THE flag. Flip to "postgres" when Phase 2 lands. Nothing else changes.
    data_source: Literal["excel", "postgres"] = "excel"

    excel_path: Path = Field(
        default=Path("data/PPD_PMO_PM_Pipeline_Export.xlsx"),
        description="Server-side path to the PMO-maintained pipeline export.",
    )

    # Unused in Phase 1. Never hardcode -- inject via systemd EnvironmentFile.
    postgres_dsn: str = ""

    static_dir: Path = Path("static")
    log_level: str = "INFO"


@functools.lru_cache
def get_settings() -> Settings:
    return Settings()


@functools.lru_cache
def get_repository() -> PipelineRepository:
    """FastAPI dependency. Cached: repositories hold their own parse cache."""
    s = get_settings()
    if s.data_source == "postgres":
        return PostgresPipelineRepository(s.postgres_dsn)
    return ExcelPipelineRepository(s.excel_path)
