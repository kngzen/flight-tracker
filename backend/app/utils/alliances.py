# Airline IATA code to global alliance mapping
# Sources: public alliance membership lists

AIRLINE_ALLIANCES: dict[str, str] = {
    # Star Alliance
    "AC": "Star Alliance", "AI": "Star Alliance", "AV": "Star Alliance",
    "BR": "Star Alliance", "CA": "Star Alliance", "CM": "Star Alliance",
    "ET": "Star Alliance", "EVA": "Star Alliance", "LH": "Star Alliance",
    "LO": "Star Alliance", "LX": "Star Alliance", "MS": "Star Alliance",
    "NH": "Star Alliance", "NZ": "Star Alliance", "OS": "Star Alliance",
    "OU": "Star Alliance", "OZ": "Star Alliance", "SA": "Star Alliance",
    "SK": "Star Alliance", "SN": "Star Alliance", "SQ": "Star Alliance",
    "TG": "Star Alliance", "TK": "Star Alliance", "TP": "Star Alliance",
    "UA": "Star Alliance", "ZH": "Star Alliance",
    # Oneworld
    "AA": "Oneworld", "AY": "Oneworld", "BA": "Oneworld",
    "CX": "Oneworld", "FJ": "Oneworld", "IB": "Oneworld",
    "JL": "Oneworld", "MH": "Oneworld", "QF": "Oneworld",
    "QR": "Oneworld", "RJ": "Oneworld", "S7": "Oneworld",
    "UL": "Oneworld", "AT": "Oneworld", "AS": "Oneworld",
    # SkyTeam
    "AF": "SkyTeam", "AM": "SkyTeam", "AR": "SkyTeam",
    "CI": "SkyTeam", "CZ": "SkyTeam", "DL": "SkyTeam",
    "GA": "SkyTeam", "KE": "SkyTeam", "KL": "SkyTeam",
    "ME": "SkyTeam", "MU": "SkyTeam", "OK": "SkyTeam",
    "RO": "SkyTeam", "SU": "SkyTeam", "SV": "SkyTeam",
    "UX": "SkyTeam", "VN": "SkyTeam",
}


def get_alliance(iata: str | None) -> str | None:
    if not iata:
        return None
    return AIRLINE_ALLIANCES.get(iata.strip().upper())
