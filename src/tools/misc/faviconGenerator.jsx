"use client";
import { useState, useCallback, useRef } from "react";
import { AlertCircle, CheckCircle } from "lucide-react";

const SIZES = [16, 32, 48, 64, 128];
const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];
const MAX_SIZE  = 5 * 1024 * 1024;

function resizeImageToCanvas(img, size) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, size, size);
  return canvas;
}

function canvasToBlob(canvas, type = "image/png") {
  return new Promise((res) => canvas.toBlob(res, type));
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload  = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image."));
    img.src     = dataUrl;
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export default function FaviconGenerator() {
  const [dataUrl,    setDataUrl]    = useState(null);
  const [fileName,   setFileName]   = useState(null);
  const [outputs,    setOutputs]    = useState([]); // { size, url, blob }
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [success,    setSuccess]    = useState(null);
  const [sizes,      setSizes]      = useState([16, 32, 48]);
  const [dragging,   setDragging]   = useState(false);
  const inputRef = useRef(null);

  const reset = () => {
    setDataUrl(null); setFileName(null); setError(null); setSuccess(null);
    outputs.forEach((o) => URL.revokeObjectURL(o.url));
    setOutputs([]);
  };

  const handleFileInput = useCallback(async (file) => {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      setError(`Unsupported type: ${file.type}. Use PNG, JPG, WebP, GIF or SVG.`); return;
    }
    if (file.size > MAX_SIZE) {
      setError(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max is 5 MB.`); return;
    }
    setError(null); setSuccess(null); setOutputs([]);
    const reader = new FileReader();
    reader.onload = (e) => { setDataUrl(e.target.result); setFileName(file.name); };
    reader.onerror = () => setError("Failed to read file.");
    reader.readAsDataURL(file);
  }, []);

  function handleDrop(e) {
    e.preventDefault(); setDragging(false);
    handleFileInput(e.dataTransfer.files[0]);
  }

  const handleGenerate = useCallback(async () => {
    if (!dataUrl) { setError("Upload an image first."); return; }
    if (sizes.length === 0) { setError("Select at least one size."); return; }
    setLoading(true); setError(null); setSuccess(null);
    outputs.forEach((o) => URL.revokeObjectURL(o.url));

    try {
      const img     = await loadImage(dataUrl);
      const results = await Promise.all(
        sizes.map(async (size) => {
          const canvas = resizeImageToCanvas(img, size);
          const blob   = await canvasToBlob(canvas, "image/png");
          const url    = URL.createObjectURL(blob);
          return { size, blob, url };
        })
      );
      setOutputs(results);
      setSuccess(`Generated ${results.length} favicon(s) successfully.`);
    } catch (e) {
      setError(`Generation failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [dataUrl, sizes, outputs]);

  const downloadAll = useCallback(async () => {
    for (const { blob, size } of outputs) {
      downloadBlob(blob, `favicon-${size}x${size}.png`);
      await new Promise((r) => setTimeout(r, 250));
    }
  }, [outputs]);

  function toggleSize(size) {
    setSizes((prev) => prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size].sort((a, b) => a - b));
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !loading && inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl px-6 py-10 cursor-pointer transition-all select-none ${
          dragging ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-blue-300 hover:bg-gray-50"
        }`}
      >
        <input ref={inputRef} type="file" accept={ACCEPTED.join(",")} className="hidden"
          onChange={(e) => handleFileInput(e.target.files[0])} />
        {dataUrl ? (
          <>
            <img src={dataUrl} alt="Source" className="w-20 h-20 object-contain rounded-lg border border-gray-200 shadow-sm" />
            <p className="text-sm font-semibold text-gray-700">{fileName}</p>
            <p className="text-xs text-blue-500">Click or drop to replace</p>
          </>
        ) : (
          <>
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-600">Drop image here or <span className="text-blue-600">browse</span></p>
            <p className="text-xs text-gray-400">PNG, JPG, WebP, GIF, SVG · Max 5 MB</p>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-red-500" />
          <p className="text-xs font-mono text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-green-600" />
          <p className="text-xs font-medium text-green-700">{success}</p>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <button onClick={handleGenerate} disabled={!dataUrl || loading || sizes.length === 0}
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? (
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          ) : <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>}
          {loading ? "Generating…" : "Generate Favicons"}
        </button>
        {outputs.length > 1 && (
          <button onClick={downloadAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg cursor-pointer transition-colors">
            ↓ Download All
          </button>
        )}
        {dataUrl && <button onClick={reset} className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ml-auto">Clear</button>}

        {/* Size checkboxes */}
        <div className="flex items-center gap-1.5 ml-auto">
          {SIZES.map((size) => (
            <button key={size} onClick={() => toggleSize(size)}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                sizes.includes(size) ? "bg-blue-600 text-white border-blue-600" : "text-gray-500 border-gray-200 hover:bg-gray-100"
              }`}>{size}px</button>
          ))}
        </div>
      </div>

      {/* Output grid */}
      {outputs.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {outputs.map(({ size, url, blob }) => (
            <div key={size} className="flex flex-col items-center gap-2 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
              <div className="bg-gray-100 rounded-lg p-3 flex items-center justify-center" style={{ minHeight: 64 }}>
                <img src={url} alt={`${size}x${size}`} style={{ width: size, height: size, imageRendering: "pixelated" }} />
              </div>
              <p className="text-xs font-semibold text-gray-600">{size}×{size}</p>
              <button onClick={() => downloadBlob(blob, `favicon-${size}x${size}.png`)}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer">
                ↓ PNG
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}