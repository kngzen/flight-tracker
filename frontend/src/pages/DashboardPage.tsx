import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plane, Globe, Clock, Route, Building2, Milestone, Orbit } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { fetchStats, fetchFlights } from "../lib/api";
import { Stats, Flight } from "../types";
import StatCard from "../components/StatCard";
import { formatNumber, kmToMiles } from "../lib/utils";
import { format } from "date-fns";

export default function DashboardPage() {
  const { data: stats } = useQuery<Stats>({ queryKey: ["stats"], queryFn: () => fetchStats() });
  const { data: flights } = useQuery<Flight[]>({ queryKey: ["flights"], queryFn: () => fetchFlights() });

  const recentFlights = flights?.slice(0, 5) || [];

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1">Your flight history at a glance</p>
      </div>

      {/* Stat cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Total Flights"
            value={formatNumber(stats.total_flights)}
            icon={Plane}
            color="brand"
          />
          <StatCard
            label="Total Distance"
            value={`${formatNumber(Math.round(stats.total_distance_miles))} mi`}
            sub={`${formatNumber(Math.round(stats.total_distance_km))} km`}
            icon={Route}
            color="green"
          />
          <StatCard
            label="Around the Earth"
            value={`${(stats.total_distance_km / 40075).toFixed(1)}x`}
            sub={(() => {
              const moon = stats.total_distance_km / 384400;
              const sun = stats.total_distance_km / 149597870;
              const parts = [];
              parts.push(`${moon.toFixed(moon >= 1 ? 1 : 2)}x to Moon`);
              parts.push(`${sun.toFixed(sun >= 0.01 ? 3 : 4)}x to Sun`);
              return parts.join(" / ");
            })()}
            icon={Orbit}
            color="cyan"
          />
          <StatCard
            label="Flight Time"
            value={`${formatNumber(Math.round(stats.total_duration_minutes / 60))}h`}
            sub={(() => {
              const h = stats.total_duration_minutes / 60;
              const parts = [];
              if (h >= 24) parts.push(`${(h / 24).toFixed(1)} days`);
              if (h >= 24 * 30) parts.push(`${(h / (24 * 30)).toFixed(1)} months`);
              if (h >= 24 * 365) parts.push(`${(h / (24 * 365)).toFixed(2)} years`);
              return parts.join(" / ") || undefined;
            })()}
            icon={Clock}
            color="amber"
          />
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Countries"
            value={stats.unique_countries}
            sub={`${stats.unique_airports} airports`}
            icon={Globe}
            color="purple"
          />
          <StatCard
            label="Airlines"
            value={stats.unique_airlines}
            icon={Building2}
            color="rose"
          />
          <StatCard
            label="Aircraft Types"
            value={stats.unique_aircraft_types}
            icon={Plane}
            color="brand"
          />
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
      )}

      {/* Recent flights */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-200">Recent Flights</h2>
          <Link to="/flights" className="text-sm text-brand-400 hover:text-brand-300">
            View all →
          </Link>
        </div>
        {recentFlights.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Plane className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No flights logged yet.</p>
            <Link to="/flights/new" className="btn-primary inline-flex mt-4 text-sm">
              Add your first flight
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentFlights.map((f) => (
              <Link
                key={f.id}
                to={`/flights/${f.id}/edit`}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Plane className="w-5 h-5 text-brand-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-100">
                    {f.departure_iata} → {f.arrival_iata}
                    <span className="text-slate-500 font-normal text-sm ml-2 hidden sm:inline">
                      {f.departure_airport?.city || ""}{f.departure_airport?.city && f.arrival_airport?.city ? " → " : ""}{f.arrival_airport?.city || ""}
                    </span>
                  </p>
                  <p className="text-sm text-slate-400">
                    {f.airline?.name || f.airline_iata || "—"} ·{" "}
                    {format(new Date(f.date), "d MMM yyyy")}
                  </p>
                </div>
                <div className="text-right text-sm text-slate-400">
                  {f.distance_km ? `${formatNumber(kmToMiles(f.distance_km))} mi` : ""}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Year breakdown - line chart */}
      {stats && stats.by_year.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-slate-200 mb-4">Flights by Year</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={stats.by_year.map((y) => ({ year: String(y.year), flights: y.flights }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="year" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis stroke="#64748b" tick={{ fill: "#94a3b8" }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 8 }}
                labelStyle={{ color: "#f1f5f9" }}
                itemStyle={{ color: "#94a3b8" }}
              />
              <Line type="monotone" dataKey="flights" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
