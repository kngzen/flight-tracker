export interface Airport {
  id: number;
  name: string;
  city: string | null;
  country: string | null;
  iata: string | null;
  icao: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface Airline {
  id: number;
  name: string;
  iata: string | null;
  icao: string | null;
  country: string | null;
  active: string | null;
}

export interface Flight {
  id: number;
  departure_iata: string;
  arrival_iata: string;
  date: string;
  departure_time: string | null;
  arrival_time: string | null;
  departure_time_actual: string | null;
  arrival_time_actual: string | null;
  dep_terminal: string | null;
  dep_gate: string | null;
  arr_terminal: string | null;
  arr_gate: string | null;
  airline_iata: string | null;
  flight_number: string | null;
  aircraft_type: string | null;
  aircraft_registration: string | null;
  seat_class: string | null;
  seat_number: string | null;
  seat_position: string | null;
  duration_minutes: number | null;
  distance_km: number | null;
  trip_reason: string | null;
  trip: string | null;
  notes: string | null;
  pnr: string | null;
  canceled: boolean;
  flighty_id: string | null;
  departure_airport: Airport | null;
  arrival_airport: Airport | null;
  airline: { iata: string; name: string; country: string } | null;
}

export interface FlightCreate {
  departure_iata: string;
  arrival_iata: string;
  date: string;
  departure_time?: string;
  arrival_time?: string;
  departure_time_actual?: string;
  arrival_time_actual?: string;
  dep_terminal?: string;
  dep_gate?: string;
  arr_terminal?: string;
  arr_gate?: string;
  airline_iata?: string;
  flight_number?: string;
  aircraft_type?: string;
  aircraft_registration?: string;
  seat_class?: string;
  seat_number?: string;
  seat_position?: string;
  duration_minutes?: number;
  trip_reason?: string;
  trip?: string;
  notes?: string;
  pnr?: string;
  canceled?: boolean;
}

export interface YearStat {
  year: number;
  flights: number;
  distance_km: number;
  duration_minutes: number;
}

export interface TopRoute {
  departure_iata: string;
  arrival_iata: string;
  departure_name: string | null;
  arrival_name: string | null;
  count: number;
  distance_km: number;
}

export interface TopAirport {
  iata: string;
  name: string | null;
  city: string | null;
  country: string | null;
  country_code: string | null;
  count: number;
  distance_km: number;
}

export interface TopAirline {
  iata: string | null;
  name: string | null;
  count: number;
  distance_km: number;
}

export interface TopAircraftType {
  aircraft_type: string;
  count: number;
  distance_km: number;
}

export interface TopAircraftFamily {
  family: string;
  count: number;
  distance_km: number;
}

export interface TopRegistration {
  registration: string;
  count: number;
  distance_km: number;
}

export interface TopCountry {
  country: string;
  country_code: string | null;
  count: number;
  distance_km: number;
}

export interface MapRoute {
  departure_iata: string;
  arrival_iata: string;
  dep_lat: number;
  dep_lon: number;
  arr_lat: number;
  arr_lon: number;
  count: number;
}

export interface ClassStat {
  count: number;
  distance_km: number;
}

export interface AllianceStat {
  alliance: string;
  count: number;
  distance_km: number;
}

export interface Stats {
  total_flights: number;
  total_distance_km: number;
  total_distance_miles: number;
  total_duration_minutes: number;
  unique_airports: number;
  unique_countries: number;
  unique_airlines: number;
  unique_aircraft_types: number;
  longest_flight_km: number | null;
  longest_flight_route: string | null;
  by_year: YearStat[];
  by_class: Record<string, ClassStat>;
  by_reason: Record<string, ClassStat>;
  by_alliance: AllianceStat[];
  top_routes: TopRoute[];
  top_airports: TopAirport[];
  top_airlines: TopAirline[];
  top_aircraft_types: TopAircraftType[];
  top_aircraft_families: TopAircraftFamily[];
  top_registrations: TopRegistration[];
  top_countries: TopCountry[];
  map_routes: MapRoute[];
}
