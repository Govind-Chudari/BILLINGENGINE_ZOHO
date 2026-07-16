import { HardDrive, AlertTriangle } from "lucide-react";

export default function StorageBar({ storage, loading }) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100
                      animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
        <div className="h-3 bg-gray-100 rounded-full" />
      </div>
    );
  }

  if (!storage) return null;

  const pct = storage.percent_used ?? 0;
  const isWarning = pct >= 80 && pct < 95;
  const isDanger  = pct >= 95;

  const barColor  = isDanger  ? "bg-red-500"
                  : isWarning ? "bg-orange-400"
                  :             "bg-brand-500";

  const textColor = isDanger  ? "text-red-600"
                  : isWarning ? "text-orange-600"
                  :             "text-brand-600";

  return (
    <div className={`bg-white rounded-2xl p-4 sm:p-5 shadow-sm border
                     ${isDanger  ? "border-red-200"
                     : isWarning ? "border-orange-200"
                     :             "border-gray-100"}`}>

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <HardDrive size={15} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">
            Storage Usage
          </span>
          {(isWarning || isDanger) && (
            <AlertTriangle size={14} className={textColor} />
          )}
        </div>
        <span className={`text-sm font-bold ${textColor}`}>
          {pct}% used
        </span>
      </div>

      {/* Bar */}
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-2.5">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Labels */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>
          <span className="font-semibold text-gray-600">
            {storage.used_readable}
          </span>
          {" "}used
        </span>
        <span>
          <span className="font-semibold text-gray-600">
            {storage.remaining_readable}
          </span>
          {" "}remaining of {storage.quota_readable}
        </span>
      </div>

      {isDanger && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-xl
                        px-3 py-2 text-xs text-red-600 font-medium">
          🚨 Storage almost full! Delete files or contact admin.
        </div>
      )}
      {isWarning && !isDanger && (
        <div className="mt-3 bg-orange-50 border border-orange-200 rounded-xl
                        px-3 py-2 text-xs text-orange-600 font-medium">
          ⚠️ You're using over 80% of your storage quota.
        </div>
      )}
    </div>
  );
}