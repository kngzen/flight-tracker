from datetime import date
from pydantic import BaseModel, field_validator
from typing import Optional


class FlightBase(BaseModel):
    departure_iata: str
    arrival_iata: str
    date: date
    airline_iata: Optional[str] = None
    flight_number: Optional[str] = None
    aircraft_type: Optional[str] = None
    aircraft_registration: Optional[str] = None
    seat_class: Optional[str] = None
    seat_number: Optional[str] = None
    seat_position: Optional[str] = None
    duration_minutes: Optional[int] = None
    trip_reason: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("departure_iata", "arrival_iata")
    @classmethod
    def upper_iata(cls, v: str) -> str:
        return v.upper().strip()

    @field_validator("airline_iata")
    @classmethod
    def upper_airline(cls, v: Optional[str]) -> Optional[str]:
        return v.upper().strip() if v else None


class FlightCreate(FlightBase):
    pass


class FlightUpdate(FlightBase):
    departure_iata: Optional[str] = None
    arrival_iata: Optional[str] = None
    date: Optional[date] = None


class FlightOut(FlightBase):
    id: int
    distance_km: Optional[float]
    departure_airport: Optional[dict] = None
    arrival_airport: Optional[dict] = None
    airline: Optional[dict] = None

    model_config = {"from_attributes": True}
