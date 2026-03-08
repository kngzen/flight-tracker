import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { fetchStats } from "../lib/api";
import { Stats } from "../types";
import StatCard from "../components/StatCard";
import { Plane, Globe, Route, Clock, Building2, Milestone } from "lucide-react";
import { formatNumber, kmToMiles } from "../lib/utils";
import { seatClassLabel } from "../lib/utils";

const KM_TO_MILES = 0.621371;
const PIE_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#f43f5e", "#06b6d4"];

const LIMIT_OPTIONS = [
  { value: 10, label: "Top 10" },
  { value: 20, label: "Top 20" },
  { value: 50, label: "Top 50" },
  { value: 1000, label: "All" },
];

function formatDurationFull(minutes: number): string {
  const hours = Math.round(minutes / 60);
  const parts = [`${formatNumber(hours)}h`];
  if (hours >= 24) parts.push(`${(hours / 24).toFixed(1)} days`);
  if (hours >= 24 * 30) parts.push(`${(hours / (24 * 30)).toFixed(1)} months`);
  if (hours >= 24 * 365) parts.push(`${(hours / (24 * 365)).toFixed(2)} years`);
  return parts.join(" / ");
}

function formatMiles(km: number): string {
  return `${formatNumber(Math.round(km * KM_TO_MILES))} mi`;
}

function AirlineLogo({ iata }: { iata: string | null }) {
  return (
    <div className="w-7 h-5 flex items-center justify-center flex-shrink-0 bg-white/90 rounded-sm overflow-hidden">
      {iata ? (
        <img
          src={`https://pics.avs.io/28/20/${iata}.png`}
          alt=""
          className="w-full h-full object-contain"
          onError={(e) => {
            const el = e.target as HTMLImageElement;
            el.style.display = "none";
          }}
        />
      ) : null}
    </div>
  );
}

function CountryFlag({ code }: { code: string | null }) {
  if (!code) return <span className="inline-block flex-shrink-0" style={{ width: 16, height: 12 }} />;
  return (
    <img
      src={`https://flagcdn.com/16x12/${code}.png`}
      alt=""
      className="inline-block flex-shrink-0"
      style={{ width: 16, height: 12 }}
      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
    />
  );
}

