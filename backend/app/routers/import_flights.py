"""Flight CSV import router — supports Flighty and OpenFlights formats."""
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
from app.models.user import User
from app.utils.auth import get_current_user
from app.utils.geo import haversine_km
from app.utils.aircraft import get_aircraft_icao

router = APIRouter(prefix="/api/import", tags=["import"])


# --------------- helpers ---------------

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


def extract_time(iso_str: str) -> Optional[str]:
    """Extract HH:MM from an ISO-ish datetime string like '2024-03-03T18:55'."""
    if not iso_str or not iso_str.strip():
        return None
    s = iso_str.strip()
    # Try ISO format first
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M"):
        try:
            dt = datetime.strptime(s, fmt)
            return dt.strftime("%H:%M")
        except ValueError:
            continue
    # Try plain HH:MM
    m = re.match(r'^(\d{1,2}:\d{2})', s)
    if m:
        return m.group(1).zfill(5)
    return None


def compute_duration_from_times(dep_str: str, arr_str: str) -> Optional[int]:
    """Compute duration in minutes between two ISO datetime strings."""
    if not dep_str or not arr_str:
        return None
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M"):
        try:
            dep = datetime.strptime(dep_str.strip(), fmt)
            arr = datetime.strptime(arr_str.strip(), fmt)
            diff = (arr - dep).total_seconds() / 60
            return round(diff) if diff > 0 else None
        except ValueError:
            continue
    return None


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

# Flighty uses airline ICAO codes (e.g. "BAW" for British Airways)
AIRLINE_ICAO_CACHE: dict[str, Optional[str]] = {}


# --------------- format detection ---------------

FLIGHTY_SIGNATURE_COLS = {"flight flighty id", "aircraft type name", "gate departure (scheduled)"}


def detect_format(headers: set[str]) -> str:
    """Detect CSV format from column headers."""
    if FLIGHTY_SIGNATURE_COLS.issubset(headers):
        return "flighty"
    return "openflights"


# --------------- shared utilities ---------------

def build_caches(db: Session):
    airport_cache: dict[str, Optional[Airport]] = {}
    airline_name_cache: dict[str, Optional[str]] = {}
    airline_icao_cache: dict[str, Optional[str]] = {}

    def get_airport(iata: str) -> Optional[Airport]:
        iata = iata.upper().strip()
        if iata not in airport_cache:
            airport_cache[iata] = db.query(Airport).filter(Airport.iata == iata).first()
        return airport_cache[iata]

    def get_airline_iata_by_name(name: str) -> Optional[str]:
        name = name.strip()
        if not name:
            return None
        if name not in airline_name_cache:
            airline = db.query(Airline).filter(Airline.name == name).first()
            airline_name_cache[name] = airline.iata if airline else None
        return airline_name_cache[name]

    def get_airline_iata_by_icao(icao: str) -> Optional[str]:
        icao = icao.upper().strip()
        if not icao:
            return None
        if icao not in airline_icao_cache:
            airline = db.query(Airline).filter(Airline.icao == icao).first()
            airline_icao_cache[icao] = airline.iata if airline else None
        return airline_icao_cache[icao]

    def compute_distance(dep_iata: str, arr_iata: str) -> Optional[float]:
        dep = get_airport(dep_iata)
        arr = get_airport(arr_iata)
        if dep and arr and dep.latitude and dep.longitude and arr.latitude and arr.longitude:
            return round(haversine_km(dep.latitude, dep.longitude, arr.latitude, arr.longitude), 1)
        return None

    return get_airport, get_airline_iata_by_name, get_airline_iata_by_icao, compute_distance


# --------------- Flighty importer ---------------

