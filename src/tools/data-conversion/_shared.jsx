// ─────────────────────────────────────────────────────────────
// Shared UI components for all data-conversion tools
// ─────────────────────────────────────────────────────────────
import { useState, useRef, useCallback } from "react";

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// ── CopyButton ────────────────────────────────────────────────
export function CopyButton({ text, disabled }) {
  const [state, setState] = useState("idle");

  async function handleCopy() {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("error");
    }
    setTimeout(() => setState("idle"), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      disabled={disabled || !text}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-gray-700 rounded-lg transition-colors"
    >
      {state === "copied" ? (
        <>
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-600">Copied!</span>
        </>
      ) : (
        <>
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

// ── DownloadButton ────────────────────────────────────────────
export function DownloadButton({ onClick, disabled, label = "Download" }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer rounded-lg transition-colors"
    >
      <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      {label}
    </button>
  );
}

// ── PanelHeader ───────────────────────────────────────────────
export function PanelHeader({ label, meta, actions }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-t-xl">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</span>
        {meta && <span className="text-xs text-gray-400 tabular-nums">{meta}</span>}
      </div>
      {actions && <div className="flex items-center gap-1.5">{actions}</div>}
    </div>
  );
}

// ── ErrorBanner ───────────────────────────────────────────────
export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
      <svg width="14" height="14" className="flex-shrink-0 mt-0.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-xs font-mono text-red-700 leading-relaxed break-all">{message}</p>
    </div>
  );
}

// ── StatsBar ──────────────────────────────────────────────────
export function StatsBar({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-4 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
      {items.map(({ label, value }) => (
        <div key={label} className="flex items-center gap-1.5 text-xs">
          <span className="text-gray-400">{label}:</span>
          <span className="font-mono font-semibold text-gray-700">{value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────
export function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ── ProcessButton ─────────────────────────────────────────────
export function ProcessButton({ onClick, loading, label }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      data-primary="true"
      className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all cursor-pointer shadow-sm disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
    >
      {loading ? (
        <Spinner />
      ) : (
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )}
      {loading ? "Processing…" : label}
    </button>
  );
}

// ── ClearButton ───────────────────────────────────────────────
export function ClearButton({ onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      Clear
    </button>
  );
}

// ── FileDropZone ──────────────────────────────────────────────
export function FileDropZone({ onFile, accept, acceptLabel, fileName, disabled }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback((file) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      onFile(null, `File too large (max 10 MB). Your file is ${(file.size / 1024 / 1024).toFixed(1)} MB.`);
      return;
    }
    onFile(file, null);
  }, [onFile]);

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }

  function handleChange(e) {
    const file = e.target.files[0];
    handleFile(file);
    e.target.value = "";
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl px-6 py-8 cursor-pointer transition-colors select-none ${
        disabled   ? "opacity-50 cursor-not-allowed"        :
        dragging   ? "border-blue-400 bg-blue-50"           :
                     "border-gray-300 hover:border-blue-300 hover:bg-gray-50"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />
      {fileName ? (
        <>
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-green-500">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium text-gray-700">{fileName}</p>
          <p className="text-xs text-gray-400">Click or drop to replace</p>
        </>
      ) : (
        <>
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-gray-400">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-sm font-medium text-gray-600">Drop file here or <span className="text-blue-600">browse</span></p>
          <p className="text-xs text-gray-400">{acceptLabel}</p>
        </>
      )}
    </div>
  );
}

// ── Toolbar wrapper ───────────────────────────────────────────
export function Toolbar({ children }) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
      {children}
    </div>
  );
}

// ── OutputTextPanel ───────────────────────────────────────────
// emptyIcon prop removed — uses a fixed left-arrow SVG instead of caller-supplied emoji
export function OutputTextPanel({ label, value, meta, emptyText = "Output appears here", actions }) {
  return (
    <div className="flex flex-col flex-1">
      <PanelHeader label={label} meta={meta} actions={actions} />
      <div className="flex flex-1 border border-gray-200 border-t-0 rounded-b-xl overflow-hidden bg-gray-50 min-h-[280px] relative">
        {value ? (
          <textarea
            readOnly
            value={value}
            spellCheck={false}
            className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-gray-50 outline-none resize-none text-gray-800 cursor-default select-all"
          />
        ) : (
          /* ← was: {emptyIcon} emoji string rendered as text */
          <div className="flex flex-col items-center justify-center w-full gap-2 pointer-events-none">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center opacity-40">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
              </svg>
            </div>
            <p className="text-xs text-gray-300">{emptyText}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Utility: download blob ────────────────────────────────────
export function downloadBlob(blob, filename) {
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Utility: flatten nested object ───────────────────────────
export function flattenObject(obj, prefix = "") {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    return { [prefix]: obj };
  }
  return Object.entries(obj).reduce((acc, [key, val]) => {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (val !== null && typeof val === "object" && !Array.isArray(val)) {
      Object.assign(acc, flattenObject(val, newKey));
    } else if (Array.isArray(val)) {
      acc[newKey] = JSON.stringify(val);
    } else {
      acc[newKey] = val;
    }
    return acc;
  }, {});
}

// ── Utility: read file as text ────────────────────────────────
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader   = new FileReader();
    reader.onload  = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsText(file, "UTF-8");
  });
}

// ── Utility: read file as ArrayBuffer ────────────────────────
export function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader   = new FileReader();
    reader.onload  = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsArrayBuffer(file);
  });
}