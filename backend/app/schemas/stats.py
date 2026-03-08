from pydantic import BaseModel
from typing import Optional


class YearStat(BaseModel):
    year: int
    flights: int
    distance_km: float
    duration_minutes: int


class TopRoute(BaseModel):
    departure_iata: str
    arrival_iata: str
    departure_name: Optional[str]
    arrival_name: Optional[str]
    count: int


class TopAirport(BaseModel):
    iata: str
    name: Optional[str]
    city: Optional[str]
    country: Optional[str]
    count: int


class TopAirline(BaseModel):
    iata: Optional[str]
    name: Optional[str]
    count: int


class MapRoute(BaseModel):
    departure_iata: str
    arrival_iata: str
    dep_lat: float
    dep_lon: float
    arr_lat: float
    arr_lon: float
    count: int


class StatsOut(BaseModel):
    total_flights: int
    total_distance_km: float
    total_distance_miles: float
    total_duration_minutes: int
    unique_airports: int
    unique_countries: int
    unique_airlines: int
    unique_aircraft_types: int
    longest_flight_km: Optional[float]
    longest_flight_route: Optional[str]
    by_year: list[YearStat]
    by_class: dict[str, int]
    by_reason: dict[str, int]
    top_routes: list[TopRoute]
    top_airports: list[TopAirport]
    top_airlines: list[TopAirline]
    map_routes: list[MapRoute]