def import_flighty_row(row: dict, db: Session, get_airport, get_airline_iata_by_name,
                       get_airline_iata_by_icao, compute_distance, existing_flighty_ids: set) -> tuple[Optional[Flight], Optional[str]]:
    """Parse a single Flighty CSV row. Returns (Flight, None) or (None, error_message)."""
    n = {k.lower().strip(): v.strip() for k, v in row.items()}

    dep_iata = (n.get("from") or "").upper().strip()
    arr_iata = (n.get("to") or "").upper().strip()
    date_str = n.get("date") or ""

    if not dep_iata or not arr_iata or not date_str:
        return None, "missing required fields (from/to/date)"

    flight_date, _ = parse_date_and_time(date_str)
    if not flight_date:
        return None, f"unrecognized date format '{date_str}'"

    # Skip future flights
    if flight_date > date.today():
        return None, None  # skip silently

    # Flighty ID for dedup
    flighty_id = n.get("flight flighty id") or None
    if flighty_id and flighty_id in existing_flighty_ids:
        return None, None  # skip duplicate silently (not an error)

    # Airline: Flighty uses ICAO code (e.g. "BAW")
    airline_raw = n.get("airline") or ""
    airline_iata = None
    if airline_raw:
        # Try as ICAO code first (Flighty typically uses ICAO)
        airline_iata = get_airline_iata_by_icao(airline_raw)
        if not airline_iata:
            # Try as IATA or name
            if len(airline_raw) <= 3:
                airline_iata = airline_raw.upper()
            else:
                airline_iata = get_airline_iata_by_name(airline_raw)

    # Flight number: Flighty stores just the number (e.g. "720")
    flight_num_raw = n.get("flight") or ""
    flight_number = None
    if flight_num_raw and airline_iata:
        flight_number = f"{airline_iata}{flight_num_raw}"
    elif flight_num_raw:
        flight_number = flight_num_raw

    # Times from ISO datetime columns
    dep_time = extract_time(n.get("gate departure (scheduled)") or "")
    dep_time_actual = extract_time(n.get("gate departure (actual)") or "")
    arr_time = extract_time(n.get("gate arrival (scheduled)") or "")
    arr_time_actual = extract_time(n.get("gate arrival (actual)") or "")

    # Distance
    distance = compute_distance(dep_iata, arr_iata)

    # Duration: Flighty timestamps are in local time at each airport,
    # so cross-timezone flights produce wrong durations.
    # Use distance-based estimation instead (850 km/h cruise + 30 min overhead).
    duration = None
    if distance:
        duration = round(distance / 850 * 60 + 30)

    # Aircraft
    aircraft_type = n.get("aircraft type name") or None
    aircraft_type_icao = get_aircraft_icao(aircraft_type)
    aircraft_reg = n.get("tail number") or None

    # Seat
    raw_class = n.get("cabin class") or ""
    seat_class = SEAT_CLASS_MAP.get(raw_class.lower().strip(), raw_class.lower() or None)
    raw_seat_type = n.get("seat type") or ""
    seat_position = SEAT_TYPE_MAP.get(raw_seat_type.lower().strip(), raw_seat_type.lower() or None)
    seat_number = n.get("seat") or None

    # Reason
    raw_reason = n.get("flight reason") or ""
    trip_reason = REASON_MAP.get(raw_reason.lower().strip(), raw_reason.lower() or None)

    # Terminals & gates
    dep_terminal = n.get("dep terminal") or None
    dep_gate = n.get("dep gate") or None
    arr_terminal = n.get("arr terminal") or None
    arr_gate = n.get("arr gate") or None

    # Canceled
    canceled = (n.get("canceled") or "").lower() == "true"

    # PNR
    pnr = n.get("pnr") or None

    # Notes
    notes = n.get("notes") or None

    flight = Flight(
        departure_iata=dep_iata,
        arrival_iata=arr_iata,
        date=flight_date,
        departure_time=dep_time,
        arrival_time=arr_time,
        departure_time_actual=dep_time_actual,
        arrival_time_actual=arr_time_actual,
        dep_terminal=dep_terminal,
        dep_gate=dep_gate,
        arr_terminal=arr_terminal,
        arr_gate=arr_gate,
        airline_iata=airline_iata or None,
        flight_number=flight_number or None,
        aircraft_type=aircraft_type,
        aircraft_type_icao=aircraft_type_icao,
        aircraft_registration=aircraft_reg,
        seat_class=seat_class or None,
        seat_number=seat_number,
        seat_position=seat_position or None,
        duration_minutes=duration,
        distance_km=distance,
        trip_reason=trip_reason or None,
        notes=notes,
        pnr=pnr,
        canceled=canceled,
        flighty_id=flighty_id,
    )
    return flight, None


# --------------- OpenFlights importer ---------------

