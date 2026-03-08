import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Plane } from "lucide-react";
import { fetchFlights, deleteFlight } from "../lib/api";
import { Flight } from "../types";
import { format } from "date-fns";
import { formatDuration, formatDistance, seatClassLabel, seatClassBadge } from "../lib/utils";
import toast from "react-hot-toast";
import clsx from "clsx";

type SortKey = "date" | "departure_iata" | "arrival_iata" | "distance_km";

export default function FlightLogPage() {
  const queryClient = useQueryClient();
  const [year, setYear] = useState<number | undefined>();
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: flights = [], isLoading } = useQuery<Flight[]>({
    queryKey: ["flights", year],
    queryFn: () => fetchFlights(year),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFlight,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flights"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast.success("Flight deleted");
      setDeleteId(null);
    },
    onError: () => toast.error("Failed to delete flight"),
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = [...flights].sort((a, b) => {
    const aVal = a[sortKey] ?? "";
    const bVal = b[sortKey] ?? "";
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  });

  const years = Array.from(new Set(flights.map((f) => new Date(f.date).getFullYear()))).sort((a, b) => b - a);

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col ? (
      sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
    ) : null;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Flight Log</h1>
          <p className="text-slate-400 mt-1">{flights.length} flights{year ? ` in ${year}` : ""}</p>
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
          <Link to="/flights/new" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Flight
          </Link>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : sorted.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Plane className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No flights found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  {[
                    { key: "date" as SortKey, label: "Date" },
                    { key: "departure_iata" as SortKey, label: "From" },
                    { key: "arrival_iata" as SortKey, label: "To" },
                  ].map(({ key, label }) => (
                    <th
                      key={key}
                      className="text-left px-4 py-3 cursor-pointer hover:text-slate-200 select-none"
                      onClick={() => handleSort(key)}
                    >
                      <span className="flex items-center gap-1">
                        {label} <SortIcon col={key} />
                      </span>
                    </th>
                  ))}
                  <th className="text-left px-4 py-3">Airline</th>
                  <th className="text-left px-4 py-3">Aircraft</th>
                  <th className="text-left px-4 py-3">Class</th>
                  <th
                    className="text-right px-4 py-3 cursor-pointer hover:text-slate-200 select-none"
                    onClick={() => handleSort("distance_km")}
                  >
                    <span className="flex items-center justify-end gap-1">
                      Distance <SortIcon col="distance_km" />
                    </span>
                  </th>
                  <th className="text-right px-4 py-3">Duration</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {sorted.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                      {format(new Date(f.date), "d MMM yyyy")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{f.departure_iata}</div>
                      <div className="text-xs text-slate-500">{f.departure_airport?.city}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{f.arrival_iata}</div>
                      <div className="text-xs text-slate-500">{f.arrival_airport?.city}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {f.airline?.name || f.airline_iata || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {f.aircraft_type || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {f.seat_class ? (
                        <span className={seatClassBadge(f.seat_class)}>
                          {seatClassLabel(f.seat_class)}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300 whitespace-nowrap">
                      {formatDistance(f.distance_km)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400 whitespace-nowrap">
                      {formatDuration(f.duration_minutes)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/flights/${f.id}/edit`}
                          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => setDeleteId(f.id)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="card max-w-sm w-full mx-4 space-y-4">
            <h3 className="font-semibold text-white">Delete Flight?</h3>
            <p className="text-slate-400 text-sm">This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button className="btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
              <button
                className="btn-danger"
                onClick={() => deleteMutation.mutate(deleteId)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
