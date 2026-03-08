from typing import Optional

import pycountry

# Hardcoded overrides for common OpenFlights country names that don't match
# pycountry exactly. Values are lowercase for flagcdn.com compatibility.
_OVERRIDES: dict[str, str] = {
    "United States": "us",
    "United Kingdom": "gb",
    "Korea": "kr",
    "Russia": "ru",
    "Taiwan": "tw",
    "Vietnam": "vn",
    "Iran": "ir",
    "Syria": "sy",
    "Macau": "mo",
    "Hong Kong": "hk",
    "Ivory Coast": "ci",
    "Czech Republic": "cz",
    "Burma": "mm",
    "Congo (Kinshasa)": "cd",
    "Congo (Brazzaville)": "cg",
}

# Module-level cache for resolved country codes.
_cache: dict[str, Optional[str]] = {}


def get_country_code(country_name: str) -> Optional[str]:
    """Map an OpenFlights country name to a lowercase ISO 3166-1 alpha-2 code.

    Lookup order:
      1. Hardcoded overrides for names that pycountry doesn't resolve correctly.
      2. Exact match via ``pycountry.countries.get(name=...)``.
      3. Fuzzy search via ``pycountry.countries.search_fuzzy(...)``.

    Results are cached in a module-level dict so each country name is resolved
    at most once. Returns ``None`` when no match is found.
    """
    if country_name in _cache:
        return _cache[country_name]

    # 1. Check hardcoded overrides first.
    if country_name in _OVERRIDES:
        _cache[country_name] = _OVERRIDES[country_name]
        return _cache[country_name]

    # 2. Try exact match.
    country = pycountry.countries.get(name=country_name)
    if country is not None:
        _cache[country_name] = country.alpha_2.lower()
        return _cache[country_name]

    # 3. Try fuzzy search.
    try:
        results = pycountry.countries.search_fuzzy(country_name)
        if results:
            _cache[country_name] = results[0].alpha_2.lower()
            return _cache[country_name]
    except LookupError:
        pass

    _cache[country_name] = None
    return None
