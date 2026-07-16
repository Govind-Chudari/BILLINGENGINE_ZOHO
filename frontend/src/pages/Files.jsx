import { useState, useEffect, useCallback } from "react";
import Navbar from "../components/Navbar";
import UploadZone from "../components/UploadZone";
import DeleteModal from "../components/DeleteModal";
import StorageBar from "../components/StorageBar";
import { objectsAPI } from "../services/api";
import { getFileIcon, getFileColor, formatBytes, formatDate } from "../utils/fileHelpers";
import {
  Download, Trash2, Search, SortAsc,
  RefreshCw, FileX, FolderOpen, Filter,
  ShieldCheck, ShieldAlert, ExternalLink
} from "lucide-react";

export default function Files() {
  const [files,         setFiles]         = useState([]);
  const [storage,       setStorage]       = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [searchQuery,   setSearchQuery]   = useState("");
  const [sortBy,        setSortBy]        = useState("date");
  const [downloading,   setDownloading]   = useState(null);
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [refreshKey,    setRefreshKey]    = useState(0);
  const [showUpload,    setShowUpload]    = useState(false);
  const [optReport,     setOptReport]     = useState(null);
  const [showOptimizer, setShowOptimizer] = useState(false);
  const [verifying,     setVerifying]     = useState(null);
  const [verifyData,    setVerifyData]    = useState(null);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const [filesRes, storageRes, optRes] = await Promise.all([
        objectsAPI.list(sortBy),
        objectsAPI.storageInfo(),
        objectsAPI.optimize()
      ]);
      setFiles(filesRes.data.files || []);
      setStorage(storageRes.data.storage);
      setOptReport(optRes.data);
    } catch (err) {
      console.error("Failed to load files:", err);
    } finally {
      setLoading(false);
    }
  }, [sortBy]);

  useEffect(() => { loadFiles(); }, [loadFiles, refreshKey]);

  async function handleDownload(filename) {
    setDownloading(filename);
    try {
      const res = await objectsAPI.download(filename);
      const url  = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href  = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Download failed: " + (err.response?.data?.error || "Unknown error"));
    } finally {
      setDownloading(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await objectsAPI.delete(deleteTarget);
      setDeleteTarget(null);
      setRefreshKey(k => k + 1);
    } catch (err) {
      alert("Delete failed: " + (err.response?.data?.error || "Unknown error"));
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleVerify(fileId) {
    setVerifying(fileId);
    try {
      const res = await objectsAPI.verify(fileId);
      setVerifyData(res.data);
    } catch (err) {
      alert("Verification failed: " + (err.response?.data?.error || "Unknown error"));
    } finally {
      setVerifying(null);
    }
  }

  const filtered = files.filter(f =>
    f.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSize = files.reduce((sum, f) => sum + (f.file_size || 0), 0);

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Navbar />

      <main className="flex-1 min-w-0
                       pt-12 pb-20 px-4
                       md:pt-14 md:pb-6 md:px-6
                       lg:pt-0 lg:pb-8 lg:px-10
                       overflow-auto">

        {/*  Header */}
        <div className="flex flex-col sm:flex-row sm:items-center
                        sm:justify-between gap-3 mb-6 pt-4 lg:pt-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-800">
              My Files
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {files.length} files · {formatBytes(totalSize)} total
            </p>
          </div>

          <button
            onClick={() => setShowUpload(v => !v)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                       bg-brand-600 hover:bg-brand-700 text-white font-semibold
                       text-sm transition-all shadow-sm hover:shadow-md
                       self-start sm:self-auto">
            <FolderOpen size={16} />
            {showUpload ? "Hide Upload" : "Upload Files"}
          </button>
        </div>

        {/* Storage Bar  */}
        <div className="mb-5">
          <StorageBar storage={storage} loading={loading} />
        </div>

        {/* Zero-Waste Storage Optimizer */}
        {optReport && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 mb-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <RefreshCw size={18} className="text-indigo-600 animate-spin-slow" />
                  🔄 Zero-Waste Storage Optimizer
                </h3>
                <p className="text-gray-400 text-sm mt-0.5">
                  Clean up stale data, clear duplicate files, and compress text resources to optimize your storage cost.
                </p>
              </div>
              <div className="flex items-center gap-3 self-stretch sm:self-auto">
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-4 py-2 rounded-xl text-center flex-1 sm:flex-none">
                  <p className="text-[10px] uppercase font-bold tracking-wider opacity-85">Est. Monthly Savings</p>
                  <p className="text-lg font-extrabold">₹{optReport.estimated_monthly_savings?.toFixed(4)}</p>
                </div>
                <button
                  onClick={() => setShowOptimizer(!showOptimizer)}
                  className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-sm font-semibold transition-all border border-indigo-200"
                >
                  {showOptimizer ? "Hide Details" : "View Recommendations"}
                </button>
              </div>
            </div>

            {showOptimizer && (
              <div className="mt-6 pt-5 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-5 animate-in fade-in slide-in-from-top-3">
                {/* Stale Files */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-gray-700 text-sm mb-1">Stale Files (90d+ cold)</h4>
                    <p className="text-xs text-gray-400 mb-3">Files not downloaded or accessed in the last 90 days.</p>
                    
                    {optReport.stale_files?.length > 0 ? (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {optReport.stale_files.map(f => (
                          <div key={f.id} className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100 text-xs">
                            <span className="font-medium text-gray-600 truncate max-w-[130px]">{f.filename}</span>
                            <span className="text-gray-400">{f.size_readable || formatBytes(f.file_size)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg">✅ All files have been active recently!</p>
                    )}
                  </div>
                </div>

                {/* Duplicate Files */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-gray-700 text-sm mb-1">Duplicate Files</h4>
                    <p className="text-xs text-gray-400 mb-3">Identified by cryptographic content hash signature.</p>
                    
                    {optReport.duplicate_files?.length > 0 ? (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {optReport.duplicate_files.map(f => (
                          <div key={f.id} className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100 text-xs">
                            <div className="min-w-0 flex-1 pr-2">
                              <p className="font-medium text-gray-600 truncate">{f.filename}</p>
                              <p className="text-[10px] text-red-400 font-semibold">Duplicate ({f.size_readable || formatBytes(f.file_size)})</p>
                            </div>
                            <button
                              onClick={() => setDeleteTarget(f.filename)}
                              className="text-red-500 hover:text-red-700 font-bold px-1.5 py-1 rounded hover:bg-red-50 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg">✅ No duplicate files detected.</p>
                    )}
                  </div>
                </div>

                {/* Compressible Files */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-gray-700 text-sm mb-1">Compressible Files</h4>
                    <p className="text-xs text-gray-400 mb-3">Text files (.json, .csv, .txt, .log) suitable for archiving.</p>
                    
                    {optReport.compressible_files?.length > 0 ? (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {optReport.compressible_files.map(f => (
                          <div key={f.id} className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100 text-xs">
                            <span className="font-medium text-gray-600 truncate max-w-[130px]">{f.filename}</span>
                            <span className="text-gray-400">Save 60%</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs font-semibold text-gray-400 p-2 text-center">No compressible files found.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upload Zone (collapsible)  */}
        {showUpload && (
          <div className="mb-5">
            <UploadZone onUploadComplete={() => {
              setRefreshKey(k => k + 1);
              setShowUpload(false);
            }} />
          </div>
        )}

        {/* File List Card  */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100
                        overflow-hidden">

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3
                          px-4 sm:px-5 py-4 border-b border-gray-50">

            {/* Search */}
            <div className="relative flex-1">
              <Search size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border-2
                           border-gray-200 bg-gray-50 focus:outline-none
                           focus:border-brand-500 focus:bg-white transition-all
                           placeholder:text-gray-400"
              />
            </div>

            {/* Sort + Refresh */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 bg-gray-50 border
                              border-gray-200 rounded-xl px-3 py-2">
                <Filter size={13} className="text-gray-400" />
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="text-sm text-gray-600 bg-transparent
                             focus:outline-none font-medium">
                  <option value="date">Newest</option>
                  <option value="size">Largest</option>
                  <option value="name">Name A–Z</option>
                </select>
              </div>

              <button
                onClick={() => setRefreshKey(k => k + 1)}
                className="p-2 rounded-xl border-2 border-gray-200
                           text-gray-400 hover:text-brand-600
                           hover:border-brand-300 transition-all">
                <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {/* Table — desktop */}
          <div className="hidden sm:block overflow-x-auto">
            {loading ? (
              <TableSkeleton />
            ) : filtered.length === 0 ? (
              <EmptyState
                hasSearch={!!searchQuery}
                onUpload={() => setShowUpload(true)}
              />
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-5 py-3 text-xs font-bold text-gray-400
                                   uppercase tracking-wider w-8">#</th>
                    <th className="px-5 py-3 text-xs font-bold text-gray-400
                                   uppercase tracking-wider">File Name</th>
                    <th className="px-5 py-3 text-xs font-bold text-gray-400
                                   uppercase tracking-wider">Size</th>
                    <th className="px-5 py-3 text-xs font-bold text-gray-400
                                   uppercase tracking-wider">Uploaded</th>
                    <th className="px-5 py-3 text-xs font-bold text-gray-400
                                   uppercase tracking-wider text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((file, index) => (
                    <FileRow
                      key={file.id}
                      file={file}
                      index={index + 1}
                      isDownloading={downloading === file.filename}
                      onDownload={() => handleDownload(file.filename)}
                      onDelete={() => setDeleteTarget(file.filename)}
                      verifying={verifying}
                      onVerify={handleVerify}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Card List — Mobile */}
          <div className="sm:hidden">
            {loading ? (
              <MobileListSkeleton />
            ) : filtered.length === 0 ? (
              <EmptyState
                hasSearch={!!searchQuery}
                onUpload={() => setShowUpload(true)}
              />
            ) : (
              <div className="divide-y divide-gray-50">
                {filtered.map(file => (
                  <MobileFileCard
                    key={file.id}
                    file={file}
                    isDownloading={downloading === file.filename}
                    onDownload={() => handleDownload(file.filename)}
                    onDelete={() => setDeleteTarget(file.filename)}
                    verifying={verifying}
                    onVerify={handleVerify}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer count */}
          {filtered.length > 0 && !loading && (
            <div className="px-5 py-3 border-t border-gray-50 bg-gray-50/50">
              <span className="text-xs text-gray-400">
                Showing {filtered.length} of {files.length} files
                {searchQuery && ` matching "${searchQuery}"`}
              </span>
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteModal
          filename={deleteTarget}
          loading={deleteLoading}
          onConfirm={handleDelete}
          onCancel={() => !deleteLoading && setDeleteTarget(null)}
        />
      )}

      {/* Blockchain Verification Modal */}
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
                    <h3 className="text-xl font-bold text-gray-800">Blockchain Integrity Proof</h3>
                    <p className="text-sm text-gray-500">File Object Verification</p>
                  </div>
                </div>
              </div>

              {verifyData.is_authentic ? (
                <div className="mb-6 bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl text-sm font-medium">
                  ✅ File integrity verified! The stored file contents cryptographically match the SHA-256 hash anchored on-chain at upload.
                </div>
              ) : (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-sm font-medium">
                  ❌ WARNING: File integrity check failed! The current file hash does not match the original record anchored to the blockchain.
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
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Current Hash (Calculated from Storage)</p>
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
                  <ExternalLink size={16} /> View anchoring transaction on PolygonScan
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


function FileRow({ file, index, isDownloading, onDownload, onDelete, verifying, onVerify }) {
  const colorClass = getFileColor(file.filename);

  return (
    <tr className="hover:bg-gray-50/80 transition-colors group">
      <td className="px-5 py-3.5 text-xs text-gray-400 font-medium">{index}</td>

      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center
                           text-lg border shrink-0 ${colorClass}`}>
            {getFileIcon(file.filename)}
          </div>
          <div className="min-w-0">
            <span className="text-sm font-medium text-gray-700 max-w-xs truncate block">
              {file.filename}
            </span>
            {file.blockchain_hash && (
              <span className="text-[10px] text-indigo-500 font-mono truncate block max-w-[200px]">
                ⛓ {file.blockchain_hash.slice(0, 20)}…
              </span>
            )}
          </div>
        </div>
      </td>

      <td className="px-5 py-3.5">
        <span className="text-sm text-gray-500">
          {file.size_readable || formatBytes(file.file_size)}
        </span>
      </td>

      <td className="px-5 py-3.5">
        <span className="text-sm text-gray-500">
          {formatDate(file.uploaded_at)}
        </span>
      </td>

      <td className="px-5 py-3.5">
        <div className="flex items-center justify-end gap-2">
          {/* Verify Blockchain */}
          {file.blockchain_hash && (
            <button onClick={() => onVerify(file.id)} disabled={verifying === file.id}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                         bg-indigo-50 hover:bg-indigo-100 text-indigo-600
                         border border-indigo-200 text-xs font-semibold
                         disabled:opacity-50 transition-all">
              {verifying === file.id
                ? <div className="w-3.5 h-3.5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                : <ShieldCheck size={13} />
              }
              <span className="hidden lg:inline">
                {verifying === file.id ? "…" : "Verify"}
              </span>
            </button>
          )}

          {/* Download */}
          <button onClick={onDownload} disabled={isDownloading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                       bg-brand-50 hover:bg-brand-100 text-brand-600
                       border border-brand-200 text-xs font-semibold
                       disabled:opacity-50 transition-all">
            {isDownloading
              ? <div className="w-3.5 h-3.5 border-2 border-brand-300
                                border-t-brand-600 rounded-full animate-spin" />
              : <Download size={13} />
            }
            <span className="hidden lg:inline">
              {isDownloading ? "..." : "Download"}
            </span>
          </button>

          {/* Delete */}
          <button onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                       bg-red-50 hover:bg-red-100 text-red-500
                       border border-red-200 text-xs font-semibold
                       transition-all">
            <Trash2 size={13} />
            <span className="hidden lg:inline">Delete</span>
          </button>
        </div>
      </td>
    </tr>
  );
}

function MobileFileCard({ file, isDownloading, onDownload, onDelete, verifying, onVerify }) {
  const colorClass = getFileColor(file.filename);

  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center
                       text-xl border shrink-0 ${colorClass}`}>
        {getFileIcon(file.filename)}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-700 truncate">
          {file.filename}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-400">
            {file.size_readable || formatBytes(file.file_size)}
          </span>
          <span className="text-gray-300 text-xs">·</span>
          <span className="text-xs text-gray-400">
            {formatDate(file.uploaded_at)}
          </span>
        </div>
        {file.blockchain_hash && (
          <p className="text-[10px] text-indigo-500 font-mono truncate mt-0.5">
            ⛓ {file.blockchain_hash.slice(0, 16)}…
          </p>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {/* Verify */}
        {file.blockchain_hash && (
          <button onClick={() => onVerify(file.id)} disabled={verifying === file.id}
            className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200
                       flex items-center justify-center text-indigo-600
                       hover:bg-indigo-100 disabled:opacity-50 transition-all">
            {verifying === file.id
              ? <div className="w-3.5 h-3.5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
              : <ShieldCheck size={15} />
            }
          </button>
        )}
        <button onClick={onDownload} disabled={isDownloading}
          className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-200
                     flex items-center justify-center text-brand-600
                     hover:bg-brand-100 disabled:opacity-50 transition-all">
          {isDownloading
            ? <div className="w-3.5 h-3.5 border-2 border-brand-300
                              border-t-brand-600 rounded-full animate-spin" />
            : <Download size={15} />
          }
        </button>
        <button onClick={onDelete}
          className="w-9 h-9 rounded-xl bg-red-50 border border-red-200
                     flex items-center justify-center text-red-500
                     hover:bg-red-100 transition-all">
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

function EmptyState({ hasSearch, onUpload }) {
  return (
    <div className="text-center py-16 px-4">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center
                      justify-center mx-auto mb-4">
        {hasSearch
          ? <Search size={28} className="text-gray-300" />
          : <FileX  size={28} className="text-gray-300" />
        }
      </div>
      <h3 className="text-base font-bold text-gray-500 mb-1">
        {hasSearch ? "No files match your search" : "No files yet"}
      </h3>
      <p className="text-gray-400 text-sm mb-5">
        {hasSearch
          ? "Try a different search term"
          : "Upload your first file to get started"
        }
      </p>
      {!hasSearch && (
        <button onClick={onUpload}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl
                     bg-brand-600 hover:bg-brand-700 text-white font-semibold
                     text-sm transition-all">
          <FolderOpen size={16} />
          Upload Files
        </button>
      )}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="p-5 space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 animate-pulse">
          <div className="w-9 h-9 bg-gray-100 rounded-xl shrink-0" />
          <div className="flex-1 h-4 bg-gray-100 rounded-lg" />
          <div className="w-16 h-4 bg-gray-100 rounded-lg" />
          <div className="w-24 h-4 bg-gray-100 rounded-lg" />
          <div className="w-20 h-8 bg-gray-100 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

function MobileListSkeleton() {
  return (
    <div className="divide-y divide-gray-50">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5 animate-pulse">
          <div className="w-11 h-11 bg-gray-100 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-gray-100 rounded w-3/4" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
          </div>
          <div className="flex gap-1.5">
            <div className="w-9 h-9 bg-gray-100 rounded-xl" />
            <div className="w-9 h-9 bg-gray-100 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}