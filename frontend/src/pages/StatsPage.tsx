import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { fetchStats } from "../lib/api";
import { Stats } from "../types";
import StatCard from "../components/StatCard";
import { Plane, Globe, Route, Clock, Building2 } from "lucide-react";
import { formatDuration, formatNumber, seatClassLabel } from "../lib/utils";

const PIE_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#f43f5e", "#06b6d4"];

export default function StatsPage() {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ["stats"],
    queryFn: fetchStats,
  });

  if (isLoading) return <div className="p-8 text-slate-400">Loading statistics...</div>;
  if (!stats) return null;

  const byYearData = stats.by_year.map((y) => ({
    year: String(y.year),
    flights: y.flights,
    distance: Math.round(y.distance_km),
  }));

  const byClassData = Object.entries(stats.by_class)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: seatClassLabel(k), value: v }));

  const byReasonData = Object.entries(stats.by_reason)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: k === "leisure" ? "Leisure" : k === "business" ? "Business" : k, value: v }));

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Statistics</h1>
        <p className="text-slate-400 mt-1">All-time flight statistics</p>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Flights" value={formatNumber(stats.total_flights)} icon={Plane} color="brand" />
        <StatCard
          label="Total Distance"
          value={`${formatNumber(Math.round(stats.total_distance_km))} km`}
          sub={`${formatNumber(Math.round(stats.total_distance_miles))} mi`}
          icon={Route}
          color="green"
        />
        <StatCard label="Flight Time" value={formatDuration(stats.total_duration_minutes)} icon={Clock} color="amber" />
        <StatCard
          label="Countries"
          value={stats.unique_countries}
          sub={`${stats.unique_airports} airports`}
          icon={Globe}
          color="purple"
        />
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard label="Airlines" value={stats.unique_airlines} icon={Building2} color="rose" />
        <StatCard label="Aircraft Types" value={stats.unique_aircraft_types} icon={Plane} color="brand" />
        {stats.longest_flight_km && (
          <StatCard
            label="Longest Flight"
            value={`${formatNumber(Math.round(stats.longest_flight_km))} km`}
            sub={stats.longest_flight_route || undefined}
            icon={Route}
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
              <XAxis dataKey="year" stroke="#64748b" tick={{ fill: "#94a3b8" }} />
              <YAxis stroke="#64748b" tick={{ fill: "#94a3b8" }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 8 }}
                labelStyle={{ color: "#f1f5f9" }}
                itemStyle={{ color: "#94a3b8" }}
              />
              <Bar dataKey="flights" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Distance per year */}
      {byYearData.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-slate-200 mb-4">Distance per Year (km)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byYearData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="year" stroke="#64748b" tick={{ fill: "#94a3b8" }} />
              <YAxis stroke="#64748b" tick={{ fill: "#94a3b8" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 8 }}
                labelStyle={{ color: "#f1f5f9" }}
                itemStyle={{ color: "#94a3b8" }}
                formatter={(v: number) => [`${formatNumber(v)} km`, "Distance"]}
              />
              <Bar dataKey="distance" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Pie charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {byClassData.length > 0 && (
          <div className="card">
            <h2 className="font-semibold text-slate-200 mb-4">By Cabin Class</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={byClassData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                  {byClassData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 8 }}
                  itemStyle={{ color: "#94a3b8" }}
                />
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
                  {byReasonData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 8 }}
                  itemStyle={{ color: "#94a3b8" }}
                />
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
                <span className="text-sm text-brand-400">{r.count}×</span>
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
              const maxCount = stats.top_airports[0].count;
              const pct = Math.round((a.count / maxCount) * 100);
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-6">{i + 1}</span>
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
                  <span className="text-sm text-slate-400 w-12 text-right">{a.count}×</span>
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
                <span className="font-mono text-brand-400 w-10">{a.iata || "—"}</span>
                <span className="flex-1 text-slate-200 text-sm">{a.name || "—"}</span>
                <span className="text-sm text-slate-400">{a.count} flights</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
