import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { adminAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { generateInvoicePDF } from "../utils/generatePDF";
import {
  Receipt, Search, RefreshCw,
  CheckCircle, Download, Filter
} from "lucide-react";

export default function AdminInvoices() {
  const { isAdmin, user: adminUser } = useAuth();
  const navigate = useNavigate();

  const [invoices,    setInvoices]    = useState([]);
  const [summary,     setSummary]     = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [paying,      setPaying]      = useState(null);
  const [refreshKey,  setRefreshKey]  = useState(0);

  useEffect(() => {
    if (!isAdmin) navigate("/dashboard");
  }, [isAdmin, navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== "all") params.status = statusFilter;
      const res = await adminAPI.allInvoices(params);
      setInvoices(res.data.invoices || []);
      setSummary({
        total:   res.data.total_revenue,
        paid:    res.data.paid_revenue,
        pending: res.data.pending_amount
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, refreshKey]);

  useEffect(() => { if (isAdmin) load(); }, [load, isAdmin]);

  async function handlePay(invoiceId) {
    setPaying(invoiceId);
    try {
      await adminAPI.payInvoice(invoiceId);
      setRefreshKey(k => k + 1);
    } catch (e) {
      alert("Failed: " + (e.response?.data?.error || "Unknown error"));
    } finally {
      setPaying(null);
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
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Receipt size={20} className="text-green-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-gray-800">
                All Invoices
              </h1>
              <p className="text-gray-400 text-sm mt-0.5">
                Platform-wide billing history
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

        {/* Revenue summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          {[
            {
              label: "Total Billed",
              value: `₹${summary?.total?.toFixed(4) ?? "0.0000"}`,
              icon: "💰", color: "bg-purple-50 border-purple-200 text-purple-700"
            },
            {
              label: "Paid Revenue",
              value: `₹${summary?.paid?.toFixed(4) ?? "0.0000"}`,
              icon: "✅", color: "bg-green-50 border-green-200 text-green-700"
            },
            {
              label: "Pending Amount",
              value: `₹${summary?.pending?.toFixed(4) ?? "0.0000"}`,
              icon: "⏳", color: "bg-amber-50 border-amber-200 text-amber-700"
            },
          ].map(card => (
            <div key={card.label}
              className={`rounded-2xl border p-4 sm:p-5 ${card.color}`}>
              <div className="flex items-center gap-2 mb-2">
                <span>{card.icon}</span>
                <span className="text-xs font-bold uppercase tracking-wider opacity-70">
                  {card.label}
                </span>
              </div>
              <p className="text-2xl font-extrabold">
                {loading
                  ? <span className="opacity-40 animate-pulse">—</span>
                  : card.value
                }
              </p>
            </div>
          ))}
        </div>

        {/* Invoice table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          {/* Toolbar */}
          <div className="flex items-center gap-3 px-4 sm:px-5 py-4 border-b border-gray-50">
            <Filter size={14} className="text-gray-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-sm rounded-xl border-2 border-gray-200 bg-gray-50
                         px-3 py-2 text-gray-600 focus:outline-none
                         focus:border-brand-500 font-medium">
              <option value="all">All invoices</option>
              <option value="generated">Pending only</option>
              <option value="paid">Paid only</option>
            </select>
            {!loading && (
              <span className="ml-auto text-xs text-gray-400">
                {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* List */}
          {loading ? (
            <div className="p-5 space-y-3 animate-pulse">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-gray-100 rounded w-1/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                  <div className="w-16 h-8 bg-gray-100 rounded-xl" />
                </div>
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-14">
              <Receipt size={32} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No invoices found</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-50">
                {invoices.map(inv => {
                  const isPaid = inv.status === "paid";
                  return (
                    <div key={inv.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-3
                                 px-4 sm:px-5 py-4 hover:bg-gray-50/50 transition-colors">

                      {/* Invoice info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center
                                         justify-center shrink-0
                                         ${isPaid
                                           ? "bg-green-100 text-green-600"
                                           : "bg-amber-100 text-amber-600"}`}>
                          <Receipt size={17} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-gray-700">
                              #{String(inv.id).padStart(4, "0")}
                            </span>
                            <span className="text-xs font-semibold text-brand-600
                                             bg-brand-50 px-2 py-0.5 rounded-full">
                              {inv.username}
                            </span>
                            <span className={`text-[11px] font-bold px-2 py-0.5
                                              rounded-full
                                              ${isPaid
                                                ? "bg-green-100 text-green-700"
                                                : "bg-amber-100 text-amber-700"}`}>
                              {isPaid ? "✓ PAID" : "PENDING"}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {inv.month} ·{" "}
                            {inv.usage.total_api_calls} API calls ·{" "}
                            {inv.usage.avg_storage_mb} MB avg
                          </p>
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="shrink-0 sm:text-right">
                        <p className="text-base font-extrabold text-gray-800">
                          ₹{inv.costs.total_amount.toFixed(4)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => generateInvoicePDF(inv, inv.username)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl
                                     bg-gray-100 hover:bg-gray-200 text-gray-600
                                     text-xs font-semibold transition-all border border-gray-200">
                          <Download size={13} />
                          <span className="hidden sm:inline">PDF</span>
                        </button>

                        {!isPaid && (
                          <button
                            onClick={() => handlePay(inv.id)}
                            disabled={paying === inv.id}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl
                                       bg-green-600 hover:bg-green-700 text-white
                                       text-xs font-semibold transition-all
                                       disabled:opacity-60">
                            {paying === inv.id
                              ? <div className="w-3.5 h-3.5 border-2 border-white/30
                                                border-t-white rounded-full animate-spin" />
                              : <CheckCircle size={13} />
                            }
                            <span className="hidden sm:inline">Mark Paid</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-5 py-4 border-t border-gray-100">
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                  <span className="text-xs text-gray-400">
                    {invoices.length} invoice{invoices.length !== 1 ? "s" : ""} shown
                  </span>
                  <span className="text-sm font-extrabold text-gray-800">
                    Total: ₹{invoices
                      .reduce((s, i) => s + i.costs.total_amount, 0)
                      .toFixed(4)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}