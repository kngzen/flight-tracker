"""OpenFlights CSV import router."""
import csv
import io
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.airport import Airport
from app.models.flight import Flight
from app.utils.auth import get_current_user
from app.utils.geo import haversine_km

router = APIRouter(prefix="/api/import", tags=["import"])


def parse_date(s: str) -> Optional[date]:
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d"):
        try:
            from datetime import datetime
            return datetime.strptime(s.strip(), fmt).date()
        except ValueError:
            continue
    return None


def safe_int(s: str) -> Optional[int]:
    try:
        return int(s.strip()) if s.strip() else None
    except ValueError:
        return None


SEAT_CLASS_MAP = {
    "Y": "economy", "C": "business", "F": "first",
    "W": "premium_economy", "P": "premium_economy",
    "economy": "economy", "business": "business",
    "first": "first", "premium": "premium_economy",
}


@router.post("/openflights")
async def import_openflights(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    """
    Import flights from an OpenFlights-compatible CSV.
    Expected columns (any order, case-insensitive):
    date, from, to, airline, flight_number, aircraft, seat_class,
    seat, duration, distance, reason, note
    """
    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    headers = [h.lower().strip() for h in (reader.fieldnames or [])]

    imported = 0
    skipped = 0
    errors = []

    # Airport cache
    airport_cache: dict = {}

    def get_airport(iata: str) -> Optional[Airport]:
        iata = iata.upper().strip()
        if iata not in airport_cache:
            airport_cache[iata] = db.query(Airport).filter(Airport.iata == iata).first()
        return airport_cache[iata]

    for i, row in enumerate(reader, start=2):
        normalized = {k.lower().strip(): v.strip() for k, v in row.items()}

        dep_iata = (normalized.get("from") or normalized.get("departure") or "").upper().strip()
        arr_iata = (normalized.get("to") or normalized.get("arrival") or "").upper().strip()
        date_str = normalized.get("date") or normalized.get("flight_date") or ""

        if not dep_iata or not arr_iata or not date_str:
            skipped += 1
            errors.append(f"Row {i}: missing required fields (from/to/date)")
            continue

        flight_date = parse_date(date_str)
        if not flight_date:
            skipped += 1
            errors.append(f"Row {i}: unrecognized date format '{date_str}'")
            continue

        # Compute distance
        dep_airport = get_airport(dep_iata)
        arr_airport = get_airport(arr_iata)
        distance = None
        if dep_airport and arr_airport and dep_airport.latitude and arr_airport.latitude:
            distance = round(haversine_km(
                dep_airport.latitude, dep_airport.longitude,
                arr_airport.latitude, arr_airport.longitude
            ), 1)

        raw_class = normalized.get("seat_class") or normalized.get("class") or normalized.get("cabin") or ""
        seat_class = SEAT_CLASS_MAP.get(raw_class.strip(), raw_class.lower() or None)

        flight = Flight(
            departure_iata=dep_iata,
            arrival_iata=arr_iata,
            date=flight_date,
            airline_iata=(normalized.get("airline") or "")[:2].upper() or None,
            flight_number=normalized.get("flight_number") or normalized.get("flight") or None,
            aircraft_type=normalized.get("aircraft") or normalized.get("plane") or None,
            aircraft_registration=normalized.get("registration") or normalized.get("reg") or None,
            seat_class=seat_class or None,
            seat_number=normalized.get("seat") or None,
            duration_minutes=safe_int(normalized.get("duration") or ""),
            distance_km=distance,
            trip_reason=normalized.get("reason") or None,
            notes=normalized.get("note") or normalized.get("notes") or None,
        )
        db.add(flight)
        imported += 1

    db.commit()

    return {
        "imported": imported,
        "skipped": skipped,
        "errors": errors[:20],  # cap error list
    }
