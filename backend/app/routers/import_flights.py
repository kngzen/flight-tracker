"""OpenFlights CSV import router."""
import csv
import io
import re
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.airline import Airline
from app.models.airport import Airport
from app.models.flight import Flight
from app.utils.auth import get_current_user
from app.utils.geo import haversine_km

router = APIRouter(prefix="/api/import", tags=["import"])


def parse_date_and_time(s: str) -> tuple[Optional[date], Optional[str]]:
    """Parse date string, returning (date, departure_time_HH:MM or None)."""
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M"):
        try:
            dt = datetime.strptime(s.strip(), fmt)
            time_str = dt.strftime("%H:%M") if (dt.hour or dt.minute) else None
            return dt.date(), time_str
        except ValueError:
            continue
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(s.strip(), fmt).date(), None
        except ValueError:
            continue
    return None, None


def parse_duration_minutes(s: str) -> Optional[int]:
    """Parse duration from HH:MM format or plain integer minutes."""
    s = s.strip()
    if not s:
        return None
    if ":" in s:
        parts = s.split(":")
        try:
            return int(parts[0]) * 60 + int(parts[1])
        except (ValueError, IndexError):
            return None
    try:
        return int(s)
    except ValueError:
        return None


def miles_to_km(miles: float) -> float:
    return round(miles * 1.60934, 1)


SEAT_CLASS_MAP = {
    "Y": "economy", "C": "business", "F": "first",
    "W": "premium_economy", "P": "premium_economy",
    "economy": "economy", "business": "business",
    "first": "first", "premium": "premium_economy",
    "premium_economy": "premium_economy",
}

SEAT_TYPE_MAP = {
    "A": "aisle", "W": "window", "M": "middle",
    "aisle": "aisle", "window": "window", "middle": "middle",
}

REASON_MAP = {
    "L": "leisure", "B": "business", "C": "crew", "O": "other",
    "leisure": "leisure", "business": "business",
    "crew": "crew", "other": "other",
}


@router.post("/openflights")
async def import_openflights(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    """
    Import flights from an OpenFlights backup CSV export.
    Expected columns: Date, From, To, Flight_Number, Airline, Distance,
    Duration, Seat, Seat_Type, Class, Reason, Plane, Registration,
    Trip, Note, From_OID, To_OID, Airline_OID, Plane_OID
    """
    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))

    imported = 0
    skipped = 0
    errors = []

    # Caches
    airport_cache: dict = {}
    airline_name_cache: dict = {}

    def get_airport(iata: str) -> Optional[Airport]:
        iata = iata.upper().strip()
        if iata not in airport_cache:
            airport_cache[iata] = db.query(Airport).filter(Airport.iata == iata).first()
        return airport_cache[iata]

    def get_airline_iata(name: str) -> Optional[str]:
        """Look up airline IATA code by name."""
        name = name.strip()
        if not name:
            return None
        if name not in airline_name_cache:
            airline = db.query(Airline).filter(Airline.name == name).first()
            airline_name_cache[name] = airline.iata if airline else None
        return airline_name_cache[name]

    for i, row in enumerate(reader, start=2):
        normalized = {k.lower().strip(): v.strip() for k, v in row.items()}

        dep_iata = (normalized.get("from") or normalized.get("departure") or "").upper().strip()
        arr_iata = (normalized.get("to") or normalized.get("arrival") or "").upper().strip()
        date_str = normalized.get("date") or normalized.get("flight_date") or ""

        if not dep_iata or not arr_iata or not date_str:
            skipped += 1
            errors.append(f"Row {i}: missing required fields (from/to/date)")
            continue

        flight_date, dep_time = parse_date_and_time(date_str)
        if not flight_date:
            skipped += 1
            errors.append(f"Row {i}: unrecognized date format '{date_str}'")
            continue

        # Distance: use CSV value (OpenFlights uses miles), fall back to calculation
        csv_distance = normalized.get("distance") or ""
        distance = None
        if csv_distance:
            try:
                distance = miles_to_km(float(csv_distance))
            except ValueError:
                pass
        if distance is None:
            dep_airport = get_airport(dep_iata)
            arr_airport = get_airport(arr_iata)
            if dep_airport and arr_airport and dep_airport.latitude and arr_airport.latitude:
                distance = round(haversine_km(
                    dep_airport.latitude, dep_airport.longitude,
                    arr_airport.latitude, arr_airport.longitude
                ), 1)

        # Duration: parse HH:MM or integer
        duration = parse_duration_minutes(normalized.get("duration") or "")

        # Airline IATA: extract from flight number prefix, fall back to name lookup
        flight_num = normalized.get("flight_number") or normalized.get("flight") or ""
        airline_iata = None
        if flight_num:
            # Extract 2-char IATA prefix from flight number
            # Handles: "UA2259"->UA, "B6615"->B6, "3K123"->3K, "AA100"->AA
            match = re.match(r'^([A-Z\d]{2})(\d)', flight_num.upper())
            if match and not match.group(1).isdigit():
                airline_iata = match.group(1)
        if not airline_iata:
            airline_raw = normalized.get("airline") or ""
            if len(airline_raw) <= 3 and airline_raw.isalpha():
                airline_iata = airline_raw.upper()
            else:
                airline_iata = get_airline_iata(airline_raw)

        # Seat class
        raw_class = normalized.get("class") or normalized.get("seat_class") or normalized.get("cabin") or ""
        seat_class = SEAT_CLASS_MAP.get(raw_class.strip(), raw_class.lower() or None)

        # Seat position from Seat_Type
        raw_seat_type = normalized.get("seat_type") or normalized.get("seat_position") or ""
        seat_position = SEAT_TYPE_MAP.get(raw_seat_type.strip(), raw_seat_type.lower() or None)

        # Trip reason
        raw_reason = normalized.get("reason") or normalized.get("trip_reason") or ""
        trip_reason = REASON_MAP.get(raw_reason.strip(), raw_reason.lower() or None)

        flight = Flight(
            departure_iata=dep_iata,
            arrival_iata=arr_iata,
            date=flight_date,
            departure_time=dep_time,
            airline_iata=airline_iata or None,
            flight_number=normalized.get("flight_number") or normalized.get("flight") or None,
            aircraft_type=normalized.get("plane") or normalized.get("aircraft") or None,
            aircraft_registration=normalized.get("registration") or normalized.get("reg") or None,
            seat_class=seat_class or None,
            seat_number=normalized.get("seat") or None,
            seat_position=seat_position or None,
            duration_minutes=duration,
            distance_km=distance,
            trip_reason=trip_reason or None,
            trip=normalized.get("trip") or None,
            notes=normalized.get("note") or normalized.get("notes") or None,
        )
        db.add(flight)
        imported += 1

    db.commit()

    return {
        "imported": imported,
        "skipped": skipped,
        "errors": errors[:20],
    }
