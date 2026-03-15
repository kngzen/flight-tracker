from datetime import date
from sqlalchemy import Boolean, Column, Date, Float, ForeignKey, Integer, String, Text
from app.database import Base


class Flight(Base):
    __tablename__ = "flights"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Route
    departure_iata = Column(String(3), nullable=False, index=True)
    arrival_iata = Column(String(3), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    departure_time = Column(String(5), nullable=True)  # HH:MM scheduled gate departure
    arrival_time = Column(String(5), nullable=True)  # HH:MM scheduled gate arrival
    departure_time_actual = Column(String(5), nullable=True)  # HH:MM actual gate departure
    arrival_time_actual = Column(String(5), nullable=True)  # HH:MM actual gate arrival

    # Terminals & gates
    dep_terminal = Column(String(10), nullable=True)
    dep_gate = Column(String(10), nullable=True)
    arr_terminal = Column(String(10), nullable=True)
    arr_gate = Column(String(10), nullable=True)

    # Flight details
    airline_iata = Column(String(10), nullable=True)
    flight_number = Column(String(20), nullable=True)
    aircraft_type = Column(String(50), nullable=True)  # Full name e.g. "Airbus A320"
    aircraft_type_icao = Column(String(10), nullable=True)  # ICAO code e.g. "A320"
    aircraft_registration = Column(String(50), nullable=True)

    # Seat
    seat_class = Column(String(30), nullable=True)  # economy, premium_economy, business, first
    seat_number = Column(String(30), nullable=True)
    seat_position = Column(String(20), nullable=True)  # window, middle, aisle

    # Computed (stored for efficiency)
    distance_km = Column(Float, nullable=True)
    duration_minutes = Column(Integer, nullable=True)

    # Extra
    trip_reason = Column(String(30), nullable=True)  # leisure, business
    trip = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    pnr = Column(String(50), nullable=True)  # Booking reference
    canceled = Column(Boolean, default=False)

    # External IDs for dedup (unique per user, not globally)
    flighty_id = Column(String(100), nullable=True, index=True)
