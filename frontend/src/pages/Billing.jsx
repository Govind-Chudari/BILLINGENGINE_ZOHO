import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { billingAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { generateInvoicePDF } from "../utils/generatePDF";
import {
  Receipt, TrendingUp, HardDrive, Activity,
  Download, CheckCircle, AlertCircle,
  Zap, Clock, ChevronRight, RefreshCw,
  CreditCard, FileText, ShieldCheck, ExternalLink, ShieldAlert
} from "lucide-react";

// Cost breakdown card 
function CostCard({ label, icon: Icon, cost, detail, color }) {
  const colors = {
    blue:   "border-blue-200   bg-blue-50   text-blue-600",
    orange: "border-orange-200 bg-orange-50 text-orange-600",
    green:  "border-green-200  bg-green-50  text-green-600",
  };
  return (
    <div className={`rounded-2xl border p-4 sm:p-5 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={15} />
        <span className="text-xs font-bold uppercase tracking-wider opacity-70">
          {label}
        </span>
      </div>
      <p className="text-2xl sm:text-3xl font-extrabold mb-1">
        ₹{cost?.toFixed(4) ?? "0.0000"}
      </p>
      <p className="text-xs opacity-60">{detail}</p>
    </div>
  );
}

// Invoice row 
function InvoiceRow({ invoice, username, onPay, paying, onVerify, verifying }) {
  const isPaid = invoice.status === "paid";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3
                    px-4 sm:px-5 py-4 border-b border-gray-50
                    last:border-0 hover:bg-gray-50/50 transition-colors">

      {/* Left — invoice info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                         shrink-0 ${isPaid
                           ? "bg-green-100 text-green-600"
                           : "bg-blue-100 text-brand-600"}`}>
          <FileText size={17} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-gray-700">
              Invoice #{String(invoice.id).padStart(4, "0")}
            </span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full
                              ${isPaid
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"}`}>
              {isPaid ? "✓ PAID" : "PENDING"}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {invoice.month} · {invoice.usage.total_api_calls} API calls ·{" "}
            {invoice.usage.avg_storage_mb} MB avg
          </p>
        </div>
      </div>

      {/* Middle — amount */}
      <div className="sm:text-right shrink-0">
        <p className="text-lg font-extrabold text-gray-800">
          ₹{invoice.costs.total_amount.toFixed(4)}
        </p>
        <p className="text-[11px] text-gray-400">
          Storage ₹{invoice.costs.storage_cost.toFixed(4)} +
          API ₹{invoice.costs.api_cost.toFixed(4)}
        </p>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Verify Blockchain */}
        <button
          onClick={() => onVerify(invoice.id)}
          disabled={verifying === invoice.id}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl
                     bg-indigo-50 hover:bg-indigo-100 text-indigo-600
                     text-xs font-semibold transition-all border border-indigo-200">
          {verifying === invoice.id ? (
            <div className="w-3.5 h-3.5 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
          ) : (
            <ShieldCheck size={13} />
          )}
          <span className="hidden sm:inline">Verify</span>
        </button>

        {/* Download PDF */}
        <button
          onClick={() => generateInvoicePDF(invoice, username)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl
                     bg-gray-100 hover:bg-gray-200 text-gray-600
                     text-xs font-semibold transition-all border border-gray-200">
          <Download size={13} />
          <span className="hidden sm:inline">PDF</span>
        </button>

        {/* Pay button */}
        {!isPaid && (
          <button
            onClick={() => onPay(invoice.id)}
            disabled={paying === invoice.id}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl
                       bg-brand-600 hover:bg-brand-700 text-white
                       text-xs font-semibold transition-all
                       disabled:opacity-60 disabled:cursor-not-allowed">
            {paying === invoice.id
              ? <div className="w-3.5 h-3.5 border-2 border-white/30
                                border-t-white rounded-full animate-spin" />
              : <CreditCard size={13} />
            }
            <span className="hidden sm:inline">
              {paying === invoice.id ? "..." : "Pay Now"}
            </span>
          </button>
        )}

        {isPaid && (
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl
                          bg-green-50 text-green-600 text-xs font-semibold
                          border border-green-200">
            <CheckCircle size={13} />
            <span className="hidden sm:inline">Paid</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Main Billing Page 
export default function Billing() {
  const { user } = useAuth();

  const [estimate,   setEstimate]   = useState(null);
  const [invoices,   setInvoices]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [generating, setGenerating] = useState(false);
  const [paying,     setPaying]     = useState(null);
  const [genMsg,     setGenMsg]     = useState(null);  
  const [refreshKey, setRefreshKey] = useState(0);
  const [verifying,  setVerifying]  = useState(null);
  const [verifyData, setVerifyData] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [budgetInput, setBudgetInput] = useState("");
  const [savingBudget, setSavingBudget] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [estRes, invRes, predRes] = await Promise.all([
          billingAPI.estimate(),
          billingAPI.listInvoices(),
          billingAPI.predict()
        ]);
        setEstimate(estRes.data.estimate);
        setInvoices(invRes.data.invoices || []);
        setPrediction(predRes.data);
        if (predRes.data.budget_limit !== null && predRes.data.budget_limit !== undefined) {
          setBudgetInput(predRes.data.budget_limit.toString());
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [refreshKey]);

  async function handleSetBudget(e) {
    e.preventDefault();
    if (!budgetInput.trim() || isNaN(budgetInput)) return;
    setSavingBudget(true);
    try {
      await billingAPI.setBudget(parseFloat(budgetInput));
      setRefreshKey(k => k + 1);
    } catch (err) {
      alert("Failed to update budget: " + (err.response?.data?.error || "Unknown error"));
    } finally {
      setSavingBudget(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenMsg(null);
    try {
      const now = new Date();
      const res = await billingAPI.generate(now.getFullYear(), now.getMonth() + 1);
      if (res.data.already_existed) {
        setGenMsg({
          type: "info",
          text: "Invoice for this month already exists — shown below."
        });
      } else {
        setGenMsg({
          type: "success",
          text: `Invoice #${String(res.data.invoice.id).padStart(4,"0")} generated successfully!`
        });
      }
      setRefreshKey(k => k + 1);
    } catch (e) {
      setGenMsg({
        type: "error",
        text: e.response?.data?.error || "Failed to generate invoice."
      });
    } finally {
      setGenerating(false);
    }
  }

  async function handlePay(invoiceId) {
    setPaying(invoiceId);
    try {
      await billingAPI.payInvoice(invoiceId);
      setRefreshKey(k => k + 1);
    } catch (e) {
      alert("Payment failed: " + (e.response?.data?.error || "Unknown error"));
    } finally {
      setPaying(null);
    }
  }

  async function handleVerify(invoiceId) {
    setVerifying(invoiceId);
    try {
      const res = await billingAPI.verify(invoiceId);
      setVerifyData(res.data);
    } catch (e) {
      alert("Verification failed: " + (e.response?.data?.error || "Unknown error"));
    } finally {
      setVerifying(null);
    }
  }

  const currentBill = estimate?.current_bill;
  const forecast    = estimate?.forecast;
  const pct         = estimate?.progress_percent ?? 0;

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
              Billing
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">
              Usage costs and invoice management
            </p>
          </div>

          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl
                       border-2 border-gray-200 text-gray-500
                       hover:border-brand-300 hover:text-brand-600
                       text-sm font-semibold transition-all self-start sm:self-auto">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Top Row: Estimate + Forecast */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">

          {/* Cost breakdown */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm
                          border border-gray-100 p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Zap size={17} className="text-brand-600" />
                <h3 className="font-bold text-gray-800">Current Month Estimate</h3>
              </div>
              {estimate && (
                <span className="text-xs text-gray-400 bg-gray-50
                                 border border-gray-200 px-2.5 py-1
                                 rounded-lg font-medium">
                  Day {estimate.day_of_month} of {estimate.days_in_month}
                </span>
              )}
            </div>

            {/* Cost cards */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-pulse">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-24 bg-gray-100 rounded-2xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <CostCard
                  label="Storage Cost"
                  icon={HardDrive}
                  cost={currentBill?.costs.storage_cost}
                  detail={`${currentBill?.usage.avg_storage_mb ?? 0} MB avg/day`}
                  color="blue"
                />
                <CostCard
                  label="API Cost"
                  icon={Activity}
                  cost={currentBill?.costs.api_cost}
                  detail={`${currentBill?.usage.total_api_calls ?? 0} total calls`}
                  color="orange"
                />
                <CostCard
                  label="Total So Far"
                  icon={Receipt}
                  cost={currentBill?.costs.total_amount}
                  detail="after free tier deduction"
                  color="green"
                />
              </div>
            )}

            {/* Free tier note */}
            {!loading && (
              <div className="mt-4 flex items-start gap-2 bg-brand-50
                              border border-brand-100 rounded-xl px-4 py-3">
                <CheckCircle size={14} className="text-brand-600 mt-0.5 shrink-0" />
                <p className="text-xs text-brand-700 font-medium">
                  Free tier applied: 1 GB storage + 1,000 API calls included
                  every month at no charge.
                </p>
              </div>
            )}
          </div>

          {/* Forecast card */}
          <div className="bg-gradient-to-br from-brand-800 to-brand-600
                          rounded-2xl shadow-sm p-5 sm:p-6 text-white">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-blue-300" />
              <h3 className="font-bold text-sm">Month Forecast</h3>
            </div>

            {loading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-10 bg-white/20 rounded-xl" />
                <div className="h-4 bg-white/10 rounded" />
                <div className="h-4 bg-white/10 rounded w-2/3" />
              </div>
            ) : (
              <>
                <p className="text-4xl font-extrabold mb-1">
                  ₹{forecast?.total_amount?.toFixed(4) ?? "0.0000"}
                </p>
                <p className="text-blue-200 text-xs mb-5">
                  projected by end of month
                </p>

                {/* Month progress */}
                <div className="space-y-2 mb-5">
                  <div className="flex justify-between text-xs text-blue-200">
                    <span>Month progress</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-blue-300">
                    {estimate?.days_remaining} days remaining this month
                  </p>
                </div>

                {/* Sub-forecast */}
                <div className="space-y-2">
                  {[
                    { label: "Storage forecast", value: `₹${forecast?.storage_cost?.toFixed(4) ?? 0}` },
                    { label: "API forecast",     value: `₹${forecast?.api_cost?.toFixed(4) ?? 0}`     },
                  ].map(row => (
                    <div key={row.label}
                      className="flex justify-between items-center
                                 bg-white/10 rounded-xl px-3 py-2">
                      <span className="text-xs text-blue-200">{row.label}</span>
                      <span className="text-xs font-bold text-white">{row.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Generate Invoice Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100
                        p-5 sm:p-6 mb-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <h3 className="font-bold text-gray-800 mb-1">Generate Invoice</h3>
              <p className="text-gray-400 text-sm">
                Create a final invoice for the current month based on your
                actual usage. Each month can only be invoiced once.
              </p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                         bg-brand-600 hover:bg-brand-700 text-white
                         font-semibold text-sm transition-all
                         disabled:opacity-60 disabled:cursor-not-allowed
                         shadow-sm hover:shadow-md self-start sm:self-auto
                         whitespace-nowrap">
              {generating
                ? <>
                    <div className="w-4 h-4 border-2 border-white/30
                                    border-t-white rounded-full animate-spin" />
                    Generating...
                  </>
                : <>
                    <Receipt size={16} />
                    Generate This Month
                  </>
              }
            </button>
          </div>

          {/* Result message */}
          {genMsg && (
            <div className={`mt-4 flex items-start gap-2.5 text-sm rounded-xl
                            px-4 py-3 border
                            ${genMsg.type === "success"
                              ? "bg-green-50 border-green-200 text-green-700"
                              : genMsg.type === "error"
                              ? "bg-red-50 border-red-200 text-red-700"
                              : "bg-blue-50 border-blue-200 text-blue-700"
                            }`}>
              {genMsg.type === "success"
                ? <CheckCircle size={15} className="mt-0.5 shrink-0" />
                : genMsg.type === "error"
                ? <AlertCircle size={15} className="mt-0.5 shrink-0" />
                : <Clock size={15} className="mt-0.5 shrink-0" />
              }
              {genMsg.text}
            </div>
          )}
        </div>

        {/* Predictive Budget & Bill Shock Panel */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 mb-5">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left side: Form to set budget */}
            <div className="flex-1">
              <h3 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
                <TrendingUp size={18} className="text-brand-600" />
                🧠 Predictive Budgeting & Bill Shock Prevention
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Set a monthly budget to trigger automatic projections. Our linear extrapolation ML engine forecasts your month-end usage to prevent bill shock.
              </p>
              
              <form onSubmit={handleSetBudget} className="flex items-center gap-3">
                <div className="relative max-w-xs w-full">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">₹</span>
                  <input
                    type="number"
                    value={budgetInput}
                    onChange={e => setBudgetInput(e.target.value)}
                    placeholder="e.g. 500"
                    min="1"
                    className="w-full pl-7 pr-4 py-2 text-sm rounded-xl border-2
                               border-gray-200 bg-gray-50 focus:outline-none
                               focus:border-brand-500 focus:bg-white transition-all
                               font-semibold text-gray-700"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingBudget}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm"
                >
                  {savingBudget ? "Saving..." : "Set Budget"}
                </button>
              </form>
            </div>

            {/* Right side: Status and alert indicator */}
            <div className="w-full lg:w-96 bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Budget Status</span>
                  {prediction?.budget_limit ? (
                    <span className="text-xs font-bold text-gray-700 font-mono">₹{prediction.budget_limit.toFixed(2)} Limit</span>
                  ) : (
                    <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-lg">No Limit Set</span>
                  )}
                </div>

                {prediction?.budget_limit ? (
                  <>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-xs text-gray-500">Projected: ₹{prediction.predicted_total}</span>
                      <span className="text-sm font-extrabold text-gray-800">
                        {Math.round((prediction.predicted_total / prediction.budget_limit) * 100)}% consumed
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          prediction.status === "shock_warning" ? "bg-red-500" :
                          prediction.status === "approaching_limit" ? "bg-amber-500" : "bg-green-500"
                        }`}
                        style={{ width: `${Math.min(100, Math.round((prediction.predicted_total / prediction.budget_limit) * 100))}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-gray-400 mt-2">Enter a budget limit on the left to activate predictive alerts and tracking.</p>
                )}
              </div>

              {prediction?.status === "shock_warning" && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-xl text-xs font-semibold flex gap-2">
                  <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-500" />
                  <div>
                    <p className="font-bold text-red-800">⚠️ Predicted Bill Shock!</p>
                    <p className="text-[11px] text-red-600 font-medium">Your projected usage of ₹{prediction.predicted_total} exceeds your budget limit.</p>
                  </div>
                </div>
              )}

              {prediction?.status === "approaching_limit" && (
                <div className="bg-amber-50 border border-amber-200 text-amber-700 px-3.5 py-2.5 rounded-xl text-xs font-semibold flex gap-2">
                  <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-500" />
                  <div>
                    <p className="font-bold text-amber-800">⚠️ Approaching Limit</p>
                    <p className="text-[11px] text-amber-600 font-medium">Your projected usage of ₹{prediction.predicted_total} is close to exceeding your budget limit.</p>
                  </div>
                </div>
              )}

              {prediction?.budget_limit && prediction?.status === "ok" && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-3.5 py-2.5 rounded-xl text-xs font-semibold flex gap-2">
                  <CheckCircle size={15} className="shrink-0 mt-0.5 text-green-500" />
                  <div>
                    <p className="font-bold text-green-800">Healthy Forecast</p>
                    <p className="text-[11px] text-green-600 font-medium">Your projected usage of ₹{prediction.predicted_total} is well within your budget limit.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Invoice History */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100
                        overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4
                          border-b border-gray-50">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-gray-400" />
              <h3 className="font-bold text-gray-700">Invoice History</h3>
            </div>
            {invoices.length > 0 && (
              <span className="text-xs text-gray-400 bg-gray-50
                               border border-gray-200 px-2.5 py-1
                               rounded-lg font-medium">
                {invoices.length} invoice{invoices.length > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Invoice list */}
          {loading ? (
            <div className="p-5 space-y-3 animate-pulse">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-gray-100 rounded w-1/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                  <div className="w-20 h-8 bg-gray-100 rounded-xl" />
                </div>
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-14 px-4">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center
                              justify-center mx-auto mb-4">
                <Receipt size={28} className="text-gray-300" />
              </div>
              <h3 className="text-base font-bold text-gray-500 mb-1">
                No invoices yet
              </h3>
              <p className="text-gray-400 text-sm">
                Click "Generate This Month" above to create your first invoice.
              </p>
            </div>
          ) : (
            <>
              <div>
                {invoices.map(inv => (
                  <InvoiceRow
                    key={inv.id}
                    invoice={inv}
                    username={user?.username}
                    onPay={handlePay}
                    paying={paying}
                    onVerify={handleVerify}
                    verifying={verifying}
                  />
                ))}
              </div>

              {/* Total summary footer */}
              <div className="bg-gray-50 px-5 py-4 border-t border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center
                                sm:justify-between gap-2">
                  <span className="text-sm text-gray-500">
                    Total across all invoices
                  </span>
                  <span className="text-lg font-extrabold text-gray-800">
                    ₹{invoices
                        .reduce((s, i) => s + i.costs.total_amount, 0)
                        .toFixed(4)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Verification Modal */}
      {verifyData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center
                    ${verifyData.is_authentic ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {verifyData.is_authentic ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Blockchain Verification</h3>
                    <p className="text-sm text-gray-500">Invoice #{String(verifyData.invoice_id).padStart(4, '0')}</p>
                  </div>
                </div>
              </div>

              {verifyData.is_authentic ? (
                <div className="mb-6 bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl text-sm font-medium">
                  ✅ This invoice is authentic. Its data matches the cryptographic hash anchored to the blockchain at the time of generation.
                </div>
              ) : (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-sm font-medium">
                  ❌ WARNING: This invoice has been altered! The current data does not match the original blockchain record.
                </div>
              )}

              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Stored Hash (Blockchain)</p>
                  <div className="font-mono text-xs break-all bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-gray-700">
                    {verifyData.stored_hash}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Current Hash (Database)</p>
                  <div className="font-mono text-xs break-all bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-gray-700">
                    {verifyData.current_hash}
                  </div>
                </div>
              </div>

              {verifyData.explorer_url && (
                <a
                  href={verifyData.explorer_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold rounded-xl transition-colors mb-3"
                >
                  <ExternalLink size={16} /> View Transaction on PolygonScan
                </a>
              )}
              
              <button
                onClick={() => setVerifyData(null)}
                className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}