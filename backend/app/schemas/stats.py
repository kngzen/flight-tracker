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
    distance_km: float = 0


class TopAirport(BaseModel):
    iata: str
    name: Optional[str]
    city: Optional[str]
    country: Optional[str]
    country_code: Optional[str] = None
    count: int
    distance_km: float = 0


class TopAirline(BaseModel):
    iata: Optional[str]
    name: Optional[str]
    count: int
    distance_km: float = 0


class TopAircraftType(BaseModel):
    aircraft_type: str
    aircraft_type_icao: Optional[str] = None
    count: int
    distance_km: float = 0


class TopAircraftIcao(BaseModel):
    aircraft_type_icao: str
    count: int
    distance_km: float = 0


class TopRegistration(BaseModel):
    registration: str
    count: int
    distance_km: float = 0


class MapRoute(BaseModel):
    departure_iata: str
    arrival_iata: str
    dep_lat: float
    dep_lon: float
    arr_lat: float
    arr_lon: float
    count: int


class AllianceStat(BaseModel):
    alliance: str
    count: int
    distance_km: float = 0


class ClassStat(BaseModel):
    count: int
    distance_km: float = 0


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
    by_class: dict[str, ClassStat]
    by_reason: dict[str, ClassStat]
    by_alliance: list[AllianceStat]
    top_routes: list[TopRoute]
    top_airports: list[TopAirport]
    top_airlines: list[TopAirline]
    top_aircraft_types: list[TopAircraftType]
    top_aircraft_icao: list[TopAircraftIcao]
    top_registrations: list[TopRegistration]
    map_routes: list[MapRoute]
