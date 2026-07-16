import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { adminAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  Search, Users, HardDrive,
  Receipt, ShieldCheck, ShieldOff,
  RefreshCw, Activity, Trash2
} from "lucide-react";

function RoleBadge({ role }) {
  return role === "admin" ? (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold
                     bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
      <ShieldCheck size={10} />
      ADMIN
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold
                     bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
      USER
    </span>
  );
}

function UserRow({ user, onToggleRole, toggling, onDelete, deleting }) {
  const initials = user.username.slice(0, 2).toUpperCase();
  const pct      = Math.min(
    100,
    Math.round((user.stats.storage_mb / 50) * 100)   // 50 MB 
  );
  const barColor = pct >= 90 ? "bg-red-500"
                 : pct >= 70 ? "bg-orange-400"
                 :             "bg-green-500";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3
                    px-4 sm:px-5 py-4 border-b border-gray-50
                    last:border-0 hover:bg-gray-50/50 transition-colors">

      {/* Avatar + name */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                         text-white text-sm font-bold shrink-0
                         ${user.role === "admin" ? "bg-amber-500" : "bg-brand-600"}`}>
          {initials}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-gray-700">
              {user.username}
            </span>
            <RoleBadge role={user.role} />
          </div>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{user.email}</p>
          <p className="text-[11px] text-gray-300 mt-0.5">
            Joined {new Date(user.created_at).toLocaleDateString("en-IN", {
              day: "numeric", month: "short", year: "numeric"
            })}
          </p>
        </div>
      </div>

      {/* Storage bar */}
      <div className="sm:w-44 shrink-0">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{user.stats.storage_mb} MB</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[10px] text-gray-400 mt-0.5">
          {user.stats.file_count} files
        </p>
      </div>

      {/* Quick stats */}
      <div className="hidden lg:flex items-center gap-4 shrink-0">
        <div className="text-center">
          <p className="text-sm font-bold text-gray-700">
            {user.stats.api_calls_month}
          </p>
          <p className="text-[10px] text-gray-400">API calls</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-gray-700">
            ₹{user.stats.total_billed.toFixed(2)}
          </p>
          <p className="text-[10px] text-gray-400">billed</p>
        </div>
      </div>

      {/* Role toggle button & Delete button */}
      <div className="shrink-0 flex items-center gap-2">
        <button
          onClick={() => onToggleRole(user)}
          disabled={toggling === user.id || deleting === user.id}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs
                      font-semibold transition-all border disabled:opacity-50
                      ${user.role === "admin"
                        ? "bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 border-gray-200 hover:border-red-200"
                        : "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200"
                      }`}>
          {toggling === user.id
            ? <div className="w-3.5 h-3.5 border-2 border-current/30
                              border-t-current rounded-full animate-spin" />
            : user.role === "admin"
            ? <ShieldOff size={13} />
            : <ShieldCheck size={13} />
          }
          {user.role === "admin" ? "Revoke Admin" : "Make Admin"}
        </button>

        <button
          onClick={() => onDelete(user)}
          disabled={deleting === user.id || user.role === "admin"}
          className={`flex items-center justify-center w-9 h-9 rounded-xl
                     border transition-all disabled:opacity-50
                     ${user.role === "admin" 
                       ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" 
                       : "text-red-500 bg-red-50 hover:bg-red-100 border-red-200"}`}
          title={user.role === "admin" ? "Cannot delete an admin" : "Delete User"}
        >
          {deleting === user.id ? (
            <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
          ) : (
            <Trash2 size={14} />
          )}
        </button>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const { isAdmin } = useAuth();
  const navigate    = useNavigate();

  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortBy,     setSortBy]     = useState("created_at");
  const [toggling,   setToggling]   = useState(null);
  const [deleting,   setDeleting]   = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!isAdmin) navigate("/dashboard");
  }, [isAdmin, navigate]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI.listUsers({
        search, role: roleFilter, sort: sortBy
      });
      setUsers(res.data.users || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, sortBy, refreshKey]);

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [loadUsers, isAdmin]);

  async function handleToggleRole(user) {
    const newRole = user.role === "admin" ? "user" : "admin";
    const confirm = window.confirm(
      `Change ${user.username}'s role to "${newRole}"?`
    );
    if (!confirm) return;

    setToggling(user.id);
    try {
      await adminAPI.updateRole(user.id, newRole);
      setRefreshKey(k => k + 1);
    } catch (e) {
      alert(e.response?.data?.error || "Failed to update role");
    } finally {
      setToggling(null);
    }
  }

  async function handleDeleteUser(user) {
    const confirm = window.confirm(
      `Are you sure you want to permanently delete the user "${user.username}" and all their associated files and invoices? This action cannot be undone.`
    );
    if (!confirm) return;

    setDeleting(user.id);
    try {
      await adminAPI.deleteUser(user.id);
      setRefreshKey(k => k + 1);
    } catch (e) {
      alert(e.response?.data?.error || "Failed to delete user");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Navbar />

      <main className="flex-1 min-w-0
                       pt-12 pb-20 px-4
                       md:pt-14 md:pb-6 md:px-6
                       lg:pt-0 lg:pb-8 lg:px-10
                       overflow-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center
                        sm:justify-between gap-3 mb-6 pt-4 lg:pt-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users size={20} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-gray-800">
                All Users
              </h1>
              <p className="text-gray-400 text-sm mt-0.5">
                {users.length} users
              </p>
            </div>
          </div>
          <button onClick={() => setRefreshKey(k => k + 1)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl
                       border-2 border-gray-200 text-gray-500
                       hover:border-brand-300 hover:text-brand-600
                       text-sm font-semibold transition-all self-start sm:self-auto">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 p-4 sm:p-5 border-b border-gray-50">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by username or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border-2
                           border-gray-200 bg-gray-50 focus:outline-none
                           focus:border-brand-500 focus:bg-white transition-all
                           placeholder:text-gray-400"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2 shrink-0 flex-wrap">
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="px-3 py-2 text-sm rounded-xl border-2 border-gray-200
                           bg-gray-50 text-gray-600 focus:outline-none
                           focus:border-brand-500 font-medium">
                <option value="all">All roles</option>
                <option value="user">Users only</option>
                <option value="admin">Admins only</option>
              </select>

              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="px-3 py-2 text-sm rounded-xl border-2 border-gray-200
                           bg-gray-50 text-gray-600 focus:outline-none
                           focus:border-brand-500 font-medium">
                <option value="created_at">Newest first</option>
                <option value="username">Name A–Z</option>
                <option value="files">Most files</option>
              </select>
            </div>
          </div>

          {/* User list */}
          {loading ? (
            <div className="p-5 space-y-4 animate-pulse">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-gray-100 rounded w-1/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                  </div>
                  <div className="w-32 h-6 bg-gray-100 rounded-xl" />
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-14">
              <Users size={32} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm font-medium">
                No users found
              </p>
            </div>
          ) : (
            <div>
              {users.map(user => (
                <UserRow
                  key={user.id}
                  user={user}
                  onToggleRole={handleToggleRole}
                  toggling={toggling}
                  onDelete={handleDeleteUser}
                  deleting={deleting}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}