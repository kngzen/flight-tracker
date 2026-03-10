import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Plane, AlertTriangle, Filter, X } from "lucide-react";
import Select from "react-select";
import { fetchFlights, deleteFlight, deleteAllFlights } from "../lib/api";
import { Flight } from "../types";
import { format } from "date-fns";
import { formatDuration, formatDistance, seatClassLabel, seatClassBadge } from "../lib/utils";
import toast from "react-hot-toast";

type SortKey = "date" | "departure_iata" | "arrival_iata" | "flight_number" | "airline_iata" | "aircraft_type" | "aircraft_registration" | "seat_class" | "seat_number" | "distance_km" | "duration_minutes" | "trip_reason" | "trip";
type SelectOption = { value: string; label: string };

const selectStyles = {
  control: (base: object) => ({ ...base, backgroundColor: "#1e293b", borderColor: "#334155", minHeight: 36, fontSize: 13 }),
  menu: (base: object) => ({ ...base, backgroundColor: "#1e293b", border: "1px solid #334155", zIndex: 20 }),
  option: (base: object, state: { isFocused: boolean; isSelected: boolean }) => ({
    ...base,
    backgroundColor: state.isSelected ? "#2563eb" : state.isFocused ? "#334155" : "transparent",
    color: "#f1f5f9",
    fontSize: 13,
  }),
  multiValue: (base: object) => ({ ...base, backgroundColor: "#334155" }),
  multiValueLabel: (base: object) => ({ ...base, color: "#e2e8f0", fontSize: 12 }),
  multiValueRemove: (base: object) => ({ ...base, color: "#94a3b8", ":hover": { backgroundColor: "#475569", color: "#f1f5f9" } }),
  input: (base: object) => ({ ...base, color: "#f1f5f9" }),
  placeholder: (base: object) => ({ ...base, color: "#64748b", fontSize: 13 }),
  indicatorSeparator: (base: object) => ({ ...base, backgroundColor: "#334155" }),
  dropdownIndicator: (base: object) => ({ ...base, color: "#64748b", padding: "4px" }),
  clearIndicator: (base: object) => ({ ...base, color: "#64748b", padding: "4px" }),
};

