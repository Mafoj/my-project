# Roadmap

T-shirt sizes. No date estimates — those would be fiction until the team is known.

## ✅ Sprint 0 — Baseline (this commit)

- Repo structure, CI (lint + typecheck + test + build artifact)
- `PipelineRepository` seam; Excel repo working; Postgres repo stubbed
- Coercion logic ported from JS **with tests pinning the behaviour**
- FastAPI serving `/api/pipeline` + the built SPA
- React/Vite/TS shell: KPIs, Summary tab, provenance banner
- systemd + Apache deployment configs

## Sprint 1 — Make it real (S)

- [ ] Create the repo on `dhl.ghe.com`; enable branch protection on `main`
- [ ] Point `EXCEL_PATH` at the real export; **verify totals match the prototype exactly**
- [ ] Deploy to the RHEL9 server (systemd + Apache); confirm SSO/network access
- [ ] Add `/api/health` to whatever monitoring exists

> The verification step is not a formality. If a single KPI differs from the
> prototype, the port has a bug — find it before anyone trusts the new tool.

## Sprint 2 — Port the remaining tabs (M)

One PR per tab. Each is independently reviewable and deployable.

- [ ] `tabs/Analysis.tsx` — funnel, probability buckets, int/ext charts
- [ ] `tabs/Timeline.tsx` — Gantt-style view
- [ ] `tabs/Allocation.tsx` — monthly PM allocation grid
- [ ] `components/FilterBar.tsx` — multi-select + cross-tab sync (localStorage)
- [ ] `components/ProjectDetail.tsx` — drill-down drawer
- [ ] Retire `PMO_PM_PipelineF.html`

## Sprint 3 — Postgres (M)

Follow `ADR-002-data-source.md` exactly: ingest → shadow → diff → flip.

- [ ] `deploy/schema.sql` (snapshot-based; see `repositories/postgres_repo.py`)
- [ ] `scripts/ingest_excel.py` (reuses `core/coerce.py` — do not re-implement parsing)
- [ ] Implement `PostgresPipelineRepository.load()`
- [ ] Shadow-run and diff both repos until byte-identical
- [ ] Flip `DATA_SOURCE=postgres`

## Sprint 4 — Things you'll want once it's live (M/L)

- [ ] **Trend view** — pipeline value over time. Only possible post-Postgres; likely
      to become the headline feature.
- [ ] Excel/CSV export of the filtered table (PMO will ask for this within a week)
- [ ] Generate `frontend/src/lib/types.ts` from `/api/openapi.json` so the contract
      cannot drift
- [ ] AuthN/AuthZ — **required before any write feature ever ships**

## Explicitly out of scope

- Editing pipeline data in the app. It is read-only by design; edits happen upstream.
  Revisit only when Phase 2 is complete *and* authz exists.
