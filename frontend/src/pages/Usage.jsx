import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { usageAPI } from "../services/api";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Area, AreaChart
} from "recharts";
import {
  BarChart2, HardDrive, Activity,
  Calendar, TrendingUp, Zap, Clock,
  AlertTriangle, Award
} from "lucide-react";

function StorageTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl
                    shadow-lg px-3 py-2.5 text-xs">
      <p className="font-semibold text-gray-600 mb-1">{label}</p>
      <p className="text-brand-600 font-bold">
        {payload[0]?.value} MB storage
      </p>
    </div>
  );
}

function ApiTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl
                    shadow-lg px-3 py-2.5 text-xs">
      <p className="font-semibold text-gray-600 mb-1">{label}</p>
      <p className="text-orange-500 font-bold">
        {payload[0]?.value} API calls
      </p>
    </div>
  );
}

function UsageStat({ icon: Icon, label, value, sub, color }) {
  const colors = {
    blue:   "bg-blue-50   text-blue-600   border-blue-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    green:  "bg-green-50  text-green-600  border-green-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
  };
  return (
    <div className={`rounded-2xl border p-4 sm:p-5 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={15} />
        <span className="text-xs font-bold uppercase tracking-wider opacity-70">
          {label}
        </span>
      </div>
      <p className="text-2xl sm:text-3xl font-extrabold">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  );
}

function ChartSkeleton({ height = "h-52" }) {
  return (
    <div className={`${height} bg-gray-50 rounded-xl
                     animate-pulse flex items-end gap-1 px-4 pb-4`}>
      {[40, 65, 45, 80, 55, 90, 70, 60, 75, 85,
        50, 65, 45, 78, 55, 88, 68, 72, 62, 80,
        55, 70, 48, 82, 60, 92, 72, 65, 78, 88
      ].map((h, i) => (
        <div key={i}
          className="flex-1 bg-gray-200 rounded-t-sm"
          style={{ height: `${h * 0.6}%` }} />
      ))}
    </div>
  );
}

export default function Usage() {
  const [history,  setHistory]  = useState([]);
  const [monthly,  setMonthly]  = useState(null);
  const [today,    setToday]    = useState(null);
  const [alltime,  setAlltime]  = useState(null);
  const [anomaly,  setAnomaly]  = useState(null);
  const [days,     setDays]     = useState(30);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [histRes, monthRes, todayRes, alltimeRes, anomalyRes] = await Promise.all([
          usageAPI.history(days),
          usageAPI.currentMonth(),
          usageAPI.today(),
          usageAPI.alltime(),
          usageAPI.anomaly()
        ]);

        const hist = histRes.data.history.map(d => ({
          ...d,
          label: new Date(d.date).toLocaleDateString("en-IN", {
            day: "numeric", month: "short"
          }),
          storage_mb: d.storage_used_mb,
          api:        d.api_calls
        }));

        setHistory(hist);
        setMonthly(monthRes.data.summary);
        setToday(todayRes.data.usage);
        setAlltime(alltimeRes.data.stats);
        setAnomaly(anomalyRes.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [days]);

  const tickInterval = days <= 7 ? 0 : days <= 14 ? 1 : 4;

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
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-800">
              Usage Analytics
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">
              Storage and API usage over time
            </p>
          </div>

          {/* Day range selector */}
          <div className="flex items-center gap-1 bg-white border border-gray-200
                          rounded-xl p-1 shadow-sm self-start sm:self-auto">
            {[7, 14, 30, 90].map(d => (
              <button key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold
                            transition-all
                            ${days === d
                              ? "bg-brand-600 text-white shadow-sm"
                              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                            }`}>
                {d}d
              </button>
            ))}
          </div>
        </div>

        {/* Today's quick stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <UsageStat
            icon={HardDrive}  color="blue"
            label="Storage Today"
            value={`${today?.storage_used_mb ?? 0} MB`}
            sub="current usage"
            loading={loading}
          />
          <UsageStat
            icon={Activity}   color="orange"
            label="API Calls Today"
            value={today?.api_calls_today ?? 0}
            sub="requests so far"
            loading={loading}
          />
          <UsageStat
            icon={Calendar}   color="green"
            label="Days Active"
            value={monthly?.days_active ?? 0}
            sub="this month"
            loading={loading}
          />
          <UsageStat
            icon={Zap}        color="purple"
            label="All-time API Calls"
            value={alltime?.total_api_calls_ever ?? 0}
            sub="since account creation"
            loading={loading}
          />
        </div>

        {/* Behavioral DNA Profile & Anomaly detection */}
        {anomaly && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 mb-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
              <div className="flex-1">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <Activity size={18} className="text-purple-600 animate-pulse" />
                  🧬 Behavioral Usage DNA Profile & Anomaly Fingerprint
                </h3>
                <p className="text-gray-400 text-sm mt-1">
                  Our Isolation Forest machine learning model continuously evaluates your storage footprint and request traffic against your 30-day baseline behavior.
                </p>
              </div>

              <div className="flex items-center gap-4 w-full lg:w-auto shrink-0">
                <div className="flex-1 lg:flex-initial bg-slate-50 border border-gray-100 rounded-xl p-3 flex flex-col items-center min-w-[120px]">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Anomaly Score</span>
                  <span className={`text-xl font-extrabold font-mono ${anomaly.is_suspicious ? 'text-red-500' : 'text-green-500'}`}>
                    {(anomaly.score * 100).toFixed(0)}%
                  </span>
                </div>

                <div className={`flex-grow lg:flex-initial border px-4 py-3 rounded-xl flex items-center gap-3 w-full lg:w-80 ${
                  anomaly.is_suspicious 
                    ? 'bg-red-50 border-red-200 text-red-800' 
                    : 'bg-green-50 border-green-200 text-green-800'
                }`}>
                  {anomaly.is_suspicious ? (
                    <>
                      <AlertTriangle size={24} className="text-red-500 shrink-0" />
                      <div>
                        <p className="font-bold text-xs uppercase tracking-wider">Suspicious Behavior</p>
                        <p className="text-[11px] text-red-600 font-medium">Unusual spike in daily calls or storage detected. Check API credentials.</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Award size={24} className="text-green-500 shrink-0" />
                      <div>
                        <p className="font-bold text-xs uppercase tracking-wider">DNA Profile: Healthy</p>
                        <p className="text-[11px] text-green-600 font-medium">Daily usage aligns perfectly with your historical fingerprint bounds.</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

          {/* Storage Chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-gray-800">Storage Over Time</h3>
                <p className="text-xs text-gray-400 mt-0.5">Daily usage in MB</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-brand-600
                              bg-brand-50 border border-brand-100
                              px-2.5 py-1 rounded-lg font-semibold">
                <HardDrive size={12} />
                MB
              </div>
            </div>

            {loading ? <ChartSkeleton height="h-52" /> : (
              <ResponsiveContainer width="100%" height={210}>
                <AreaChart data={history}
                  margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
                  <defs>
                    <linearGradient id="storageGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#1a56db" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#1a56db" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    tickLine={false}
                    axisLine={false}
                    interval={tickInterval}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<StorageTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="storage_mb"
                    stroke="#1a56db"
                    strokeWidth={2.5}
                    fill="url(#storageGrad)"
                    dot={false}
                    activeDot={{ r: 5, fill: "#1a56db" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* API Calls Chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-gray-800">API Calls Per Day</h3>
                <p className="text-xs text-gray-400 mt-0.5">Request volume</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-orange-600
                              bg-orange-50 border border-orange-100
                              px-2.5 py-1 rounded-lg font-semibold">
                <Activity size={12} />
                Requests
              </div>
            </div>

            {loading ? <ChartSkeleton height="h-52" /> : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={history}
                  margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    tickLine={false}
                    axisLine={false}
                    interval={tickInterval}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<ApiTooltip />} />
                  <Bar
                    dataKey="api"
                    fill="#f97316"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* This Month Summary  */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={17} className="text-brand-600" />
            <h3 className="font-bold text-gray-800">This Month Summary</h3>
            {monthly && (
              <span className="ml-auto text-xs text-gray-400 bg-gray-50
                               border border-gray-200 px-2.5 py-1 rounded-lg font-medium">
                {monthly.month_label}
              </span>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                {
                  label: "Avg Daily Storage",
                  value: `${monthly?.avg_storage_mb ?? 0} MB`,
                  icon: HardDrive,
                  color: "text-brand-600"
                },
                {
                  label: "Peak Storage",
                  value: `${monthly?.peak_storage_mb ?? 0} MB`,
                  icon: TrendingUp,
                  color: "text-purple-600"
                },
                {
                  label: "Total API Calls",
                  value: monthly?.total_api_calls ?? 0,
                  icon: Activity,
                  color: "text-orange-500"
                },
                {
                  label: "Days Active",
                  value: `${monthly?.days_active ?? 0} / ${monthly?.days_in_month ?? 30}`,
                  icon: Clock,
                  color: "text-green-600"
                },
              ].map(item => (
                <div key={item.label}
                  className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <item.icon size={13} className={item.color} />
                    <span className="text-[11px] font-semibold text-gray-400
                                     uppercase tracking-wider">
                      {item.label}
                    </span>
                  </div>
                  <p className={`text-xl font-extrabold ${item.color}`}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Month progress bar */}
          {monthly && !loading && (
            <div className="mt-5 pt-4 border-t border-gray-50">
              <div className="flex justify-between text-xs text-gray-400
                              font-medium mb-2">
                <span>Month progress</span>
                <span>
                  Day {new Date().getDate()} of {monthly.days_in_month}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.round(
                      (new Date().getDate() / monthly.days_in_month) * 100
                    )}%`
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}