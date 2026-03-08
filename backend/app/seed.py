"""Seed airports and airlines from OpenFlights data files."""
import csv
import os
import sys

from app.database import SessionLocal, engine
from app.models.airport import Airport
from app.models.airline import Airline
import app.models  # ensure all models are registered


DATA_PATHS = [
    "/app/data",
    os.path.join(os.path.dirname(__file__), "..", "..", "data"),
    os.path.join(os.path.dirname(__file__), "data"),
]


def find_data_file(name: str) -> str | None:
    for path in DATA_PATHS:
        full = os.path.join(path, name)
        if os.path.exists(full):
            return full
    return None


def seed_airports(db):
    if db.query(Airport).count() > 0:
        print("Airports already seeded, skipping.")
        return

    airports_file = find_data_file("airports.dat")
    if not airports_file:
        print("airports.dat not found, skipping airport seed.")
        return

    count = 0
    with open(airports_file, encoding="utf-8", errors="replace") as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) < 8:
                continue
            try:
                iata = row[4].strip().strip('"')
                icao = row[5].strip().strip('"')
                lat = float(row[6].strip().strip('"'))
                lon = float(row[7].strip().strip('"'))
                airport = Airport(
                    openflights_id=int(row[0]) if row[0].strip().isdigit() else None,
                    name=row[1].strip().strip('"'),
                    city=row[2].strip().strip('"') or None,
                    country=row[3].strip().strip('"') or None,
                    iata=iata if iata and iata != "\\N" else None,
                    icao=icao if icao and icao != "\\N" else None,
                    latitude=lat,
                    longitude=lon,
                    altitude_ft=int(float(row[8].strip())) if len(row) > 8 and row[8].strip().lstrip("-").replace(".", "").isdigit() else None,
                    timezone=row[10].strip().strip('"') if len(row) > 10 else None,
                )
                db.add(airport)
                count += 1
            except (ValueError, IndexError):
                continue

    db.commit()
    print(f"Seeded {count} airports.")


def seed_airlines(db):
    if db.query(Airline).count() > 0:
        print("Airlines already seeded, skipping.")
        return

    airlines_file = find_data_file("airlines.dat")
    if not airlines_file:
        print("airlines.dat not found, skipping airline seed.")
        return

    count = 0
    with open(airlines_file, encoding="utf-8", errors="replace") as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) < 7:
                continue
            try:
                iata = row[3].strip().strip('"')
                icao = row[4].strip().strip('"')
                airline = Airline(
                    openflights_id=int(row[0]) if row[0].strip().lstrip("-").isdigit() else None,
                    name=row[1].strip().strip('"'),
                    alias=row[2].strip().strip('"') or None,
                    iata=iata if iata and iata != "\\N" else None,
                    icao=icao if icao and icao != "\\N" else None,
                    callsign=row[5].strip().strip('"') or None,
                    country=row[6].strip().strip('"') or None,
                    active=row[7].strip().strip('"') if len(row) > 7 else None,
                )
                db.add(airline)
                count += 1
            except (ValueError, IndexError):
                continue

    db.commit()
    print(f"Seeded {count} airlines.")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_airports(db)
        seed_airlines(db)
    finally:
        db.close()
