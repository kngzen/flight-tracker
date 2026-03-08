from fastapi import APIRouter, Depends
from sqlalchemy import func, extract
from sqlalchemy.orm import Session
from collections import defaultdict

from app.database import get_db
from app.models.flight import Flight
from app.models.airport import Airport
from app.models.airline import Airline
from app.schemas.stats import StatsOut
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/stats", tags=["stats"])

KM_TO_MILES = 0.621371


@router.get("", response_model=StatsOut)
def get_stats(
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    flights = db.query(Flight).all()

    if not flights:
        return StatsOut(
            total_flights=0, total_distance_km=0, total_distance_miles=0,
            total_duration_minutes=0, unique_airports=0, unique_countries=0,
            unique_airlines=0, unique_aircraft_types=0, longest_flight_km=None,
            longest_flight_route=None, by_year={}, by_class={}, by_reason={},
            top_routes=[], top_airports=[], top_airlines=[], map_routes=[],
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
    longest_route = f"{longest.departure_iata}→{longest.arrival_iata}" if longest else None

    # By year
    by_year_map: dict = defaultdict(lambda: {"flights": 0, "distance_km": 0.0, "duration_minutes": 0})
    for f in flights:
        y = f.date.year
        by_year_map[y]["flights"] += 1
        by_year_map[y]["distance_km"] += f.distance_km or 0
        by_year_map[y]["duration_minutes"] += f.duration_minutes or 0
    by_year = [
        {"year": y, **v} for y, v in sorted(by_year_map.items())
    ]

    # By class
    by_class: dict = defaultdict(int)
    for f in flights:
        by_class[f.seat_class or "unknown"] += 1

    # By reason
    by_reason: dict = defaultdict(int)
    for f in flights:
        by_reason[f.trip_reason or "unknown"] += 1

    # Top routes
    route_counts: dict = defaultdict(int)
    for f in flights:
        key = (f.departure_iata, f.arrival_iata)
        route_counts[key] += 1
    top_routes_raw = sorted(route_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    top_routes = []
    for (dep, arr), count in top_routes_raw:
        dep_a = airport_map.get(dep)
        arr_a = airport_map.get(arr)
        top_routes.append({
            "departure_iata": dep, "arrival_iata": arr,
            "departure_name": dep_a.name if dep_a else None,
            "arrival_name": arr_a.name if arr_a else None,
            "count": count,
        })

    # Top airports
    airport_counts: dict = defaultdict(int)
    for f in flights:
        airport_counts[f.departure_iata] += 1
        airport_counts[f.arrival_iata] += 1
    top_airports_raw = sorted(airport_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    top_airports = []
    for iata, count in top_airports_raw:
        a = airport_map.get(iata)
        top_airports.append({
            "iata": iata,
            "name": a.name if a else None,
            "city": a.city if a else None,
            "country": a.country if a else None,
            "count": count,
        })

    # Top airlines
    airline_iata_set = {f.airline_iata for f in flights if f.airline_iata}
    airline_map = {a.iata: a for a in db.query(Airline).filter(Airline.iata.in_(airline_iata_set)).all()}
    airline_counts: dict = defaultdict(int)
    for f in flights:
        if f.airline_iata:
            airline_counts[f.airline_iata] += 1
    top_airlines = []
    for iata, count in sorted(airline_counts.items(), key=lambda x: x[1], reverse=True)[:10]:
        a = airline_map.get(iata)
        top_airlines.append({
            "iata": iata,
            "name": a.name if a else None,
            "count": count,
        })

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
                "departure_iata": dep_iata,
                "arrival_iata": arr_iata,
                "dep_lat": dep_a.latitude,
                "dep_lon": dep_a.longitude,
                "arr_lat": arr_a.latitude,
                "arr_lon": arr_a.longitude,
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
        by_class=dict(by_class),
        by_reason=dict(by_reason),
        top_routes=top_routes,
        top_airports=top_airports,
        top_airlines=top_airlines,
        map_routes=map_routes,
    )
