from sqlalchemy import Column, Integer, String
from app.database import Base


class Airline(Base):
    __tablename__ = "airlines"

    id = Column(Integer, primary_key=True, index=True)
    openflights_id = Column(Integer, unique=True, nullable=True)
    name = Column(String, nullable=False)
    alias = Column(String, nullable=True)
    iata = Column(String(2), nullable=True, index=True)
    icao = Column(String(3), nullable=True, index=True)
    callsign = Column(String, nullable=True)
    country = Column(String, nullable=True)
    active = Column(String(1), nullable=True)
