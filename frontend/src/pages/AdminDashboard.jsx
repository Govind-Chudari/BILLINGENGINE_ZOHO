import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { adminAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  Users, HardDrive, Receipt, Activity,
  TrendingUp, ShieldCheck, UserCheck,
  Clock, BarChart2
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line
} from "recharts";

function StatCard({ icon: Icon, label, value, sub, color, loading }) {
  const colors = {
    blue:   "border-blue-500   bg-blue-50   text-blue-600",
    green:  "border-green-500  bg-green-50  text-green-600",
    orange: "border-orange-500 bg-orange-50 text-orange-600",
    amber:  "border-amber-500  bg-amber-50  text-amber-600",
    purple: "border-purple-500 bg-purple-50 text-purple-600",
  };
  const [border, bg, iconColor] = colors[color].split(" ");

  return (
    <div className={`bg-white rounded-2xl p-5 border-l-4 shadow-sm
                     hover:shadow-md transition-shadow ${border}`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1 pr-3">
          <p className="text-[11px] font-bold text-gray-400 uppercase
                        tracking-wider mb-1.5">
            {label}
          </p>
          <p className="text-2xl sm:text-3xl font-extrabold text-gray-800">
            {loading
              ? <span className="text-gray-200 animate-pulse">—</span>
              : value
            }
          </p>
          {sub && !loading && (
            <p className="text-xs text-gray-400 mt-1">{sub}</p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center
                         justify-center shrink-0 ${bg}`}>
          <Icon size={19} className={iconColor} />
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { isAdmin }     = useAuth();
  const navigate        = useNavigate();
  const [overview,  setOverview]  = useState(null);
  const [stats,     setStats]     = useState(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (!isAdmin) navigate("/dashboard");
  }, [isAdmin, navigate]);

  useEffect(() => {
    async function load() {
      try {
        const [ovRes, stRes] = await Promise.all([
          adminAPI.overview(),
          adminAPI.platformStats()
        ]);
        setOverview(ovRes.data);
        setStats(stRes.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    if (isAdmin) load();
  }, [isAdmin]);

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Navbar />

      <main className="flex-1 min-w-0
                       pt-12 pb-20 px-4
                       md:pt-14 md:pb-6 md:px-6
                       lg:pt-0 lg:pb-8 lg:px-10
                       overflow-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6 pt-4 lg:pt-8">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center
                          justify-center shrink-0">
            <ShieldCheck size={20} className="text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-800">
              Admin Dashboard
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">
              Platform-wide overview and controls
            </p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-6">
          <StatCard
            icon={Users}      color="blue"
            label="Total Users"
            value={overview?.users.total ?? "—"}
            sub={`${overview?.users.new_this_month ?? 0} new this month`}
            loading={loading}
          />
          <StatCard
            icon={UserCheck}  color="green"
            label="Active Today"
            value={overview?.users.active_today ?? "—"}
            sub="users with activity today"
            loading={loading}
          />
          <StatCard
            icon={HardDrive}  color="orange"
            label="Total Storage"
            value={loading ? "—" : `${overview?.storage.total_mb ?? 0} MB`}
            sub={`${overview?.storage.total_files ?? 0} total files`}
            loading={loading}
          />
          <StatCard
            icon={Receipt}    color="amber"
            label="Total Revenue"
            value={loading ? "—" : `₹${overview?.billing.paid_revenue ?? 0}`}
            sub={`₹${overview?.billing.total_billed ?? 0} billed total`}
            loading={loading}
          />
        </div>

        {/* Second row stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {[
            {
              label: "Total Invoices",
              value: overview?.billing.total_invoices ?? "—",
              icon: "🧾"
            },
            {
              label: "Pending Invoices",
              value: overview?.billing.pending_invoices ?? "—",
              icon: "⏳"
            },
            {
              label: "Total Files",
              value: overview?.storage.total_files ?? "—",
              icon: "📁"
            },
            {
              label: "Admin Accounts",
              value: overview?.users.admins ?? "—",
              icon: "🛡️"
            },
          ].map(item => (
            <div key={item.label}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100
                         flex items-center gap-3">
              <span className="text-2xl">{item.icon}</span>
              <div>
                <p className="text-xl font-extrabold text-gray-800">
                  {loading
                    ? <span className="text-gray-200 animate-pulse">—</span>
                    : item.value
                  }
                </p>
                <p className="text-xs text-gray-400 font-medium">{item.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

          {/* Daily API calls chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-5">
              <Activity size={16} className="text-orange-500" />
              <h3 className="font-bold text-gray-800">Platform API Calls</h3>
              <span className="text-xs text-gray-400 ml-auto">Last 14 days</span>
            </div>
            {loading ? (
              <div className="h-44 bg-gray-50 rounded-xl animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={stats?.daily_history ?? []}
                  margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    tickLine={false} axisLine={false}
                    interval={1}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    tickLine={false} axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12, borderRadius: 12,
                      border: "1px solid #e2e8f0"
                    }}
                  />
                  <Bar dataKey="api_calls" fill="#f97316"
                       radius={[4,4,0,0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Active users chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp size={16} className="text-brand-600" />
              <h3 className="font-bold text-gray-800">Daily Active Users</h3>
              <span className="text-xs text-gray-400 ml-auto">Last 14 days</span>
            </div>
            {loading ? (
              <div className="h-44 bg-gray-50 rounded-xl animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart
                  data={stats?.daily_history ?? []}
                  margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    tickLine={false} axisLine={false}
                    interval={1}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    tickLine={false} axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12, borderRadius: 12,
                      border: "1px solid #e2e8f0"
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="active_users"
                    stroke="#1a56db"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top users by storage */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-5">
            <BarChart2 size={16} className="text-purple-600" />
            <h3 className="font-bold text-gray-800">Top Users by Storage</h3>
          </div>

          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-20 h-3 bg-gray-100 rounded" />
                  <div className="flex-1 h-5 bg-gray-100 rounded-full" />
                  <div className="w-12 h-3 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          ) : stats?.top_users_by_storage?.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              No storage data yet
            </p>
          ) : (
            <div className="space-y-3">
              {(stats?.top_users_by_storage ?? []).map((u, i) => {
                const maxMB = stats.top_users_by_storage[0]?.storage_mb || 1;
                const pct   = Math.round((u.storage_mb / maxMB) * 100);
                const colors = [
                  "bg-brand-500", "bg-green-500",
                  "bg-orange-400", "bg-purple-500", "bg-pink-500"
                ];
                return (
                  <div key={u.username} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center
                                    justify-center text-xs font-bold text-gray-500 shrink-0">
                      {i + 1}
                    </div>
                    <span className="text-sm font-semibold text-gray-700 w-24 truncate shrink-0">
                      {u.username}
                    </span>
                    <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700
                                    ${colors[i]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-500 w-16 text-right shrink-0">
                      {u.storage_mb} MB
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}