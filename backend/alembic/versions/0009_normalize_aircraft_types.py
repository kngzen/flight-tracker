"""Normalize aircraft_type values and drop aircraft_type_icao column.

Converts existing aircraft_type values (e.g. "Boeing 737-800", "Airbus A320neo")
to canonical type-level names (e.g. "Boeing 737", "Airbus A320").

Revision ID: 0009
Revises: 0008
"""
import re
from alembic import op
import sqlalchemy as sa

revision = "0009"
down_revision = "0008"


# Inline normalization rules (same logic as app.utils.aircraft.normalize_aircraft_type)
# so migration is self-contained and not affected by future code changes.
_RULES: list[tuple[str, str]] = [
    (r"a\s*220|bcs[13]", "Airbus A220"),
    (r"a\s*318", "Airbus A318"),
    (r"a\s*319", "Airbus A319"),
    (r"a\s*321", "Airbus A321"),
    (r"a\s*320", "Airbus A320"),
    (r"a\s*30[0b]", "Airbus A300"),
    (r"a\s*310", "Airbus A310"),
    (r"a\s*33[0-9]|a\s*330", "Airbus A330"),
    (r"a\s*34[0-6]|a\s*340", "Airbus A340"),
    (r"a\s*35[09k]|a\s*350", "Airbus A350"),
    (r"a\s*38[08]|a\s*380", "Airbus A380"),
    (r"7[0]7", "Boeing 707"),
    (r"71[27]", "Boeing 717"),
    (r"72[27]", "Boeing 727"),
    (r"73[3-9m]|737|b73", "Boeing 737"),
    (r"74[4-8]|747|b74", "Boeing 747"),
    (r"75[2-3]|757|b75", "Boeing 757"),
    (r"76[2-4]|767|b76", "Boeing 767"),
    (r"77[2-9lwx]|777|b77", "Boeing 777"),
    (r"78[89x]|787|b78", "Boeing 787"),
    (r"crj.?1000|crjx", "Bombardier CRJ-1000"),
    (r"crj.?200|crj2", "Bombardier CRJ-200"),
    (r"crj.?700|crj7", "Bombardier CRJ-700"),
    (r"crj.?900|crj9", "Bombardier CRJ-900"),
    (r"dash.?8|dh[c8]|dhc.?8|q400", "De Havilland Dash 8"),
    (r"erj.?135|e135", "Embraer ERJ-135"),
    (r"erj.?140|e140", "Embraer ERJ-140"),
    (r"erj.?145|e145", "Embraer ERJ-145"),
    (r"e.?170", "Embraer E170"),
    (r"e.?175|e75", "Embraer E175"),
    (r"e.?195|e295|e95", "Embraer E195"),
    (r"e.?190|e290|e90", "Embraer E190"),
    (r"atr.?72|at7", "ATR 72"),
    (r"atr.?42|at4", "ATR 42"),
    (r"superjet|su95|ssj", "Sukhoi Superjet 100"),
    (r"c919|comac", "COMAC C919"),
    (r"md.?1[01]", "McDonnell Douglas MD-11"),
    (r"dc.?10", "McDonnell Douglas DC-10"),
    (r"md.?9", "McDonnell Douglas MD-90"),
    (r"md.?8", "McDonnell Douglas MD-80"),
    (r"fokker.?100|f100", "Fokker 100"),
    (r"fokker.?70|f70", "Fokker 70"),
    (r"bae.?146|b461", "BAe 146"),
    (r"rj.?85", "Avro RJ85"),
    (r"rj.?1[0h]", "Avro RJ100"),
    (r"saab.?2000|sb20", "Saab 2000"),
    (r"saab.?340|sf34", "Saab 340"),
    (r"cessna.?208|c208|caravan", "Cessna 208 Caravan"),
    (r"dornier.?328|d328", "Dornier 328"),
]

_COMPILED = [(re.compile(p, re.IGNORECASE), c) for p, c in _RULES]


def _normalize(raw: str) -> str:
    for pattern, canonical in _COMPILED:
        if pattern.search(raw):
            return canonical
    return raw


def upgrade():
    conn = op.get_bind()

    # Get all distinct aircraft_type values
    rows = conn.execute(
        sa.text("SELECT DISTINCT aircraft_type FROM flights WHERE aircraft_type IS NOT NULL")
    ).fetchall()

    for (raw_type,) in rows:
        normalized = _normalize(raw_type)
        if normalized != raw_type:
            conn.execute(
                sa.text("UPDATE flights SET aircraft_type = :new WHERE aircraft_type = :old"),
                {"new": normalized, "old": raw_type},
            )

    # Drop the aircraft_type_icao column
    op.drop_column("flights", "aircraft_type_icao")


def downgrade():
    # Re-add the column (data is lost)
    op.add_column("flights", sa.Column("aircraft_type_icao", sa.String(10), nullable=True))
