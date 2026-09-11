# Vanguard Trading

A professional, **Trading Platform** cryptocurrency  and other assets investment platform. Clean, institutional design in the spirit of Vanguard
Investor — original branding, not a copy — built as two independent applications (`/frontend`, `/backend`) talking over a REST API and
WebSockets.



---

## What's implemented

**Backend (FastAPI + PostgreSQL + Redis + WebSockets)**
- Full auth: registration, login, JWT access + rotating refresh tokens, session/device tracking, login history, 2FA (TOTP) architecture
- Ledger-based accounting: every balance change (`TRADE_BUY`, `TRADE_SELL`, `POSITION_CLOSE`, `ADMIN_CREDIT`, `ADMIN_DEBIT`) writes an
  immutable `transaction_ledger` row — account balances are never edited directly
- Paper trading engine: market/limit/stop-limit orders, average-cost position tracking, realized/unrealized P&L, close-at-market
- Simulated market engine: per-asset controlled random price movement on a configurable interval, auto-fills resting limit/stop orders
- WebSocket infrastructure: `market.price_update`, `position.updated`, `position.profit_loss_updated`, `position.closed`,
  `order.updated`, `trade.executed`, `account.balance_updated`, and the full `admin.*` event set — routed through a Redis-pub/sub
  abstraction that transparently falls back to an in-process bus if Redis isn't running
- Admin financial management: user roll-up table, per-user financial profile, ledger-backed balance adjustments with mandatory reason +
  confirmation, an admin-managed position layer (`admin_positions`) and account-override layer (`user_financial_settings`) that are
  always clearly labeled **"Admin-managed"** to the end user, and a full audit log
- 18 SQLAlchemy models, one hand-written Alembic migration (`alembic/versions/`), dev seed script

**Frontend (React + Vite + TypeScript + Tailwind CSS)**
- Public site: landing page, live Markets browser, asset detail pages, Learn, Security overview, legal pages
- Authenticated app: dashboard, trading terminal (candlestick chart via TradingView Lightweight Charts, order book, order form, live
  positions), portfolio, watchlist, wallet, security, profile
- Admin console: overview stats, user management table (search/sort/paginate), per-user financial profile with balance-adjustment and
  account-override forms, admin position management, audit log viewer
- 7 separate Zustand stores (auth, account, portfolio, positions, orders, market data, WebSocket connection) — live updates flow from
  the WebSocket straight into these stores, so the UI never needs a manual refresh after a trade, close, or admin action

---

## Prerequisites

- **Node.js** 20+ and npm (already used to scaffold this project)
- **Python** 3.12+
- **PostgreSQL** 16+ and **Redis** 7+ — easiest via Docker; see below
- **Docker Desktop**, if you want to use `docker-compose.yml` (recommended)

---

## Option A — Run everything with Docker (recommended)

This repo ships a `docker-compose.yml` that runs Postgres, Redis, and the backend together, running migrations and seeding data
automatically on first boot.

1. Copy the backend environment file and fill in a real secret key:
   ```bash
   cp backend/.env.example backend/.env
   ```
   Generate a secret with:
   ```bash
   python3 -c "import secrets; print(secrets.token_urlsafe(64))"
   ```
   and paste it into `SECRET_KEY` in `backend/.env`.

2. **If you're on WSL2** (this project was built inside one): open Docker Desktop → Settings → Resources → WSL Integration, and enable
   integration for your distro, then restart the terminal. This is what lets the `docker` command reach Docker Desktop's engine from
   inside WSL.

3. From the repo root:
   ```bash
   docker compose up --build
   ```
   This starts Postgres and Redis, waits for them to be healthy, runs `alembic upgrade head`, seeds demo data, and starts the API on
   `http://localhost:8000`.

