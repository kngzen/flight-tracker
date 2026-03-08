import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  color?: string;
}

export default function StatCard({ label, value, sub, icon: Icon, color = "brand" }: StatCardProps) {
  const colorMap: Record<string, string> = {
    brand: "bg-brand-900/40 text-brand-400",
    green: "bg-green-900/40 text-green-400",
    amber: "bg-amber-900/40 text-amber-400",
    purple: "bg-purple-900/40 text-purple-400",
    rose: "bg-rose-900/40 text-rose-400",
  };

  return (
    <div className="card flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colorMap[color] || colorMap.brand}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm text-slate-400">{label}</p>
        <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
