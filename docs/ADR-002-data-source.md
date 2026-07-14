# ADR-002: Excel now, Postgres later — behind one contract

**Status:** Accepted · **Date:** 2026-07-14

## Context

The PMO maintains the pipeline in Excel and must keep doing so for the next few
months. A move to a proper database design is planned but not imminent.

The prototype parses the XLSX **in the browser**, on every page load, for every
user — and locates the file by scraping Apache's directory-index HTML with
`DOMParser`.

## Decision

Introduce a `PipelineRepository` interface. Ship `ExcelPipelineRepository` now.
Ship `PostgresPipelineRepository` as a stub. Select between them with a single
`DATA_SOURCE` env var. Both return the identical `PipelinePayload`.

The frontend calls `GET /api/pipeline` and is never told which one answered.

## Why not just keep parsing Excel in the browser?

Because it welds the *storage format* to the *presentation layer*. The day Postgres
arrives, every component that touches data would need rewriting. Moving the parse
to the server costs one afternoon now and saves the entire Phase 2 frontend effort.

The scraping of Apache's directory listing is separately unacceptable: it breaks
on any `mod_autoindex` change and is an implicit contract with a web server config.

## Why not go straight to Postgres?

Because the PMO must keep working in Excel for months. Forcing the DB now would
either block the users or create a second master and a reconciliation problem.
Excel remains the source of truth until the PMO is ready — the architecture simply
stops *depending* on that fact.

## Migration plan (Phase 2)

The seam only pays off if the cutover is boring. It is:

1. **Build** `scripts/ingest_excel.py` — parses the same export (reusing
   `core/coerce.py`, so the numbers cannot diverge) and INSERTs a snapshot.
2. **Shadow.** Run ingestion on a schedule while reads still come from Excel.
   Diff `/api/pipeline` output from both repositories until they match *exactly*.
3. **Flip.** Set `DATA_SOURCE=postgres`. Restart. Frontend unchanged.
4. **Retire.** Later, let the PMO write to Postgres directly and drop the Excel input.

Rollback at any point = flip the variable back.

## The bonus nobody asked for

Postgres stores **snapshots**, not just current state. That makes "what did the
2026 pipeline look like last month?" answerable — a question the Excel-only design
cannot answer at all, because each export overwrites the last. Expect this to become
the most-used feature once it exists.

## Consequences

- (+) Migration is a config flag, not a project.
- (+) Parsing happens once per file change, not once per user per page load.
- (+) Excel stays authoritative exactly as long as the PMO needs it to.
- (−) One extra layer of indirection in the backend. Worth it.
