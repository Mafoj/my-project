"""
FastAPI entrypoint.

Serves two things:
  1. GET /api/pipeline  -- the whole dataset as JSON (the stable contract)
  2. the built React SPA as static files, with SPA history fallback

Deliberately read-only. There is no POST/PUT/DELETE anywhere, because the
pipeline is maintained upstream in Excel. If that changes, add write endpoints
here -- and add authz at the same time, not after.
"""
from __future__ import annotations

import logging

from fastapi import Depends, FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import Settings, get_repository, get_settings
from app.models import PipelinePayload
from app.repositories.base import PipelineRepository

logging.basicConfig(
    level=get_settings().log_level,
    format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
)
log = logging.getLogger(__name__)

app = FastAPI(
    title="ISQ PMO PM Pipeline",
    version="0.1.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

# NOTE: no CORS middleware. The SPA is served same-origin by this very app,
# so CORS is unnecessary -- and adding it would only widen the attack surface.


@app.get("/api/health")
def health(repo: PipelineRepository = Depends(get_repository)) -> JSONResponse:
    ok, detail = repo.health()
    return JSONResponse(
        status_code=200 if ok else 503,
        content={"status": "ok" if ok else "degraded", "detail": detail},
    )


@app.get("/api/pipeline", response_model=PipelinePayload)
def get_pipeline(repo: PipelineRepository = Depends(get_repository)) -> PipelinePayload:
    """The entire dataset. Small enough to send whole; paginate only if that stops being true."""
    try:
        return repo.load()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        log.exception("Failed to load pipeline")
        raise HTTPException(status_code=500, detail="Failed to load pipeline data") from e


def mount_spa(application: FastAPI, settings: Settings) -> None:
    """Serve the Vite build. Any unknown path -> index.html (client-side routing)."""
    static_dir = settings.static_dir
    if not static_dir.is_dir():
        log.warning("static_dir %s missing -- API-only mode (fine in dev)", static_dir)
        return

    assets = static_dir / "assets"
    if assets.is_dir():
        application.mount("/assets", StaticFiles(directory=assets), name="assets")

    @application.get("/{full_path:path}", include_in_schema=False)
    def spa_fallback(full_path: str) -> FileResponse:
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")
        candidate = static_dir / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(static_dir / "index.html")


mount_spa(app, get_settings())
