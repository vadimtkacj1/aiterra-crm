# CRM (FastAPI + React)

## Backend (FastAPI) — run (dev)

```bash
cd backend
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1
```

API base URL: `http://127.0.0.1:8000/api` (у `frontend/.env` має збігатися `VITE_API_BASE_URL`).

Optional: `META_SNAPSHOT_MOCK=true` in `backend/.env` returns synthetic Meta analytics (no Graph API) for local UI work.

Default seeded admin (from `.env`):
- Email: `admin@example.com`
- Password: `Admin123!`

### Backend tests (pytest)

Tests are split by the usual pyramid:

- **`tests/unit/`** — isolated checks (pure logic, helpers, schemas, services with mocks). Fast, no real DB or HTTP server.
- **`tests/integration/`** — FastAPI app with `TestClient`, in-memory SQLite, and DB overrides so routes and persistence work together.

`pytest.ini` sets `testpaths` to those two folders. Use the project venv so dev dependencies (pytest and a compatible **`httpx`** version for Starlette `TestClient`; `httpx` 0.28+ is incompatible) do not clash with other tools:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements-dev.txt
pytest
```

## Frontend (Vite + React) — run (dev)

```bash
cd frontend
npm install
npm run dev
```

Frontend env is in `frontend/.env`.

