import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { createFlight } from "../lib/api";
import { FlightCreate } from "../types";
import FlightForm from "../components/FlightForm";
import toast from "react-hot-toast";

export default function AddFlightPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createFlight,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flights"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast.success("Flight added!");
      navigate("/flights");
    },
    onError: () => toast.error("Failed to add flight"),
  });

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <div className="mb-6">
        <Link to="/flights" className="flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to flights
        </Link>
        <h1 className="text-2xl font-bold text-white">Add Flight</h1>
      </div>

      <FlightForm
        onSubmit={(data: FlightCreate) => mutation.mutate(data)}
        isLoading={mutation.isPending}
        submitLabel="Add Flight"
      />
    </div>
  );
}
