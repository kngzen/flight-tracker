from pydantic import BaseModel
from typing import Optional


class AirportOut(BaseModel):
    id: int
    name: str
    city: Optional[str]
    country: Optional[str]
    iata: Optional[str]
    icao: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]

    model_config = {"from_attributes": True}


class AirportSearch(BaseModel):
    results: list[AirportOut]
    total: int
