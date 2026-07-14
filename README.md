# ISQ PMO — PM Pipeline

Analytical dashboard over the ISQ PMO project pipeline: KPIs, funnel, probability
buckets, PM allocation, timeline, and drill-down.

Successor to the single-file `PMO_PM_PipelineF.html` prototype.

---

## The one thing to understand

**The data source is swappable and the frontend does not know which one is active.**

```
React SPA ──GET /api/pipeline──▶ FastAPI ──▶ PipelineRepository (interface)
                                                 │
                                    ┌────────────┴────────────┐
                                    ▼                         ▼
                            ExcelRepository          PostgresRepository
                            (Phase 1 — NOW)          (Phase 2 — LATER)
```

The pipeline is maintained in Excel today and will move to Postgres in a few
months. That migration is a **config change** (`DATA_SOURCE=excel` →
`DATA_SOURCE=postgres`), not a rewrite, because both repositories return the
identical `PipelinePayload` contract defined in `backend/app/models.py`.

**Consequence for contributors:** never let a UI component learn where data came
from. If you find yourself writing `if (source === 'excel')` in `frontend/`, stop
— the abstraction has leaked.

---

## What changed from the prototype, and why

| Prototype | Here | Why |
|---|---|---|
| Babel compiles JSX in the browser | Vite builds in CI | Prototype shipped React's **dev** build + a compiler to every user. Now: 47 KB gzipped, precompiled. |
| React/Chart.js/XLSX from public CDNs | npm deps, bundled | CDNs are likely blocked on the DHL network, and are a supply-chain risk. Zero external runtime deps now. |
| One 3,033-line HTML file | Modular TS + Python | 3k-line files can't be diffed, reviewed, or tested. Two people editing = guaranteed conflict. |
| XLSX parsed in every browser | Parsed once, server-side | Same work was repeated per user per page load. Also unblocks the row cap. |
| Scrapes Apache's directory index with `DOMParser` | `GET /api/pipeline` | Broke on any `mod_autoindex` config change. Now an explicit contract. |
| Business data in the repo | `.gitignore`d | Pipeline values must not live in git. |

---

## Quickstart

**Requires:** Python 3.11+, Node 20+

```bash
# 1. Put the pipeline export where the backend expects it
cp /path/to/PPD_PMO_PM_Pipeline_Export.xlsx data/

# 2. Backend (terminal 1)
cd backend
python -m venv ../.venv && source ../.venv/bin/activate
pip install -r requirements-dev.txt
cp ../.env.example ../.env
uvicorn app.main:app --reload          # → http://127.0.0.1:8000/api/docs

# 3. Frontend (terminal 2)
cd frontend
npm install
npm run dev                             # → http://127.0.0.1:5173  (proxies /api)
```

`npm run build` emits into `backend/static/`, which FastAPI then serves — so in
production there is **one process on one port**.

## Tests

```bash
cd backend && pytest -q          # coercion logic is pinned; see below
cd frontend && npm run typecheck
```

`backend/tests/test_coerce.py` deserves attention: it pins the number-parsing
rules ported from the original JS. European formatting (`"1.234.567,89"` →
`1234567.89`) is load-bearing — a silent regression there puts wrong figures in
front of steering. Don't "tidy" `core/coerce.py` without these tests passing.

## Layout

```
backend/
  app/
    models.py              ← THE CONTRACT. Read this first.
    config.py              ← DATA_SOURCE flag → picks the repository
    main.py                ← API + serves the built SPA
    core/coerce.py         ← ported number/date/status parsing
    repositories/
      base.py              ← the swap seam
      excel_repo.py        ← Phase 1
      postgres_repo.py     ← Phase 2 (stub, deliberately)
  tests/
frontend/
  src/
    lib/types.ts           ← mirrors models.py
    lib/api.ts             ← the only place that touches the network
    App.tsx                ← shell + Summary tab
    tabs/                  ← remaining tabs land here (Sprint 2)
deploy/                    ← systemd unit + Apache vhost
docs/                      ← ADRs and roadmap
```

## Docs

- `docs/ADR-001-frontend-stack.md` — why React survived, and why the single file didn't
- `docs/ADR-002-data-source.md` — the Excel → Postgres migration, in detail
- `docs/ROADMAP.md` — what's done, what's next
