import { useForm, Controller } from "react-hook-form";
import { FlightCreate } from "../types";
import AirportSelect from "./AirportSelect";
import AirlineSelect from "./AirlineSelect";

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

export default function FlightForm({ defaultValues, onSubmit, isLoading, submitLabel = "Save Flight" }: Props) {
  const { register, handleSubmit, control, formState: { errors } } = useForm<FlightCreate>({
    defaultValues: defaultValues || {},
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Route */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-slate-200">Route</h3>
        <div className="grid grid-cols-2 gap-4">
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
        <div className="grid grid-cols-2 gap-4">
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
        </div>
      </div>

      {/* Flight Details */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-slate-200">Flight Details</h3>
        <div className="grid grid-cols-2 gap-4">
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
          <div>
            <label className="label">Flight Number</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. AA100"
              {...register("flight_number")}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Aircraft Type</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Boeing 737, A320"
              {...register("aircraft_type")}
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
          <label className="label">Duration (minutes)</label>
          <input
            type="number"
            className="input"
            placeholder="e.g. 480"
            {...register("duration_minutes", { valueAsNumber: true })}
          />
        </div>
      </div>

      {/* Seat */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-slate-200">Seat</h3>
        <div className="grid grid-cols-3 gap-4">
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
