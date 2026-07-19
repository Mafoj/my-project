# Deploying to a RHEL server

Step-by-step guide to get this app running in production on a Linux/RHEL host:
FastAPI backend serving the built React SPA, behind Apache (TLS), managed by
systemd. Matches the scaffolding already in `deploy/`.

Target layout on the server: `/opt/pmo-pipeline` (backend + frontend build +
data), running as a dedicated `pmoapp` service user, reverse-proxied by Apache
on 443, with uvicorn bound only to `127.0.0.1:8000`.

---

## 0. What you need before you start

- Root or sudo access on the RHEL server.
- The server can reach the internet (or your internal mirror) for `dnf` and
  `npm`/`pip` packages — or you build the frontend elsewhere and just copy the
  result (see step 6).
- A hostname/DNS entry for the app, and a TLS cert + key for it (or accept
  plain HTTP for a first pass and add TLS once the cert is issued).

---

## 1. Install prerequisites on the server

```bash
sudo dnf install -y git python3.12 python3.12-devel httpd mod_ssl policycoreutils-python-utils
```

Notes:
- **Python version matters.** `pydantic-core` (a FastAPI dependency) fails to
  build from source on Python 3.14+; use 3.11, 3.12, or 3.13. RHEL9's
  AppStream has `python3.12` (or `python3.11`); pick whichever is available —
  just don't rely on the system default `python3` without checking its
  version first (`python3 --version`).
- **Node is only needed if you build the frontend on this server** (see step
  6, option B). If you'll build it elsewhere and copy the output, skip
  installing Node here entirely.
- `mod_ssl` ships the Apache TLS module; `policycoreutils-python-utils` gives
  you `setsebool` for the SELinux step later.

### Git specifically

`git` is included in the command above, but if you're setting up a server
that already has some packages installed, here's how to check/install it on
its own:

```bash
git --version                       # if this prints a version, you're done
```

If it's missing:

```bash
sudo dnf install -y git
git --version                       # confirm — e.g. "git version 2.43.5"
```

`git` ships in RHEL's BaseOS repo, so this works even on a server with no
extra repos configured, as long as `dnf` itself can reach BaseOS (internet or
your internal mirror). If `dnf` reports no such package, your repo config is
missing BaseOS/AppStream — that's a separate, system-level fix (`dnf repolist`
to see what's enabled) and not specific to this app.

---

## 2. Create the service user and directory layout

```bash
sudo useradd --system --home-dir /opt/pmo-pipeline --shell /sbin/nologin pmoapp
sudo mkdir -p /opt/pmo-pipeline
sudo chown pmoapp:pmoapp /opt/pmo-pipeline
```

---

## 3. Get the code onto the server

**Option A — git clone (preferred, makes future updates a `git pull`):**

