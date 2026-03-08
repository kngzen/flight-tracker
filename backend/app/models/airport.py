from sqlalchemy import Column, Float, Integer, String
from app.database import Base


class Airport(Base):
    __tablename__ = "airports"

    id = Column(Integer, primary_key=True, index=True)
    openflights_id = Column(Integer, unique=True, nullable=True)
    name = Column(String, nullable=False)
    city = Column(String, nullable=True)
    country = Column(String, nullable=True)
    iata = Column(String(3), unique=True, nullable=True, index=True)
    icao = Column(String(4), unique=True, nullable=True, index=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    altitude_ft = Column(Integer, nullable=True)
    timezone = Column(String, nullable=True)
