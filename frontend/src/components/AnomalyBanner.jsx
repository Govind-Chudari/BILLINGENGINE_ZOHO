import { useEffect, useState } from "react";
import { usageAPI } from "../services/api";
import { AlertTriangle, X } from "lucide-react";

export default function AnomalyBanner() {
  const [anomaly, setAnomaly] = useState(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    async function checkAnomaly() {
      try {
        const res = await usageAPI.anomaly();
        if (res.data.is_suspicious) {
          setAnomaly(res.data);
        }
      } catch (e) {
        console.error("Failed to fetch anomaly data", e);
      }
    }
    checkAnomaly();
  }, []);

  if (!anomaly || !isVisible) return null;

  return (
    <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl mb-6 flex items-start gap-3 relative shadow-sm">
      <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
      <div className="flex-1 pr-6">
        <h3 className="font-bold text-red-900 mb-1">Unusual Usage Detected</h3>
        <p className="text-sm text-red-700">
          We noticed an unexpected spike in your usage today (Anomaly Score: {anomaly.score}). 
          You've used {anomaly.api_calls_today} API calls and {Math.round(anomaly.storage_today / (1024 * 1024))} MB of storage. 
          If this wasn't you, please check your API keys immediately.
        </p>
      </div>
      <button 
        onClick={() => setIsVisible(false)}
        className="absolute top-3 right-3 text-red-400 hover:text-red-700"
      >
        <X size={16} />
      </button>
    </div>
  );
}
