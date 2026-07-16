import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import AnomalyBanner from "../components/AnomalyBanner";
import { usageAPI, billingAPI, objectsAPI } from "../services/api";
import {
  HardDrive, FileText, Activity,
  Receipt, TrendingUp, Clock, Zap
} from "lucide-react";

function StatCard({ icon: Icon, label, value, sub, accent, loading }) {
  const styles = {
    blue:   { border: "border-blue-500",   bg: "bg-blue-50",   icon: "text-blue-600"   },
    green:  { border: "border-green-500",  bg: "bg-green-50",  icon: "text-green-600"  },
    orange: { border: "border-orange-500", bg: "bg-orange-50", icon: "text-orange-600" },
    purple: { border: "border-purple-500", bg: "bg-purple-50", icon: "text-purple-600" },
  };
  const s = styles[accent];

  return (
    <div className={`bg-white rounded-2xl p-5 border-l-4 shadow-sm
                     hover:shadow-md transition-shadow ${s.border}`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1 pr-3">
          <p className="text-[11px] font-bold text-gray-400 uppercase
                        tracking-wider mb-1.5 truncate">
            {label}
          </p>
          <p className="text-2xl sm:text-3xl font-extrabold text-gray-800
                        leading-none">
            {loading
              ? <span className="text-gray-200 animate-pulse">—</span>
              : value
            }
          </p>
          {sub && !loading && (
            <p className="text-xs text-gray-400 mt-1.5 truncate">{sub}</p>
          )}
        </div>
        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center
                         justify-center shrink-0 ${s.bg}`}>
          <Icon size={19} className={s.icon} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats,   setStats]   = useState(null);
  const [billing, setBilling] = useState(null);
  const [storage, setStorage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [todayRes, billRes, storageRes] = await Promise.all([
          usageAPI.today(),
          billingAPI.estimate(),
          objectsAPI.storageInfo()
        ]);
        setStats(todayRes.data.usage);
        setBilling(billRes.data.estimate);
        setStorage(storageRes.data.storage);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const pct      = storage?.percent_used ?? 0;
  const barColor = pct >= 90 ? "bg-red-500"
                 : pct >= 70 ? "bg-orange-400"
                 :             "bg-green-500";

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Navbar />

      <main className="flex-1 min-w-0
                       pt-12 pb-20 px-4
                       md:pt-14 md:pb-6 md:px-6
                       lg:pt-0 lg:pb-8 lg:px-10
                       overflow-auto">

        {/* Anomaly Banner */}
        <div className="pt-4 lg:pt-8">
          <AnomalyBanner />
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center
                        sm:justify-between gap-3 mb-6 pt-4 lg:pt-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-800">
              Good day,{" "}
              <span className="text-brand-600">{user?.username}</span> 👋
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">
              Here's your storage account overview.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-200
                          rounded-xl px-3 py-2 text-xs text-gray-500 shadow-sm
                          self-start sm:self-auto">
            <Clock size={13} />
            {new Date().toLocaleDateString("en-IN", {
              weekday: "short", day: "numeric",
              month: "short", year: "numeric"
            })}
          </div>
        </div>

        {/* Stats Grid 
              mobile:  2 columns
              lg:      4 columns               
        */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-5 sm:mb-8">
          <StatCard
            icon={HardDrive} accent="blue"
            label="Storage Used"
            value={storage?.used_readable ?? "—"}
            sub={`${pct}% of ${storage?.quota_readable ?? "?"}`}
            loading={loading}
          />
          <StatCard
            icon={FileText} accent="green"
            label="Total Files"
            value={stats?.total_files ?? "—"}
            sub="objects in your bucket"
            loading={loading}
          />
          <StatCard
            icon={Activity} accent="orange"
            label="API Calls Today"
            value={stats?.api_calls_today ?? "—"}
            sub="requests made today"
            loading={loading}
          />
          <StatCard
            icon={Receipt} accent="purple"
            label="Est. Bill"
            value={billing ? `₹${billing.forecast.total_amount}` : "—"}
            sub="forecast for this month"
            loading={loading}
          />
        </div>

        {/* Bottom Row 
              mobile:  stack vertically
              md:      2 columns
              lg:      3 columns
        */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

          {/* Storage Meter */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-700 text-sm">Storage Quota</h3>
              <HardDrive size={16} className="text-gray-400" />
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-xs text-gray-500 font-medium">
                <span>Used: {storage?.used_readable ?? "—"}</span>
                <span>Free: {storage?.remaining_readable ?? "—"}</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="text-right text-xs font-bold text-gray-500">
                {pct}% of {storage?.quota_readable ?? "—"}
              </div>
            </div>

            {pct >= 80 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl
                              px-3 py-2 text-xs text-orange-700 font-medium">
                ⚠️ Nearing your storage limit!
              </div>
            )}
          </div>

          {/* This Month */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-700 text-sm">This Month</h3>
              <TrendingUp size={16} className="text-gray-400" />
            </div>

            <div className="space-y-2">
              {[
                {
                  label: "Avg storage",
                  value: billing
                    ? `${billing.current_bill.usage.avg_storage_mb} MB`
                    : "—"
                },
                {
                  label: "Total API calls",
                  value: billing
                    ? billing.current_bill.usage.total_api_calls
                    : "—"
                },
                {
                  label: "Days remaining",
                  value: billing ? billing.days_remaining : "—"
                },
                {
                  label: "Month progress",
                  value: billing ? `${billing.progress_percent}%` : "—"
                },
              ].map(row => (
                <div key={row.label}
                  className="flex items-center justify-between py-2
                             border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-500">{row.label}</span>
                  <span className="text-sm font-bold text-gray-800">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Start */}
          <div className="md:col-span-2 lg:col-span-1
                          bg-gradient-to-br from-brand-800 to-brand-600
                          rounded-2xl p-5 sm:p-6 shadow-sm text-white">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={17} className="text-blue-300" />
              <h3 className="font-bold text-sm">Quick Start</h3>
            </div>

            {/* On md (2-col layout)  */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-1 gap-2">
              {[
                { icon: "📁", text: "Upload your first file",  to: "/files"   },
                { icon: "📊", text: "View usage analytics",    to: "/usage"   },
                { icon: "🧾", text: "Generate your invoice",   to: "/billing" },
              ].map(item => (
                <a key={item.text} href={item.to}
                  className="flex items-center gap-3 bg-white/10 hover:bg-white/20
                             rounded-xl px-3 py-2.5 text-sm font-medium
                             transition-colors no-underline text-white">
                  <span className="text-base">{item.icon}</span>
                  <span className="truncate">{item.text}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}