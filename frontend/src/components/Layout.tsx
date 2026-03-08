import { Outlet, NavLink, useLocation } from "react-router-dom";
import { logout } from "../lib/auth";
import {
  LayoutDashboard,
  List,
  Map,
  BarChart3,
  Upload,
  LogOut,
  Plane,
  Plus,
} from "lucide-react";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/flights", label: "Flight Log", icon: List },
  { to: "/map", label: "World Map", icon: Map },
  { to: "/stats", label: "Statistics", icon: BarChart3 },
  { to: "/import", label: "Import", icon: Upload },
];

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-600 rounded-lg flex items-center justify-center">
              <Plane className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white">FlightTracker</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {nav.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-600 text-white"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Quick add */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <NavLink
            to="/flights/new"
            className="flex items-center gap-2 btn-primary w-full justify-center text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Flight
          </NavLink>
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
