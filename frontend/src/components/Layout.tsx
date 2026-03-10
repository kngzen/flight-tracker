import { useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { logout } from "../lib/auth";
import { fetchMe } from "../lib/api";
import {
  LayoutDashboard,
  List,
  Map,
  BarChart3,
  Upload,
  LogOut,
  Plane,
  Plus,
  Menu,
  X,
  User,
} from "lucide-react";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/flights", label: "Flight Log", icon: List },
  { to: "/map", label: "World Map", icon: Map },
  { to: "/stats", label: "Statistics", icon: BarChart3 },
  { to: "/import", label: "Import", icon: Upload },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: user } = useQuery({ queryKey: ["me"], queryFn: fetchMe });

  const closeSidebar = () => setSidebarOpen(false);

  const sidebarContent = (
    <>
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
            onClick={closeSidebar}
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

      {/* Quick add & account */}
      <div className="p-4 border-t border-slate-800 space-y-2">
        <NavLink
          to="/flights/new"
          onClick={closeSidebar}
          className="flex items-center gap-2 btn-primary w-full justify-center text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Flight
        </NavLink>
        <NavLink
          to="/account"
          onClick={closeSidebar}
          className={({ isActive }) =>
            `flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-colors ${
              isActive
                ? "bg-brand-600 text-white"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
            }`
          }
        >
          <User className="w-4 h-4" />
          {user?.username || "Account"}
        </NavLink>
        <button
          onClick={() => { closeSidebar(); logout(); }}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-slate-900 border-r border-slate-800 flex-col flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 md:hidden" style={{ zIndex: 1100 }}>
          <div className="absolute inset-0 bg-black/60" onClick={closeSidebar} />
          <aside className="relative w-64 h-full bg-slate-900 border-r border-slate-800 flex flex-col" style={{ zIndex: 1101 }}>
            <button
              onClick={closeSidebar}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-slate-900 border-b border-slate-800">
          <button onClick={() => setSidebarOpen(true)} className="p-1 text-slate-400 hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-600 rounded-md flex items-center justify-center">
              <Plane className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-sm">FlightTracker</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
