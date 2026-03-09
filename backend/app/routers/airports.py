from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, func, case
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.airport import Airport
from app.schemas.airport import AirportOut, AirportSearch
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/airports", tags=["airports"])


@router.get("/search", response_model=AirportSearch)
def search_airports(
    q: str = Query(..., min_length=1),
    limit: int = Query(10, le=50),
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    q_upper = q.upper().strip()
    priority = case(
        (func.upper(Airport.iata) == q_upper, 0),       # exact IATA
        (func.upper(Airport.icao) == q_upper, 1),       # exact ICAO
        (func.upper(Airport.iata).startswith(q_upper), 2),  # IATA starts with
        (func.upper(Airport.city) == q_upper, 3),       # exact city
        (Airport.city.ilike(f"{q}%"), 4),               # city starts with
        else_=5,
    )
    query = db.query(Airport).filter(
        or_(
            func.upper(Airport.iata) == q_upper,
            func.upper(Airport.icao) == q_upper,
            func.upper(Airport.iata).startswith(q_upper),
            Airport.name.ilike(f"%{q}%"),
            Airport.city.ilike(f"%{q}%"),
            Airport.country.ilike(f"%{q}%"),
        )
    ).order_by(
        priority,
        Airport.name,
    ).limit(limit)

    results = query.all()
    return {"results": results, "total": len(results)}


@router.get("/{iata}", response_model=AirportOut)
def get_airport(
    iata: str,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    airport = db.query(Airport).filter(Airport.iata == iata.upper()).first()
    if not airport:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Airport not found")
    return airport
