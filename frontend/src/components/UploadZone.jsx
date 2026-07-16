import { useRef, useState, useCallback } from "react";
import { Upload, FolderOpen, X, CheckCircle, AlertCircle, FileIcon } from "lucide-react";
import { objectsAPI } from "../services/api";
import { formatBytes, getFileIcon } from "../utils/fileHelpers";

const ALLOWED = [
  ".jpg",".jpeg",".png",".gif",".webp",
  ".pdf",".doc",".docx",".xls",".xlsx",
  ".txt",".csv",".json",".xml",
  ".mp4",".mp3",".zip",".tar",".gz"
];

function FileQueueItem({ item, onRemove }) {
  const statusIcon = {
    waiting:    <div className="w-4 h-4 rounded-full border-2 border-gray-300" />,
    uploading:  <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />,
    done:       <CheckCircle size={16} className="text-green-500" />,
    error:      <AlertCircle size={16} className="text-red-500" />,
  };

  const barColor = {
    waiting:   "bg-gray-200",
    uploading: "bg-brand-500",
    done:      "bg-green-500",
    error:     "bg-red-400",
  };

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-gray-50
                    border border-gray-100 group">
      <span className="text-xl shrink-0">{getFileIcon(item.file.name)}</span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-sm font-medium text-gray-700 truncate">
            {item.file.name}
          </span>
          <span className="text-xs text-gray-400 shrink-0">
            {formatBytes(item.file.size)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300
                        ${barColor[item.status]}`}
            style={{ width: `${item.progress}%` }}
          />
        </div>

        {item.error && (
          <p className="text-xs text-red-500 mt-0.5">{item.error}</p>
        )}
      </div>

      <div className="shrink-0">{statusIcon[item.status]}</div>

      {item.status === "waiting" && (
        <button onClick={() => onRemove(item.id)}
          className="shrink-0 text-gray-300 hover:text-red-400
                     transition-colors opacity-0 group-hover:opacity-100">
          <X size={15} />
        </button>
      )}
    </div>
  );
}

export default function UploadZone({ onUploadComplete }) {
  const [isDragging, setIsDragging] = useState(false);
  const [queue,      setQueue]      = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  let nextId = useRef(0);

  function addFiles(files) {
    const valid = Array.from(files).filter(file => {
      const ext = "." + file.name.split(".").pop().toLowerCase();
      return ALLOWED.includes(ext) && file.size > 0;
    });

    const items = valid.map(file => ({
      id:       ++nextId.current,
      file,
      status:   "waiting",
      progress: 0,
      error:    null,
    }));

    setQueue(prev => [...prev, ...items]);
  }

  const onDragOver  = useCallback(e => { e.preventDefault(); setIsDragging(true);  }, []);
  const onDragLeave = useCallback(e => { e.preventDefault(); setIsDragging(false); }, []);
  const onDrop      = useCallback(e => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }, []);

  function removeFromQueue(id) {
    setQueue(prev => prev.filter(item => item.id !== id));
  }

  function updateItem(id, patch) {
    setQueue(prev =>
      prev.map(item => item.id === id ? { ...item, ...patch } : item)
    );
  }

  async function uploadAll() {
    const waiting = queue.filter(item => item.status === "waiting");
    if (waiting.length === 0) return;

    setIsUploading(true);
    let anySuccess = false;

    for (const item of waiting) {
      updateItem(item.id, { status: "uploading", progress: 20 });

      try {
        const formData = new FormData();
        formData.append("file", item.file);

        updateItem(item.id, { progress: 60 });
        await objectsAPI.upload(formData);
        updateItem(item.id, { status: "done", progress: 100 });
        anySuccess = true;

      } catch (err) {
        const msg = err.response?.data?.error || "Upload failed";
        updateItem(item.id, { status: "error", progress: 0, error: msg });
      }
    }

    setIsUploading(false);

    if (anySuccess) {
      setTimeout(() => {
        onUploadComplete?.();
        setQueue(prev => prev.filter(item => item.status !== "done"));
      }, 1500);
    }
  }

  const waitingCount = queue.filter(i => i.status === "waiting").length;
  const doneCount    = queue.filter(i => i.status === "done").length;

  return (
    <div className="space-y-3">

      {/* Drop zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center
                    cursor-pointer transition-all duration-200
                    ${isDragging
                      ? "border-brand-500 bg-brand-50 scale-[1.01]"
                      : "border-gray-200 bg-gray-50 hover:border-brand-300 hover:bg-brand-50/50"
                    }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={e => addFiles(e.target.files)}
          accept={ALLOWED.join(",")}
        />

        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center
                         mx-auto mb-4 transition-all
                         ${isDragging ? "bg-brand-100" : "bg-white border border-gray-200"}`}>
          {isDragging
            ? <Upload size={26} className="text-brand-600 animate-bounce" />
            : <FolderOpen size={26} className="text-gray-400" />
          }
        </div>

        <p className="font-semibold text-gray-700 text-sm mb-1">
          {isDragging ? "Drop files to upload" : "Drag & drop files here"}
        </p>
        <p className="text-gray-400 text-xs mb-3">
          or click to browse your computer
        </p>
        <div className="flex flex-wrap justify-center gap-1">
          {["JPG","PNG","PDF","DOCX","CSV","MP4","ZIP"].map(t => (
            <span key={t}
              className="px-2 py-0.5 bg-white border border-gray-200
                         rounded-md text-[10px] font-semibold text-gray-400">
              {t}
            </span>
          ))}
          <span className="px-2 py-0.5 bg-white border border-gray-200
                           rounded-md text-[10px] font-semibold text-gray-400">
            +more
          </span>
        </div>
      </div>

      {/* File queue */}
      {queue.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100
                        shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3
                          border-b border-gray-50">
            <span className="text-sm font-semibold text-gray-700">
              Upload Queue
              <span className="ml-2 text-xs font-normal text-gray-400">
                {doneCount}/{queue.length} completed
              </span>
            </span>
            <button
              onClick={() => setQueue([])}
              className="text-xs text-gray-400 hover:text-red-500
                         transition-colors font-medium">
              Clear all
            </button>
          </div>

          <div className="p-3 space-y-2 max-h-52 overflow-y-auto">
            {queue.map(item => (
              <FileQueueItem
                key={item.id}
                item={item}
                onRemove={removeFromQueue}
              />
            ))}
          </div>

          {waitingCount > 0 && (
            <div className="px-3 pb-3">
              <button
                onClick={uploadAll}
                disabled={isUploading}
                className="w-full py-2.5 rounded-xl bg-brand-600
                           hover:bg-brand-700 disabled:opacity-60
                           disabled:cursor-not-allowed text-white font-semibold
                           text-sm flex items-center justify-center gap-2
                           transition-all">
                {isUploading
                  ? <>
                      <div className="w-4 h-4 border-2 border-white/30
                                      border-t-white rounded-full animate-spin" />
                      Uploading...
                    </>
                  : <>
                      <Upload size={15} />
                      Upload {waitingCount} file{waitingCount > 1 ? "s" : ""}
                    </>
                }
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}