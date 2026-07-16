import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  FolderOpen,
  BarChart2,
  Receipt,
  LogOut,
  Zap,
  ChevronRight,
  ShieldCheck,
  Users,
  Menu,
  X
} from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const initials = user?.username?.slice(0, 2).toUpperCase() || "??";

  const NAV = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/files", icon: FolderOpen, label: "My Files" },
    { to: "/usage", icon: BarChart2, label: "Usage" },
    { to: "/billing", icon: Receipt, label: "Billing" },
    ...(isAdmin
      ? [
          { to: "/admin", icon: ShieldCheck, label: "Admin Home", special: true },
          { to: "/admin/users", icon: Users, label: "Manage Users", special: true },
          { to: "/admin/invoices", icon: Receipt, label: "All Invoices", special: true },
          { to: "/admin/tasks",    icon: Zap,         label: "Tasks",        special: true },
        ]
      : [])
  ];

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex w-56 bg-brand-900 flex-col min-h-screen sticky top-0 shrink-0">
        {/* Logo */}
        <div className="px-5 py-6 border-b border-white/10">
          <div className="flex items-center gap-3.5">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Zap size={17} className="text-white" />
            </div>
            <div>
              <div className="text-white font-extrabold text-lg leading-none">
                BillFlow
              </div>
              <div className="text-blue-400 text-[10px] font-medium mt-0.5">
                Billing Engine
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="px-5 pt-5 pb-2">
          <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
            Navigation
          </span>
        </div>

        <nav className="flex-1 px-3 pb-4 space-y-2">
          {NAV.map(({ to, icon: Icon, label, special }) => (
            <NavLink key={to} to={to} end>
              {({ isActive }) => (
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group
                  ${
                    special && !isActive
                      ? "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                      : isActive
                      ? "bg-brand-600 text-white shadow-lg shadow-brand-600/30"
                      : "text-white/60 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Icon
                    size={17}
                    className={
                      special && !isActive
                        ? "text-amber-400"
                        : isActive
                        ? "text-white"
                        : "text-white/50 group-hover:text-white/80"
                    }
                  />
                  <span className="flex-1">{label}</span>
                  {isActive && (
                    <ChevronRight size={14} className="text-white/60" />
                  )}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Section */}
        <div className="px-3 pb-5 pt-3 border-t border-white/10 space-y-2">
          <div className="flex items-center gap-3 px-2 py-2">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                isAdmin ? "bg-amber-500" : "bg-brand-600"
              }`}
            >
              {initials}
            </div>
            <div>
              <div className="text-white text-sm font-semibold">
                {user?.username}
              </div>
              <div
                className={`text-[11px] ${
                  isAdmin ? "text-amber-400" : "text-blue-400"
                }`}
              >
                {isAdmin ? "Administrator" : "Free account"}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 text-sm font-semibold transition-all duration-150"
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* MOBILE TOP BAR */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-brand-900 border-b border-white/10 h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
            <Zap size={15} className="text-white" />
          </div>
          <span className="text-white font-extrabold text-base">
            BillFlow
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${
              isAdmin ? "bg-amber-500" : "bg-brand-600"
            }`}
          >
            {initials}
          </div>

          <button
            onClick={() => setMobileMenuOpen(true)}
            className="text-white/80"
          >
            <Menu size={22} />
          </button>
        </div>
      </div>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Drawer */}
          <div className="relative w-72 bg-white h-full shadow-xl p-5 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold text-gray-800">Menu</h2>
              <button onClick={() => setMobileMenuOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2">
              {NAV.map(({ to, icon: Icon, label, special }) => (
                <NavLink
                  key={to}
                  to={to}
                  end
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {({ isActive }) => (
                    <div
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all
                      ${
                        isActive
                          ? "bg-brand-100 text-brand-600"
                          : special
                          ? "text-amber-600"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <Icon size={18} />
                      {label}
                    </div>
                  )}
                </NavLink>
              ))}
            </div>

            <button
              onClick={handleLogout}
              className="mt-8 w-full py-2 rounded-xl bg-red-500 text-white text-sm font-semibold"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </>
  );
}