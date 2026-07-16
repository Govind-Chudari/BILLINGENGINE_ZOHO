export function getFileIcon(filename) {
  const ext = filename.split(".").pop()?.toLowerCase();
  const map = {
    jpg: "🖼️", jpeg: "🖼️", png: "🖼️", gif: "🖼️", webp: "🖼️", svg: "🖼️",    // Images
    pdf: "📄", doc: "📝", docx: "📝", xls: "📊", xlsx: "📊",    // Documents
    ppt: "📊", pptx: "📊", txt: "📃",    // Sheets
    csv: "📋", json: "📋", xml: "📋",    // Data
    mp4: "🎬", mp3: "🎵", wav: "🎵",    // Media
    zip: "📦", tar: "📦", gz: "📦",     // Archives
  };
  return map[ext] || "📎";
}

export function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  if (bytes < 1024)          return `${bytes} B`;
  if (bytes < 1024 * 1024)   return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatDate(isoString) {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric"
  });
}

export function getFileColor(filename) {
  const ext = filename.split(".").pop()?.toLowerCase();
  const images   = ["jpg","jpeg","png","gif","webp","svg"];
  const docs     = ["pdf","doc","docx","txt"];
  const sheets   = ["xls","xlsx","csv"];
  const media    = ["mp4","mp3","wav"];
  const archives = ["zip","tar","gz"];

  if (images.includes(ext))   return "bg-pink-50   text-pink-600   border-pink-200";
  if (docs.includes(ext))     return "bg-blue-50   text-blue-600   border-blue-200";
  if (sheets.includes(ext))   return "bg-green-50  text-green-600  border-green-200";
  if (media.includes(ext))    return "bg-purple-50 text-purple-600 border-purple-200";
  if (archives.includes(ext)) return "bg-orange-50 text-orange-600 border-orange-200";
  return                             "bg-gray-50   text-gray-600   border-gray-200";
}