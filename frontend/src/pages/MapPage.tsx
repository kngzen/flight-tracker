import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, Tooltip as LTooltip, useMap } from "react-leaflet";
import { fetchStats } from "../lib/api";
import { Stats } from "../types";
import { Sun, Moon, Tag } from "lucide-react";

const DARK_TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png";
const LIGHT_TILES = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

// Calculate intermediate points for a great-circle arc
// Split segments that cross the antimeridian to avoid horizontal lines
function greatCirclePoints(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
  steps = 50
): [number, number][][] {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;

  const p1 = toRad(lat1), l1 = toRad(lon1);
  const p2 = toRad(lat2), l2 = toRad(lon2);

  const d = 2 * Math.asin(
    Math.sqrt(
      Math.sin((p2 - p1) / 2) ** 2 +
      Math.cos(p1) * Math.cos(p2) * Math.sin((l2 - l1) / 2) ** 2
    )
  );

  if (d === 0) return [[[lat1, lon1]]];

  const rawPoints: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(p1) * Math.cos(l1) + B * Math.cos(p2) * Math.cos(l2);
    const y = A * Math.cos(p1) * Math.sin(l1) + B * Math.cos(p2) * Math.sin(l2);
    const z = A * Math.sin(p1) + B * Math.sin(p2);
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

function TileSwapper({ url }: { url: string }) {
  return <TileLayer key={url} url={url} attribution={ATTRIBUTION} />;
}

/** Interpolate blue gradient based on t ∈ [0,1]. Darker = more visited. */
function heatColor(t: number): string {
  // Light sky blue → deep blue
  const r = Math.round(186 + (30 - 186) * t);
  const g = Math.round(230 + (64 - 230) * t);
  const b = Math.round(253 + (175 - 253) * t);
  return `rgb(${r},${g},${b})`;
}

function MapCenterUpdater({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  useMemo(() => {
    map.setView([lat, lon], map.getZoom(), { animate: true });
  }, [lat, lon]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function MapPage() {
  const [year, setYear] = useState<number | undefined>();
  const [view, setView] = useState<"routes" | "bubbles">("routes");
  const [darkMode, setDarkMode] = useState(true);
  const [showLabels, setShowLabels] = useState(false);

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

  const maxAirportCount = Math.max(...Array.from(airportMap.values()).map((a) => a.count), 1);

  // Find busiest airport for centering
  let busiestAirport = { lat: 37.7749, lon: -122.4194 }; // fallback: SFO
  let busiestCount = 0;
  airportMap.forEach((ap) => {
    if (ap.count > busiestCount) {
      busiestCount = ap.count;
      busiestAirport = { lat: ap.lat, lon: ap.lon };
    }
  });

  const lineColor = darkMode ? "#3b82f6" : "#2563eb";
  const dotColor = darkMode ? "#3b82f6" : "#2563eb";
  const dotBorder = darkMode ? "#60a5fa" : "#1d4ed8";
  const labelColor = darkMode ? "#e2e8f0" : "#1e293b";

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 md:p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">World Map</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {routes.length} routes · {airportMap.size} airports
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* View toggle */}
          <div className="flex rounded-lg overflow-hidden border border-slate-700">
            <button
              type="button"
              className={`px-3 py-1.5 text-sm ${view === "routes" ? "bg-brand-600 text-white" : "bg-slate-800 text-slate-400 hover:text-slate-200"}`}
              onClick={() => setView("routes")}
            >
              Routes
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 text-sm ${view === "bubbles" ? "bg-brand-600 text-white" : "bg-slate-800 text-slate-400 hover:text-slate-200"}`}
              onClick={() => setView("bubbles")}
            >
              Airports
            </button>
          </div>
          {/* Labels toggle */}
          <button
            type="button"
            className={`p-2 rounded-lg border transition-colors ${showLabels ? "bg-brand-600/20 border-brand-500 text-brand-300" : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"}`}
            onClick={() => setShowLabels(!showLabels)}
            title={showLabels ? "Hide airport codes" : "Show airport codes"}
          >
            <Tag className="w-4 h-4" />
          </button>
          {/* Dark/light toggle */}
          <button
            type="button"
            className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            onClick={() => setDarkMode(!darkMode)}
            title={darkMode ? "Switch to light map" : "Switch to dark map"}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
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
            center={[busiestAirport.lat, busiestAirport.lon]}
            zoom={2}
            style={{ height: "100%", width: "100%" }}
            worldCopyJump
          >
            <TileSwapper url={darkMode ? DARK_TILES : LIGHT_TILES} />
            <MapCenterUpdater lat={busiestAirport.lat} lon={busiestAirport.lon} />

            {view === "routes" && (
              <>
                {/* Route lines */}
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
                      pathOptions={{ color: lineColor, weight, opacity }}
                    />
                  ));
                })}

                {/* Small airport dots */}
                {Array.from(airportMap.entries()).map(([iata, ap]) => (
                  <CircleMarker
                    key={iata}
                    center={[ap.lat, ap.lon]}
                    radius={4}
                    pathOptions={{
                      color: dotBorder,
                      fillColor: dotColor,
                      fillOpacity: 0.9,
                      weight: 1.5,
                    }}
                  >
                    {showLabels && (
                      <LTooltip permanent direction="top" offset={[0, -6]} className="airport-label">
                        <span style={{ color: labelColor, fontSize: 9, fontWeight: 600, textShadow: darkMode ? "0 1px 3px rgba(0,0,0,0.8)" : "0 1px 3px rgba(255,255,255,0.8)" }}>
                          {iata}
                        </span>
                      </LTooltip>
                    )}
                    <Popup>
                      <div className="text-sm font-medium">{iata}</div>
                      <div className="text-xs text-gray-500">{ap.count} flights</div>
                    </Popup>
                  </CircleMarker>
                ))}
              </>
            )}

            {view === "bubbles" && (
              <>
                {/* Sized heat-colored bubbles */}
                {Array.from(airportMap.entries()).map(([iata, ap]) => {
                  const minR = 5;
                  const maxR = 30;
                  const t = ap.count / maxAirportCount; // 0..1
                  const r = minR + t * (maxR - minR);
                  const color = heatColor(t);
                  return (
                    <CircleMarker
                      key={iata}
                      center={[ap.lat, ap.lon]}
                      radius={r}
                      pathOptions={{
                        color,
                        fillColor: color,
                        fillOpacity: 0.45 + t * 0.45,
                        weight: 2,
                      }}
                    >
                      {showLabels && (
                        <LTooltip permanent direction="top" offset={[0, -(r + 4)]} className="airport-label">
                          <span style={{ color: labelColor, fontSize: 10, fontWeight: 600, textShadow: darkMode ? "0 1px 3px rgba(0,0,0,0.8)" : "0 1px 3px rgba(255,255,255,0.8)" }}>
                            {iata}
                          </span>
                        </LTooltip>
                      )}
                      <Popup>
                        <div className="text-sm font-medium">{iata}</div>
                        <div className="text-xs text-gray-500">{ap.count} flights</div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </>
            )}
          </MapContainer>
        )}
      </div>
    </div>
  );
}
