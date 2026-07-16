import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import {
  Play, CheckCircle, Clock,
  AlertCircle, Zap, Mail,
  HardDrive, Receipt
} from "lucide-react";

const TASKS = [
  {
    id:       "generate-invoices",
    icon:     Receipt,
    title:    "Generate All Invoices",
    desc:     "Creates invoices for all users for the previous month. Safe to run multiple times — skips users who already have one.",
    endpoint: "/api/tasks/generate-invoices",
    color:    "blue"
  },
  {
    id:       "storage-alerts",
    icon:     HardDrive,
    title:    "Send Storage Alerts",
    desc:     "Emails all users who are using more than 80% of their storage quota.",
    endpoint: "/api/tasks/storage-alerts",
    color:    "orange"
  },
  {
    id:       "daily-digest",
    icon:     Mail,
    title:    "Send Daily Digest",
    desc:     "Sends each user their daily usage summary with storage, API calls, and current estimated bill.",
    endpoint: "/api/tasks/daily-digest",
    color:    "green"
  },
];

function TaskCard({ task, onRun, result, running }) {
  const colors = {
    blue:   "border-blue-200   bg-blue-50   text-blue-600",
    orange: "border-orange-200 bg-orange-50 text-orange-600",
    green:  "border-green-200  bg-green-50  text-green-600",
  };
  const Icon = task.icon;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl border flex items-center
                           justify-center shrink-0 ${colors[task.color]}`}>
            <Icon size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-sm">{task.title}</h3>
            <p className="text-xs text-gray-400 mt-0.5 max-w-sm">{task.desc}</p>
          </div>
        </div>

        <button
          onClick={() => onRun(task)}
          disabled={running === task.id}
          className="flex items-center gap-2 px-4 py-2 rounded-xl
                     bg-brand-600 hover:bg-brand-700 text-white
                     text-sm font-semibold transition-all shrink-0
                     disabled:opacity-60 disabled:cursor-not-allowed">
          {running === task.id
            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white
                              rounded-full animate-spin" />
            : <Play size={14} />
          }
          {running === task.id ? "Running..." : "Run Now"}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className={`flex items-start gap-2.5 text-sm rounded-xl px-4 py-3
                         border mt-2
                         ${result.success
                           ? "bg-green-50 border-green-200 text-green-700"
                           : "bg-red-50 border-red-200 text-red-700"}`}>
          {result.success
            ? <CheckCircle size={15} className="mt-0.5 shrink-0" />
            : <AlertCircle size={15} className="mt-0.5 shrink-0" />
          }
          <div>
            <p className="font-semibold">{result.message}</p>
            {result.task_id && (
              <p className="text-xs opacity-70 mt-0.5 font-mono">
                Task ID: {result.task_id}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminTasks() {
  const { isAdmin } = useAuth();
  const navigate    = useNavigate();
  const [running,  setRunning]  = useState(null);
  const [results,  setResults]  = useState({});

  if (!isAdmin) {
    navigate("/dashboard");
    return null;
  }

  async function handleRun(task) {
    setRunning(task.id);
    setResults(prev => ({ ...prev, [task.id]: null }));
    try {
      const res = await api.post(task.endpoint);
      setResults(prev => ({
        ...prev,
        [task.id]: {
          success:  true,
          message:  res.data.message,
          task_id:  res.data.task_id
        }
      }));
    } catch (err) {
      setResults(prev => ({
        ...prev,
        [task.id]: {
          success: false,
          message: err.response?.data?.error || "Task failed to queue"
        }
      }));
    } finally {
      setRunning(null);
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

        <div className="flex items-center gap-3 mb-6 pt-4 lg:pt-8">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Zap size={20} className="text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-800">
              Background Tasks
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">
              Manually trigger scheduled Celery tasks
            </p>
          </div>
        </div>

        {/* Schedule info */}
        <div className="bg-brand-900 rounded-2xl p-5 mb-6 text-white">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} className="text-blue-300" />
            <h3 className="font-bold text-sm">Automatic Schedule</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { time: "1st of month, 2am",  task: "Generate all invoices"   },
              { time: "Every day, 8am",      task: "Send daily usage digest" },
              { time: "Every day, 9am",      task: "Storage quota alerts"   },
              { time: "Every hour",          task: "Platform snapshot"      },
            ].map(item => (
              <div key={item.task}
                className="bg-white/10 rounded-xl px-4 py-3">
                <p className="text-blue-300 text-[11px] font-bold uppercase
                               tracking-wider mb-1">
                  {item.time}
                </p>
                <p className="text-white text-sm font-medium">{item.task}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Task cards */}
        <div className="space-y-4">
          {TASKS.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onRun={handleRun}
              result={results[task.id]}
              running={running}
            />
          ))}
        </div>

        {/* Flower link */}
        <div className="mt-6 bg-white rounded-2xl border border-gray-100
                        shadow-sm p-5 flex flex-col sm:flex-row
                        sm:items-center gap-4">
          <div className="flex-1">
            <h3 className="font-bold text-gray-800 mb-1">
              Flower — Task Monitor
            </h3>
            <p className="text-gray-400 text-sm">
              Real-time Celery task monitoring — see running tasks,
              queues, and worker status.
            </p>
          </div>
          <a href="http://localhost:5555" target="_blank" rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                       bg-gray-800 hover:bg-gray-900 text-white font-semibold
                       text-sm transition-all shrink-0 no-underline">
            <Zap size={15} />
            Open Flower UI
          </a>
        </div>
      </main>
    </div>
  );
}