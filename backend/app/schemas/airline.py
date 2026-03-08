from pydantic import BaseModel
from typing import Optional


class AirlineOut(BaseModel):
    id: int
    name: str
    iata: Optional[str]
    icao: Optional[str]
    country: Optional[str]
    active: Optional[str]

    model_config = {"from_attributes": True}


class AirlineSearch(BaseModel):
    results: list[AirlineOut]
    total: int
