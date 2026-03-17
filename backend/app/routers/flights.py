from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.flight import Flight
from app.models.airport import Airport
from app.models.airline import Airline
from app.models.user import User
from app.schemas.flight import FlightCreate, FlightOut, FlightUpdate
from app.utils.auth import get_current_user
from app.utils.geo import haversine_km
from app.utils.aircraft import normalize_aircraft_type, suggest_aircraft_types as _suggest_aircraft

router = APIRouter(prefix="/api/flights", tags=["flights"])


class DeleteAllConfirm(BaseModel):
    confirmation: str


def enrich_flight(flight: Flight, db: Session) -> dict:
    dep = db.query(Airport).filter(Airport.iata == flight.departure_iata).first()
    arr = db.query(Airport).filter(Airport.iata == flight.arrival_iata).first()
    airline = db.query(Airline).filter(Airline.iata == flight.airline_iata).order_by(Airline.id).first() if flight.airline_iata else None

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
    user: User = Depends(get_current_user),
):
    query = db.query(Flight).filter(Flight.user_id == user.id)
    if year:
        from sqlalchemy import extract
        query = query.filter(extract("year", Flight.date) == year)
    flights = query.order_by(Flight.date.desc()).offset(skip).limit(limit).all()
    return [enrich_flight(f, db) for f in flights]


@router.post("/delete-all", status_code=200)
def delete_all_flights(
    body: DeleteAllConfirm,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Delete all flights for the current user."""
    if body.confirmation != "delete":
        raise HTTPException(status_code=400, detail="Type 'delete' to confirm")
    count = db.query(Flight).filter(Flight.user_id == user.id).delete()
    db.commit()
    return {"deleted": count}


@router.post("", response_model=FlightOut, status_code=201)
def create_flight(
    payload: FlightCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    distance = compute_distance(payload.departure_iata, payload.arrival_iata, db)
    data = payload.model_dump()
    data["aircraft_type"] = normalize_aircraft_type(data.get("aircraft_type"))
    flight = Flight(**data, user_id=user.id, distance_km=distance)
    db.add(flight)
    db.commit()
    db.refresh(flight)
    return enrich_flight(flight, db)


@router.get("/estimate-duration")
def estimate_duration(
    departure_iata: str = Query(...),
    arrival_iata: str = Query(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Estimate flight duration based on great-circle distance."""
    distance = compute_distance(departure_iata.upper(), arrival_iata.upper(), db)
    if distance is None:
        return {"duration_minutes": None}
    cruise_speed_kmh = 850
    overhead_minutes = 30
    minutes = round(distance / cruise_speed_kmh * 60 + overhead_minutes)
    return {"duration_minutes": minutes, "distance_km": distance}


@router.get("/aircraft-types/suggest")
def suggest_aircraft_types(
    q: str = Query("", min_length=1),
    user: User = Depends(get_current_user),
):
    """Return canonical aircraft types matching the query."""
    return _suggest_aircraft(q)


@router.get("/{flight_id}", response_model=FlightOut)
def get_flight(
    flight_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    flight = db.query(Flight).filter(Flight.id == flight_id, Flight.user_id == user.id).first()
    if not flight:
        raise HTTPException(status_code=404, detail="Flight not found")
    return enrich_flight(flight, db)


@router.put("/{flight_id}", response_model=FlightOut)
def update_flight(
    flight_id: int,
    payload: FlightUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    flight = db.query(Flight).filter(Flight.id == flight_id, Flight.user_id == user.id).first()
    if not flight:
        raise HTTPException(status_code=404, detail="Flight not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "aircraft_type" in update_data:
        update_data["aircraft_type"] = normalize_aircraft_type(update_data["aircraft_type"])
    for key, value in update_data.items():
        setattr(flight, key, value)

    if "departure_iata" in update_data or "arrival_iata" in update_data:
        flight.distance_km = compute_distance(flight.departure_iata, flight.arrival_iata, db)

    db.commit()
    db.refresh(flight)
    return enrich_flight(flight, db)


@router.delete("/{flight_id}", status_code=204)
def delete_flight(
    flight_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    flight = db.query(Flight).filter(Flight.id == flight_id, Flight.user_id == user.id).first()
    if not flight:
        raise HTTPException(status_code=404, detail="Flight not found")
    db.delete(flight)
    db.commit()
