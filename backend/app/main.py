import logging
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

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


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    body = exc.body
    logging.warning(f"Validation error on {request.method} {request.url.path}")
    logging.warning(f"Request body: {body}")
    logging.warning(f"Errors: {exc.errors()}")
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


@app.get("/api/health")
def health():
    return {"status": "ok"}
