import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plane, Globe, Clock, Route, Building2, Milestone } from "lucide-react";
import { fetchStats, fetchFlights } from "../lib/api";
import { Stats, Flight } from "../types";
import StatCard from "../components/StatCard";
import { formatDuration, formatNumber } from "../lib/utils";
import { format } from "date-fns";

export default function DashboardPage() {
  const { data: stats } = useQuery<Stats>({ queryKey: ["stats"], queryFn: fetchStats });
  const { data: flights } = useQuery<Flight[]>({ queryKey: ["flights"], queryFn: () => fetchFlights() });

  const recentFlights = flights?.slice(0, 5) || [];

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1">Your flight history at a glance</p>
      </div>

      {/* Stat cards */}
      {stats && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Total Flights"
            value={formatNumber(stats.total_flights)}
            icon={Plane}
            color="brand"
          />
          <StatCard
            label="Total Distance"
            value={`${formatNumber(Math.round(stats.total_distance_km))} km`}
            sub={`${formatNumber(Math.round(stats.total_distance_miles))} miles`}
            icon={Route}
            color="green"
          />
          <StatCard
            label="Flight Time"
            value={formatDuration(stats.total_duration_minutes)}
            icon={Clock}
            color="amber"
          />
          <StatCard
            label="Countries Visited"
            value={stats.unique_countries}
            sub={`${stats.unique_airports} airports`}
            icon={Globe}
            color="purple"
          />
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Airlines Flown"
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
              value={`${formatNumber(Math.round(stats.longest_flight_km))} km`}
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
                    {f.departure_airport?.city || f.departure_iata} →{" "}
                    {f.arrival_airport?.city || f.arrival_iata}
                  </p>
                  <p className="text-sm text-slate-400">
                    {f.airline?.name || f.airline_iata || "—"} ·{" "}
                    {format(new Date(f.date), "d MMM yyyy")}
                  </p>
                </div>
                <div className="text-right text-sm text-slate-400">
                  {f.distance_km ? `${formatNumber(Math.round(f.distance_km))} km` : ""}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Year breakdown */}
      {stats && stats.by_year.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-slate-200 mb-4">Flights by Year</h2>
          <div className="space-y-2">
            {[...stats.by_year].reverse().map((y) => {
              const maxFlights = Math.max(...stats.by_year.map((s) => s.flights));
              const pct = Math.round((y.flights / maxFlights) * 100);
              return (
                <div key={y.year} className="flex items-center gap-3">
                  <span className="text-sm text-slate-400 w-12">{y.year}</span>
                  <div className="flex-1 bg-slate-800 rounded-full h-2">
                    <div
                      className="bg-brand-500 h-2 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm text-slate-300 w-20 text-right">
                    {y.flights} flights
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
