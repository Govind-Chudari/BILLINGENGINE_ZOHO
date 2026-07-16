import { Trash2, X, AlertTriangle } from "lucide-react";
import { getFileIcon } from "../utils/fileHelpers";

export default function DeleteModal({ filename, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         onClick={onCancel}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6
                   animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600
                     transition-colors">
          <X size={18} />
        </button>

        {/* Icon */}
        <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center
                        justify-center mx-auto mb-4">
          <AlertTriangle size={26} className="text-red-500" />
        </div>

        <h3 className="text-lg font-bold text-gray-800 text-center mb-1">
          Delete File?
        </h3>
        <p className="text-gray-400 text-sm text-center mb-4">
          This action cannot be undone.
        </p>

        {/* File chip */}
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200
                        rounded-xl px-3 py-2.5 mb-6">
          <span className="text-xl">{getFileIcon(filename)}</span>
          <span className="text-sm font-medium text-gray-700 truncate">
            {filename}
          </span>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border-2 border-gray-200
                       text-gray-600 font-semibold text-sm
                       hover:bg-gray-50 transition-all">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600
                       disabled:opacity-60 disabled:cursor-not-allowed
                       text-white font-semibold text-sm
                       flex items-center justify-center gap-2 transition-all">
            {loading
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white
                                rounded-full animate-spin" />
              : <Trash2 size={15} />
            }
            {loading ? "Deleting..." : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}