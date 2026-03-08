import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline } from "react-leaflet";
import { fetchStats } from "../lib/api";
import { Stats } from "../types";

// Calculate intermediate points for a great-circle arc
// Split segments that cross the antimeridian to avoid horizontal lines
function greatCirclePoints(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
  steps = 50
): [number, number][][] {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;

  const φ1 = toRad(lat1), λ1 = toRad(lon1);
  const φ2 = toRad(lat2), λ2 = toRad(lon2);

  const d = 2 * Math.asin(
    Math.sqrt(
      Math.sin((φ2 - φ1) / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2
    )
  );

  if (d === 0) return [[[lat1, lon1]]];

  const rawPoints: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
    const z = A * Math.sin(φ1) + B * Math.sin(φ2);
    rawPoints.push([toDeg(Math.atan2(z, Math.sqrt(x ** 2 + y ** 2))), toDeg(Math.atan2(y, x))]);
  }

  // Split into segments at antimeridian crossings (lon jumps > 180)
  const segments: [number, number][][] = [];
  let current: [number, number][] = [rawPoints[0]];
  for (let i = 1; i < rawPoints.length; i++) {
    const prevLon = rawPoints[i - 1][1];
    const curLon = rawPoints[i][1];
    if (Math.abs(curLon - prevLon) > 180) {
      segments.push(current);
      current = [];
    }
    current.push(rawPoints[i]);
  }
  if (current.length > 0) segments.push(current);

  return segments;
}

export default function MapPage() {
  const [year, setYear] = useState<number | undefined>();

  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ["stats", year],
    queryFn: () => fetchStats(year),
  });

  if (isLoading) {
    return <div className="p-8 text-slate-400">Loading map data...</div>;
  }

  const routes = stats?.map_routes || [];
  const years = [...(stats?.by_year.map((y) => y.year) || [])].reverse();

  const maxCount = Math.max(...routes.map((r) => r.count), 1);

  // Collect unique airports
  const airportMap = new Map<string, { lat: number; lon: number; label: string; count: number }>();
  routes.forEach((r) => {
    const depKey = r.departure_iata;
    const arrKey = r.arrival_iata;
    airportMap.set(depKey, {
      lat: r.dep_lat, lon: r.dep_lon,
      label: r.departure_iata,
      count: (airportMap.get(depKey)?.count || 0) + r.count,
    });
    airportMap.set(arrKey, {
      lat: r.arr_lat, lon: r.arr_lon,
      label: r.arrival_iata,
      count: (airportMap.get(arrKey)?.count || 0) + r.count,
    });
  });

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">World Map</h1>
          <p className="text-slate-400 mt-1">
            {routes.length} routes · {airportMap.size} airports
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="input w-auto"
            value={year || ""}
            onChange={(e) => setYear(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">All years</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-1 relative">
        {routes.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-slate-500">
            No flight data to display. Add flights first.
          </div>
        ) : (
          <MapContainer
            center={[20, 0]}
            zoom={2}
            style={{ height: "100%", width: "100%" }}
            worldCopyJump
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
            />

            {/* Routes */}
            {routes.map((route, i) => {
              const segments = greatCirclePoints(
                route.dep_lat, route.dep_lon,
                route.arr_lat, route.arr_lon
              );
              const opacity = 0.3 + (route.count / maxCount) * 0.5;
              const weight = 1 + (route.count / maxCount) * 4;
              return segments.map((seg, j) => (
                <Polyline
                  key={`${i}-${j}`}
                  positions={seg}
                  pathOptions={{
                    color: "#3b82f6",
                    weight,
                    opacity,
                  }}
                />
              ));
            })}

            {/* Airports */}
            {Array.from(airportMap.entries()).map(([iata, ap]) => (
              <CircleMarker
                key={iata}
                center={[ap.lat, ap.lon]}
                radius={4}
                pathOptions={{
                  color: "#60a5fa",
                  fillColor: "#3b82f6",
                  fillOpacity: 0.9,
                  weight: 1.5,
                }}
              >
                <Popup>
                  <div className="text-sm font-medium">{iata}</div>
                  <div className="text-xs text-gray-500">{ap.count} flights</div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        )}
      </div>
    </div>
  );
}