`/opt/pmo-pipeline` was created and `chown`'d to `pmoapp` in step 2, but it's
still empty — `git clone` needs to create that directory itself (or clone
into it while it's empty), so this step populates it for the first time.

**1. Get the repo URL.** From your git host (GitHub, `dhl.ghe.com`, etc.),
copy either the HTTPS or SSH clone URL for the repo — they look like:

```
https://dhl.ghe.com/your-org/pmo-pipeline.git      # HTTPS
git@dhl.ghe.com:your-org/pmo-pipeline.git          # SSH
```

**2. Authenticate.** Pick whichever your git host and network policy allow:

- **SSH (preferred for a server — no password prompt on every pull):**
  generate a key as the `pmoapp` user, then add the *public* key to your git
  host (GitHub/GHE → Settings → SSH keys, or as a repo-scoped deploy key if
  the host supports it):

  ```bash
  sudo -u pmoapp mkdir -m 700 -p /opt/pmo-pipeline/.ssh
  sudo -u pmoapp ssh-keygen -t ed25519 -C "pmoapp@$(hostname -s)" -f /opt/pmo-pipeline/.ssh/id_ed25519 -N ""
  sudo -u pmoapp cat /opt/pmo-pipeline/.ssh/id_ed25519.pub    # paste this into the git host
  # First connection prompts to trust the host key — confirm it matches what your git host publishes:
  sudo -u pmoapp ssh -T git@dhl.ghe.com
  ```

- **HTTPS with a personal access token:** if the server can't hold an SSH key
  (or your git host requires it), generate a token from the git host (repo
  read scope is enough) and use it as the password when cloning — you'll be
  prompted, or embed it in the URL for a one-off clone:

  ```bash
  sudo -u pmoapp git clone https://<token>@dhl.ghe.com/your-org/pmo-pipeline.git /opt/pmo-pipeline
  ```

  Don't leave the token sitting in shell history longer than necessary
  (`history -d` the line, or just clone once and switch the remote to a
  token-free HTTPS URL afterwards — `git pull` will then prompt each time).

**3. Clone:**

```bash
sudo -u pmoapp git clone <your-repo-url> /opt/pmo-pipeline
```

**4. Pin to a specific release, if you don't want to deploy whatever's on the
default branch:**

```bash
cd /opt/pmo-pipeline
sudo -u pmoapp git checkout <tag-or-commit>
```

**5. Verify the clone actually landed:**

```bash
sudo -u pmoapp git -C /opt/pmo-pipeline status
sudo -u pmoapp git -C /opt/pmo-pipeline log -1 --oneline
ls /opt/pmo-pipeline                # expect: backend/ frontend/ data/ deploy/ docs/ ...
```

**Option B — copy from your Mac via `rsync`** (if the server can't reach your
git remote at all):

```bash
# From your Mac, in the project directory:
rsync -avz --exclude='.venv' --exclude='node_modules' --exclude='.run' \
  ./ youruser@server:/tmp/pmo-pipeline-upload/

# Then on the server:
sudo mv /tmp/pmo-pipeline-upload/* /opt/pmo-pipeline/
sudo chown -R pmoapp:pmoapp /opt/pmo-pipeline
```

Either way, you should end up with `/opt/pmo-pipeline/backend`,
`/opt/pmo-pipeline/frontend`, `/opt/pmo-pipeline/data`, and
`/opt/pmo-pipeline/deploy` on the server.

---

## 4. Backend: virtualenv + dependencies

```bash
cd /opt/pmo-pipeline
sudo -u pmoapp python3.12 -m venv .venv
sudo -u pmoapp .venv/bin/pip install --upgrade pip
sudo -u pmoapp .venv/bin/pip install -r backend/requirements.txt
```

Use `backend/requirements.txt` here, **not** `requirements-dev.txt` — the dev
file adds `pytest`/`ruff`/`mypy`, which production doesn't need.

---

## 5. Data file + backend configuration

The app reads one Excel export. Put it where the app expects it:

```bash
sudo -u pmoapp mkdir -p /opt/pmo-pipeline/data
# Copy your current pipeline export there, e.g.:
sudo -u pmoapp cp "/path/to/ISQ Pipeline 2026.xlsx" "/opt/pmo-pipeline/data/"
```

The repo you cloned may already contain a checked-in copy of the Excel file
under `data/` from development — that's fine as a placeholder, but replace it
with the real, current export before going live, and keep it updated going
forward (the app hot-reloads on file change, no restart needed).

Now set `backend/.env`. **If you cloned the repo, it may already contain a
`backend/.env` with a developer's local Mac path in `EXCEL_PATH` — that will
not resolve on this server, so overwrite it:**

```bash
sudo -u pmoapp tee /opt/pmo-pipeline/backend/.env <<'EOF'
DATA_SOURCE=excel
EXCEL_PATH=/opt/pmo-pipeline/data/ISQ Pipeline 2026.xlsx
LOG_LEVEL=INFO
EOF
```

Use an **absolute path** for `EXCEL_PATH` (as above) — the default is a path
relative to the process's working directory, and systemd will run this app
with `backend/` as the working directory, not the repo root, so a relative
`data/...` path would look in the wrong place.

---

## 6. Frontend: build the SPA

`vite.config.ts` builds straight into `backend/static/`, which FastAPI serves
directly — so in production there's one process on one port, no separate
frontend server.

**Option A — build on this server:**

```bash
# Install Node 20+ if you haven't (e.g. via nodesource or your internal mirror), then:
cd /opt/pmo-pipeline/frontend
sudo -u pmoapp npm install
sudo -u pmoapp npm run build
```

**Option B — build elsewhere, copy the result** (useful if the server has no
internet access for `npm install`):

```bash
# On your Mac / build machine:
cd frontend && npm install && npm run build
# This produces backend/static/ in the repo. Copy just that directory:
rsync -avz ../backend/static/ youruser@server:/tmp/pmo-static-upload/

# On the server:
sudo -u pmoapp cp -r /tmp/pmo-static-upload/* /opt/pmo-pipeline/backend/static/
```

Either way, verify it landed correctly:

```bash
ls /opt/pmo-pipeline/backend/static/index.html   # should exist
```

---

## 7. Smoke-test before wiring systemd

Run it by hand first, so any config problem is easy to see:

```bash
cd /opt/pmo-pipeline/backend
sudo -u pmoapp /opt/pmo-pipeline/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

In another shell on the server:

```bash
curl -s http://127.0.0.1:8000/api/health
curl -s http://127.0.0.1:8000/api/pipeline | head -c 200
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8000/   # should be 200 (the SPA)
```

If `/api/health` reports `degraded` or you get a 500/503, check the Excel
path from step 5 before moving on. Once it looks right, `Ctrl-C` it — systemd
will run it from here on.

---

## 8. Install the systemd service

The repo already ships a unit file at `deploy/pmo-pipeline.service`. Review it
— it assumes exactly the layout used above (`/opt/pmo-pipeline`, user
`pmoapp`), plus a **separate** env file at `/etc/pmo-pipeline/pmo-pipeline.env`
reserved for secrets (e.g. a future Postgres DSN — unused today, but the unit
requires the file to exist).

```bash
sudo mkdir -p /etc/pmo-pipeline
sudo tee /etc/pmo-pipeline/pmo-pipeline.env <<'EOF'
# Reserved for future secrets (e.g. POSTGRES_DSN). Empty for Phase 1 (Excel).
EOF
sudo chown root:root /etc/pmo-pipeline/pmo-pipeline.env
sudo chmod 600 /etc/pmo-pipeline/pmo-pipeline.env

sudo cp /opt/pmo-pipeline/deploy/pmo-pipeline.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now pmo-pipeline
sudo systemctl status pmo-pipeline
```

Check the logs:

```bash
sudo journalctl -u pmo-pipeline -f
```

Re-run the `curl` checks from step 7 — they should still pass, now via the
service.

---

## 9. Reverse proxy (Apache) + TLS

The repo also ships `deploy/apache-pmo-pipeline.conf`. **Edit it first** —
it has placeholder values you must change:

- `ServerName` → your real hostname (e.g. `pmo-pipeline.yourcompany.com`)
- `SSLCertificateFile` / `SSLCertificateKeyFile` → your actual cert/key paths

```bash
sudo cp /opt/pmo-pipeline/deploy/apache-pmo-pipeline.conf /etc/httpd/conf.d/pmo-pipeline.conf
sudo httpd -t                      # validate config syntax before reloading
sudo systemctl enable --now httpd
sudo systemctl reload httpd
```

If you don't have a cert yet, comment out the `<VirtualHost *:443>` block and
the HTTP→HTTPS redirect, and temporarily proxy plain `:80` to `127.0.0.1:8000`
instead — just don't leave it that way for anything handling real business
data.

---

## 10. Firewall

Open the ports Apache listens on — **not** 8000, since uvicorn only binds to
`127.0.0.1` and should never be reachable directly from outside the box:

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

---

## 11. SELinux

RHEL ships SELinux enforcing by default. Apache proxying to a local backend
port needs one boolean enabled — this is the single most common thing that
silently breaks this exact setup:

```bash
getenforce                                        # confirm it's Enforcing
sudo setsebool -P httpd_can_network_connect on
```

If something still doesn't work and you suspect SELinux, check for denials:

```bash
sudo ausearch -m avc -ts recent
```

---

## 12. Verify end-to-end

From your own machine (not the server):

```bash
curl -sk https://pmo-pipeline.yourcompany.com/api/health
```

Then open the URL in a browser and click through a couple of tabs. If the KPI
totals look right and the Project Quality / Timeline tabs load data, you're
done.

---

## 13. Updating the app later

```bash
cd /opt/pmo-pipeline
sudo -u pmoapp git pull                                   # or re-upload via rsync
sudo -u pmoapp .venv/bin/pip install -r backend/requirements.txt   # only if deps changed
cd frontend && sudo -u pmoapp npm install && sudo -u pmoapp npm run build
sudo systemctl restart pmo-pipeline
```

Dropping a fresh Excel export into `data/` does **not** need a restart — the
repository watches the file's mtime and reloads on the next request.

---

## Troubleshooting quick reference

| Symptom | Check |
|---|---|
| `systemctl status pmo-pipeline` shows failed | `journalctl -u pmo-pipeline -e`; usually a bad `EXCEL_PATH` or missing `/etc/pmo-pipeline/pmo-pipeline.env` |
| `/api/health` returns `degraded` | Excel file missing/unreadable at the configured `EXCEL_PATH`, or malformed |
| Apache 502/503 | Is `pmo-pipeline.service` actually running? `curl 127.0.0.1:8000/api/health` directly on the server |
| Apache proxy works for static assets but API calls 403/502 intermittently | SELinux — see step 11 |
| Browser loads a blank page | `backend/static/index.html` missing — frontend build didn't land in the right place (step 6) |
| Old data still showing after replacing the Excel file | Confirm you overwrote the file at the exact `EXCEL_PATH` configured, and that its mtime actually changed (`stat`) |

## Reference: what NOT to use in production

- `scripts/start_c.sh` / `scripts/stop_c.sh` — dev convenience scripts (auto
  venv creation, `npm run dev`, background PID files under `.run/`). They're
  fine for a laptop, not for a managed server; use the systemd unit instead.
- `uvicorn --reload` — dev-only auto-reload; the systemd unit deliberately
  omits it.
