from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.flight import Flight
from app.models.airport import Airport
from app.models.airline import Airline
from app.schemas.flight import FlightCreate, FlightOut, FlightUpdate
from app.utils.auth import get_current_user
from app.utils.geo import haversine_km

router = APIRouter(prefix="/api/flights", tags=["flights"])


class DeleteAllConfirm(BaseModel):
    confirmation: str


def enrich_flight(flight: Flight, db: Session) -> dict:
    dep = db.query(Airport).filter(Airport.iata == flight.departure_iata).first()
    arr = db.query(Airport).filter(Airport.iata == flight.arrival_iata).first()
    airline = db.query(Airline).filter(Airline.iata == flight.airline_iata).first() if flight.airline_iata else None

    data = {c.name: getattr(flight, c.name) for c in flight.__table__.columns}
    data["departure_airport"] = (
        {"iata": dep.iata, "name": dep.name, "city": dep.city, "country": dep.country,
         "latitude": dep.latitude, "longitude": dep.longitude} if dep else None
    )
    data["arrival_airport"] = (
        {"iata": arr.iata, "name": arr.name, "city": arr.city, "country": arr.country,
         "latitude": arr.latitude, "longitude": arr.longitude} if arr else None
    )
    data["airline"] = (
        {"iata": airline.iata, "name": airline.name, "country": airline.country} if airline else None
    )
    return data


def compute_distance(departure_iata: str, arrival_iata: str, db: Session) -> Optional[float]:
    dep = db.query(Airport).filter(Airport.iata == departure_iata).first()
    arr = db.query(Airport).filter(Airport.iata == arrival_iata).first()
    if dep and arr and dep.latitude and dep.longitude and arr.latitude and arr.longitude:
        return round(haversine_km(dep.latitude, dep.longitude, arr.latitude, arr.longitude), 1)
    return None


@router.get("", response_model=list[FlightOut])
def list_flights(
    skip: int = 0,
    limit: int = Query(10000, le=10000),
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    query = db.query(Flight)
    if year:
        from sqlalchemy import extract
        query = query.filter(extract("year", Flight.date) == year)
    flights = query.order_by(Flight.date.desc()).offset(skip).limit(limit).all()
    return [enrich_flight(f, db) for f in flights]


@router.post("/delete-all", status_code=200)
def delete_all_flights(
    body: DeleteAllConfirm,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    """Delete all flights. Requires confirmation field to be exactly 'delete'."""
    if body.confirmation != "delete":
        raise HTTPException(status_code=400, detail="Type 'delete' to confirm")
    count = db.query(Flight).delete()
    db.commit()
    return {"deleted": count}


@router.post("", response_model=FlightOut, status_code=201)
def create_flight(
    payload: FlightCreate,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    distance = compute_distance(payload.departure_iata, payload.arrival_iata, db)
    flight = Flight(**payload.model_dump(), distance_km=distance)
    db.add(flight)
    db.commit()
    db.refresh(flight)
    return enrich_flight(flight, db)


@router.get("/{flight_id}", response_model=FlightOut)
def get_flight(
    flight_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    flight = db.query(Flight).filter(Flight.id == flight_id).first()
    if not flight:
        raise HTTPException(status_code=404, detail="Flight not found")
    return enrich_flight(flight, db)


@router.put("/{flight_id}", response_model=FlightOut)
def update_flight(
    flight_id: int,
    payload: FlightUpdate,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    flight = db.query(Flight).filter(Flight.id == flight_id).first()
    if not flight:
        raise HTTPException(status_code=404, detail="Flight not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(flight, key, value)

    # Recompute distance if route changed
    if "departure_iata" in update_data or "arrival_iata" in update_data:
        flight.distance_km = compute_distance(flight.departure_iata, flight.arrival_iata, db)

    db.commit()
    db.refresh(flight)
    return enrich_flight(flight, db)


@router.get("/aircraft-types/suggest")
def suggest_aircraft_types(
    q: str = Query("", min_length=1),
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    """Return distinct aircraft types matching the query."""
    types = (
        db.query(Flight.aircraft_type)
        .filter(Flight.aircraft_type.isnot(None))
        .filter(Flight.aircraft_type.ilike(f"%{q}%"))
        .distinct()
        .limit(20)
        .all()
    )
    return [t[0] for t in types if t[0]]


@router.delete("/{flight_id}", status_code=204)
def delete_flight(
    flight_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    flight = db.query(Flight).filter(Flight.id == flight_id).first()
    if not flight:
        raise HTTPException(status_code=404, detail="Flight not found")
    db.delete(flight)
    db.commit()