4. In a second terminal, start the frontend (it isn't containerized, to keep the dev loop fast):
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Open `http://localhost:5173`. Vite proxies `/api` and `/ws` to `localhost:8000` automatically (see `frontend/vite.config.ts`).

5. Log in with the seeded accounts.

   `scripts/seed.py` prints each password once, when it creates the account.
   Nothing here ships a working credential — this repository is public, and a
   password written in it is a live login to every deployment seeded from it.

   Set your own before seeding:

   ```bash
   ADMIN_SEED_PASSWORD='choose-a-strong-one' \
   DEMO_SEED_PASSWORD='another-one' \
   python -m scripts.seed
   ```

   With neither set, a random password is generated and printed once — copy it
   from that output, it is not recoverable afterwards. Seeded users are
   `admin@vanguardiafinancial.com` and `demo@vanguardtrading.dev`.

---

## Option B — Run natively (no Docker)

1. **Install and start PostgreSQL and Redis** locally, then create the database:
   ```bash
   createdb vanguard_trading
   ```

2. **Backend setup:**
   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate          # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   cp .env.example .env               # then edit DATABASE_URL / REDIS_URL / SECRET_KEY to match your local setup
   alembic upgrade head                # creates all tables
   python -m scripts.seed              # seeds assets + demo/admin users
   uvicorn app.main:app --reload --port 8000
   ```

3. **Frontend setup** (separate terminal):
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Visit `http://localhost:5173`.

---

## Verification performed in this environment

This sandbox had no system Postgres/Redis and no working Docker daemon (WSL integration was off), so the full live stack could not be
exercised end-to-end here. What *was* verified directly:

- Backend: all 18 models, Pydantic schemas, services, and 39 API routes import cleanly (`python -c "import app.main"`); the FastAPI app
  boots and serves `/api/health` and a fully-resolving `/openapi.json` with no DB connection; the Alembic migration parses and resolves
  (`alembic heads`); the simulated market engine correctly falls back to an in-process event bus when Redis is unreachable.
- Frontend: `tsc --noEmit` passes with zero errors across the whole app; `npm run build` produces a clean production bundle; every page
  module (18 pages) transforms successfully through Vite's dev server.

Run the app locally with Option A or B above to see it fully live — trading, live P&L, and the admin console all require a real
Postgres connection to exercise.

---

## Project structure

```
Vanguard-Trading/
├── frontend/                # React + Vite + TypeScript + Tailwind
│   └── src/
│       ├── components/      # common/, charts/, layout/, trading/, admin/
│       ├── pages/            # public/, auth/, dashboard/, markets/, trading/, portfolio/, watchlist/, wallet/, security/, profile/, admin/
│       ├── layouts/          # PublicLayout, AuthLayout, AppLayout, AdminLayout
│       ├── services/          # apiClient, websocketService, adminService, securityService
│       ├── store/             # 7 separate Zustand stores
│       ├── types/             # TS types mirroring backend Pydantic schemas
│       └── utils/             # formatting, class-name helpers
│
├── backend/
│   └── app/
│       ├── api/v1/endpoints/  # auth, users, portfolio, markets, positions, orders, trades, watchlist, wallet, security, admin
│       ├── models/            # 18 SQLAlchemy models
│       ├── schemas/           # Pydantic request/response models
│       ├── services/          # ledger, trading engine, simulated market engine, admin, auth, audit
│       ├── websocket/         # connection manager, event bus bridge, /ws route
│       ├── core/               # config, security (JWT/bcrypt), deps, rate limiting
│       └── database/           # async SQLAlchemy session/engine
│   ├── alembic/                # migration environment + initial schema migration
│   └── scripts/                 # seed.py, init_db.py
│
└── docker-compose.yml
```

## Security notes

- Passwords are hashed with bcrypt; access tokens are short-lived JWTs (15 min) with rotating refresh tokens tracked per-device in
  `user_sessions` (revocable from Security settings).
- Every admin balance adjustment and admin-managed override is written to `audit_logs` with actor, reason, before/after values.
- Rate limiting (slowapi) is applied globally and more tightly on `/auth/*`. CORS is restricted to `CORS_ORIGINS` in `.env`. Standard
  security headers are set on every response.
- **Never commit `backend/.env`.** Only `.env.example` (no real secrets) is checked in.
