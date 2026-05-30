// ─────────────────────────────────────────────────────────────
// Shared UI primitives for document-conversion tools
// ─────────────────────────────────────────────────────────────
"use client";
import { useState, useRef, useCallback } from "react";

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

// ── downloadBlob ──────────────────────────────────────────────
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// ── readFileAsArrayBuffer ─────────────────────────────────────
export function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = (e) => resolve(e.target.result);
    r.onerror = () => reject(new Error("Failed to read file."));
    r.readAsArrayBuffer(file);
  });
}

// ── readFileAsDataURL ─────────────────────────────────────────
export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = (e) => resolve(e.target.result);
    r.onerror = () => reject(new Error("Failed to read file."));
    r.readAsDataURL(file);
  });
}

// ── formatBytes ───────────────────────────────────────────────
export function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// ── CopyButton ────────────────────────────────────────────────
export function CopyButton({ text, disabled }) {
  const [state, setState] = useState("idle");
  async function handleCopy() {
    try { await navigator.clipboard.writeText(text); setState("copied"); }
    catch { setState("error"); }
    setTimeout(() => setState("idle"), 2000);
  }
  return (
    <button onClick={handleCopy} disabled={disabled || !text}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-gray-700 rounded-lg transition-colors">
      {state === "copied" ? (
        <><svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg><span className="text-green-600">Copied!</span></>
      ) : (
        <><svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy</>
      )}
    </button>
  );
}

// ── DownloadButton ────────────────────────────────────────────
export function DownloadButton({ onClick, disabled, label = "Download" }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer rounded-lg transition-colors shadow-sm">
      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      {label}
    </button>
  );
}

// ── ConvertButton ─────────────────────────────────────────────
export function ConvertButton({ onClick, loading, disabled, label = "Convert" }) {
  return (
    <button onClick={onClick} disabled={disabled || loading}
      className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100">
      {loading ? (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )}
      {loading ? "Processing…" : label}
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

// ── SuccessBanner ─────────────────────────────────────────────
export function SuccessBanner({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2.5 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
      <svg width="14" height="14" className="flex-shrink-0 mt-0.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-xs font-medium text-green-700 leading-relaxed">{message}</p>
    </div>
  );
}

// ── WarningBanner ─────────────────────────────────────────────
export function WarningBanner({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
      <svg width="14" height="14" className="flex-shrink-0 mt-0.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.834-1.964-.834-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
      <p className="text-xs font-medium text-amber-700 leading-relaxed">{message}</p>
    </div>
  );
}

// ── InfoCards ─────────────────────────────────────────────────
export function InfoCards({ cards }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cards.map(({ icon, title, desc }) => (
        <div key={title} className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-100 rounded-xl">
          <span className="text-xl flex-shrink-0">{icon}</span>
          <div>
            <p className="text-xs font-semibold text-gray-700">{title}</p>
            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── StatsBar ──────────────────────────────────────────────────
export function StatsBar({ items }) {
  if (!items?.length) return null;
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

// ── FileDropZone ──────────────────────────────────────────────
export function FileDropZone({
  onFile, accept, acceptLabel, fileInfo,
  disabled, multiple = false
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback((files) => {
    if (!files || files.length === 0) return;
    if (multiple) {
      const arr = Array.from(files);
      const oversized = arr.filter(f => f.size > MAX_FILE_SIZE);
      if (oversized.length > 0) {
        onFile(null, `File(s) too large. Max size is 50 MB.`);
        return;
      }
      onFile(arr, null);
    } else {
      const file = files[0];
      if (file.size > MAX_FILE_SIZE) {
        onFile(null, `File too large (${formatBytes(file.size)}). Max is 50 MB.`);
        return;
      }
      onFile(file, null);
    }
  }, [onFile, multiple]);

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  }

  function handleChange(e) {
    handleFiles(e.target.files);
    e.target.value = "";
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl px-6 py-10 cursor-pointer transition-all select-none ${
        disabled   ? "opacity-50 cursor-not-allowed" :
        dragging   ? "border-blue-400 bg-blue-50 scale-[1.01]" :
                     "border-gray-300 hover:border-blue-300 hover:bg-gray-50"
      }`}
    >
      <input ref={inputRef} type="file" accept={accept} multiple={multiple}
        className="hidden" onChange={handleChange} disabled={disabled} />

      {fileInfo ? (
        <>
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-green-600">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-700">{fileInfo.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{fileInfo.meta}</p>
          </div>
          <p className="text-xs text-blue-500 hover:text-blue-700">Click or drop to replace</p>
        </>
      ) : (
        <>
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-600">
              Drop file here or <span className="text-blue-600">browse</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">{acceptLabel}</p>
          </div>
        </>
      )}
    </div>
  );
}

// ── Toolbar ───────────────────────────────────────────────────
export function Toolbar({ children }) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
      {children}
    </div>
  );
}

// ── LimitationNotice ──────────────────────────────────────────
export function LimitationNotice({ lines }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
      <svg width="14" height="14" className="flex-shrink-0 mt-0.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div>
        <p className="text-xs font-semibold text-blue-700 mb-1">Browser Limitations</p>
        <ul className="space-y-0.5">
          {lines.map((l, i) => (
            <li key={i} className="text-xs text-blue-600">{l}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}