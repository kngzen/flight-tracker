export function formatDuration(minutes: number | null): string {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

export function formatDistance(km: number | null): string {
  if (!km) return "—";
  return `${km.toLocaleString()} km`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString();
}

export function seatClassLabel(cls: string | null): string {
  const map: Record<string, string> = {
    economy: "Economy",
    premium_economy: "Premium Economy",
    business: "Business",
    first: "First",
  };
  return cls ? (map[cls] || cls) : "—";
}

export function seatClassBadge(cls: string | null): string {
  const map: Record<string, string> = {
    economy: "badge-economy",
    premium_economy: "badge-premium_economy",
    business: "badge-business",
    first: "badge-first",
  };
  return cls ? (map[cls] || "badge bg-slate-700 text-slate-200") : "";
}