export default function FlightLogPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [year, setYear] = useState<number | undefined>();
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Filter state
  const [filterAirlines, setFilterAirlines] = useState<SelectOption[]>([]);
  const [filterFrom, setFilterFrom] = useState<SelectOption[]>([]);
  const [filterTo, setFilterTo] = useState<SelectOption[]>([]);
  const [filterAircraft, setFilterAircraft] = useState<SelectOption[]>([]);
  const [filterAircraftIcao, setFilterAircraftIcao] = useState<SelectOption[]>([]);

  const { data: flights = [], isLoading } = useQuery<Flight[]>({
    queryKey: ["flights", year],
    queryFn: () => fetchFlights(year),
  });

  // Read URL search params on mount and when flights load
  useEffect(() => {
    const airline = searchParams.get("airline");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const aircraft = searchParams.get("aircraft");
    let hasFilter = false;

    if (airline && flights.length > 0) {
      const vals = airline.split(",");
      const opts = vals.map((v) => {
        const f = flights.find((fl) => fl.airline_iata === v || fl.airline?.name === v);
        return { value: v, label: f?.airline?.name || v };
      });
      setFilterAirlines(opts);
      hasFilter = true;
    }
    if (from) {
      setFilterFrom(from.split(",").map((v) => ({ value: v, label: v })));
      hasFilter = true;
    }
    if (to) {
      setFilterTo(to.split(",").map((v) => ({ value: v, label: v })));
      hasFilter = true;
    }
    if (aircraft) {
      setFilterAircraft(aircraft.split(",").map((v) => ({ value: v, label: v })));
      hasFilter = true;
    }
    const aircraftIcao = searchParams.get("aircraft_icao");
    if (aircraftIcao) {
      setFilterAircraftIcao(aircraftIcao.split(",").map((v) => ({ value: v, label: v })));
      hasFilter = true;
    }
    if (hasFilter) {
      setShowFilters(true);
      // Clear URL params after applying
      setSearchParams({}, { replace: true });
    }
  }, [flights.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const deleteAllMutation = useMutation({
    mutationFn: deleteAllFlights,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["flights"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast.success(`Deleted ${data.deleted} flights`);
      setShowDeleteAll(false);
      setDeleteConfirm("");
    },
    onError: () => toast.error("Failed to delete flights"),
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  // Build filter options from flights data
  const airlineOptions = useMemo(() => {
    const map = new Map<string, string>();
    flights.forEach((f) => {
      if (f.airline_iata) map.set(f.airline_iata, f.airline?.name || f.airline_iata);
    });
    return Array.from(map.entries())
      .map(([v, l]) => ({ value: v, label: l }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [flights]);

  const fromOptions = useMemo(() => {
    const set = new Set(flights.map((f) => f.departure_iata));
    return Array.from(set).sort().map((v) => ({ value: v, label: v }));
  }, [flights]);

  const toOptions = useMemo(() => {
    const set = new Set(flights.map((f) => f.arrival_iata));
    return Array.from(set).sort().map((v) => ({ value: v, label: v }));
  }, [flights]);

  const aircraftOptions = useMemo(() => {
    const set = new Set<string>();
    flights.forEach((f) => { if (f.aircraft_type) set.add(f.aircraft_type); });
    return Array.from(set).sort().map((v) => ({ value: v, label: v }));
  }, [flights]);

  const aircraftIcaoOptions = useMemo(() => {
    const set = new Set<string>();
    flights.forEach((f) => { if (f.aircraft_type_icao) set.add(f.aircraft_type_icao); });
    return Array.from(set).sort().map((v) => ({ value: v, label: v }));
  }, [flights]);

  // Apply filters
  const filtered = useMemo(() => {
    let result = flights;
    if (filterAirlines.length > 0) {
      const vals = new Set(filterAirlines.map((o) => o.value));
      result = result.filter((f) => f.airline_iata && vals.has(f.airline_iata));
    }
    if (filterFrom.length > 0) {
      const vals = new Set(filterFrom.map((o) => o.value));
      result = result.filter((f) => vals.has(f.departure_iata));
    }
    if (filterTo.length > 0) {
      const vals = new Set(filterTo.map((o) => o.value));
      result = result.filter((f) => vals.has(f.arrival_iata));
    }
    if (filterAircraft.length > 0) {
      const vals = new Set(filterAircraft.map((o) => o.value));
      result = result.filter((f) => f.aircraft_type && vals.has(f.aircraft_type));
    }
    if (filterAircraftIcao.length > 0) {
      const vals = new Set(filterAircraftIcao.map((o) => o.value));
      result = result.filter((f) => f.aircraft_type_icao && vals.has(f.aircraft_type_icao));
    }
    return result;
  }, [flights, filterAirlines, filterFrom, filterTo, filterAircraft, filterAircraftIcao]);

  const sorted = [...filtered].sort((a, b) => {
    let aVal: string | number | null;
    let bVal: string | number | null;
    if (sortKey === "airline_iata") {
      aVal = a.airline?.name ?? a.airline_iata ?? "";
      bVal = b.airline?.name ?? b.airline_iata ?? "";
    } else {
      aVal = a[sortKey] ?? "";
      bVal = b[sortKey] ?? "";
    }
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  });

  const years = Array.from(new Set(flights.map((f) => new Date(f.date).getFullYear()))).sort((a, b) => b - a);
  const activeFilterCount = filterAirlines.length + filterFrom.length + filterTo.length + filterAircraft.length + filterAircraftIcao.length;

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col ? (
      sortDir === "asc" ? <ChevronUp className="w-3 h-3 flex-shrink-0" /> : <ChevronDown className="w-3 h-3 flex-shrink-0" />
    ) : null;

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Flight Log</h1>
          <p className="text-slate-400 mt-1">
            {activeFilterCount > 0 ? `${filtered.length} of ${flights.length}` : flights.length} flights{year ? ` in ${year}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
              activeFilterCount > 0
                ? "bg-brand-600/20 border-brand-500 text-brand-300"
                : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
            }`}
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="bg-brand-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
          <select
            className="input w-auto"
            value={year || ""}
            onChange={(e) => setYear(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">All years</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          {flights.length > 0 && (
            <button
              type="button"
              onClick={() => setShowDeleteAll(true)}
              className="btn-danger flex items-center gap-2 text-sm"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Delete All</span>
            </button>
          )}
          <Link to="/flights/new" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Flight</span>
          </Link>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-300">Filters</h3>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => { setFilterAirlines([]); setFilterFrom([]); setFilterTo([]); setFilterAircraft([]); setFilterAircraftIcao([]); }}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
            <div>
              <label className="label text-xs">Airline</label>
              <Select
                isMulti
                options={airlineOptions}
                value={filterAirlines}
                onChange={(v) => setFilterAirlines([...v])}
                placeholder="All airlines"
                styles={selectStyles}
                menuPortalTarget={document.body}
              />
            </div>
            <div>
              <label className="label text-xs">From</label>
              <Select
                isMulti
                options={fromOptions}
                value={filterFrom}
                onChange={(v) => setFilterFrom([...v])}
                placeholder="All origins"
                styles={selectStyles}
                menuPortalTarget={document.body}
              />
            </div>
            <div>
              <label className="label text-xs">To</label>
              <Select
                isMulti
                options={toOptions}
                value={filterTo}
                onChange={(v) => setFilterTo([...v])}
                placeholder="All destinations"
                styles={selectStyles}
                menuPortalTarget={document.body}
              />
            </div>
            <div>
              <label className="label text-xs">Aircraft Type</label>
              <Select
                isMulti
                options={aircraftOptions}
                value={filterAircraft}
                onChange={(v) => setFilterAircraft([...v])}
                placeholder="All types"
                styles={selectStyles}
                menuPortalTarget={document.body}
              />
            </div>
            <div>
              <label className="label text-xs">Aircraft ICAO</label>
              <Select
                isMulti
                options={aircraftIcaoOptions}
                value={filterAircraftIcao}
                onChange={(v) => setFilterAircraftIcao([...v])}
                placeholder="All ICAO"
                styles={selectStyles}
                menuPortalTarget={document.body}
              />
            </div>
          </div>
        </div>
      )}

      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : sorted.length === 0 ? (
          <div className="card text-center py-8 text-slate-500">
            <Plane className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No flights found.</p>
          </div>
        ) : (
          sorted.map((f) => (
            <div key={f.id} className="card p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{f.departure_iata}</span>
                    <span className="text-slate-500">→</span>
                    <span className="font-semibold text-white">{f.arrival_iata}</span>
                    {f.seat_class && (
                      <span className={`${seatClassBadge(f.seat_class)} text-[10px]`}>
                        {seatClassLabel(f.seat_class)}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {f.departure_airport?.city || ""}{f.departure_airport?.city && f.arrival_airport?.city ? " → " : ""}{f.arrival_airport?.city || ""}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Link
                    to={`/flights/${f.id}/edit`}
                    className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    onClick={() => setDeleteId(f.id)}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                <span>{format(new Date(f.date), "d MMM yyyy")}</span>
                {f.airline?.name && <span>{f.airline.name}</span>}
                {f.flight_number && <span className="font-mono">{f.flight_number}</span>}
                {f.distance_km && <span>{formatDistance(f.distance_km)}</span>}
                {f.duration_minutes && <span>{formatDuration(f.duration_minutes)}</span>}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block card p-0">
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
                  {([
                    { key: "date", label: "Date", align: "left" },
                    { key: "departure_iata", label: "From", align: "left" },
                    { key: "arrival_iata", label: "To", align: "left" },
                    { key: "flight_number", label: "Flight", align: "left" },
                    { key: "airline_iata", label: "Airline", align: "left" },
                    { key: "aircraft_type", label: "Aircraft", align: "left" },
                    { key: "aircraft_registration", label: "Reg", align: "left" },
                    { key: "seat_class", label: "Class", align: "left" },
                    { key: "seat_number", label: "Seat", align: "left" },
                    { key: "distance_km", label: "Distance", align: "right" },
                    { key: "duration_minutes", label: "Duration", align: "right" },
                    { key: "trip_reason", label: "Reason", align: "left" },
                    { key: "trip", label: "Trip", align: "left" },
                  ] as { key: SortKey; label: string; align: "left" | "right" }[]).map(({ key, label, align }) => (
                    <th
                      key={key}
                      className={`${align === "right" ? "text-right" : "text-left"} px-4 py-3 cursor-pointer hover:text-slate-200 select-none whitespace-nowrap`}
                      onClick={() => handleSort(key)}
                    >
                      <span className={`flex items-center gap-1 ${align === "right" ? "justify-end" : ""}`}>
                        {label} <SortIcon col={key} />
                      </span>
                    </th>
                  ))}
                  <th className="px-2 py-3 sticky right-0 bg-slate-900/95 backdrop-blur-sm"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {sorted.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                      <div>{format(new Date(f.date), "d MMM yyyy")}</div>
                      {f.departure_time && <div className="text-xs text-slate-500">{f.departure_time}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{f.departure_iata}</div>
                      <div className="text-xs text-slate-500">{f.departure_airport?.city}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{f.arrival_iata}</div>
                      <div className="text-xs text-slate-500">{f.arrival_airport?.city}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-300 font-mono text-xs">
                      {f.flight_number || "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                      {f.airline?.name || f.airline_iata || "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                      {f.aircraft_type || "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                      {f.aircraft_registration || "\u2014"}
                    </td>
                    <td className="px-4 py-3">
                      {f.seat_class ? (
                        <span className={seatClassBadge(f.seat_class)}>
                          {seatClassLabel(f.seat_class)}
                        </span>
                      ) : (
                        <span className="text-slate-500">{"\u2014"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {f.seat_number ? (
                        <span>
                          {f.seat_number}
                          {f.seat_position ? ` (${f.seat_position})` : ""}
                        </span>
                      ) : (
                        <span className="text-slate-500">{"\u2014"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300 whitespace-nowrap">
                      {formatDistance(f.distance_km)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400 whitespace-nowrap">
                      {formatDuration(f.duration_minutes)}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs capitalize">
                      {f.trip_reason || "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {f.trip || "\u2014"}
                    </td>
                    <td className="px-2 py-3 sticky right-0 bg-slate-900/95 backdrop-blur-sm">
                      <div className="flex items-center gap-0.5">
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

      {/* Delete all confirmation */}
      {showDeleteAll && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="card max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
              <h3 className="font-semibold text-white">Delete All Flights?</h3>
            </div>
            <p className="text-slate-400 text-sm">
              This will permanently delete all {flights.length} flights. This action cannot be undone.
            </p>
            <div>
              <label className="label text-xs">Type <span className="text-red-400 font-mono">delete</span> to confirm</label>
              <input
                type="text"
                className="input"
                placeholder="delete"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button className="btn-secondary" onClick={() => { setShowDeleteAll(false); setDeleteConfirm(""); }}>Cancel</button>
              <button
                className="btn-danger"
                onClick={() => deleteAllMutation.mutate(deleteConfirm)}
                disabled={deleteConfirm !== "delete" || deleteAllMutation.isPending}
              >
                {deleteAllMutation.isPending ? "Deleting..." : "Delete All Flights"}
              </button>
            </div>
          </div>
        </div>
      )}

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
