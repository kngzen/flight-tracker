"""Aircraft type name to ICAO code mapping."""

# Maps common aircraft type names (lowercase) to ICAO type designator
# Source: ICAO Doc 8643
_AIRCRAFT_MAP: dict[str, str] = {
    # Airbus
    "airbus a220-100": "BCS1",
    "airbus a220-300": "BCS3",
    "airbus a300": "A30B",
    "airbus a310": "A310",
    "airbus a318": "A318",
    "airbus a319": "A319",
    "airbus a319neo": "A19N",
    "airbus a320": "A320",
    "airbus a320neo": "A20N",
    "airbus a321": "A321",
    "airbus a321neo": "A21N",
    "airbus a321xlr": "A21N",
    "airbus a330": "A330",
    "airbus a330-200": "A332",
    "airbus a330-300": "A333",
    "airbus a330-800neo": "A338",
    "airbus a330-900neo": "A339",
    "airbus a330neo": "A339",
    "airbus a340": "A340",
    "airbus a340-200": "A342",
    "airbus a340-300": "A343",
    "airbus a340-500": "A345",
    "airbus a340-600": "A346",
    "airbus a350": "A359",
    "airbus a350-900": "A359",
    "airbus a350-1000": "A35K",
    "airbus a380": "A388",
    "airbus a380-800": "A388",
    # Boeing
    "boeing 707": "B707",
    "boeing 717": "B712",
    "boeing 727": "B727",
    "boeing 737": "B737",
    "boeing 737-300": "B733",
    "boeing 737-400": "B734",
    "boeing 737-500": "B735",
    "boeing 737-600": "B736",
    "boeing 737-700": "B737",
    "boeing 737-800": "B738",
    "boeing 737-900": "B739",
    "boeing 737 max": "B38M",
    "boeing 737 max 7": "B37M",
    "boeing 737 max 8": "B38M",
    "boeing 737 max 9": "B39M",
    "boeing 737 max 10": "B3XM",
    "boeing 747": "B744",
    "boeing 747-400": "B744",
    "boeing 747-8": "B748",
    "boeing 747-8i": "B748",
    "boeing 757": "B752",
    "boeing 757-200": "B752",
    "boeing 757-300": "B753",
    "boeing 767": "B763",
    "boeing 767-200": "B762",
    "boeing 767-300": "B763",
    "boeing 767-400": "B764",
    "boeing 777": "B77W",
    "boeing 777-200": "B772",
    "boeing 777-200er": "B772",
    "boeing 777-200lr": "B77L",
    "boeing 777-300": "B773",
    "boeing 777-300er": "B77W",
    "boeing 777x": "B779",
    "boeing 777-9": "B779",
    "boeing 787": "B788",
    "boeing 787-8": "B788",
    "boeing 787-9": "B789",
    "boeing 787-10": "B78X",
    # Bombardier / Canadair
    "bombardier crj-200": "CRJ2",
    "bombardier crj-700": "CRJ7",
    "bombardier crj-900": "CRJ9",
    "bombardier crj-1000": "CRJX",
    "canadair regional jet 200": "CRJ2",
    "canadair regional jet 700": "CRJ7",
    "canadair regional jet 900": "CRJ9",
    "bombardier dash 8": "DH8D",
    "dash 8": "DH8D",
    "bombardier dash 8 q400": "DH8D",
    "de havilland canada dhc-8-400 dash 8": "DH8D",
    # Embraer
    "embraer 170": "E170",
    "embraer 175": "E75S",
    "embraer erj 175": "E75S",
    "embraer 190": "E190",
    "embraer erj 190": "E190",
    "embraer 195": "E195",
    "embraer erj 195": "E195",
    "embraer e175": "E75S",
    "embraer e190": "E190",
    "embraer e195": "E195",
    "embraer e190-e2": "E290",
    "embraer e195-e2": "E295",
    "embraer erj-135": "E135",
    "embraer erj-140": "E140",
    "embraer erj-145": "E145",
    # ATR
    "atr 42": "AT43",
    "atr 72": "AT76",
    "atr 72-600": "AT76",
    # Sukhoi / COMAC
    "sukhoi superjet 100": "SU95",
    "comac c919": "C919",
    # McDonnell Douglas
    "mcdonnell douglas md-80": "MD80",
    "mcdonnell douglas md-82": "MD82",
    "mcdonnell douglas md-83": "MD83",
    "mcdonnell douglas md-88": "MD88",
    "mcdonnell douglas md-90": "MD90",
    "mcdonnell douglas md-11": "MD11",
    "mcdonnell douglas dc-10": "DC10",
    # Fokker
    "fokker 70": "F70",
    "fokker 100": "F100",
    # BAe / Avro
    "bae 146": "B461",
    "avro rj85": "RJ85",
    "avro rj100": "RJ1H",
    # Saab
    "saab 340": "SF34",
    "saab 2000": "SB20",
    # Cessna (common for regional)
    "cessna 208 caravan": "C208",
    # Dornier
    "dornier 328": "D328",
}


def get_aircraft_icao(name: str | None) -> str | None:
    """Look up ICAO type designator from aircraft type name."""
    if not name:
        return None
    key = name.lower().strip()
    # Direct match
    if key in _AIRCRAFT_MAP:
        return _AIRCRAFT_MAP[key]
    # Try partial match (find longest matching key)
    best = None
    for k, v in _AIRCRAFT_MAP.items():
        if k in key or key in k:
            if best is None or len(k) > len(best[0]):
                best = (k, v)
    return best[1] if best else None
