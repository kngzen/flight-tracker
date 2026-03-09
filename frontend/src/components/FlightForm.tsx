import { useState, useEffect, useRef, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { FlightCreate } from "../types";
import AirportSelect from "./AirportSelect";
import AirlineSelect from "./AirlineSelect";
import { api } from "../lib/api";
import { format } from "date-fns";

function minutesToHHMM(mins: number | undefined | null): string {
  if (!mins) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function hhmmToMinutes(s: string): number | undefined {
  if (!s) return undefined;
  const parts = s.split(":");
  if (parts.length !== 2) return undefined;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return undefined;
  return h * 60 + m;
}

interface Props {
  defaultValues?: Partial<FlightCreate>;
  onSubmit: (data: FlightCreate) => void;
  isLoading?: boolean;
  submitLabel?: string;
}

const SEAT_CLASSES = [
  { value: "economy", label: "Economy" },
  { value: "premium_economy", label: "Premium Economy" },
  { value: "business", label: "Business" },
  { value: "first", label: "First" },
];

const SEAT_POSITIONS = [
  { value: "window", label: "Window" },
  { value: "middle", label: "Middle" },
  { value: "aisle", label: "Aisle" },
];

const TRIP_REASONS = [
  { value: "leisure", label: "Leisure" },
  { value: "business", label: "Business" },
];

function AircraftTypeInput({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  const [query, setQuery] = useState(value || "");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSuggestions = (q: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    timeoutRef.current = setTimeout(async () => {
      try {
        const res = await api.get("/flights/aircraft-types/suggest", { params: { q } });
        setSuggestions(res.data);
        setShowSuggestions(res.data.length > 0);
      } catch {
        setSuggestions([]);
      }
    }, 200);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        className="input"
        placeholder="e.g. A320, Boeing 737"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
          fetchSuggestions(e.target.value);
        }}
        onFocus={() => {
          if (suggestions.length > 0) setShowSuggestions(true);
        }}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 transition-colors"
              onClick={() => {
                setQuery(s);
                onChange(s);
                setShowSuggestions(false);
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FlightForm({ defaultValues, onSubmit, isLoading, submitLabel = "Save Flight" }: Props) {
  const today = format(new Date(), "yyyy-MM-dd");
  const { register, handleSubmit, control, formState: { errors }, watch, setValue } = useForm<FlightCreate>({
    defaultValues: { date: today, ...defaultValues },
  });

  const [durationHHMM, setDurationHHMM] = useState(minutesToHHMM(defaultValues?.duration_minutes));
  const [estimating, setEstimating] = useState(false);
  const [airlineAutoFilled, setAirlineAutoFilled] = useState(false);

  const depIata = watch("departure_iata");
  const arrIata = watch("arrival_iata");
  const flightNumber = watch("flight_number");

  const estimateDuration = useCallback(async (dep: string, arr: string) => {
    if (!dep || !arr || dep.length < 2 || arr.length < 2) return;
    setEstimating(true);
    try {
      const res = await api.get("/flights/estimate-duration", { params: { departure_iata: dep, arrival_iata: arr } });
      if (res.data.duration_minutes) {
        const mins = res.data.duration_minutes;
        setDurationHHMM(minutesToHHMM(mins));
        setValue("duration_minutes", mins);
      }
    } catch { /* ignore */ }
    setEstimating(false);
  }, [setValue]);

  // Auto-estimate when both airports are set and duration is empty
  useEffect(() => {
    if (depIata && arrIata && !durationHHMM) {
      estimateDuration(depIata, arrIata);
    }
  }, [depIata, arrIata]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-fill airline from flight number prefix (e.g. "UA1234" -> "UA")
  useEffect(() => {
    if (!flightNumber || flightNumber.length < 3) return;
    const match = flightNumber.toUpperCase().match(/^([A-Z\d]{2})\d/);
    if (match && !match[1].match(/^\d{2}$/)) {
      const prefix = match[1];
      const currentAirline = watch("airline_iata");
      if (!currentAirline || airlineAutoFilled) {
        setValue("airline_iata", prefix);
        setAirlineAutoFilled(true);
      }
    }
  }, [flightNumber]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFormSubmit = (data: FlightCreate) => {
    // Convert HH:MM duration to minutes before submitting
    const mins = hhmmToMinutes(durationHHMM);
    // Clean up empty strings to undefined so they become null on the backend
    const cleaned = Object.fromEntries(
      Object.entries({ ...data, duration_minutes: mins }).map(([k, v]) => [k, v === "" ? undefined : v])
    ) as unknown as FlightCreate;
    onSubmit(cleaned);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Route */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-slate-200">Route</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Departure Airport *</label>
            <Controller
              name="departure_iata"
              control={control}
              rules={{ required: "Required" }}
              render={({ field }) => (
                <AirportSelect
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="e.g. JFK, London..."
                />
              )}
            />
            {errors.departure_iata && (
              <p className="text-red-400 text-xs mt-1">{errors.departure_iata.message}</p>
            )}
          </div>
          <div>
            <label className="label">Arrival Airport *</label>
            <Controller
              name="arrival_iata"
              control={control}
              rules={{ required: "Required" }}
              render={({ field }) => (
                <AirportSelect
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="e.g. LHR, Paris..."
                />
              )}
            />
            {errors.arrival_iata && (
              <p className="text-red-400 text-xs mt-1">{errors.arrival_iata.message}</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Date *</label>
            <input
              type="date"
              className="input"
              {...register("date", { required: "Required" })}
            />
            {errors.date && (
              <p className="text-red-400 text-xs mt-1">{errors.date.message}</p>
            )}
          </div>
          <div>
            <label className="label">Departure Time</label>
            <input
              type="text"
              className="input"
              placeholder="HH:MM (24h)"
              maxLength={5}
              {...register("departure_time", {
                pattern: { value: /^([01]\d|2[0-3]):[0-5]\d$/, message: "Use HH:MM format" },
              })}
              onBlur={(e) => {
                // Auto-format: "930" → "09:30", "14" → "14:00"
                let v = e.target.value.trim();
                if (/^\d{3,4}$/.test(v)) {
                  v = v.padStart(4, "0");
                  e.target.value = `${v.slice(0, 2)}:${v.slice(2)}`;
                  register("departure_time").onChange(e);
                }
              }}
            />
            {errors.departure_time && (
              <p className="text-red-400 text-xs mt-1">{errors.departure_time.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Flight Details */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-slate-200">Flight Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Flight Number</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. AA100"
              {...register("flight_number")}
            />
          </div>
          <div>
            <label className="label">Airline</label>
            <Controller
              name="airline_iata"
              control={control}
              render={({ field }) => (
                <AirlineSelect
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="e.g. AA, BA, United..."
                />
              )}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Aircraft Type</label>
            <Controller
              name="aircraft_type"
              control={control}
              render={({ field }) => (
                <AircraftTypeInput value={field.value} onChange={field.onChange} />
              )}
            />
          </div>
          <div>
            <label className="label">Registration</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. N12345"
              {...register("aircraft_registration")}
            />
          </div>
        </div>
        <div>
          <label className="label">Duration (HH:MM){estimating && <span className="text-brand-400 text-xs ml-2">estimating...</span>}</label>
          <input
            type="text"
            className="input"
            placeholder="HH:MM"
            maxLength={5}
            value={durationHHMM}
            onChange={(e) => {
              setDurationHHMM(e.target.value);
              setValue("duration_minutes", hhmmToMinutes(e.target.value));
            }}
            onBlur={(e) => {
              let v = e.target.value.trim();
              if (/^\d{3,4}$/.test(v)) {
                v = v.padStart(4, "0");
                const formatted = `${v.slice(0, 2)}:${v.slice(2)}`;
                setDurationHHMM(formatted);
                setValue("duration_minutes", hhmmToMinutes(formatted));
              }
            }}
          />
        </div>
      </div>

      {/* Seat */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-slate-200">Seat</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Class</label>
            <select className="input" {...register("seat_class")}>
              <option value="">— Select —</option>
              {SEAT_CLASSES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Seat Number</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. 12A"
              {...register("seat_number")}
            />
          </div>
          <div>
            <label className="label">Position</label>
            <select className="input" {...register("seat_position")}>
              <option value="">— Select —</option>
              {SEAT_POSITIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Extra */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-slate-200">Extra</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Trip Reason</label>
            <select className="input" {...register("trip_reason")}>
              <option value="">— Select —</option>
              {TRIP_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Trip</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Summer 2024 Europe"
              {...register("trip")}
            />
          </div>
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea
            className="input min-h-[80px] resize-y"
            placeholder="Any notes about this flight..."
            {...register("notes")}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button type="submit" className="btn-primary" disabled={isLoading}>
          {isLoading ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
