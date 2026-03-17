"""Aircraft type normalization, family mapping, and suggestion list."""

import re

# ──────────────────────────────────────────────────────────
# Canonical aircraft types (the stored values)
# ──────────────────────────────────────────────────────────

AIRCRAFT_TYPES: list[str] = [
    # Airbus
    "Airbus A220",
    "Airbus A300",
    "Airbus A310",
    "Airbus A318",
    "Airbus A319",
    "Airbus A320",
    "Airbus A321",
    "Airbus A330",
    "Airbus A340",
    "Airbus A350",
    "Airbus A380",
    # Boeing
    "Boeing 707",
    "Boeing 717",
    "Boeing 727",
    "Boeing 737",
    "Boeing 747",
    "Boeing 757",
    "Boeing 767",
    "Boeing 777",
    "Boeing 787",
    # Bombardier / De Havilland Canada
    "Bombardier CRJ-200",
    "Bombardier CRJ-700",
    "Bombardier CRJ-900",
    "Bombardier CRJ-1000",
    "De Havilland Dash 8",
    # Embraer
    "Embraer ERJ-135",
    "Embraer ERJ-140",
    "Embraer ERJ-145",
    "Embraer E170",
    "Embraer E175",
    "Embraer E190",
    "Embraer E195",
    # ATR
    "ATR 42",
    "ATR 72",
    # Embraer (additional)
    "Embraer 120 Brasilia",
    # Others
    "Sukhoi Superjet 100",
    "COMAC C919",
    "McDonnell Douglas MD-80",
    "McDonnell Douglas MD-90",
    "McDonnell Douglas MD-11",
    "McDonnell Douglas DC-10",
    "Fokker 70",
    "Fokker 100",
    "BAe 146",
    "Avro RJ85",
    "Avro RJ100",
    "Saab 340",
    "Saab 2000",
    "Cessna 208 Caravan",
    "Dornier 328",
    "McDonnell Douglas DC-9",
]

# ──────────────────────────────────────────────────────────
# Aircraft families: family name → list of member types
# ──────────────────────────────────────────────────────────

AIRCRAFT_FAMILIES: dict[str, list[str]] = {
    # Airbus
    "A220 family": ["Airbus A220"],
    "A300 family": ["Airbus A300", "Airbus A310"],
    "A320 family": ["Airbus A318", "Airbus A319", "Airbus A320", "Airbus A321"],
    "A330 family": ["Airbus A330"],
    "A340 family": ["Airbus A340"],
    "A350 family": ["Airbus A350"],
    "A380 family": ["Airbus A380"],
    # Boeing
    "707 family": ["Boeing 707"],
    "727 family": ["Boeing 727"],
    "737 family": ["Boeing 737"],
    "747 family": ["Boeing 747"],
    "757 family": ["Boeing 757"],
    "767 family": ["Boeing 767"],
    "777 family": ["Boeing 777"],
    "787 family": ["Boeing 787"],
    # Douglas / McDonnell Douglas / Boeing
    "DC-9 family": ["McDonnell Douglas DC-9", "McDonnell Douglas MD-80", "McDonnell Douglas MD-90", "Boeing 717"],
    "DC-10 family": ["McDonnell Douglas DC-10", "McDonnell Douglas MD-11"],
    # Bombardier / De Havilland
    "CRJ family": ["Bombardier CRJ-200", "Bombardier CRJ-700", "Bombardier CRJ-900", "Bombardier CRJ-1000"],
    "Dash 8 family": ["De Havilland Dash 8"],
    # Embraer
    "E-Jet family": ["Embraer E170", "Embraer E175", "Embraer E190", "Embraer E195"],
    "ERJ family": ["Embraer ERJ-135", "Embraer ERJ-140", "Embraer ERJ-145", "Embraer 120 Brasilia"],
    # ATR
    "ATR family": ["ATR 42", "ATR 72"],
    # Others
    "Fokker family": ["Fokker 70", "Fokker 100"],
    "BAe 146 family": ["BAe 146", "Avro RJ85", "Avro RJ100"],
    "Sukhoi Superjet family": ["Sukhoi Superjet 100"],
    "C919 family": ["COMAC C919"],
    "Saab family": ["Saab 340", "Saab 2000"],
    "Cessna Caravan family": ["Cessna 208 Caravan"],
    "Dornier 328 family": ["Dornier 328"],
}

# Reverse lookup: type → family
_TYPE_TO_FAMILY: dict[str, str] = {}
for _family, _members in AIRCRAFT_FAMILIES.items():
    for _t in _members:
        _TYPE_TO_FAMILY[_t] = _family


def get_aircraft_family(aircraft_type: str | None) -> str | None:
    """Return the family name for a given canonical aircraft type."""
    if not aircraft_type:
        return None
    return _TYPE_TO_FAMILY.get(aircraft_type)


# ──────────────────────────────────────────────────────────
# Normalization: raw string → canonical type
# ──────────────────────────────────────────────────────────

# Patterns to match raw input to canonical types.
# Order matters — more specific patterns first.
_NORMALIZE_RULES: list[tuple[re.Pattern, str]] = []


def _add_rule(pattern: str, canonical: str):
    _NORMALIZE_RULES.append((re.compile(pattern, re.IGNORECASE), canonical))


