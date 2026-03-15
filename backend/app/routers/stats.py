from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import extract
from sqlalchemy.orm import Session
from collections import defaultdict

from app.database import get_db
from app.models.flight import Flight
from app.models.airport import Airport
from app.models.airline import Airline
from app.schemas.stats import StatsOut
from app.models.user import User
from app.utils.auth import get_current_user
from app.utils.country_codes import get_country_code
from app.utils.alliances import get_alliance

router = APIRouter(prefix="/api/stats", tags=["stats"])

KM_TO_MILES = 0.621371


@router.get("", response_model=StatsOut)
def get_stats(
    year: Optional[int] = None,
    limit: int = Query(10, ge=1, le=1000),
    sort_by: str = Query("flights", pattern="^(flights|distance)$"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Flight).filter(Flight.user_id == user.id)
    if year:
        query = query.filter(extract("year", Flight.date) == year)
    flights = query.all()

    if not flights:
        return StatsOut(
            total_flights=0, total_distance_km=0, total_distance_miles=0,
            total_duration_minutes=0, unique_airports=0, unique_countries=0,
            unique_airlines=0, unique_aircraft_types=0, longest_flight_km=None,
            longest_flight_route=None, by_year=[], by_class={}, by_reason={},
            by_alliance=[], top_routes=[], top_airports=[], top_airlines=[],
            top_aircraft_types=[], top_aircraft_icao=[], top_registrations=[], map_routes=[],
        )

    total_distance = sum(f.distance_km or 0 for f in flights)
    total_duration = sum(f.duration_minutes or 0 for f in flights)

    airports_visited = set()
    for f in flights:
        airports_visited.add(f.departure_iata)
        airports_visited.add(f.arrival_iata)

    # Countries
    airport_map = {a.iata: a for a in db.query(Airport).filter(Airport.iata.in_(airports_visited)).all()}
    countries = set()
    for iata in airports_visited:
        a = airport_map.get(iata)
        if a and a.country:
            countries.add(a.country)

    unique_airlines = {f.airline_iata for f in flights if f.airline_iata}
    unique_aircraft = {f.aircraft_type for f in flights if f.aircraft_type}

    # Longest flight
    longest = max(flights, key=lambda f: f.distance_km or 0, default=None)
    longest_route = f"{longest.departure_iata}\u2192{longest.arrival_iata}" if longest else None

    # By year (always return all years regardless of year filter)
    all_flights = db.query(Flight).filter(Flight.user_id == user.id).all() if year else flights
    by_year_map: dict = defaultdict(lambda: {"flights": 0, "distance_km": 0.0, "duration_minutes": 0})
    for f in all_flights:
        y = f.date.year
        by_year_map[y]["flights"] += 1
        by_year_map[y]["distance_km"] += f.distance_km or 0
        by_year_map[y]["duration_minutes"] += f.duration_minutes or 0
    # Fill in missing years between min and max
    if by_year_map:
        min_year = min(by_year_map.keys())
        max_year = max(by_year_map.keys())
        for y in range(min_year, max_year + 1):
            if y not in by_year_map:
                by_year_map[y]  # triggers defaultdict creation with zeros
    by_year = [{"year": y, **v} for y, v in sorted(by_year_map.items())]

    # Sort key for rankings
    rank_key = "distance_km" if sort_by == "distance" else "count"

    # By class (count + distance)
    by_class: dict = defaultdict(lambda: {"count": 0, "distance_km": 0.0})
    for f in flights:
        key = f.seat_class or "unknown"
        by_class[key]["count"] += 1
        by_class[key]["distance_km"] += f.distance_km or 0

    # By reason (count + distance)
    by_reason: dict = defaultdict(lambda: {"count": 0, "distance_km": 0.0})
    for f in flights:
        key = f.trip_reason or "unknown"
        by_reason[key]["count"] += 1
        by_reason[key]["distance_km"] += f.distance_km or 0

    # By alliance
    alliance_data: dict = defaultdict(lambda: {"count": 0, "distance_km": 0.0})
    for f in flights:
        alliance = get_alliance(f.airline_iata)
        if alliance:
            alliance_data[alliance]["count"] += 1
            alliance_data[alliance]["distance_km"] += f.distance_km or 0
    by_alliance = [
        {"alliance": k, "count": v["count"], "distance_km": round(v["distance_km"], 1)}
        for k, v in sorted(alliance_data.items(), key=lambda x: x[1][rank_key], reverse=True)
    ]

    # Top routes (track both count and distance)
    route_data: dict = defaultdict(lambda: {"count": 0, "distance_km": 0.0})
    for f in flights:
        key = (f.departure_iata, f.arrival_iata)
        route_data[key]["count"] += 1
        route_data[key]["distance_km"] += f.distance_km or 0
    top_routes = []
    for (dep, arr), data in sorted(route_data.items(), key=lambda x: x[1][rank_key], reverse=True)[:limit]:
        dep_a = airport_map.get(dep)
        arr_a = airport_map.get(arr)
        top_routes.append({
            "departure_iata": dep, "arrival_iata": arr,
            "departure_name": dep_a.name if dep_a else None,
            "arrival_name": arr_a.name if arr_a else None,
            "count": data["count"],
            "distance_km": round(data["distance_km"], 1),
        })

    # Top airports (count both dep+arr, but distance only from origin)
    airport_data: dict = defaultdict(lambda: {"count": 0, "distance_km": 0.0})
    for f in flights:
        d = f.distance_km or 0
        airport_data[f.departure_iata]["count"] += 1
        airport_data[f.departure_iata]["distance_km"] += d
        airport_data[f.arrival_iata]["count"] += 1
    top_airports = []
    for iata, data in sorted(airport_data.items(), key=lambda x: x[1][rank_key], reverse=True)[:limit]:
        a = airport_map.get(iata)
        country_name = a.country if a else None
        top_airports.append({
            "iata": iata,
            "name": a.name if a else None,
            "city": a.city if a else None,
            "country": country_name,
            "country_code": get_country_code(country_name) if country_name else None,
            "count": data["count"],
            "distance_km": round(data["distance_km"], 1),
        })

    # Top airlines (track both count and distance)
    airline_iata_set = {f.airline_iata for f in flights if f.airline_iata}
    # For duplicate IATA codes (e.g. SQ = Singapore Airlines + Singapore Airlines Cargo),
    # prefer the one with lower id (typically the passenger airline)
    airline_map: dict = {}
    for a in db.query(Airline).filter(Airline.iata.in_(airline_iata_set)).order_by(Airline.id).all():
        if a.iata not in airline_map:
            airline_map[a.iata] = a
    airline_data: dict = defaultdict(lambda: {"count": 0, "distance_km": 0.0})
    for f in flights:
        if f.airline_iata:
            airline_data[f.airline_iata]["count"] += 1
            airline_data[f.airline_iata]["distance_km"] += f.distance_km or 0
    top_airlines = []
    for iata, data in sorted(airline_data.items(), key=lambda x: x[1][rank_key], reverse=True)[:limit]:
        a = airline_map.get(iata)
        top_airlines.append({
            "iata": iata,
            "name": a.name if a else None,
            "count": data["count"],
            "distance_km": round(data["distance_km"], 1),
        })

    # Top aircraft types
    aircraft_data: dict = defaultdict(lambda: {"count": 0, "distance_km": 0.0, "icao": None})
    for f in flights:
        if f.aircraft_type:
            aircraft_data[f.aircraft_type]["count"] += 1
            aircraft_data[f.aircraft_type]["distance_km"] += f.distance_km or 0
            if f.aircraft_type_icao:
                aircraft_data[f.aircraft_type]["icao"] = f.aircraft_type_icao
    top_aircraft_types = [
        {"aircraft_type": k, "aircraft_type_icao": v["icao"], "count": v["count"], "distance_km": round(v["distance_km"], 1)}
        for k, v in sorted(aircraft_data.items(), key=lambda x: x[1][rank_key], reverse=True)[:limit]
    ]

    # Top aircraft by ICAO code
    icao_data: dict = defaultdict(lambda: {"count": 0, "distance_km": 0.0})
    for f in flights:
        if f.aircraft_type_icao:
            icao_data[f.aircraft_type_icao]["count"] += 1
            icao_data[f.aircraft_type_icao]["distance_km"] += f.distance_km or 0
    top_aircraft_icao = [
        {"aircraft_type_icao": k, "count": v["count"], "distance_km": round(v["distance_km"], 1)}
        for k, v in sorted(icao_data.items(), key=lambda x: x[1][rank_key], reverse=True)[:limit]
    ]

    # Top registrations
    reg_data: dict = defaultdict(lambda: {"count": 0, "distance_km": 0.0})
    for f in flights:
        if f.aircraft_registration:
            reg_data[f.aircraft_registration]["count"] += 1
            reg_data[f.aircraft_registration]["distance_km"] += f.distance_km or 0
    top_registrations = [
        {"registration": k, "count": v["count"], "distance_km": round(v["distance_km"], 1)}
        for k, v in sorted(reg_data.items(), key=lambda x: x[1][rank_key], reverse=True)[:limit]
    ]

    # Top countries (count flights touching each country via departure/arrival airports)
    country_data: dict = defaultdict(lambda: {"count": 0, "distance_km": 0.0})
    for f in flights:
        visited_countries = set()
        dep_a = airport_map.get(f.departure_iata)
        arr_a = airport_map.get(f.arrival_iata)
        if dep_a and dep_a.country:
            visited_countries.add(dep_a.country)
        if arr_a and arr_a.country:
            visited_countries.add(arr_a.country)
        for c in visited_countries:
            country_data[c]["count"] += 1
            country_data[c]["distance_km"] += f.distance_km or 0
    top_countries = [
        {"country": k, "country_code": get_country_code(k), "count": v["count"], "distance_km": round(v["distance_km"], 1)}
        for k, v in sorted(country_data.items(), key=lambda x: x[1][rank_key], reverse=True)[:limit]
    ]

    # Map routes
    map_route_counts: dict = defaultdict(int)
    for f in flights:
        map_route_counts[(f.departure_iata, f.arrival_iata)] += 1
    map_routes = []
    for (dep_iata, arr_iata), count in map_route_counts.items():
        dep_a = airport_map.get(dep_iata)
        arr_a = airport_map.get(arr_iata)
        if dep_a and arr_a and dep_a.latitude and arr_a.latitude:
            map_routes.append({
                "departure_iata": dep_iata, "arrival_iata": arr_iata,
                "dep_lat": dep_a.latitude, "dep_lon": dep_a.longitude,
                "arr_lat": arr_a.latitude, "arr_lon": arr_a.longitude,
                "count": count,
            })

    return StatsOut(
        total_flights=len(flights),
        total_distance_km=round(total_distance, 1),
        total_distance_miles=round(total_distance * KM_TO_MILES, 1),
        total_duration_minutes=total_duration,
        unique_airports=len(airports_visited),
        unique_countries=len(countries),
        unique_airlines=len(unique_airlines),
        unique_aircraft_types=len(unique_aircraft),
        longest_flight_km=round(longest.distance_km, 1) if longest and longest.distance_km else None,
        longest_flight_route=longest_route,
        by_year=by_year,
        by_class={k: {"count": v["count"], "distance_km": round(v["distance_km"], 1)} for k, v in by_class.items()},
        by_reason={k: {"count": v["count"], "distance_km": round(v["distance_km"], 1)} for k, v in by_reason.items()},
        by_alliance=by_alliance,
        top_routes=top_routes,
        top_airports=top_airports,
        top_airlines=top_airlines,
        top_aircraft_types=top_aircraft_types,
        top_aircraft_icao=top_aircraft_icao,
        top_registrations=top_registrations,
        top_countries=top_countries,
        map_routes=map_routes,
    )
