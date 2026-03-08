# ✈️ FlightTracker

A self-hosted flight tracking app inspired by Flightmemory and OpenFlights. Log your flights, visualize routes on an interactive world map, and explore detailed statistics.

## Features

- **Flight Log** — Add, edit, and delete flights with airline, aircraft, seat class, duration, and notes
- **Airport & Airline Autocomplete** — Powered by the full OpenFlights database (~7,500 airports, ~5,900 airlines)
- **Interactive World Map** — Great-circle route arcs, per-airport markers, route weight by frequency
- **Statistics Dashboard** — Total distance/time, countries visited, top routes, top airports, top airlines, yearly breakdowns, cabin class distribution
- **OpenFlights CSV Import** — Bulk-import flights from an OpenFlights-compatible CSV file
- **Single-user auth** — Simple username/password login with JWT tokens
- **Docker Compose** — Fully containerized, runs behind your Cloudflare tunnel

## Quick Start

```bash
# 1. Copy and configure env
cp .env.example .env
# Edit .env — set ADMIN_PASSWORD and SECRET_KEY at minimum

# 2. Start
docker compose up -d

# 3. Open
http://localhost:8080
```

## Configuration

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_PASSWORD` | `changeme` | Database password |
| `SECRET_KEY` | `changeme-...` | JWT signing key (run `openssl rand -hex 32`) |
| `ADMIN_USERNAME` | `admin` | Login username |
| `ADMIN_PASSWORD` | `changeme` | Login password |
| `PORT` | `8080` | Host port to expose |

## Cloudflare Tunnel

Point your tunnel to `http://localhost:8080` (or whatever `PORT` you set). No extra configuration needed.

## CSV Import Format

The importer accepts CSV files with these columns (all optional except `date`, `from`, `to`):

```
date, from, to, airline, flight_number, aircraft, seat_class, seat, duration, reason, note
```

Date formats: `YYYY-MM-DD`, `DD/MM/YYYY`, `MM/DD/YYYY`

Seat classes: `economy`, `premium_economy`, `business`, `first` (or `Y`, `W`, `C`, `F`)

## Architecture

```
nginx (port 8080)
  ├── /api/*  → FastAPI backend (Python)
  └── /*      → React frontend (Vite + Tailwind)
              PostgreSQL 16
```

## Development

```bash
# Backend
cd backend
pip install -r requirements.txt
DATABASE_URL=postgresql://... uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```