def import_openflights_row(row: dict, db: Session, get_airport, get_airline_iata_by_name,
                           get_airline_iata_by_icao, compute_distance) -> tuple[Optional[Flight], Optional[str]]:
    """Parse a single OpenFlights CSV row."""
    n = {k.lower().strip(): v.strip() for k, v in row.items()}

    dep_iata = (n.get("from") or n.get("departure") or "").upper().strip()
    arr_iata = (n.get("to") or n.get("arrival") or "").upper().strip()
    date_str = n.get("date") or n.get("flight_date") or ""

    if not dep_iata or not arr_iata or not date_str:
        return None, "missing required fields (from/to/date)"

    flight_date, dep_time = parse_date_and_time(date_str)
    if not flight_date:
        return None, f"unrecognized date format '{date_str}'"

    # Skip future flights
    if flight_date > date.today():
        return None, None  # skip silently

    # Check for separate departure_time column
    if not dep_time:
        raw_dep_time = n.get("departure_time") or n.get("dep_time") or n.get("time") or ""
        raw_dep_time = raw_dep_time.strip()
        if raw_dep_time:
            m = re.match(r'^(\d{1,2}:\d{2})(:\d{2})?$', raw_dep_time)
            if m:
                dep_time = m.group(1).zfill(5)

    # Distance
    csv_distance = n.get("distance") or ""
    distance = None
    if csv_distance:
        try:
            distance = miles_to_km(float(csv_distance))
        except ValueError:
            pass
    if distance is None:
        distance = compute_distance(dep_iata, arr_iata)

    # Duration
    duration = parse_duration_minutes(n.get("duration") or "")

    # Airline IATA
    flight_num = n.get("flight_number") or n.get("flight") or ""
    airline_iata = None
    if flight_num:
        match = re.match(r'^([A-Z\d]{2})(\d)', flight_num.upper())
        if match and not match.group(1).isdigit():
            airline_iata = match.group(1)
    if not airline_iata:
        airline_raw = n.get("airline") or ""
        if len(airline_raw) <= 3 and airline_raw.isalpha():
            airline_iata = airline_raw.upper()
        else:
            airline_iata = get_airline_iata_by_name(airline_raw)

    # Seat class
    raw_class = n.get("class") or n.get("seat_class") or n.get("cabin") or ""
    seat_class = SEAT_CLASS_MAP.get(raw_class.strip(), raw_class.lower() or None)

    # Seat position
    raw_seat_type = n.get("seat_type") or n.get("seat_position") or ""
    seat_position = SEAT_TYPE_MAP.get(raw_seat_type.strip(), raw_seat_type.lower() or None)

    # Trip reason
    raw_reason = n.get("reason") or n.get("trip_reason") or ""
    trip_reason = REASON_MAP.get(raw_reason.strip(), raw_reason.lower() or None)

    # Aircraft
    aircraft_type = n.get("plane") or n.get("aircraft") or None
    aircraft_type_icao = get_aircraft_icao(aircraft_type)

    flight = Flight(
        departure_iata=dep_iata,
        arrival_iata=arr_iata,
        date=flight_date,
        departure_time=dep_time,
        airline_iata=airline_iata or None,
        flight_number=n.get("flight_number") or n.get("flight") or None,
        aircraft_type=aircraft_type,
        aircraft_type_icao=aircraft_type_icao,
        aircraft_registration=n.get("registration") or n.get("reg") or None,
        seat_class=seat_class or None,
        seat_number=n.get("seat") or None,
        seat_position=seat_position or None,
        duration_minutes=duration,
        distance_km=distance,
        trip_reason=trip_reason or None,
        trip=n.get("trip") or None,
        notes=n.get("note") or n.get("notes") or None,
    )
    return flight, None


# --------------- endpoint ---------------

@router.post("/openflights")
async def import_flights(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Import flights from CSV. Auto-detects Flighty or OpenFlights format.
    Flighty imports use Flight Flighty ID for deduplication.
    """
    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    headers = {h.lower().strip() for h in (reader.fieldnames or [])}
    fmt = detect_format(headers)

    imported = 0
    skipped = 0
    duplicates = 0
    errors = []

    get_airport, get_airline_iata_by_name, get_airline_iata_by_icao, compute_dist = build_caches(db)

    # Pre-load existing flighty IDs for dedup (scoped to current user)
    existing_flighty_ids: set[str] = set()
    if fmt == "flighty":
        rows = db.query(Flight.flighty_id).filter(
            Flight.flighty_id.isnot(None), Flight.user_id == user.id
        ).all()
        existing_flighty_ids = {r[0] for r in rows}

    for i, row in enumerate(reader, start=2):
        try:
            if fmt == "flighty":
                flight, err = import_flighty_row(
                    row, db, get_airport, get_airline_iata_by_name,
                    get_airline_iata_by_icao, compute_dist, existing_flighty_ids
                )
            else:
                flight, err = import_openflights_row(
                    row, db, get_airport, get_airline_iata_by_name,
                    get_airline_iata_by_icao, compute_dist
                )

            if err:
                skipped += 1
                errors.append(f"Row {i}: {err}")
            elif flight is None:
                duplicates += 1
            else:
                flight.user_id = user.id
                db.add(flight)
                if flight.flighty_id:
                    existing_flighty_ids.add(flight.flighty_id)
                imported += 1
        except Exception as e:
            skipped += 1
            errors.append(f"Row {i}: {str(e)}")

    db.commit()

    return {
        "format": fmt,
        "imported": imported,
        "skipped": skipped,
        "duplicates": duplicates,
        "errors": errors[:20],
    }
