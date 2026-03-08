from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.airline import Airline
from app.schemas.airline import AirlineOut, AirlineSearch
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/airlines", tags=["airlines"])


@router.get("/search", response_model=AirlineSearch)
def search_airlines(
    q: str = Query(..., min_length=1),
    limit: int = Query(10, le=50),
    db: Session = Depends(get_db),
    _: str = Depends(get_current_user),
):
    q_upper = q.upper().strip()
    query = db.query(Airline).filter(
        or_(
            func.upper(Airline.iata) == q_upper,
            func.upper(Airline.icao) == q_upper,
            Airline.name.ilike(f"%{q}%"),
        )
    ).order_by(
        (func.upper(Airline.iata) == q_upper).desc(),
        Airline.name,
    ).limit(limit)

    results = query.all()
    return {"results": results, "total": len(results)}
