"""
Phase 2 repository: reads from Postgres.

NOT WIRED UP YET -- deliberately. It exists now, unimplemented, to prove the
seam holds: when you are ready to migrate, you implement load() here, set
DATA_SOURCE=postgres, and the frontend does not change.

Migration plan (see docs/ADR-002-data-source.md):
  1. Write scripts/ingest_excel.py -- parses the same export, INSERTs into the
     tables below. Run it on a schedule alongside Phase 1 (read still Excel).
  2. Diff /api/pipeline output from both repos until they agree exactly.
  3. Flip DATA_SOURCE=postgres. Excel becomes an ingestion input, not a runtime
     dependency.
  4. Later, retire the Excel input entirely and let people write to Postgres.

Suggested schema (also in deploy/schema.sql):

  CREATE TABLE pipeline_snapshot (
      id            BIGSERIAL PRIMARY KEY,
      taken_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      source_ref    TEXT NOT NULL
  );
  CREATE TABLE pipeline_project (
      id                   BIGSERIAL PRIMARY KEY,
      snapshot_id          BIGINT NOT NULL REFERENCES pipeline_snapshot(id) ON DELETE CASCADE,
      project_name         TEXT NOT NULL DEFAULT '',
      ...
  );

Snapshots are the payoff: they let you answer "what did the 2026 pipeline look
like last month?" -- which the Excel-only design cannot answer at all.
"""
from __future__ import annotations

from app.models import PipelinePayload
from app.repositories.base import PipelineRepository


class PostgresPipelineRepository(PipelineRepository):
    def __init__(self, dsn: str) -> None:
        self._dsn = dsn

    def health(self) -> tuple[bool, str]:
        return False, "Postgres repository not implemented yet (Phase 2)"

    def load(self) -> PipelinePayload:
        raise NotImplementedError(
            "PostgresPipelineRepository is a Phase 2 placeholder. "
            "Set DATA_SOURCE=excel until the ingestion job is built."
        )
