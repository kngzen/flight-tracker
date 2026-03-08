from datetime import date
from sqlalchemy import Column, Date, Float, Integer, String, Text
from app.database import Base


class Flight(Base):
    __tablename__ = "flights"

    id = Column(Integer, primary_key=True, index=True)

    # Route
    departure_iata = Column(String(3), nullable=False, index=True)
    arrival_iata = Column(String(3), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    departure_time = Column(String(5), nullable=True)  # HH:MM format

    # Flight details
    airline_iata = Column(String(10), nullable=True)
    flight_number = Column(String(10), nullable=True)
    aircraft_type = Column(String(50), nullable=True)
    aircraft_registration = Column(String(20), nullable=True)

    # Seat
    seat_class = Column(String(20), nullable=True)  # economy, premium_economy, business, first
    seat_number = Column(String(10), nullable=True)
    seat_position = Column(String(10), nullable=True)  # window, middle, aisle

    # Computed (stored for efficiency)
    distance_km = Column(Float, nullable=True)
    duration_minutes = Column(Integer, nullable=True)

    # Extra
    trip_reason = Column(String(20), nullable=True)  # leisure, business
    trip = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