export default function StatsPage() {
  const [year, setYear] = useState<number | undefined>();
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState<"flights" | "distance">("flights");

  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ["stats", year, limit, sortBy],
    queryFn: () => fetchStats(year, limit, sortBy),
  });

  if (isLoading) return <div className="p-8 text-slate-400">Loading statistics...</div>;
  if (!stats) return null;

  const years = stats.by_year.map((y) => y.year);
  const isMileageMode = sortBy === "distance";

  const byYearData = stats.by_year.map((y) => ({
    year: String(y.year),
    flights: y.flights,
    distance: Math.round(y.distance_km * KM_TO_MILES),
  }));

  const byClassData = Object.entries(stats.by_class)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: seatClassLabel(k), value: v }));

  const byReasonData = Object.entries(stats.by_reason)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: k === "leisure" ? "Leisure" : k === "business" ? "Business" : k, value: v }));

  const tooltipStyle = {
    contentStyle: { backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 8 },
    labelStyle: { color: "#f1f5f9" },
    itemStyle: { color: "#94a3b8" },
  };

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Statistics</h1>
        <p className="text-slate-400 mt-1">{year ? `${year} statistics` : "All-time statistics"}</p>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Flights" value={formatNumber(stats.total_flights)} icon={Plane} color="brand" />
        <StatCard
          label="Total Distance"
          value={`${formatNumber(Math.round(stats.total_distance_miles))} mi`}
          sub={`${formatNumber(Math.round(stats.total_distance_km))} km`}
          icon={Route}
          color="green"
        />
        <StatCard
          label="Flight Time"
          value={formatDurationFull(stats.total_duration_minutes)}
          icon={Clock}
          color="amber"
        />
        <StatCard
          label="Countries"
          value={stats.unique_countries}
          sub={`${stats.unique_airports} airports`}
          icon={Globe}
          color="purple"
        />
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Airlines" value={stats.unique_airlines} icon={Building2} color="rose" />
        <StatCard label="Aircraft Types" value={stats.unique_aircraft_types} icon={Plane} color="brand" />
        {stats.longest_flight_km && (
          <StatCard
            label="Longest Flight"
            value={`${formatNumber(kmToMiles(stats.longest_flight_km))} mi`}
            sub={stats.longest_flight_route || undefined}
            icon={Milestone}
            color="green"
          />
        )}
      </div>

      {/* Flights per year bar chart */}
      {byYearData.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-slate-200 mb-4">Flights per Year</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byYearData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="year" stroke="#64748b" tick={{ fill: "#94a3b8" }} interval={0} angle={-45} textAnchor="end" height={50} />
              <YAxis stroke="#64748b" tick={{ fill: "#94a3b8" }} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="flights" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Distance per year */}
      {byYearData.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-slate-200 mb-4">Distance per Year (miles)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byYearData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="year" stroke="#64748b" tick={{ fill: "#94a3b8" }} interval={0} angle={-45} textAnchor="end" height={50} />
              <YAxis stroke="#64748b" tick={{ fill: "#94a3b8" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => [`${formatNumber(v)} mi`, "Distance"]} />
              <Bar dataKey="distance" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filters - placed after charts, before ranked lists */}
      <div className="flex items-center justify-end gap-3 flex-wrap">
        <div className="flex rounded-lg overflow-hidden border border-slate-700">
          <button
            className={`px-3 py-1.5 text-sm ${sortBy === "flights" ? "bg-brand-600 text-white" : "bg-slate-800 text-slate-400 hover:text-slate-200"}`}
            onClick={() => setSortBy("flights")}
          >
            By Flights
          </button>
          <button
            className={`px-3 py-1.5 text-sm ${sortBy === "distance" ? "bg-brand-600 text-white" : "bg-slate-800 text-slate-400 hover:text-slate-200"}`}
            onClick={() => setSortBy("distance")}
          >
            By Mileage
          </button>
        </div>
        <select
          className="input w-auto"
          value={year || ""}
          onChange={(e) => setYear(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">All years</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          className="input w-auto"
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
        >
          {LIMIT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Pie charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {byClassData.length > 0 && (
          <div className="card">
            <h2 className="font-semibold text-slate-200 mb-4">By Cabin Class</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={byClassData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                  {byClassData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
                <Tooltip {...tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        {byReasonData.length > 0 && (
          <div className="card">
            <h2 className="font-semibold text-slate-200 mb-4">By Trip Reason</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={byReasonData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                  {byReasonData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
                <Tooltip {...tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Top routes */}
      {stats.top_routes.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-slate-200 mb-4">Top Routes</h2>
          <div className="space-y-2">
            {stats.top_routes.map((r, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-6">{i + 1}</span>
                <div className="flex-1">
                  <span className="text-slate-200 font-medium">
                    {r.departure_iata} → {r.arrival_iata}
                  </span>
                  {(r.departure_name || r.arrival_name) && (
                    <span className="text-slate-500 text-sm ml-2">
                      {r.departure_name} → {r.arrival_name}
                    </span>
                  )}
                </div>
                <span className="text-sm text-slate-400">{isMileageMode ? formatMiles(r.distance_km) : `${r.count}\u00d7`}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top airports */}
      {stats.top_airports.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-slate-200 mb-4">Most Visited Airports</h2>
          <div className="space-y-2">
            {stats.top_airports.map((a, i) => {
              const maxVal = isMileageMode ? stats.top_airports[0].distance_km : stats.top_airports[0].count;
              const curVal = isMileageMode ? a.distance_km : a.count;
              const pct = maxVal > 0 ? Math.round((curVal / maxVal) * 100) : 0;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-6">{i + 1}</span>
                  <CountryFlag code={a.country_code} />
                  <span className="font-mono text-brand-400 w-10">{a.iata}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-slate-200 text-sm">{a.name}</span>
                      {a.city && <span className="text-slate-500 text-xs">{a.city}, {a.country}</span>}
                    </div>
                    <div className="bg-slate-800 rounded-full h-1.5">
                      <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <span className="text-sm text-slate-400 w-20 text-right">
                    {isMileageMode ? formatMiles(a.distance_km) : `${a.count}\u00d7`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top airlines */}
      {stats.top_airlines.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-slate-200 mb-4">Most Flown Airlines</h2>
          <div className="space-y-2">
            {stats.top_airlines.map((a, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-6">{i + 1}</span>
                <AirlineLogo iata={a.iata} />
                <span className="font-mono text-brand-400 w-10">{a.iata || "\u2014"}</span>
                <span className="flex-1 text-slate-200 text-sm">{a.name || "\u2014"}</span>
                <span className="text-sm text-slate-400">
                  {isMileageMode ? formatMiles(a.distance_km) : `${a.count} flights`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top aircraft types */}
      {stats.top_aircraft_types.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-slate-200 mb-4">Most Flown Aircraft Types</h2>
          <div className="space-y-2">
            {stats.top_aircraft_types.map((a, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-6">{i + 1}</span>
                <Plane className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span className="flex-1 text-slate-200 text-sm">{a.aircraft_type}</span>
                <span className="text-sm text-slate-400">
                  {isMileageMode ? formatMiles(a.distance_km) : `${a.count} flights`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top registrations */}
      {stats.top_registrations.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-slate-200 mb-4">Most Flown Registrations</h2>
          <div className="space-y-2">
            {stats.top_registrations.map((r, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-6">{i + 1}</span>
                <span className="font-mono text-brand-400 flex-1">{r.registration}</span>
                <span className="text-sm text-slate-400">
                  {isMileageMode ? formatMiles(r.distance_km) : `${r.count} flights`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
