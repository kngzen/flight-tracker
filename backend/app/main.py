from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, airports, airlines, flights, stats, import_flights

app = FastAPI(
    title="Flight Tracker",
    description="Self-hosted flight tracking application",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(airports.router)
app.include_router(airlines.router)
app.include_router(flights.router)
app.include_router(stats.router)
app.include_router(import_flights.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
