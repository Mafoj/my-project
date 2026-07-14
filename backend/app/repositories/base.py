"""
The swap seam.

Anything that wants pipeline data depends on THIS, never on Excel or psycopg
directly. That is the entire mechanism by which Phase 2 (Postgres) becomes a
config change instead of a rewrite.
"""
from __future__ import annotations

from abc import ABC, abstractmethod

from app.models import PipelinePayload


class PipelineRepository(ABC):
    """Read-only access to the pipeline dataset."""

    @abstractmethod
    def load(self) -> PipelinePayload:
        """Return the full dataset. Implementations should cache internally."""

    @abstractmethod
    def health(self) -> tuple[bool, str]:
        """(is_healthy, human_readable_detail) -- used by /api/health."""
