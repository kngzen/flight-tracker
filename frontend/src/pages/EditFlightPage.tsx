import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api, updateFlight } from "../lib/api";
import { Flight, FlightCreate } from "../types";
import FlightForm from "../components/FlightForm";
import toast from "react-hot-toast";

export default function EditFlightPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: flight, isLoading } = useQuery<Flight>({
    queryKey: ["flight", id],
    queryFn: async () => {
      const res = await api.get(`/flights/${id}`);
      return res.data;
    },
  });

  const mutation = useMutation({
    mutationFn: (data: FlightCreate) => updateFlight(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flights"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["flight", id] });
      toast.success("Flight updated!");
      navigate("/flights");
    },
    onError: () => toast.error("Failed to update flight"),
  });

  if (isLoading) {
    return (
      <div className="p-8 text-slate-400">Loading...</div>
    );
  }

  if (!flight) {
    return (
      <div className="p-8 text-slate-400">Flight not found.</div>
    );
  }

  const defaultValues: Partial<FlightCreate> = {
    departure_iata: flight.departure_iata,
    arrival_iata: flight.arrival_iata,
    date: flight.date,
    airline_iata: flight.airline_iata || undefined,
    flight_number: flight.flight_number || undefined,
    aircraft_type: flight.aircraft_type || undefined,
    aircraft_registration: flight.aircraft_registration || undefined,
    seat_class: flight.seat_class || undefined,
    seat_number: flight.seat_number || undefined,
    seat_position: flight.seat_position || undefined,
    duration_minutes: flight.duration_minutes || undefined,
    trip_reason: flight.trip_reason || undefined,
    notes: flight.notes || undefined,
  };

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <Link to="/flights" className="flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to flights
        </Link>
        <h1 className="text-2xl font-bold text-white">Edit Flight</h1>
        <p className="text-slate-400 mt-1">
          {flight.departure_iata} → {flight.arrival_iata} · {flight.date}
        </p>
      </div>

      <FlightForm
        defaultValues={defaultValues}
        onSubmit={(data) => mutation.mutate(data)}
        isLoading={mutation.isPending}
        submitLabel="Save Changes"
      />
    </div>
  );
}
