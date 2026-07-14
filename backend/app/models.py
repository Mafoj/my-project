"""
Domain models = THE STABLE CONTRACT.

This is the single most important file in the repo.

The frontend consumes these shapes and nothing else. The Excel repository and
the (future) Postgres repository both produce exactly these objects. That is
what makes the Phase 1 -> Phase 2 migration a config change rather than a
rewrite.

RULE: Do not add a field here that only one repository can populate. If Excel
can't provide it, it does not belong in the contract yet.
"""
from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

MONTH_KEYS = [
    "jan", "feb", "mar", "apr", "may", "jun",
    "jul", "aug", "sep", "oct", "nov", "dec",
]

# Mirrors STATUS_NORM in the original single-file app.
ProjectStatus = Literal[
    "Initiation", "Starting", "In Progress", "On Hold",
    "Completed", "Cancelled", "Won", "Lost", "Unknown",
]

CLOSED_STATUSES: set[str] = {"Completed", "Cancelled", "Won", "Lost"}
PIPELINE_STATUSES: set[str] = {"Initiation", "Starting"}


class Project(BaseModel):
    """One row of the main pipeline sheet."""

    project_name: str = ""
    project_name_its: str = ""
    tower: str = ""
    pc_ownership: str = ""
    pm_name: str = ""
    int_ext: str = ""
    sales_force: str = ""
    bso_io: str = ""
    project_status: str = "Unknown"
    start_date: date | None = None
    end_date: date | None = None
    bu: str = ""
    comments: str = ""

    # Derived numerics. Named without leading underscore (unlike the original
    # `_v` / `_vw` / `_p`) because these are now a public API, not internals.
    value_2026: float = 0.0
    value_weighted_2026: float = 0.0
    probability: float = 0.0  # always normalised to 0-100


class Allocation(BaseModel):
    """One row of the PM allocation sheet (monthly grid)."""

    tower: str = ""
    profit_ownership: str = ""
    pm_depart: str = ""
    pm_name: str = ""
    pm_name_secondary: str = ""
    project_name: str = ""
    externality: str = ""
    order_n: str = ""
    notes: str = ""
    project_status: str = "Unknown"
    in_project_list: str = ""

    value: float = 0.0
    probability: float = 0.0
    months: dict[str, float] = Field(default_factory=dict)  # "jan".."dec" -> float


class DatasetMeta(BaseModel):
    """Provenance. Shown in the UI header so users know how stale the data is."""

    source: Literal["excel", "postgres"]
    source_ref: str          # filename, or table name in Phase 2
    generated_at: str        # ISO8601, when the repo produced this payload
    source_modified_at: str | None = None  # file mtime / snapshot timestamp
    project_count: int = 0
    allocation_count: int = 0


class PipelinePayload(BaseModel):
    """The one and only response shape of GET /api/pipeline."""

    meta: DatasetMeta
    projects: list[Project]
    allocations: list[Allocation]