# Airbus — match subtypes like A320neo, A321-200, A330-900neo, etc.
_add_rule(r"a\s*220|bcs[13]", "Airbus A220")
_add_rule(r"a\s*318", "Airbus A318")
_add_rule(r"a\s*319", "Airbus A319")
_add_rule(r"a\s*321", "Airbus A321")
_add_rule(r"a\s*320", "Airbus A320")  # after 321 to avoid A320 matching "A321"
_add_rule(r"a\s*30[0b]", "Airbus A300")
_add_rule(r"a\s*310", "Airbus A310")
_add_rule(r"a\s*33[0-9]|a\s*330", "Airbus A330")
_add_rule(r"a\s*34[0-6]|a\s*340", "Airbus A340")
_add_rule(r"a\s*35[09k]|a\s*350", "Airbus A350")
_add_rule(r"a\s*38[08]|a\s*380", "Airbus A380")

# Boeing — match subtypes like 737-800, 737 MAX 8, 777-300ER, etc.
_add_rule(r"7[0]7", "Boeing 707")
_add_rule(r"71[27]", "Boeing 717")
_add_rule(r"72[27]", "Boeing 727")
_add_rule(r"73[3-9m]|737|b73", "Boeing 737")
_add_rule(r"74[4-8]|747|b74", "Boeing 747")
_add_rule(r"75[2-3]|757|b75", "Boeing 757")
_add_rule(r"76[2-4]|767|b76", "Boeing 767")
_add_rule(r"77[2-9lwx]|777|b77", "Boeing 777")
_add_rule(r"78[89x]|787|b78", "Boeing 787")

# Bombardier / De Havilland
_add_rule(r"crj.?1000|crjx", "Bombardier CRJ-1000")
_add_rule(r"crj.?200|crj2", "Bombardier CRJ-200")
_add_rule(r"crj.?700|crj7", "Bombardier CRJ-700")
_add_rule(r"crj.?900|crj9", "Bombardier CRJ-900")
_add_rule(r"\bcrj\b", "Bombardier CRJ-200")  # bare "CRJ" defaults to CRJ-200
_add_rule(r"dash.?8|dh[c8]|dhc.?8|q400", "De Havilland Dash 8")

# Embraer — handle "ERJ-145", "Embraer RJ145", "Embraer ERJ 145", "E145", etc.
_add_rule(r"e?rj.?135|e.?135|embraer\s*135", "Embraer ERJ-135")
_add_rule(r"e?rj.?140|e.?140|embraer\s*140", "Embraer ERJ-140")
_add_rule(r"e?rj.?145|e.?145|embraer\s*145", "Embraer ERJ-145")
_add_rule(r"e.?170|embraer\s*170", "Embraer E170")
_add_rule(r"e.?175|e75|embraer\s*175", "Embraer E175")
_add_rule(r"e.?195|e295|e95|embraer\s*195", "Embraer E195")
_add_rule(r"e.?190|e290|e90|embraer\s*190", "Embraer E190")  # after 195 to avoid overlap
_add_rule(r"embraer\s*120|brasilia", "Embraer 120 Brasilia")

# ATR
_add_rule(r"atr.?72|at7", "ATR 72")
_add_rule(r"atr.?42|at4", "ATR 42")

# Others
_add_rule(r"superjet|su95|ssj", "Sukhoi Superjet 100")
_add_rule(r"c919|comac", "COMAC C919")
_add_rule(r"md.?1[01]", "McDonnell Douglas MD-11")
_add_rule(r"dc.?10", "McDonnell Douglas DC-10")
_add_rule(r"dc.?9", "McDonnell Douglas DC-9")
_add_rule(r"md.?9", "McDonnell Douglas MD-90")
_add_rule(r"md.?8", "McDonnell Douglas MD-80")
_add_rule(r"fokker.?100|f100", "Fokker 100")
_add_rule(r"fokker.?70|f70", "Fokker 70")
_add_rule(r"bae.?146|b461", "BAe 146")
_add_rule(r"rj.?85", "Avro RJ85")
_add_rule(r"rj.?1[0h]", "Avro RJ100")
_add_rule(r"saab.?2000|sb20", "Saab 2000")
_add_rule(r"saab.?340|sf34", "Saab 340")
_add_rule(r"cessna.?208|c208|caravan", "Cessna 208 Caravan")
_add_rule(r"dornier.?328|d328", "Dornier 328")


def normalize_aircraft_type(raw: str | None) -> str | None:
    """Normalize a raw aircraft type string to a canonical type name.

    Returns the canonical name (e.g. "Boeing 737") or the original string
    if no match is found.
    """
    if not raw:
        return None
    cleaned = raw.strip()
    if not cleaned:
        return None

    # Check for exact match with canonical types (case-insensitive)
    lower = cleaned.lower()
    for t in AIRCRAFT_TYPES:
        if lower == t.lower():
            return t

    # Run through normalization rules
    for pattern, canonical in _NORMALIZE_RULES:
        if pattern.search(cleaned):
            return canonical

    # No match — return original as-is
    return cleaned


def suggest_aircraft_types(query: str) -> list[str]:
    """Return canonical aircraft types matching the query string.

    Matches against the full name or the short model number (e.g. "A3" matches
    all Airbus A3xx types, "73" matches Boeing 737, etc.)
    """
    if not query or len(query) < 1:
        return []
    q = query.lower().strip()
    results = []
    for t in AIRCRAFT_TYPES:
        # Match against full name
        if q in t.lower():
            results.append(t)
            continue
        # Match against model number without manufacturer prefix
        # e.g. "Airbus A320" → "A320", "Boeing 737" → "737"
        parts = t.split(" ", 1)
        if len(parts) > 1 and q in parts[1].lower():
            results.append(t)
    return results
